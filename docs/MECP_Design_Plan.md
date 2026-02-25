# MECP Design Plan — Research-Informed Protocol & Implementation Strategy

## Context

MECP (Mesh Emergency Communication Protocol) is a structured text encoding for LoRa mesh networks enabling cross-language emergency and everyday communication over extremely bandwidth-constrained radio links. The developer brief (v2) provides a solid foundation but, informed by deep research into GMDSS, ICAO, NATO STANAG, Japanese/Korean/Taiwanese disaster systems, Red Cross protocols, EENA standards, UN OSOCC/INSARAG, and amateur radio emergency networks, this plan refines and strengthens the protocol, UX, and architecture.

**Core validation:** MECP's fundamental approach — structured numeric codes with pre-translated lookup tables, layered severity, and daily-use driving emergency readiness — is the most validated pattern in emergency communication history, proven across maritime (75+ years), aviation, military, and civilian disaster systems worldwide.

---

## Part 1: Protocol Refinements

### 1.1 New Code Categories & Codes (v1.0)

Research revealed critical gaps in the code table. These additions are informed by GMDSS nature-of-distress codes, IFRC disaster taxonomy, INSARAG accountability needs, and real-world emergency scenarios.

**New Category X — Threat/Security** (human-caused dangers — qualitatively different from T-category infrastructure/terrain)

| Code | English | Rationale |
|------|---------|-----------|
| X01 | Dangerous person / threat nearby | Cannot express human threats with current codes |
| X02 | Area unsafe — avoid | Critical for route planning |
| X03 | Gunfire / explosions heard | Specific actionable information |
| X04 | Civil unrest / crowd danger | Common in crisis scenarios |
| X05 | Theft / looting reported | Post-disaster security |
| X06 | Authorities / emergency services present | Positive safety signal |
| X07 | Checkpoint / road closure (authority) | Movement planning |

