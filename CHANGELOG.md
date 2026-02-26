# Changelog

All notable changes to MECP will be documented in this file.

## [1.1.0] - 2026-02-27

### Added
- **B (Beacon) category** with 3 new codes: B01 (Automated distress beacon active), B02 (Beacon acknowledged), B03 (Cancel beacon — I am OK)
- Engine helpers: `isBeacon()`, `isBeaconAck()`, `isBeaconCancel()`
- Beacon system in mobile app: background GPS transmission with rate decay (5min → 15min → 30min), ACK loop, beacon status screen, received beacon cards in inbox
- Beacon service using expo-location foreground service for reliable background transmission
- Drill beacon support: D01+B01 auto-stops after 3 transmissions
- 14 new UI translation keys for beacon functionality across all 20 languages
- Beacon detection in Python, Arduino, and Shell reference implementations

### Protocol
- Code table now: **12 categories, 108 codes** (was 11 categories, 105 codes)
- New category B (Beacon) joins existing categories
- B01 messages carry GPS coordinates and timestamp, retransmitted at decaying intervals
- B02 acknowledges a beacon and reduces sender's transmission rate
- B03 cancels an active beacon

---

## [1.0.0] - 2026-02-25

### Added
- MECP protocol specification v1.0
- Complete code table: 11 categories, 105 codes
- MECP engine (TypeScript) with encoder, decoder, and full test suite
- Web encoder/decoder (PWA-enhanced single HTML file)
- Language files: 20 languages
- Language file template for contributors
- GitHub issue templates for code proposals and translation reviews
- Example implementations: Python, Arduino/ESP32, Shell
- Printable reference card support

### Protocol
- Categories: M (Medical), T (Terrain), W (Weather), S (Supplies), P (Position), C (Coordination), R (Response), D (Drill), L (Life/Leisure), X (Threat/Security), H (Have/Offer Resources)
- Severity levels: 0 (MAYDAY), 1 (URGENT), 2 (SAFETY), 3 (ROUTINE)
- Freetext conventions: GPS coordinates, person count (Npax), ETA, incident tags (#), language hints (@xx), timestamps (@HHMM), callsigns (~)
- Maximum message size: 200 bytes UTF-8
