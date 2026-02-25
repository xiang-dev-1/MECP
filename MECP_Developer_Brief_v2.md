# MECP — Mesh Emergency Communication Protocol

## Complete Developer Brief & Implementation Guide

**Version 2.0 — February 2026**
**Classification: Open (CC0 1.0 Public Domain)**
**Target: Full-stack developer, zero prior mesh networking knowledge assumed**

---

## Table of Contents

1. [What This Project Is](#1-what-this-project-is)
2. [The Problem We're Solving](#2-the-problem-were-solving)
3. [Background: What You Need to Understand First](#3-background-what-you-need-to-understand-first)
4. [Protocol Specification](#4-protocol-specification)
5. [Complete Code Table](#5-complete-code-table)
6. [Parser Specification](#6-parser-specification)
7. [Architecture Overview](#7-architecture-overview)
8. [Phase 1: Web Encoder/Decoder](#8-phase-1-web-encoderdecoder)
9. [Phase 2: React Native Mobile App](#9-phase-2-react-native-mobile-app)
10. [Language Files](#10-language-files)
11. [Testing](#11-testing)
12. [Design Decisions Left to You](#12-design-decisions-left-to-you)
13. [Key Resources](#13-key-resources)
14. [Licensing & Governance](#14-licensing--governance)
15. [Glossary](#15-glossary)

---

## 1. What This Project Is

MECP is a structured text encoding for LoRa mesh networks that lets people who share no common spoken language exchange meaningful information — both emergency and everyday — over extremely bandwidth-constrained radio links.

Think of it as a multilingual phrasebook that happens to be machine-parseable. A user in Scotland composes a message by tapping through a menu in English. The app generates a compact ASCII string like `MECP/0/M01 M07 2pax P05 56.68,-5.02`. That string is transmitted over whatever mesh radio the user has. A recipient in Slovakia receives the string, and their app renders each code in Slovak. No internet. No translation API. No AI. Just a lookup table shipped with the app.

**The deliverables, in priority order:**

1. **A web-based encoder/decoder** — a single HTML page where anyone can compose and parse MECP messages. No installation, no hardware, no Bluetooth. Works today, on any device, over any transport (mesh, SMS, WhatsApp, paper). This is Phase 1 and should be built first.

2. **A React Native mobile app** — connects via Bluetooth to LoRa mesh radios (both Meshtastic and MeshCore platforms), provides a native send/receive UI with MECP built in. This is Phase 2 and is the larger engineering effort.

**Why the web tool comes first:** It lets people start using MECP immediately with zero hardware purchases. A hillwalking group can use MECP codes in a WhatsApp group today. A mesh community can adopt the codes using their existing apps and a printed reference card. The web tool validates the protocol and builds community before you invest months in Bluetooth debugging. The protocol is the product. Everything else is a distribution channel.

---

## 2. The Problem We're Solving

LoRa mesh networks are growing rapidly across Europe. Communities operate nationally: Slovakia runs MeshCore, Scotland runs Meshtastic, German and Austrian groups run both. These networks carry only plain text — maximum 228 characters per message. There is no translation layer, no standardised vocabulary, and no interoperability for cross-language communication.

**The failure scenario:** A traveller carrying a mesh device in a foreign country during a crisis. Mobile networks are down. No internet. No common language with local mesh operators. The radio link exists but is useless because neither party can understand the other.

Maritime radio solved this decades ago with GMDSS (Global Maritime Distress and Safety System) — standardised codes and phrases that work across all languages. MECP is the mesh equivalent.

**But here's the strategic insight that changes everything:** Emergency-only protocols fail in practice because nobody learns them until the emergency. Maritime GMDSS works because sailors use it daily for routine traffic — weather, coordination, logistics. The emergency codes work because the system is already muscle memory.

So MECP includes social and routine codes alongside emergency ones. `MECP/3/L01 L07 30min` means "beer, running late, 30 minutes." Same format, same parser, same cross-language rendering. People learn the interface through daily use on every hike and festival. When someone actually needs `MECP/0/M07 P05 48.6520,20.1305`, their thumbs already know the path.

---

## 3. Background: What You Need to Understand First

### 3.1 LoRa and Why It Matters

LoRa (Long Range) is a radio modulation technique operating on license-free frequencies: **868 MHz in Europe** (UK/EU), **915 MHz in North America**. It transmits small amounts of data over long distances — typically 2–15 km, up to 300+ km in ideal mountain-to-mountain conditions — at very low power (25 mW in EU, 1W in US).

The critical tradeoff: **extremely low bandwidth**. Maximum packet size is **256 bytes**. After encryption overhead, packet headers, routing metadata, and protobuf encoding, the usable text payload is approximately **228 characters** on Meshtastic. EU regulations impose a **1% duty cycle** — your device can transmit for a maximum of 36 seconds per hour.

This is not internet. This is not even SMS. Every byte counts. MECP is designed around this constraint.

### 3.2 What a Mesh Network Is

Devices relay messages for each other. If node A can't reach node C directly, it sends through node B. Messages hop through multiple nodes. No central server, no internet, no infrastructure required. The network is self-organising and self-healing.

### 3.3 The Two Platforms You Must Support

**Meshtastic** is the dominant platform (~46,000 Discord members, ~6,500 GitHub stars on firmware repo). Open source, GPLv3. Created by Kevin Hester in 2020. Every device relays by default (flood routing). Firmware runs on ESP32 and nRF52840 microcontrollers. Apps available for Android (Kotlin), iOS (Swift), web (TypeScript). Messages are plain UTF-8 text. Encryption is AES256-CTR per channel, with optional PKC for direct messages (X25519 key exchange, AES-CCM encryption since firmware 2.5).

Key integration points:
- **Protobuf definitions:** `github.com/meshtastic/protobufs` — defines all message types. `TEXT_MESSAGE_APP` (portnum 1) carries user text messages. MECP messages are standard text messages; the `MECP/` prefix is what distinguishes them.
- **TypeScript library:** `@meshtastic/js` in the `github.com/meshtastic/web` monorepo — the official JS/TS library for interacting with devices via BLE, serial, or Wi-Fi.
- **Android integration:** `github.com/meshtastic/Meshtastic-Android` exposes an `IMeshService` AIDL interface. A standalone app can bind to this service.
- **Python CLI:** `pip install meshtastic` — simplest way to prototype.
- **BLE service UUIDs:** Meshtastic devices advertise specific BLE service UUIDs that identify them as Meshtastic nodes.

**MeshCore** is newer (~3,500 Discord members). Created by Scott Powell (Australia) and Rastislav Vysoký (Slovakia). Open source core (MIT license), proprietary mobile apps. Only dedicated repeater nodes relay — client devices do not. Growing rapidly in Slovakia, UK, Germany.

Key integration points:
- **JavaScript library:** MeshCore provides a JS library for BLE interaction with companion radios. This is the primary integration path.
- **Python client:** Exists for command-line interaction.
- **Web client:** Exists and could be extended.
- **Licensing note:** Core library is MIT. Mobile apps are proprietary/closed-source. Direct BLE integration with companion radio firmware is open and unrestricted.
- **BLE service UUIDs:** Different from Meshtastic's — the app can identify which platform a device runs by scanning its advertised services.

**Critical fact:** The two platforms are **incompatible at the protocol level**. A Meshtastic device cannot communicate with a MeshCore device. They use different firmware, different packet formats, different routing strategies. They run on the same physical hardware (Heltec V3, LILYGO T-Beam, RAK4631, etc.) and the same frequencies, but different software.

**What this means for you:** Your app doesn't bridge the platforms. It connects to whichever device(s) the user has. If they have a Meshtastic radio, you talk to it via the Meshtastic BLE protocol. If they have MeshCore, you talk to it via MeshCore's BLE protocol. If they have both (two separate radios), you maintain two independent BLE connections. The MECP protocol layer above is platform-agnostic — it's just text.

### 3.4 The Hardware Users Have

You don't need to know the hardware deeply, but it helps to understand what users are pairing with:

| Device | Price | Key Feature | Notes |
|--------|-------|-------------|-------|
| Heltec V3/V4 | £20-30 | Cheapest entry point | No GPS, small OLED screen |
| LILYGO T-Beam | £30-40 | GPS + battery slot | Most popular outdoor device |
| LILYGO T-Deck | £50-60 | Keyboard + screen | Standalone, no phone needed |
| RAK4631 | £25-35 | Ultra-low power (nRF52840) | Best for always-on base stations |

All connect to phones via **Bluetooth Low Energy (BLE)**. Some support USB serial and Wi-Fi. Your app will primarily use BLE.

### 3.5 Why Smartphones Can't Be Mesh Radios

This comes up constantly from users. A smartphone has Wi-Fi, Bluetooth, cellular, NFC, and GPS — but **no LoRa radio**. LoRa requires a specific chip (Semtech SX1262 or SX1276) that no phone manufacturer includes. You can't solve this in software. The phone acts as the interface (screen, keyboard, GPS); the LoRa board does the radio transmission. The phone never touches the mesh directly.

Old smartphones are already recycled in this ecosystem as dedicated Meshtastic controllers — an old Android phone with a cracked screen and no SIM, paired via Bluetooth to a £20 board, is a perfectly functional mesh setup.

---

## 4. Protocol Specification

### 4.1 Message Format

Every MECP message is a single ASCII string:

```
MECP/<severity>/<codes> [freetext]
```

Components:
- **`MECP`** — fixed literal prefix. Case-sensitive. Identifies the message as MECP-encoded. Enables both human recognition and machine parsing.
- **`/`** — forward slash delimiter. Unambiguous in ASCII, present on all keyboards, visually parseable.
- **`<severity>`** — single digit 0–3. See section 4.2.
- **`<codes>`** — one or more category-code pairs (e.g., `M01`, `T04`, `L01`, `D01`). Space-separated. See section 5.
- **`[freetext]`** — optional. Anything after the last recognised code. May contain GPS coordinates, counts, names, untranslated notes. Display as-is without translation.

### 4.2 Severity Levels

| Level | Label | Definition | UI Colour |
|-------|-------|------------|-----------|
| 0 | MAYDAY | Life-threatening, immediate response required | Red (#DC2626) |
| 1 | URGENT | Serious, hours matter | Orange (#EA580C) |
| 2 | SAFETY | Hazard advisory to others | Yellow (#CA8A04) |
| 3 | ROUTINE | Non-emergency: coordination, social, logistics | Blue (#2563EB) |

**Design notes:**
- Severity 0 messages should trigger audible alerts (where hardware supports it), visual prominence, and should pin to the top of the message list until manually dismissed. **Exception:** if any D-category code (D01, D02) is present in the message, suppress all alerts regardless of severity. See section 5 (Category D).
- Severity labels are kept in English (MAYDAY, URGENT) alongside local translations because MAYDAY is internationally recognised. Never translate MAYDAY to a local equivalent alone.
- Future firmware integration could use severity 0 to trigger priority rebroadcast at the mesh routing level.

### 4.3 Freetext Conventions

The freetext portion is unstructured, but these patterns should be recognised by the parser:

| Pattern | Meaning | Example |
|---------|---------|---------|
| `[number]pax` | Casualty/person count | `3pax` = 3 people |
| `[lat],[lon]` | GPS coordinates (decimal degrees, no spaces) | `48.6520,20.1305` |
| Bare integer after `R03` | ETA in minutes | `R03 45` = ETA 45 minutes |
| Everything else | Place names, notes | `Poprad`, `near car park` |

GPS coordinates should be detected and rendered as tappable links or displayed on an offline map if available. Place names are never translated — Poprad is Poprad in every language.

### 4.4 Code Stacking

Multiple codes create compound meaning without grammar. Each code is rendered as a separate line in the user's language.

**Example 1:**
```
MECP/0/M01 M07 2pax P05 48.6520,20.1305
```
Renders as:
- Severity: **MAYDAY** 🔴
- Injury
- Fracture / immobile
- 2 people
- At GPS: 48.6520, 20.1305
- **Total: 46 bytes** (fits easily in a 228-byte LoRa packet)

**Example 2:**
```
MECP/2/T04 T01 P02 Poprad
```
Renders as:
- Severity: **SAFETY** 🟡
- Flooding
- Road blocked
- Evacuating toward: Poprad
- **Total: 29 bytes**

**Example 3:**
```
MECP/3/L01 L07 30min
```
Renders as:
- Severity: **ROUTINE** 🔵
- Beer
- Running late
- 30 minutes
- **Total: 21 bytes**

### 4.5 Maximum Message Size

MECP messages must not exceed **200 bytes** total. This leaves 28–56 bytes of margin within the LoRa packet limit (varies by platform) for encryption overhead and packet headers. The encoder should warn the user if freetext pushes the message beyond 200 bytes.

---

## 5. Complete Code Table

Each code consists of one uppercase letter (category) followed by two digits. Categories are mnemonic: M = Medical, T = Terrain, D = Drill, L = Life/Leisure. Numbering within categories is fixed permanently — a code once assigned never changes meaning. New codes may only be appended.

### Category M — Medical

| Code | English | Slovak |
|------|---------|--------|
| M01 | Injury | Zranenie |
| M02 | Unconscious person | Osoba v bezvedomí |
| M03 | Breathing difficulty | Ťažkosti s dýchaním |
| M04 | Cardiac event | Srdcové problémy |
| M05 | Hypothermia | Podchladenie |
| M06 | Severe bleeding | Silné krvácanie |
| M07 | Fracture / immobile | Zlomenina / imobilný |
| M08 | Burns | Popáleniny |
| M09 | Multiple casualties | Viacero zranených |
| M10 | Deceased | Mŕtvy |

### Category T — Terrain / Infrastructure

| Code | English | Slovak |
|------|---------|--------|
| T01 | Road blocked | Cesta zablokovaná |
| T02 | Bridge out | Zničený most |
| T03 | Building collapsed | Zrútená budova |
| T04 | Flooding | Záplavy |
| T05 | Landslide | Zosuv pôdy |
| T06 | Power out | Výpadok elektriny |
| T07 | Fire | Požiar |
| T08 | Avalanche | Lavína |
| T09 | Path impassable | Chodník nepriechodný |
| T10 | Shelter available | Úkryt k dispozícii |

### Category W — Weather / Environment

| Code | English | Slovak |
|------|---------|--------|
| W01 | Storm approaching | Blíži sa búrka |
| W02 | Visibility zero | Nulová viditeľnosť |
| W03 | Extreme cold | Extrémny mráz |
| W04 | Extreme heat | Extrémne teplo |
| W05 | Air quality danger | Nebezpečná kvalita vzduchu |

### Category S — Supplies

| Code | English | Slovak |
|------|---------|--------|
| S01 | Need water | Potreba vody |
| S02 | Need food | Potreba jedla |
| S03 | Need medication | Potreba liekov |
| S04 | Need battery / power | Potreba batérie / energie |
| S05 | Need fuel | Potreba paliva |
| S06 | Need tools / equipment | Potreba náradia |

### Category P — Position / Movement

| Code | English | Slovak |
|------|---------|--------|
| P01 | Stranded / stuck | Uviaznutý |
| P02 | Evacuating toward | Evakuácia smerom k |
| P03 | Sheltering in place | Ukrytý na mieste |
| P04 | En route to | Na ceste k |
| P05 | At GPS coordinates | Na GPS súradniciach |
| P06 | Lost | Stratený |
| P07 | Group separated | Skupina rozdelená |

### Category C — Coordination

| Code | English | Slovak |
|------|---------|--------|
| C01 | Send rescue | Pošlite záchranu |
| C02 | Need transport | Potreba transportu |
| C03 | Relay this message | Prepošli túto správu |
| C04 | Confirm received | Potvrďte prijatie |
| C05 | How many people | Koľko ľudí |
| C06 | What is status | Aký je stav |
| C07 | Can you reach | Dokážete dosiahnuť |
| C08 | Rendezvous at | Stretnutie na |

### Category R — Response

| Code | English | Slovak |
|------|---------|--------|
| R01 | Acknowledged | Potvrdené |
| R02 | Help coming | Pomoc prichádza |
| R03 | ETA [minutes] | Príchod o [minúty] |
| R04 | Cannot assist | Nemôžem pomôcť |
| R05 | Redirecting to | Presmerujem na |
| R06 | Stand by | Čakajte |

### Category D — Drill / Test

This category is **safety-critical infrastructure**, not a convenience feature. Without it, the first test of a MAYDAY message on a live mesh triggers panic across every MECP-equipped node in range. Maritime radio requires "THIS IS A DRILL" framing on all exercise traffic. NATO uses "EXERCISE EXERCISE EXERCISE" before simulated transmissions. MECP must have the same discipline built in.

**Parser behaviour:** When `D01` or `D02` appears **anywhere** in a message's code list, the entire message is treated as a drill. The app must: render all other codes normally (so the drill is realistic practice), wrap the entire message in a distinct visual treatment (dashed border, hatched background, or similar), display "DRILL" or "TEST" prominently in the severity banner alongside the severity level, and **suppress all audible alerts, vibration, and pinning** — even if severity is 0. The user practises reading a realistic MAYDAY. Nobody scrambles a rescue team.

`D04` exists because someone will inevitably send a real-looking MAYDAY while fumbling through the app for the first time. It's the "unsend" that mesh networks don't otherwise have.

| Code | English | Slovak |
|------|---------|--------|
| D01 | This is a drill | Toto je cvičenie |
| D02 | This is a test | Toto je test |
| D03 | End of drill | Koniec cvičenia |
| D04 | Ignore previous — sent in error | Ignorujte predošlé — odoslané omylom |

**Example drill messages:**
```
MECP/0/D01 M01 M07 2pax P05 48.6520,20.1305
```
Renders as a full MAYDAY with all medical codes expanded — but wrapped in a DRILL banner, silent, visually distinct. Realistic practice. No real response needed.

```
MECP/3/D04
```
"Ignore previous — sent in error." Broadcast immediately when someone accidentally sends a live message they didn't intend to. Severity 3 (routine) because the correction itself is not an emergency.

### Category L — Life / Leisure / Social

This category exists to drive daily adoption. People learn the protocol through routine use, making emergency codes second nature.

| Code | English | Slovak |
|------|---------|--------|
| L01 | Beer / drinks | Pivo / nápoje |
| L02 | Coffee | Káva |
| L03 | Food ready | Jedlo hotové |
| L04 | Summit reached | Na vrchole |
| L05 | At camp | V tábore |
| L06 | Running late | Meškám |
| L07 | Good signal here | Dobrý signál tu |
| L08 | Photo opportunity | Miesto na fotku |
| L09 | Wildlife spotted | Zver spozorovaná |
| L10 | Beautiful view | Krásny výhľad |
| L11 | Trail conditions good | Dobré podmienky na trase |
| L12 | Trail conditions bad | Zlé podmienky na trase |
| L13 | Need a break | Potrebujem pauzu |
| L14 | Heading home | Idem domov |
| L15 | Good morning / check-in | Dobré ráno / prihlásenie |
| L16 | Good night | Dobrú noc |
| L17 | Thank you | Ďakujem |
| L18 | Having fun | Zábava |
| L19 | Festival / event here | Festival / udalosť tu |
| L20 | Node test / ping | Test uzla / ping |

**Example social messages:**
```
MECP/3/L01 L06 30min           → "Beer. Running late. 30 minutes."
MECP/3/L04 P05 56.95,-4.98     → "Summit reached. At GPS coordinates."
MECP/3/L15                      → "Good morning / check-in."
MECP/3/L20                      → "Node test / ping."
```

---

## 6. Parser Specification

### 6.1 Decoding Algorithm

```
1. Check if message starts with "MECP/" (case-sensitive, exact match).
   If not → pass through as normal message. Stop.

2. Extract severity: character at index 5.
   Must be 0, 1, 2, or 3.
   If not → mark as parse-warning, set severity to null, continue.

3. Check character at index 6 is "/".
   If not → parse-warning, attempt to continue.

4. Extract everything from index 7 onward. This is the codes+freetext block.

5. Tokenise by spaces. For each token, in order:
   a. Check if it matches regex: ^[A-Z][0-9]{2}$
      If yes → it is a code. Add to codes array.
      If no → this token begins the freetext. Everything from here
              onward (including this token) is freetext. Stop scanning.

6. Within freetext, extract structured patterns:
   a. /(\d+)pax/  → casualty/person count
   b. /(-?\d+\.\d+),(-?\d+\.\d+)/ → GPS coordinates (lat, lon)
   c. Bare integer immediately following an R03 code → ETA minutes

7. Look up each code in the active language file.
   If code not found → display "Unknown code: [code]"
   Never silently drop unknown codes.

8. Return parsed object:
   {
     valid: boolean,
     severity: 0|1|2|3|null,
     codes: ["M01", "M07", ...],
     isDrill: boolean,       // true if ANY D-category code (D01, D02) present
     freetext: "string or null",
     extracted: {
       count: number|null,
       gps: { lat: number, lon: number }|null,
       eta: number|null
     },
     warnings: ["string", ...]
   }
```

**Drill detection rule:** After step 7, scan the codes array. If any code starts with "D" and is `D01` or `D02`, set `isDrill = true`. The UI layer uses this flag to suppress alerts and apply drill visual treatment. `D03` and `D04` are informational codes and do not set `isDrill` — `D03` marks end of a drill sequence, and `D04` is a retraction of a previous message, neither of which should suppress the alert system of the message they appear in.
```

### 6.2 Encoding Algorithm

```
1. Concatenate: "MECP/" + severity + "/" + codes.join(" ")
2. If freetext exists: append " " + freetext
3. Trim trailing whitespace
4. Validate total byte length (UTF-8) ≤ 200
   If exceeded → warn user to shorten freetext
5. Return the string
```

### 6.3 Edge Cases to Handle Gracefully

| Input | Expected Behaviour |
|-------|-------------------|
| `MECP/0/M01 M07 2pax P05 48.6520,20.1305` | Full parse, all fields extracted |
| `MECP/0/M01` | Valid, single code, no freetext |
| `MECP/5/X99` | Parse-warning (invalid severity), unknown code displayed |
| `Hello everyone` | Not MECP, pass through as normal message |
| `MECP/0/` | Severity 0, no codes, display as partial MECP with warning |
| `mecp/0/M01` | Not MECP (case-sensitive). Pass through. |
| `MECP/1/M09 12pax T03 T07` | Count (12) extracted; note that codes can appear after freetext-like tokens if they follow a recognisable pattern — but per the algorithm, once a non-code token is hit, everything is freetext. So this needs special handling: `12pax` matches the count pattern but is not a code. `T03` and `T07` after it are ambiguous. **Decision:** strict left-to-right parsing. `12pax` triggers freetext mode. `T03 T07` become part of freetext. If the user wants all three codes parsed, they should put codes before freetext: `MECP/1/M09 T03 T07 12pax`. Document this in the app's compose screen. |
| `MECP/0/M01 M07 P05 48.6520,20.1305 near the bridge 2pax` | Codes: M01, M07, P05. Freetext: "48.6520,20.1305 near the bridge 2pax". GPS and count extracted from freetext. |

**Principle:** Never silently discard a message. If parsing fails, show the raw message with a note explaining the partial parse. A garbled MECP message is still more useful than a dropped one.

---

## 7. Architecture Overview

### 7.1 Conceptual Model

MECP is **not** a mesh platform. It is a text encoding that rides on top of any text transport. The architecture has three independent layers:

```
┌─────────────────────────────────────────────────────┐
│                    USER INTERFACE                     │
│  Language selector, phrase menu, compose, display     │
├─────────────────────────────────────────────────────┤
│                    MECP ENGINE                        │
│  Encoder, decoder, language file loader               │
│  Pure logic. No platform dependencies. No I/O.        │
├─────────────────────────────────────────────────────┤
│                 TRANSPORT ADAPTERS                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Meshtastic  │  │   MeshCore   │  │  Clipboard  │ │
│  │  BLE Adapter │  │  BLE Adapter │  │  (web tool) │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

The MECP engine is identical across all targets — web, Android, iOS. It is a pure function: strings in, structured data out. The transport adapters are where platform-specific code lives. The clipboard adapter (for the web tool) is trivially simple: the user copies the MECP string and pastes it into whatever app they're already using.

### 7.2 Why This Separation Matters

When you encounter a bug, this architecture tells you immediately where to look. If MECP codes render incorrectly across languages, the bug is in the MECP engine or language files. If messages fail to send on Android but work on iOS, the bug is in a BLE adapter. If the compose flow is confusing, it's UI. No layer depends on another's internals.

---

## 8. Phase 1: Web Encoder/Decoder

### 8.1 What to Build

A single HTML file (self-contained, no build step, no server, no dependencies) that provides:

1. **Language selector** — dropdown or flag buttons. Changes all UI text and code translations.
2. **Compose mode** — guided flow: pick severity → pick category → pick codes → add freetext/GPS → preview → copy to clipboard.
3. **Decode mode** — paste any text string → if it starts with `MECP/`, parse and render it in the selected language with structured display. If not, show "Not an MECP message."
4. **Reference card view** — display the full code table in two languages side by side (user picks both), formatted for printing on A5 double-sided.

### 8.2 Tech Stack

Plain HTML + CSS + vanilla JavaScript. No React, no bundler, no npm. The entire thing must work by opening the HTML file from a USB stick with no internet. This is a tool for emergencies — it must be maximally portable.

The language files are embedded as JavaScript objects inside the HTML file, or loaded from adjacent JSON files. If self-contained (single file), embed them. Total language data is under 200 KB for all languages — trivially embeddable.

### 8.3 UX Priorities

- The compose flow must be completable in **under 10 seconds** by a first-time user with no training. Big buttons. Obvious flow. No text input required for a standard emergency message.
- Colour-code everything by severity. Red/orange/yellow/blue, consistently, everywhere.
- Category icons must be universally recognisable without text: ✚ medical, ▲ terrain, ☁ weather, 📦 supplies, 📍 position, ↔ coordination, ✓ response, ⚠ drill/test, 🍺 life/leisure.
- The generated MECP string should be displayed in a monospace font with a prominent "Copy" button.
- The decode view should accept pasted text and also show a text input where someone can type a received MECP string character by character (useful when someone is reading it aloud from a radio screen).

### 8.4 Offline Map Integration (Optional)

If you want to display GPS coordinates on a map without internet, you have options:
- Link to OpenStreetMap with coordinates (works if user has internet later)
- Display raw coordinates prominently with a "Copy coordinates" button
- Do NOT bundle map tiles in the web tool — keep it lightweight

### 8.5 Deliverable

One HTML file. Works in any browser. Works offline. Under 1 MB total. A developer can build this in a weekend.

---

## 9. Phase 2: React Native Mobile App

### 9.1 Why React Native

The Meshtastic ecosystem has an official TypeScript client library (`@meshtastic/js`) that handles protobuf encoding/decoding and BLE communication. MeshCore's companion library is also JavaScript. Using React Native means you pull from both ecosystems natively rather than porting them to Dart or Kotlin. Single codebase produces both Android and iOS builds. The BLE layer uses `react-native-ble-plx`, the most mature React Native BLE library.

### 9.2 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + TypeScript |
| BLE | react-native-ble-plx |
| Meshtastic protocol | @meshtastic/js (protobuf encoding, BLE service interaction) |
| MeshCore protocol | MeshCore JS library (BLE companion radio protocol) |
| MECP engine | Pure TypeScript module (shared with web tool) |
| State management | React Context or Zustand (keep it simple) |
| Navigation | React Navigation |
| Language files | JSON, bundled as assets |

### 9.3 BLE Architecture

**This is where 40% of your debugging time will go.** BLE on mobile is notoriously inconsistent.

```
┌─────────────────────────────────────────────┐
│              BLE Connection Manager          │
│  Scan → Identify → Connect → Maintain       │
├──────────────────┬──────────────────────────┤
│ Meshtastic BLE   │  MeshCore BLE            │
│ Service Handler  │  Service Handler         │
│                  │                           │
│ - Identifies by  │  - Identifies by          │
│   service UUID   │    service UUID           │
│ - Speaks protobuf│  - Speaks MeshCore        │
│ - Uses @mesh/js  │    companion protocol     │
│ - TEXT_MESSAGE_APP│  - Text message API       │
│   portnum 1      │                           │
└──────────────────┴──────────────────────────┘
```

Key BLE challenges you will face:
- **Android background restrictions:** Different manufacturers (Samsung, Xiaomi, Huawei) kill background BLE connections differently. You need to handle reconnection gracefully.
- **iOS background BLE:** Apple allows BLE background operation but with strict limitations. The app can receive data in background but UI updates are deferred.
- **Connection stability:** BLE connections drop. Frequently. Your app must handle disconnection and automatic reconnection without user intervention.
- **Simultaneous connections:** For dual-platform support (user has both Meshtastic and MeshCore radios), you maintain two independent BLE connections. This works but doubles the connection management complexity.

**Recommendation:** Get single-platform BLE working reliably on Android before adding MeshCore or iOS. The Meshtastic BLE protocol is better documented and more stable.

### 9.4 Platform Abstraction Layer

Define a TypeScript interface that both adapters implement:

```typescript
interface MeshTransport {
  platform: 'meshtastic' | 'meshcore';
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  sendText(message: string, channel?: number): Promise<boolean>;
  onMessageReceived(callback: (msg: IncomingMessage) => void): void;
  onConnectionStateChanged(callback: (state: ConnectionState) => void): void;
  getDeviceInfo(): Promise<DeviceInfo>;
  isConnected(): boolean;
}

interface IncomingMessage {
  text: string;
  from: string;        // node ID or name
  timestamp: number;
  channel: number;
  rssi?: number;       // signal strength
  snr?: number;        // signal quality
}
```

The MECP engine and entire UI only interact with this interface. They never know whether they're talking to Meshtastic or MeshCore.

### 9.5 User Interface Flow

**First launch:**
1. Language selection — full screen of flag buttons. No text required to navigate (because the user might not read any of the available languages yet). Pick a flag, everything renders in that language.
2. Bluetooth scan — app scans for nearby BLE devices. Identifies each as Meshtastic or MeshCore by service UUID. Displays device names with a small badge (M for Meshtastic, MC for MeshCore). Tap to connect.

**Main screen:**
- Message feed showing all incoming messages.
- Normal text messages appear as-is (plain text bubbles).
- MECP messages are detected by `MECP/` prefix and rendered as structured cards: colour-coded severity banner, each code expanded into user's language, GPS coordinates tappable, casualty counts prominent.
- Non-MECP and MECP coexist in the same feed.

**Compose screen (the critical UX):**
1. **Severity** — four large buttons filling the screen. Red: MAYDAY. Orange: URGENT. Yellow: SAFETY. Blue: ROUTINE. One tap.
2. **Category** — nine buttons with icons. Medical ✚, Terrain ▲, Weather ☁, Supplies 📦, Position 📍, Coordination ↔, Response ✓, Drill ⚠, Life 🍺. One tap. **Note:** When Drill is selected, the compose screen should pre-insert `D01` or `D02` as the first code and visually remind the user that this message will be marked as non-real.
3. **Codes** — list of codes within the chosen category, displayed in user's language. Checkboxes for multi-select. "Done" button at bottom.
4. **Freetext & GPS** — optional screen. Text input field. "Attach GPS" button inserts current coordinates. "Add count" button inserts `[number]pax`.
5. **Preview & Send** — shows the human-readable version in user's language AND the raw MECP string. Confirm to send. The raw MECP string is what gets transmitted.

**Total flow: 4–5 taps for a standard message. Under 10 seconds. Test this. If it takes longer, simplify.**

**For severity 0 (MAYDAY) incoming messages:**
- Audible alert tone (if device supports it)
- Visual: red full-width banner, larger text
- Pin to top of message list until manually dismissed
- Vibration pattern distinct from normal notifications
- **All of the above suppressed if `isDrill` is true.** Instead: display with dashed border, "DRILL" label in the banner alongside "MAYDAY", no sound, no vibration, no pinning. The message content renders identically so the drill is realistic — only the alert behaviour changes.

### 9.6 Connection Status

Always visible. A small indicator showing:
- Which device(s) are connected
- Platform type (Meshtastic/MeshCore badge)
- Signal quality if available
- Battery level of connected radio if available

When disconnected, show clearly. Offer one-tap reconnect. Never let the user compose a message they can't send — if no device is connected and no clipboard fallback is available, disable the send button and show why.

---

## 10. Language Files

### 10.1 Structure

```json
{
  "language": "sk",
  "language_name": "Slovenčina",
  "language_name_en": "Slovak",
  "flag_emoji": "🇸🇰",
  "severities": {
    "0": { "local": "MAYDAY", "label": "MAYDAY" },
    "1": { "local": "NALIEHAVÉ", "label": "URGENT / NALIEHAVÉ" },
    "2": { "local": "BEZPEČNOSŤ", "label": "SAFETY / BEZPEČNOSŤ" },
    "3": { "local": "BEŽNÉ", "label": "ROUTINE / BEŽNÉ" }
  },
  "categories": {
    "M": { "name": "Zdravotné", "icon": "medical" },
    "T": { "name": "Terén / Infraštruktúra", "icon": "terrain" },
    "W": { "name": "Počasie", "icon": "weather" },
    "S": { "name": "Zásoby", "icon": "supplies" },
    "P": { "name": "Pozícia / Pohyb", "icon": "position" },
    "C": { "name": "Koordinácia", "icon": "coordination" },
    "R": { "name": "Odpoveď", "icon": "response" },
    "D": { "name": "Cvičenie / Test", "icon": "drill" },
    "L": { "name": "Život / Voľný čas", "icon": "leisure" }
  },
  "codes": {
    "M01": "Zranenie",
    "M02": "Osoba v bezvedomí",
    "M03": "Ťažkosti s dýchaním",
    "D01": "Toto je cvičenie",
    "D02": "Toto je test",
    "D03": "Koniec cvičenia",
    "D04": "Ignorujte predošlé — odoslané omylom",
    "...": "..."
  },
  "ui": {
    "send": "Odoslať",
    "cancel": "Zrušiť",
    "attach_gps": "Priložiť GPS",
    "add_count": "Pridať počet",
    "preview": "Náhľad",
    "copy": "Kopírovať",
    "paste_decode": "Vložiť a dekódovať",
    "severity_select": "Vyberte závažnosť",
    "category_select": "Vyberte kategóriu",
    "code_select": "Vyberte kódy",
    "freetext_placeholder": "Voliteľný text...",
    "parse_failed": "MECP správa — nepodarilo sa úplne spracovať",
    "unknown_code": "Neznámy kód",
    "message_too_long": "Správa presahuje 200 bajtov",
    "not_connected": "Žiadne pripojené zariadenie",
    "connecting": "Pripájanie...",
    "connected_to": "Pripojené k",
    "scan_devices": "Hľadať zariadenia"
  }
}
```

### 10.2 Priority Languages for v1.0

English, Slovak, German, Polish, Czech, French, Italian, Spanish, Norwegian, Ukrainian, Turkish, Dutch, Hungarian, Romanian, Croatian, Swedish, Danish, Finnish, Portuguese, Greek, Bulgarian, Slovenian.

This covers all countries with active mesh communities plus likely expansion areas. Total size: estimated under 200 KB for all languages.

### 10.3 Translation Quality Warning

**Machine-translated emergency phrases are dangerous.** "Fracture" mistranslated as "crack" in the wrong sense could cause real problems in a medical emergency. Every language file must be verified by a native speaker with understanding of the domain. For the initial release, ship only languages that have been human-verified. Mark unverified languages clearly in the UI.

Community contributions to translations should be structured via a public GitHub repository with pull request review by native speakers. Consider using Crowdin or similar translation management platforms.

---

## 11. Testing

### 11.1 MECP Engine Unit Tests

These must all pass before any UI or transport work begins:

```
TEST: "MECP/0/M01 M07 2pax P05 48.6520,20.1305"
  → severity=0, codes=[M01,M07,P05], count=2, gps=(48.6520,20.1305)

TEST: "MECP/2/T04 T01 P02 Poprad"
  → severity=2, codes=[T04,T01,P02], freetext="Poprad"

TEST: "MECP/3/R01 R03 45"
  → severity=3, codes=[R01,R03], eta=45

TEST: "MECP/1/M09 T03 T07 12pax"
  → severity=1, codes=[M09,T03,T07], count=12

TEST: "MECP/3/L01 L06 30min"
  → severity=3, codes=[L01,L06], freetext="30min"

TEST: "MECP/0/M01"
  → severity=0, codes=[M01], no freetext

TEST: "MECP/0/D01 M01 M07 2pax P05 48.6520,20.1305"
  → severity=0, codes=[D01,M01,M07,P05], count=2, gps=(48.6520,20.1305)
  → isDrill=true (D01 present), suppress all alerts

TEST: "MECP/3/D04"
  → severity=3, codes=[D04], isDrill=true, no freetext
  → renders as "Ignore previous — sent in error"

TEST: "MECP/0/D02 M09 12pax T03"
  → severity=0, codes=[D02,M09,T03], count=12, isDrill=true
  → full MAYDAY parse but no audible/visual alert escalation

TEST: "MECP/5/X99"
  → parse-warning (invalid severity), unknown code X99

TEST: "Hello everyone"
  → not MECP, pass through

TEST: "MECP/0/"
  → severity=0, no codes, partial parse warning

TEST: "mecp/0/M01"
  → not MECP (case-sensitive), pass through

TEST: "MECP/0/M01 M07 P05 -33.8688,151.2093 3pax near harbour"
  → severity=0, codes=[M01,M07,P05], gps=(-33.8688,151.2093),
    count=3, freetext includes "near harbour"

TEST: encode(severity=0, codes=["M01","M07"], freetext="2pax P05 48.6520,20.1305")
  → "MECP/0/M01 M07 2pax P05 48.6520,20.1305"

TEST: encode with freetext exceeding 200 bytes total
  → warning returned, message not sent

TEST: Language rendering — parse "MECP/0/M01" with language "sk"
  → codes[0].localised = "Zranenie"

TEST: Language rendering — parse "MECP/0/M01" with language "en"
  → codes[0].localised = "Injury"
```

### 11.2 Integration Tests (Phase 2 only)

- Send MECP from app → receive on standard Meshtastic app. Verify raw string is readable as plain text.
- Send MECP between two MECP-equipped devices in different languages. Verify each renders codes in own language.
- Test with MeshCore companion radio. Verify string survives MeshCore packet format.
- GPS coordinate extraction on devices with and without GPS.
- Severity 0 alert behaviour: audio, visual prominence, pinning.
- Severity 0 with D01 present: verify all alerts suppressed, drill visual treatment applied, message content still renders fully.
- D04 (sent in error): verify renders correctly as a retraction notice.
- Duty cycle: send 20 MECP messages rapidly. Verify rate limiting prevents regulatory violation.
- BLE disconnection during send. Verify message is queued and sent on reconnection.
- BLE disconnection during receive. Verify missed messages are retrieved on reconnection (if platform supports store-and-forward).

---

## 12. Design Decisions Left to You

These are deliberately unresolved. Each has tradeoffs and you are closer to the implementation than the protocol designer.

### 12.1 App vs Plugin

A standalone app means full control over UX but requires reimplementing BLE connectivity. A plugin to the existing Meshtastic/MeshCore apps means lighter development but dependency on upstream acceptance and plugin architectures that may not exist yet. **Recommendation:** Start standalone. The existing Meshtastic Android app exposes an AIDL service you can bind to, which gives you messaging capability without reimplementing the full BLE stack. Investigate this path early — if it works, it dramatically reduces Phase 2 scope.

### 12.2 MECP Messages in Main Feed vs Separate View

Should MECP messages appear inline with normal chat, or in a dedicated tab? Inline ensures visibility but adds noise. Separate is cleaner but risks messages being missed. **Recommendation:** Inline by default, with a filter toggle to show only MECP messages.

### 12.3 Offline Maps

GPS coordinate extraction is straightforward. Displaying them on a map without internet requires bundling offline tiles or integrating with an external offline map app. Options:
- Ship without maps, display raw coordinates with copy button (simplest)
- Offer optional tile pack downloads (significant app size increase)
- Launch coordinates in OsmAnd or similar via intent (if installed)
- Use pre-cached low-zoom-level tiles for approximate positioning (compromise)

### 12.4 Audio Alerts

Phones can beep. T-Decks have buzzers. Heltec boards do not. Alert behaviour must degrade gracefully. The app should handle its own alerts; don't depend on the radio hardware.

### 12.5 Version Negotiation

If the code table is extended in a future version, a receiver may encounter unknown codes. The current design handles this (display "Unknown code"). **Recommendation:** Do not add version identifiers to the message format. Keep it minimal. Unknown codes are self-documenting. If a major structural change is ever needed, the prefix could change (e.g., `MECP2/`).

### 12.6 What Happens When You Hit a Wall

You will encounter situations not covered in this brief. When making decisions:
- **Prioritise the emergency use case.** If a design choice makes daily use slightly less convenient but makes emergency use more reliable, choose reliability.
- **Prioritise graceful degradation.** Every feature should work partially rather than fail completely. No GPS? Display coordinates as text. No BLE? Offer clipboard mode. Can't parse a code? Show the raw string.
- **Prioritise simplicity.** Every feature you add is a feature that can break during an emergency. The person using this is cold, scared, possibly injured, on a cracked phone screen with shaking hands. Less is more.

---

## 13. Key Resources

### 13.1 Meshtastic Ecosystem

| Resource | URL | Why You Need It |
|----------|-----|-----------------|
| Firmware source | github.com/meshtastic/firmware | Understanding message flow — read `src/mesh/MeshService.cpp` and `src/mesh/Router.cpp` |
| Protobuf definitions | github.com/meshtastic/protobufs | Canonical message formats. `portnums.proto` defines TEXT_MESSAGE_APP. `mesh.proto` defines MeshPacket. |
| Android app | github.com/meshtastic/Meshtastic-Android | Reference BLE implementation in Kotlin. Study the AIDL service binding. |
| Web client / JS library | github.com/meshtastic/web | `@meshtastic/js` package — official TypeScript library for device interaction. |
| Apple app | github.com/meshtastic/Meshtastic-Apple | Reference BLE implementation in Swift. |
| Python CLI | `pip install meshtastic` | Fastest prototyping path. `sendText()` and `onReceive()` patterns. |
| Encryption docs | meshtastic.org/docs/overview/encryption/ | Understand how messages are encrypted. MECP rides on top of this. |
| Web flasher | flasher.meshtastic.org | For flashing test devices during development. |

### 13.2 MeshCore Ecosystem

| Resource | URL | Why You Need It |
|----------|-----|-----------------|
| Core library | github.com/ripplebiz/MeshCore | C++ core. MIT licensed. |
| Community hub | meshcore.co.uk | Flasher, map, community resources. |
| Slovak community | mesh.om3kff.sk | Active MeshCore community with published network settings. |

### 13.3 General

| Resource | Why You Need It |
|----------|-----------------|
| ETSI EN 300 220 | EU 868 MHz regulatory standard. Understand duty cycle before designing retry/queue logic. |
| react-native-ble-plx docs | Your BLE library. Read the entire README before writing code. |
| Meshtastic Discord (~46k members) | Community support. discord.com/invite/meshtastic |
| r/meshtastic (~100k subscribers) | Broader community, good for discovering edge cases. |

---

## 14. Licensing & Governance

| Component | License | Rationale |
|-----------|---------|-----------|
| Protocol specification (this document) | CC0 1.0 (public domain) | Anyone may implement MECP without restriction. The protocol must remain free forever. |
| App source code | Recommend GPLv3 | Aligns with Meshtastic's licensing. Ensures improvements are shared. MIT acceptable if MeshCore compatibility is prioritised. |
| Language files | CC BY 4.0 | Allow use, translation, redistribution with attribution. Encourage community contributions. |

**Code table governance:** New codes may only be appended, never renumbered or redefined. A code once assigned retains its meaning permanently. A printed card from 2026 must still be valid in 2036. Propose new codes via public GitHub repository with community review.

---

## 15. Glossary

| Term | Definition |
|------|-----------|
| **BLE** | Bluetooth Low Energy. Wireless protocol connecting phones to LoRa radios. |
| **Companion radio** | MeshCore term for a client device that connects to a phone via BLE. Does not relay traffic. |
| **Duty cycle** | Percentage of time a device may transmit. 1% in EU868 = max 36 seconds per hour. |
| **ESP32** | Low-cost microcontroller (Espressif Systems). Used in Heltec and LILYGO boards. |
| **Flood routing** | Meshtastic's approach: every node rebroadcasts every message (up to hop limit). Simple but generates traffic. |
| **GMDSS** | Global Maritime Distress and Safety System. The maritime protocol that inspired MECP. |
| **LoRa** | Long Range radio modulation. Low bandwidth, long distance, sub-GHz frequencies. |
| **MQTT** | Message Queuing Telemetry Transport. Bridges mesh data to internet servers. Optional. |
| **nRF52840** | Nordic Semiconductor microcontroller. Lower power than ESP32. Used in RAK devices. |
| **Node** | Any device on the mesh network. |
| **Portnum** | Meshtastic's application port number. TEXT_MESSAGE_APP = portnum 1. |
| **Protobuf** | Protocol Buffers. Google's binary serialisation format used by Meshtastic. |
| **PSK** | Pre-Shared Key. Symmetric encryption key shared by all members of a Meshtastic channel. |
| **Repeater** | A node that relays messages to extend coverage. |
| **RSSI** | Received Signal Strength Indicator (dBm). How strong a received signal is. |
| **SNR** | Signal-to-Noise Ratio (dB). Signal quality relative to background noise. |
| **TOFU** | Trust On First Use. Key verification model — accept the first key seen, flag changes. Like SSH. |
| **USB OTG** | USB On-The-Go. Allows a phone to host USB devices like LoRa boards via cable. |

---

## Appendix A: Suggested Development Roadmap

| Phase | Deliverable | Estimated Effort | Detail |
|-------|------------|-----------------|--------|
| 1 | MECP engine (TypeScript) | 1–2 days | Pure encoder/decoder + unit tests. Publish as npm package. |
| 2 | Web encoder/decoder | 2–3 days | Single HTML file. Full compose/decode/reference card UI. |
| 3 | Language files (5 languages) | 1 week | en, sk, de, pl, cz. Human-verified. |
| 4 | Android app (Meshtastic only) | 4–6 weeks | React Native. BLE connection to Meshtastic. Full MECP UI. |
| 5 | MeshCore adapter | 2–3 weeks | Add MeshCore BLE support to existing app. |
| 6 | iOS build | 1–2 weeks | React Native cross-compilation. iOS-specific BLE tuning. |
| 7 | Language expansion | Ongoing | Community-driven. 24+ languages. |
| 8 | Printable reference cards | 1 week | A5 double-sided, per language pair. PDF generation. |

## Appendix B: Physical Reference Card

Produce a printable A5 double-sided card containing:
- **Front:** Complete code table in two languages (user picks pair, e.g., English/Slovak).
- **Back:** Message format with three examples, severity definitions, GPS format reminder.
- Design for readability in poor conditions: high contrast, minimum 9pt font.
- Distribute to mesh community operators as standard kit.
- The card ensures MECP works even without the app — a person with a standard Meshtastic text interface and a printed card can compose and read MECP messages by hand.

## Appendix C: Route to Community Adoption

This protocol has zero value without adoption. The technical build is the easy part. Here is the strategy for getting communities to actually use it:

1. **GitHub repository first.** Publish the spec, language files, and web tool. GitHub Discussions is the official Meshtastic community discussion venue.
2. **Meshtastic Discord (~46k members).** Frame as a problem, not a solution: "How do you communicate with foreign mesh operators in an emergency? Here's a draft protocol." Invite feedback.
3. **r/meshtastic (~100k subscribers).** Post framing the language barrier problem with the protocol as your proposed answer.
4. **Slovak ARES community (mesh.om3kff.sk).** They meet weekly, already use mesh for emergency coordination. Direct outreach in Slovak if possible.
5. **MeshCore community.** Rastislav Vysoký (Slovak developer) bridges both platform and language communities.
6. **YouTube mesh channels.** Send a laminated reference card and two-paragraph explanation to mesh YouTubers. If they demo it, that's worth more than any forum post.
7. **The demo video.** A two-minute screen recording of the app composing a MAYDAY message in English and receiving it rendered in Slovak will do more for adoption than any specification. Build the demo early.

---

*End of document. The protocol is CC0 public domain. Build freely.*
