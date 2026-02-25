# Contributing to MECP

Thank you for your interest in MECP. This project saves lives by enabling cross-language communication over mesh networks. Every contribution matters.

## How to Contribute

### Translations (Most Needed)

The highest-impact contribution is adding or verifying a language translation.

1. Copy `languages/_template.json` to `languages/XX.json` (ISO 639-1 code)
2. Translate every code and UI string
3. Use the English file (`languages/en.json`) as the reference for context on each code
4. Submit a pull request with the title: `lang: Add [Language Name] translation`
5. A native speaker must review before merge

**Warning:** Machine-translated emergency phrases are dangerous. "Fracture" mistranslated as "crack" in the wrong sense could cause real problems. Every translation must be verified by a native speaker who understands emergency/medical terminology.

### Proposing New Codes

MECP codes are permanent. A code once assigned never changes meaning. This is by design — a printed reference card from 2026 must still be valid in 2036.

1. Open an issue using the "New Code Proposal" template
2. Include: proposed code, English text, category, rationale
3. Community discussion period (minimum 7 days)
4. Codes are only appended, never renumbered or redefined

### Code Contributions

1. Fork the repository
2. Create a feature branch
3. Write tests for any engine changes
4. Ensure all existing tests pass
5. Submit a pull request

### Bug Reports

Use the "Bug Report" issue template. Include:
- What you expected to happen
- What actually happened
- The exact MECP string that caused the issue (if applicable)
- Your browser/device/OS

## Development Setup

```bash
# Engine development
cd engine
npm install
npm test

# Web tool
# Just open web/index.html in a browser. No build step needed.
```

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind. This is emergency infrastructure.

## License

- App code: GPLv3
- Protocol specification: CC0 (public domain)
- Language files: CC BY 4.0
