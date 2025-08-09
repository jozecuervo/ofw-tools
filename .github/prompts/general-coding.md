---
description: Guidelines for general code generation and best practices in this repo
applyTo: "**/*.{js,json,md}"
tools: ["jest"]
---

## General Coding Guidelines

- Write small, composable functions with clear names. Avoid side effects unless explicitly intended (e.g., CLI output, file writes).
- Prefer vanilla JavaScript and built-in Node APIs over additional dependencies.
- Validate and sanitize all external inputs (CLI args, file paths). Fail fast with helpful messages and non-zero exit codes.
- Use early returns and guard clauses for readability.
- Optimize for readability first; then measure before micro-optimizing hot paths.
- Handle large files/streams using Node streams or incremental parsing where possible to keep memory bounded.
- Log concise, actionable errors. When applicable, suggest the correct command usage.

### Examples

```javascript
/** Parse an integer CLI flag with default and validation */
function parseIntFlag(value, { name, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, defaultValue = undefined }) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid value for --${name}: ${value}`);
  }
  return parsed;
}
```

```javascript
/** Safe file read with clear failure */
const fs = require('fs');
function readJsonFileSync(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to read JSON at ${filePath}: ${err.message}`);
  }
}
```

### Style

- Use descriptive names: functions as verbs (e.g., `computeWeeklyStats`), values as nouns (e.g., `weeklyStats`).
- Avoid deep nesting; extract helpers.
- Keep modules focused; one responsibility per file when feasible.

### Testing

- Favor deterministic unit tests under `__tests__/` using Jest.
- Mock external libraries or filesystem where practical, especially for large PDFs or sentiment libraries.


