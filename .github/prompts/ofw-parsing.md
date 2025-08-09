---
description: Prompts for robust parsing and analysis of OFW PDFs and derived JSON
applyTo: ["index.js", "message-volume.js"]
---

## OFW Parsing and Analysis

- Support multiple OFW export layouts; detect by headers or structure.
- Strip headers/footers and artifacts; preserve message bodies faithfully.
- Derive weekly stats (counts, read times, word totals, sentiment) deterministically.
- Normalize names and handle pseudo-rows like "To:" carefully.
- For clusters: parameterize sender, threshold minutes, and minimum message count.

### Edge Cases to Cover

- Pages with wrapped metadata and values on next line.
- Missing read receipts; treat as nulls, not zeros.
- Non-ASCII characters and mixed encodings.
- Timezone consistency when aggregating by week.


