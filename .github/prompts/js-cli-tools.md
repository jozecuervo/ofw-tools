---
description: Guidance for building and improving Node.js CLI tools in this repo
applyTo: "**/*.js"
---

## Node.js CLI Patterns

- Entry points should parse args, validate, then call pure functions.
- Print `--help` text with examples; exit 0. On misuse, print usage to stderr; exit 1.
- Keep stdout for data results and stderr for diagnostics.
- For long-running operations (PDF parsing), print succinct progress or counts.
- Use streaming where feasible for large files; avoid loading entire files into memory unless necessary.

### CLI Skeleton

```javascript
if (require.main === module) {
  try {
    const [, , ...argv] = process.argv;
    // parse argv...
    // run main...
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
```


