# MECP — Mesh Emergency Communication Protocol

**Cross-language emergency communication for LoRa mesh networks.**

MECP is a structured text encoding that lets people who share no common spoken language exchange meaningful information over bandwidth-constrained radio links. It works like a multilingual phrasebook that happens to be machine-parseable.

A user in Scotland composes a message by tapping through a menu in English. The app generates a compact ASCII string like `MECP/0/M01 M07 2pax P05 56.68,-5.02`. That string travels over LoRa mesh radio. A recipient in Slovakia sees each code rendered in Slovak. No internet. No translation API. Just a lookup table shipped with the app.

## Quick Start

**Web Tool** — Open `web/index.html` in any browser. No installation needed. Works offline.

**Decode a message:**
```
MECP/0/M01 M07 2pax P05 48.6520,20.1305
```
= MAYDAY: Injury, Fracture/immobile, 2 people, at GPS 48.6520, 20.1305

**Compose a message:** Severity > Category > Codes > Freetext > Copy

## Message Format

```
MECP/<severity>/<codes> [freetext]
```

| Severity | Label | Meaning |
|----------|-------|---------|
| 0 | MAYDAY | Life-threatening, immediate response |
| 1 | URGENT | Serious, hours matter |
| 2 | SAFETY | Hazard advisory |
| 3 | ROUTINE | Non-emergency |

## Code Categories

| Cat | Name | Example |
|-----|------|---------|
| M | Medical | M01 Injury, M07 Fracture |
| T | Terrain/Infrastructure | T04 Flooding, T07 Fire |
| W | Weather | W01 Storm approaching |
| S | Supplies | S01 Need water |
| P | Position/Movement | P05 At GPS coordinates |
| C | Coordination | C01 Send rescue |
| R | Response | R01 Acknowledged |
| D | Drill/Test | D01 This is a drill |
| L | Life/Leisure | L01 Beer, L04 Summit reached |
| X | Threat/Security | X01 Dangerous person nearby |
| H | Have/Offer Resources | H03 Have medical supplies |

See `spec/mecp-protocol-v1.0.md` for the complete code table.

## Examples

```
MECP/0/M01 M07 2pax P05 48.6520,20.1305   Emergency: injury + fracture, 2 people, GPS
MECP/2/T04 T01 P02 Poprad                   Warning: flooding, road blocked, evacuating
MECP/3/L01 L06 30min                         Social: beer, running late, 30 minutes
MECP/0/D01 M01 M07 2pax P05 48.65,20.13     Drill: realistic practice, no real response
MECP/2/H03 H07 5pax P05 48.65,20.13         Offering: medical supplies + shelter for 5
```

## Project Structure

```
engine/     TypeScript MECP encoder/decoder (npm package)
languages/  Translation files (JSON, one per language)
web/        Self-contained web encoder/decoder (single HTML file)
spec/       Formal protocol specification
examples/   Reference implementations (Python, Arduino, Shell)
docs/       Developer brief, design plan, guides
cards/      Printable reference card generator
```

## Why This Exists

LoRa mesh networks are growing across Europe. Communities operate nationally — Slovakia runs MeshCore, Scotland runs Meshtastic, German groups run both. These networks carry only plain text (max 228 characters). There is no translation layer and no standardized vocabulary.

The failure scenario: a traveller with a mesh device in a foreign country during a crisis. Mobile networks are down. No internet. No common language. The radio link exists but is useless.

Maritime radio solved this decades ago with GMDSS. MECP is the mesh equivalent.

## Why Social Codes?

Emergency-only protocols fail because nobody learns them until the emergency. GMDSS works because sailors use it daily. MECP includes social codes (`L01` Beer, `L04` Summit reached) so people learn the interface through daily use. When someone needs `MECP/0/M07 P05 48.6520,20.1305`, their thumbs already know the path.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The highest-impact contribution is adding a verified language translation.

## Licenses

| Component | License |
|-----------|---------|
| Protocol specification | CC0 1.0 (public domain) |
| App source code | GPLv3 |
| Language files | CC BY 4.0 |

The protocol is free forever. Anyone may implement MECP without restriction.
