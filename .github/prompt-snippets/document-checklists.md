---
description: Checklists for organizing divorce case documents and evidence
---

## Evidence & Documents Checklist

- OFW Messages Report (PDF) → parsed JSON/CSV in `output/` via `npm run ofw:analyze`
- OFW weekly stats summary (Markdown/CSV) for exhibits
- iMessage export (txt) → yearly JSON in `output/` via `npm run imessage`
- Visitation calendars (annotated) via `npm run visitation` and `npm run nth-week`
- Property worksheets via `npm run moore-marsden` and `npm run apportionment`
- Receipts/statements supporting Epstein reimbursements and Watts credits

## Per-Artifact Notes

- Name files with ISO dates, e.g., `OFW_Messages_Report_YYYY-MM-DD.pdf`
- Keep original exports in `source_files/` and derived outputs in `output/`
- Track date ranges covered by each artifact in a case log (Markdown table)


