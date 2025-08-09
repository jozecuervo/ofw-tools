---
description: Guidance for building and improving Node.js CLI tools in this repo
applyTo: "**/*.js"
---

## Node.js CLI Patterns

- Parse/validate args; call pure functions to do work.
- `--help` exits 0; misuse prints usage to stderr and exits 1.
- stdout = data; stderr = diagnostics.
- For long tasks, print brief progress; stream large files.