**New Category H — Have/Offer Resources** (the S-category covers "need X" but there's no way to say "I have X" — critical for disaster coordination per INSARAG/OSOCC patterns)

| Code | English | Rationale |
|------|---------|-----------|
| H01 | Have water available | Resource coordination |
| H02 | Have food available | Resource coordination |
| H03 | Have medical supplies | Resource coordination |
| H04 | Have power / charging | Resource coordination |
| H05 | Have fuel | Resource coordination |
| H06 | Have tools / equipment | Resource coordination |
| H07 | Have shelter / space for [N]pax | Resource coordination |
| H08 | Have transport / vehicle | Resource coordination |

**Additional codes for existing categories:**

| Code | English | Rationale |
|------|---------|-----------|
| M11 | Animal bite / sting | Changes required treatment (antivenom vs splint) |
| M12 | Allergic reaction / anaphylaxis | Requires EpiPen, not splint |
| M13 | Poisoning / toxic exposure | Specific treatment required |
| M14 | Persons located alive | INSARAG accountability |
| M15 | Area searched, no victims found | INSARAG accountability |
| T11 | Drowning / water rescue needed | Leading cause of accidental death, currently uncodeable |
| T12 | Water contamination | Public health |
| T13 | Earthquake | Missing from IFRC disaster taxonomy mapping |
| T14 | Gas leak | Specific evacuation response |
| T15 | Chemical spill / HAZMAT | Specific PPE/decon response |
| T16 | Vehicle accident | Most common emergency globally |
| T17 | Vehicle fire | Specific response needed |
| W06 | Tsunami / tidal surge warning | Missing critical weather event |
| R07 | Situation resolved / all clear | Closes out incidents — every system needs this |

### 1.2 New Freetext Conventions (v1.0)

Research-backed additions to the freetext pattern vocabulary:

| Pattern | Meaning | Cost | Source |
|---------|---------|------|--------|
| `#[A-Za-z0-9]{1,4}` | Incident reference tag | 2-5 bytes | Solves message threading, ACK targeting, escalation tracking (NATO 9-line model) |
| `@[a-z]{2}` | Sender language hint (ISO 639-1) | 3 bytes | PEMEA precedent — helps recipients know what language to reply in |
| `@HHMM` | Composition timestamp (UTC) | 5 bytes | Mesh latency makes timestamps valuable; distinguished from language hint by digit pattern |
| `~[A-Za-z0-9]{1,9}` | Sender callsign | 2-10 bytes | For non-mesh transports (SMS, paper, voice readout) where transport-layer ID absent |

**Example with new conventions:**
```
MECP/0/M01 M07 2pax P05 48.6520,20.1305 #A1 @sk @1430 ~OM3ABC
```
= MAYDAY: Injury, Fracture, 2 people, GPS coords, incident tag A1, sender speaks Slovak, composed at 14:30 UTC, callsign OM3ABC. Total: ~75 bytes. Still well within 200-byte budget.

### 1.3 Behavioral Protocol Additions (v1.0)

| Rule | Rationale | Source |
|------|-----------|--------|
| Auto-attach GPS for severity 0-1 (opt-out, not opt-in) | AML/eCall/EPIRB all proved auto-location saves lives | EENA, GMDSS |
| MAYDAY confirmation: long-press (1s) to send severity 0 | GMDSS 90-95% false alert rate teaches this lesson | GMDSS |
| Prompt ACK for incoming severity 0 | Maritime MAYDAY RELAY requires acknowledgment | GMDSS, ICAO |
| Priority queue: severity 0 transmits before severity 3 | Duty cycle budget must serve emergencies first | ARES, NATO |
| Message deduplication by content+source+time window | Flood routing creates duplicates; NAVTEX solved this decades ago | NAVTEX |
| Recommended code ordering: Location > Incident > Hazard > Casualties > Resources | Follows the proven METHANE reporting framework | NATO STANAG 2934, UK emergency services |

### 1.4 D04 Correction on isDrill

The brief states D04 sets `isDrill = true`. This is incorrect per the brief's own logic. D04 ("Ignore previous — sent in error") is a retraction, not a drill. It should NOT suppress alerts on the D04 message itself. **Correction: only D01 and D02 set isDrill. D03 and D04 do not.** The brief's Section 6.1 step 10 (drill detection) already says this correctly, but the unit test at line 729-731 incorrectly sets isDrill=true for D04. Fix: D04 test should have `isDrill=false`.

### 1.5 What We Are NOT Changing

| Decision | Rationale |
|----------|-----------|
| Keep 4 severity levels | Validated as the sweet spot by GMDSS, NATO. More leads to precedence inflation; fewer is too coarse for untrained civilians |
| Keep ASCII encoding | Human readability, transport universality, debuggability outweigh 70% byte savings of binary. 200-byte budget is sufficient |
| No version field in message | Brief is correct — unknown codes are self-documenting. Minimal wire format is right |
| Freetext remains unstructured | NATO "remarks" field pattern — necessary escape valve, but clearly marked as untranslated |
| No channel/group encoding | Transport layer handles this. Redundant in MECP |

---

## Part 2: UX Design — Research-Informed

### 2.1 Accessibility-First Severity Encoding

The brief's colors fail WCAG 2.1 AA contrast for SAFETY (#CA8A04) and URGENT (#EA580C) on white. Research demands multi-channel encoding:

| Severity | Color (adjusted) | Shape | Pattern | Border | Icon |
|----------|-----------------|-------|---------|--------|------|
| 0 MAYDAY | #DC2626 (red) | Octagon | Solid fill | 4px solid | Exclamation in triangle |
| 1 URGENT | #EA580C (orange) | Diamond | Diagonal stripes | 3px dashed | Clock with exclamation |
| 2 SAFETY | #B45309 (darker amber) | Triangle | Horizontal stripes | 2px dotted | Shield/warning |
| 3 ROUTINE | #2563EB (blue) | Rectangle | No pattern | 1px solid | Info circle |

**Rule:** Color is NEVER the sole differentiator. Shape + pattern + border + icon + text label ALL encode severity simultaneously. 8% of males are colorblind.

Use white text on colored backgrounds (high contrast) rather than colored text on white.

### 2.2 Compose Flow UX (Stress-State Design)

Based on Fitts's Law under stress, Japanese earthquake app patterns, and cognitive load research:

- **Touch targets: minimum 64x64dp, ideally 72dp** (normal apps use 44-48dp, but cold/shaking hands need 30-50% larger)
- **Debounce: 150-200ms** (tremor compensation)
- **Center-screen placement** for all critical elements (stress causes tunnel vision)
- **Maximum 6 choices per screen** (working memory drops from 7±2 to 3-4 under stress)
- **MAYDAY send: long-press 1 second** (prevents accidental sends; NOT a complex dialog)
- **D04 "sent in error": accessible within 2 taps** from message feed (the "undo" for mesh)

**Compose flow (4-5 taps):**
1. Severity: 4 full-width stacked buttons (72dp tall, 16dp spacing)
2. Category: 9 icon buttons in 3x3 grid (large, labeled)
3. Codes: Checklist within selected category (5-10 items, multi-select)
4. Freetext/GPS: Optional. GPS auto-attached for severity 0-1. Tag auto-suggested.
5. Preview & Send: Human-readable + raw MECP string. Confirm.

### 2.3 Decoded Message Display

Following the Japanese earthquake alert pattern (Yurekuru Call):

```
┌─────────────────────────────────────────┐
│ [OCTAGON] 0  MAYDAY       [severity bar]│  <- Large numeral + shape + color
├─────────────────────────────────────────┤
│ ✚ Injury                    [translated]│  <- Each code with category icon
│ ✚ Fracture / immobile       [translated]│
│ 📍 At GPS coordinates       [translated]│
│ ────────────────────────────────────────│
│ 2 people                    [extracted] │  <- Extracted structured data
│ 📍 48.6520, 20.1305     [tap to open]  │
│ ────────────────────────────────────────│
│ near the bridge          [untranslated] │  <- Freetext in italic/grey
│ ⚠ This text is not translated           │
├─────────────────────────────────────────┤
│ MECP/0/M01 M07 2pax P05 48.6520,20.1305│  <- Raw string, monospace
│                              [📋 Copy]  │
└─────────────────────────────────────────┘
```

Key: **Freetext is visually distinguished** from translated codes (italic, different background, labeled "untranslated"). This is the single most important UX lesson from NATO/GMDSS/ICAO — freetext is where cross-language breaks down.

### 2.4 Language Selection

Flag buttons + language name in native script + Latin script. Example:
```
🇸🇰 Slovenčina (Slovak)
🇬🇧 English
🇩🇪 Deutsch (German)
```
No text reading required — flags enable navigation even if user can't read any available language.

### 2.5 Alert Sound Design

Based on IEC 60601-1-8 (medical alarms), ISO 7731, and Taiwan/Japan alert patterns:

| Severity | Pattern | Duration |
|----------|---------|----------|
| 0 MAYDAY | 3 rising tones (1000-1500-2000 Hz), repeat 3x | ~3 seconds |
| 1 URGENT | 2 tones (1200-1500 Hz), repeat 2x | ~2 seconds |
| 2 SAFETY | Single tone 1000 Hz | ~1 second |
| 3 ROUTINE | Silent (optional soft click) | N/A |

MAYDAY sound overrides silent mode if OS permits (Android notification channels with HIGH importance; iOS Critical Alerts).

### 2.6 Drill Visual Treatment

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱
│  ⚠ DRILL — MAYDAY                       │  <- Dashed border, hatched BG
│  [Full message renders identically]      │  <- Content unchanged
│  NO sound. NO vibration. NO pinning.     │
╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

### 2.7 Chat-Optimized Output (for WhatsApp/SMS/Telegram paste)

```
*MAYDAY* [Severity 0]
- Injury
- Fracture / immobile
- 2 people
- GPS: 48.6520, 20.1305

MECP/0/M01 M07 2pax P05 48.6520,20.1305
```

Bold severity, bullet points, raw string at bottom. No emoji (inconsistent cross-platform rendering). Under 10 lines.

### 2.8 Printable Reference Card

**A5 landscape, double-sided:**
- Front: Complete code table in bilingual columns (user picks language pair), severity definitions with color bars, category headers with icons
- Back: 3-4 example messages (emergency, warning, social, drill), freetext pattern reference, message format diagram

**Additional: credit-card-size (85.6 x 53.98mm) wallet emergency card:**
- Severity definitions, top 5 medical codes, top 5 terrain codes, message format only
- Fits in wallet/ID holder for always-carry

Design specs: minimum 9pt sans-serif, high-contrast black on white, color bars for severity (redundant with shapes for B&W printing), waterproof lamination recommended.

---

## Part 3: Architecture & Implementation

### 3.1 Phase 1: Web Encoder/Decoder (PWA-Enhanced Single HTML File)

**What to build:**
Single HTML file (self-contained, no build step) enhanced with PWA capabilities:
- `manifest.json` (inlined as data URI or adjacent file) for "Add to Home Screen"
- Minimal service worker (~30 lines) for offline caching
- `navigator.geolocation` for GPS attachment
- `navigator.clipboard.writeText()` for copy
- `navigator.share()` as mobile share alternative

**Features:**
1. Language selector (flag buttons)
2. Compose mode (guided: severity > category > codes > freetext/GPS > preview > copy)
3. Decode mode (paste/type > parse > render in selected language)
4. Reference card view (two languages side-by-side, print-optimized CSS)
5. Bilingual display: show codes in user's language AND English (Taiwan model — redundancy + visitor-friendly)

**Tech:** HTML + CSS + vanilla JS. All language data embedded as JS objects. Total <500KB.

**Responsive breakpoints:**
- <600px: Single column (phone)
- 600-900px: Two-column compose/preview (tablet)
- >900px: Full reference card layout (desktop)

### 3.2 Phase 2: React Native Mobile App

**AIDL-first strategy for Android Meshtastic** (from ecosystem research):

| Integration Path | Complexity | Reliability | Time |
|-----------------|-----------|-------------|------|
| AIDL (bind to Meshtastic Android app) | Low | High | 1-2 weeks |
| Direct BLE (react-native-ble-plx) | High | Medium | 4-6 weeks |
| @meshtastic/js in RN | Very High | Low | Unknown |

**Recommended phased approach:**
1. **Phase 2a:** Android + AIDL service binding for Meshtastic (~2-3 weeks) — Write ~200-300 lines of Kotlin native module wrapping `IMeshService` AIDL interface
2. **Phase 2b:** Add MeshCore BLE via react-native-ble-plx (~2-3 weeks)
3. **Phase 2c:** iOS direct BLE for both platforms (~3-4 weeks)

**Stack (confirming brief's choices with refinements):**
- React Native + TypeScript
- react-native-ble-plx (confirmed as best BLE option; no viable alternative has emerged)
- MECP engine: pure TypeScript module (shared between web tool and app)
- SQLite (not AsyncStorage) for message history — 6MB AsyncStorage limit is insufficient
- Zustand for state management (simpler than Redux, sufficient for this app)
- All language JSON files bundled as app assets (<200KB)

**BLE architecture (unchanged from brief, this is correct):**
```
┌──────────────────────────────────────────┐
│              BLE Connection Manager       │
│  Scan → Identify (by service UUID) →     │
│  Connect → Maintain → Auto-reconnect     │
├─────────────────┬────────────────────────┤
│ Meshtastic BLE  │  MeshCore BLE          │
│ (AIDL on Andr.) │  (react-native-ble-plx)│
│ (BLE on iOS)    │                        │
└─────────────────┴────────────────────────┘
```

### 3.3 MECP Engine (Pure TypeScript — Shared Module)

The engine is platform-agnostic. No I/O, no dependencies. Published as npm package.

**Key functions:**
- `encode(severity, codes, freetext?) → string`
- `decode(rawString) → ParsedMessage`
- `validate(rawString) → ValidationResult`
- `getCodeDescription(code, language) → string`
- `loadLanguage(langCode) → LanguageFile`

**ParsedMessage interface (refined from brief):**
```typescript
interface ParsedMessage {
  valid: boolean;
  severity: 0 | 1 | 2 | 3 | null;
  codes: string[];
  isDrill: boolean;           // true only if D01 or D02 present
  freetext: string | null;
  extracted: {
    count: number | null;     // from Npax pattern
    gps: { lat: number; lon: number } | null;
    eta: number | null;       // from R03 N pattern
    reference: string | null; // from #tag pattern
    language: string | null;  // from @xx pattern
    timestamp: string | null; // from @HHMM pattern
    callsign: string | null;  // from ~CALL pattern
  };
  warnings: string[];
  raw: string;                // original input string
}
```

### 3.4 Language File Schema (Enhanced)

```json
{
  "language": "sk",
  "language_name": "Slovenčina",
  "language_name_en": "Slovak",
  "language_name_latin": "Slovencina",
  "flag_emoji": "🇸🇰",
  "text_direction": "ltr",
  "severities": { ... },
  "categories": {
    "M": { "name": "Zdravotné", "icon": "medical" },
    "X": { "name": "Hrozba / Bezpečnosť", "icon": "threat" },
    "H": { "name": "Ponúkam zdroje", "icon": "resources" },
    ...
  },
  "codes": {
    "M01": "Zranenie",
    "X01": "Nebezpečná osoba / hrozba v blízkosti",
    "H01": "K dispozícii voda",
    ...
  },
  "ui": { ... },
  "deprecations": {}
}
```

Added: `text_direction`, `language_name_latin`, `deprecations` object, new categories X and H.

### 3.5 Priority Languages (v1.0)

Based on active mesh community mapping: **English, Slovak, German, Czech, Polish, Dutch, French, Italian, Norwegian, Ukrainian** (10 languages covering the most active mesh communities). Expand to full 22+ language list post-v1.0 with human verification.

---

## Part 4: Development Roadmap (Revised)

| Phase | Deliverable | Effort | Notes |
|-------|------------|--------|-------|
| 1 | MECP engine (TypeScript) + full unit tests | 2-3 days | Includes new codes, freetext conventions, enhanced parser |
| 2 | Web encoder/decoder (PWA-enhanced HTML) | 3-4 days | Full compose/decode/reference card. Responsive. Offline. |
| 3 | Language files (10 languages) | 1-2 weeks | Human-verified. Community contribution pipeline via GitHub. |
| 4 | Android app (Meshtastic via AIDL) | 2-3 weeks | AIDL-first approach dramatically reduces BLE debugging |
| 5 | MeshCore BLE adapter | 2-3 weeks | react-native-ble-plx for direct BLE |
| 6 | iOS build (both platforms via BLE) | 3-4 weeks | No AIDL on iOS; direct BLE for both Meshtastic and MeshCore |
| 7 | Printable reference cards (A5 + wallet) | 3-5 days | PDF generation per language pair |
| 8 | Language expansion to 22+ | Ongoing | Community-driven with native speaker review |

---

## Part 5: Critical Design Decisions (Resolved)

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Standalone app vs plugin | Standalone + AIDL binding | Full UX control; AIDL eliminates 40% of BLE work on Android |
| MECP in main feed vs separate | Inline with filter toggle | Brief recommendation is correct; inline ensures visibility |
| Offline maps | No bundled tiles; raw GPS coordinates + copy button + external app intent (OsmAnd) | Simplicity; keep app <25MB |
| Audio alerts | App-generated, not radio-dependent | T-Deck has buzzer, Heltec doesn't; graceful degradation |
| Bilingual display | Show user's language + English always | Taiwan model; redundancy + visitor accessibility |

---

## Part 5B: Local Message Storage & History

### On-Device Message Persistence

Messages sent and received must be saved locally on the device. This serves multiple purposes:

**Why:**
- Emergency messages may need to be referenced hours or days later (coordinates, casualty counts, incident tags)
- Legal/accountability: a log of what was communicated during an incident
- Offline review: user may compose messages before having a radio connection, then send when connected
- Message queue: unsent messages persist across app restarts and send when BLE reconnects

**Web Tool (Phase 1):**
- Use `localStorage` for recent message history (last 100 messages)
- Use `IndexedDB` for full history if available (graceful fallback to localStorage)
- Store both raw MECP strings and parsed metadata (severity, codes, timestamp)
- "Message History" tab showing sent/received/drafted messages
- Export as plain text file (`.txt`) for archival — one message per line with local timestamp
- Clear history button with confirmation

**Mobile App (Phase 2):**
- **SQLite database** (not AsyncStorage) — supports structured queries, no 6MB limit
- Schema:
  ```
  messages(id, raw_string, severity, codes_json, freetext, is_drill,
           direction [sent|received|draft], platform [meshtastic|meshcore|clipboard],
           source_node, channel, timestamp_composed, timestamp_received,
           gps_lat, gps_lon, reference_tag, is_read, is_pinned)
  ```
- Message queue table for unsent messages with retry state
- Auto-cleanup: archive messages older than 90 days (configurable), never auto-delete severity 0-1
- Export: share full message log as CSV or plain text
- Search: filter by severity, date range, codes, freetext content

**Drafts:**
- If the user starts composing but navigates away, auto-save as draft
- Drafts survive app restart
- Show draft count badge on compose button

---

## Part 5C: GitHub-Ready Project Structure

The project should be structured for easy community adoption, contribution, and forking from day one.

### Repository Structure
```
MECP/
├── README.md                    # Project overview, quick start, badges
├── LICENSE                      # GPLv3 for app code
├── LICENSE-PROTOCOL             # CC0 for protocol spec
├── LICENSE-LANGUAGES            # CC BY 4.0 for language files
├── CONTRIBUTING.md              # How to contribute: translations, code, testing
├── CODE_OF_CONDUCT.md           # Standard contributor covenant
├── CHANGELOG.md                 # Version history
├── docs/
│   ├── MECP_Developer_Brief_v2.md       # Original brief
│   ├── MECP_Design_Plan.md              # This document
│   ├── protocol-spec.md                 # Standalone protocol specification
│   ├── code-table.md                    # Complete code table (auto-generated from language files)
│   ├── freetext-conventions.md          # Freetext pattern reference
│   └── translation-guide.md            # How to contribute a new language
├── spec/
│   └── mecp-protocol-v1.0.md           # Formal protocol specification (for implementors)
├── engine/
│   ├── package.json                     # Publishable as @mecp/engine on npm
│   ├── tsconfig.json
│   ├── src/
│   │   ├── encoder.ts
│   │   ├── decoder.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── tests/
│       ├── encoder.test.ts
│       ├── decoder.test.ts
│       └── edge-cases.test.ts
├── languages/
│   ├── en.json                          # Each language is a separate JSON file
│   ├── sk.json
│   ├── de.json
│   ├── ...
│   └── _template.json                  # Template for new language contributions
├── web/
│   ├── index.html                       # Self-contained web tool
│   ├── service-worker.js                # PWA offline support
│   └── manifest.json                    # PWA manifest
├── app/                                 # React Native mobile app (Phase 2)
│   ├── package.json
│   ├── src/
│   │   ├── mecp/                        # Shared MECP engine (symlinked or copied from engine/)
│   │   ├── transport/
│   │   │   ├── MeshTransport.ts         # Interface
│   │   │   ├── MeshtasticAdapter.ts
│   │   │   └── MeshCoreAdapter.ts
│   │   ├── storage/
│   │   │   └── MessageDatabase.ts       # SQLite message persistence
│   │   ├── screens/
│   │   └── components/
│   └── android/
│       └── app/src/main/java/.../       # AIDL native module
├── cards/
│   ├── generator/                       # Reference card PDF generator
│   └── output/                          # Generated PDFs per language pair
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── new_code_proposal.md         # Template for proposing new MECP codes
│   │   └── translation_review.md        # Template for translation review requests
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       ├── test-engine.yml              # CI: run MECP engine unit tests
│       ├── validate-languages.yml       # CI: validate language file schema
│       └── build-web.yml                # CI: build and deploy web tool to GitHub Pages
└── examples/
    ├── python/                          # Python encoder/decoder example
    │   └── mecp.py
    ├── arduino/                         # Arduino/ESP32 minimal decoder
    │   └── mecp_decoder.ino
    └── curl/                            # Shell script examples
        └── mecp_encode.sh
```

### GitHub Pages Deployment
- The `web/index.html` auto-deploys to GitHub Pages via CI
- Anyone can use the MECP encoder/decoder by visiting `https://<user>.github.io/MECP/`
- No installation, no build step, works immediately

### Community Adoption Features
- **Issue templates** for proposing new codes (requires: English text, rationale, category justification)
- **Translation template** (`_template.json`) with all keys, English values as placeholders, instructions
- **Translation guide** explaining context for each code (why "Fracture / immobile" not just "Fracture")
- **Examples in multiple languages** (Python, Arduino/ESP32, shell) so people can integrate MECP into their own tools without using the official app
- **The Arduino example is critical**: many Meshtastic users are tinkerers who flash their own firmware. A 50-line Arduino decoder means any device with a screen can render MECP codes locally.
- **Protocol spec as a standalone document** — anyone can implement MECP in any language from the spec alone, without reading the full developer brief

### Badges for README
```markdown
![Protocol Version](https://img.shields.io/badge/MECP-v1.0-blue)
![License: GPLv3](https://img.shields.io/badge/License-GPLv3-green)
![Protocol: CC0](https://img.shields.io/badge/Protocol-CC0%20Public%20Domain-lightgrey)
![Languages](https://img.shields.io/badge/Languages-10-orange)
```

---

## Part 6: Verification & Testing Plan

### Unit Tests (MECP Engine)
- All 14 existing test cases from brief Section 11.1
- D04 test corrected: `isDrill=false`
- New tests for: #tag extraction, @lang extraction, @HHMM extraction, ~callsign extraction
- New codes (X, H categories) in encode/decode roundtrip
- GPS with negative coordinates (southern/western hemispheres)
- Edge: message at exactly 200 bytes
- Edge: Unicode freetext (CJK, accented, RTL)
- Byte count (UTF-8 bytes, not characters)

### Web Tool Testing
- Compose flow completable in <10 seconds (stopwatch test)
- All 10 languages render correctly
- Offline mode: load once, airplane mode, full functionality
- Responsive: test at 375px, 768px, 1024px, 1440px widths
- Accessibility: screen reader compatibility, keyboard navigation, colorblind simulation
- Print: reference card renders correctly on A5

### Mobile App Testing (Phase 2)
- All integration tests from brief Section 11.2
- AIDL service binding on Samsung, Xiaomi, Huawei (background killing)
- BLE reconnection after deliberate disconnect
- Duty cycle tracking and queue priority
- Severity 0 alert: sound, vibration, pin, override silent mode
- Drill suppression: D01 present → no sound, no vibration, visual treatment
- GPS cold-fix timing display
- Deduplication of flood-routed messages

---

## Part 7: Key Insight Summary (Research-Backed)

1. **Social codes (L-category) are mission-critical, not a nice-to-have.** Every successful emergency system (GMDSS, ARES, Japan's 171) works because people use it daily. L-codes drive adoption that makes emergency codes work.

2. **Freetext is the failure mode.** Every system that achieved cross-language interop (NATO, GMDSS, ICAO) breaks down at the freetext boundary. MECP must visually mark freetext as untranslated.

3. **MECP is genuinely novel.** No cross-language structured protocol exists for LoRa mesh. First-mover advantage is real but requires community adoption as the bottleneck, not technology.

4. **The protocol is the product.** The web tool, the app, the reference card are all distribution channels. The code table — stable, append-only, human-verified translations — is the enduring value.

5. **eCall, GMDSS DSC, and Japan's Safety Tips app all validate the exact same pattern** MECP uses: pre-translated structured codes + variable data slots + severity classification. This is not experimental — it is the proven architecture for multilingual emergency communication.
