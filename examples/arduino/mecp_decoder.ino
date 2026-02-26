/*
 * MECP Minimal Decoder — Arduino / ESP32
 *
 * Decodes an MECP message string into severity, codes, and freetext.
 * Designed for resource-constrained devices with a display (T-Deck, Heltec, etc).
 *
 * Usage:
 *   char msg[] = "MECP/0/M01 M07 2pax 48.6520,20.1305";
 *   MECPMessage parsed;
 *   if (mecp_decode(msg, &parsed)) {
 *     Serial.println(parsed.severity);
 *     for (int i = 0; i < parsed.code_count; i++)
 *       Serial.println(parsed.codes[i]);
 *   }
 */

#include <string.h>
#include <stdlib.h>

#define MECP_MAX_CODES 16
#define MECP_CODE_LEN 4      // "M01\0"
#define MECP_MAX_FREETEXT 128

typedef struct {
  int severity;                          // 0-3, or -1 if invalid
  char codes[MECP_MAX_CODES][MECP_CODE_LEN];
  int code_count;
  char freetext[MECP_MAX_FREETEXT];
  bool is_drill;
  bool is_beacon;                        // B01 present
  int pax;                               // -1 if not present
  float gps_lat;                         // NAN if not present
  float gps_lon;                         // NAN if not present
} MECPMessage;

static bool is_code(const char *tok) {
  // Exactly 3 chars: uppercase letter + 2 digits
  if (strlen(tok) != 3) return false;
  if (tok[0] < 'A' || tok[0] > 'Z') return false;
  if (tok[1] < '0' || tok[1] > '9') return false;
  if (tok[2] < '0' || tok[2] > '9') return false;
  return true;
}

bool mecp_decode(const char *input, MECPMessage *msg) {
  // Init
  msg->severity = -1;
  msg->code_count = 0;
  msg->freetext[0] = '\0';
  msg->is_drill = false;
  msg->is_beacon = false;
  msg->pax = -1;
  msg->gps_lat = NAN;
  msg->gps_lon = NAN;

  // Check prefix "MECP/"
  if (strncmp(input, "MECP/", 5) != 0) return false;

  // Severity at index 5
  char sev = input[5];
  if (sev < '0' || sev > '3') return false;
  msg->severity = sev - '0';

  // Check '/' at index 6
  if (input[6] != '/') return false;

  // Tokenize body (from index 7)
  char buf[256];
  strncpy(buf, input + 7, sizeof(buf) - 1);
  buf[sizeof(buf) - 1] = '\0';

  bool in_freetext = false;
  int ft_pos = 0;
  char *tok = strtok(buf, " ");

  while (tok != NULL) {
    if (!in_freetext && is_code(tok) && msg->code_count < MECP_MAX_CODES) {
      strncpy(msg->codes[msg->code_count], tok, MECP_CODE_LEN - 1);
      msg->codes[msg->code_count][MECP_CODE_LEN - 1] = '\0';
      msg->code_count++;
    } else {
      // Everything from here is freetext
      in_freetext = true;
      if (ft_pos > 0 && ft_pos < MECP_MAX_FREETEXT - 1) {
        msg->freetext[ft_pos++] = ' ';
      }
      int len = strlen(tok);
      if (ft_pos + len < MECP_MAX_FREETEXT) {
        memcpy(msg->freetext + ft_pos, tok, len);
        ft_pos += len;
      }
    }
    tok = strtok(NULL, " ");
  }
  msg->freetext[ft_pos] = '\0';

  // Drill detection: D01 or D02
  // Beacon detection: B01
  for (int i = 0; i < msg->code_count; i++) {
    if (strcmp(msg->codes[i], "D01") == 0 || strcmp(msg->codes[i], "D02") == 0) {
      msg->is_drill = true;
    }
    if (strcmp(msg->codes[i], "B01") == 0) {
      msg->is_beacon = true;
    }
  }

  // Extract pax count (Npax pattern)
  char *pax_ptr = strstr(msg->freetext, "pax");
  if (pax_ptr && pax_ptr > msg->freetext) {
    char *p = pax_ptr - 1;
    while (p >= msg->freetext && *p >= '0' && *p <= '9') p--;
    p++;
    if (p < pax_ptr) {
      msg->pax = atoi(p);
    }
  }

  // Extract GPS (lat,lon pattern)
  char *comma = strchr(msg->freetext, ',');
  if (comma) {
    // Walk back from comma to find start of lat
    char *lat_start = comma - 1;
    while (lat_start > msg->freetext && (*lat_start == '.' || (*lat_start >= '0' && *lat_start <= '9') || *lat_start == '-')) {
      lat_start--;
    }
    if (*lat_start != '.' && !(*lat_start >= '0' && *lat_start <= '9') && *lat_start != '-') {
      lat_start++;
    }
    float lat = atof(lat_start);
    float lon = atof(comma + 1);
    if (lat >= -90.0f && lat <= 90.0f && lon >= -180.0f && lon <= 180.0f) {
      msg->gps_lat = lat;
      msg->gps_lon = lon;
    }
  }

  return true;
}

// ─── Helpers ───

void mecp_print(MECPMessage *msg) {
  Serial.print("Severity: ");
  Serial.println(msg->severity);
  Serial.print("Codes: ");
  for (int i = 0; i < msg->code_count; i++) {
    Serial.print(msg->codes[i]);
    if (i < msg->code_count - 1) Serial.print(", ");
  }
  Serial.println();
  Serial.print("Freetext: ");
  Serial.println(msg->freetext);
  Serial.print("Drill: ");
  Serial.println(msg->is_drill ? "yes" : "no");
  Serial.print("Beacon: ");
  Serial.println(msg->is_beacon ? "yes" : "no");
  if (msg->pax >= 0) {
    Serial.print("Pax: ");
    Serial.println(msg->pax);
  }
  if (!isnan(msg->gps_lat)) {
    Serial.print("GPS: ");
    Serial.print(msg->gps_lat, 4);
    Serial.print(", ");
    Serial.println(msg->gps_lon, 4);
  }
}

// ─── Example usage ───

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Test 1: Standard emergency message
  const char *test_msg = "MECP/0/M01 M07 2pax 48.6520,20.1305 #A1";
  MECPMessage parsed;

  Serial.println("--- Test 1: Emergency ---");
  if (mecp_decode(test_msg, &parsed)) {
    mecp_print(&parsed);
  } else {
    Serial.println("Not an MECP message");
  }

  // Test 2: Beacon message
  const char *beacon_msg = "MECP/0/B01 M01 P05 48.6520,20.1305 @1430";
  MECPMessage parsed2;

  Serial.println("\n--- Test 2: Beacon ---");
  if (mecp_decode(beacon_msg, &parsed2)) {
    mecp_print(&parsed2);
  } else {
    Serial.println("Not an MECP message");
  }
}

void loop() {
  // Nothing — one-shot demo
}
