# Changelog

All notable changes to MECP will be documented in this file.

## [1.0.0] - 2026-02-25

### Added
- MECP protocol specification v1.0
- Complete code table: 11 categories, 90+ codes
- MECP engine (TypeScript) with encoder, decoder, and full test suite
- Web encoder/decoder (PWA-enhanced single HTML file)
- Language files: English, Slovak
- Language file template for contributors
- GitHub issue templates for code proposals and translation reviews
- Example implementations: Python, Arduino/ESP32, Shell
- Printable reference card support

### Protocol
- Categories: M (Medical), T (Terrain), W (Weather), S (Supplies), P (Position), C (Coordination), R (Response), D (Drill), L (Life/Leisure), X (Threat/Security), H (Have/Offer Resources)
- Severity levels: 0 (MAYDAY), 1 (URGENT), 2 (SAFETY), 3 (ROUTINE)
- Freetext conventions: GPS coordinates, person count (Npax), ETA, incident tags (#), language hints (@xx), timestamps (@HHMM), callsigns (~)
- Maximum message size: 200 bytes UTF-8
