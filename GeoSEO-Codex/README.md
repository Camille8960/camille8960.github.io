# GeoSEO-Codex

Separate Codex-built GEO/SEO monitor for Sunrise Expo.

This folder intentionally does not replace the existing `geo-seo/` dashboard or the existing `geo-seo/codex/` copy. It is meant to be uploaded to the GitHub Pages repository root as:

```text
GeoSEO-Codex/
```

Public URL after GitHub Pages updates:

```text
https://camille8960.github.io/GeoSEO-Codex/
```

## Real API Scan

The workflow expects these GitHub Actions secrets:

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
```

Optional repository variables:

```text
OPENAI_MODEL
ANTHROPIC_MODEL
```

If those variables are blank, the scanner falls back to `gpt-5` and `claude-sonnet-4-20250514`.

## Commands

```bash
npm test
npm run scan
npm run scan:mock
```

`npm run scan` is the real API scan. `npm run scan:mock` is only for local dashboard smoke testing and must not be treated as real measurement.
