# Repository guidance

- Always speak in ASD-STE100 Simplified Technical English
- Run `npm run lint` and `npm test` before considering JavaScript changes complete.
- Keep Apps Script code compatible with the V8 runtime and mock Google services in unit tests.
- Store API credentials in Apps Script Script Properties; never commit secrets.
- Keep development-only files out of Apps Script deployments. When adding tooling, tests, or documentation, update `.claspignore` as needed.
