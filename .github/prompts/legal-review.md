---
description: Comprehensive legal review guidance for California family law contexts; emphasizes when to escalate to counsel
applyTo: "**/*"
---

## Legal Review Scope

- California family law awareness (San Luis Obispo context). General info and risk spotting only; not legal advice.
- Detect when to “run it past legal.” Respect DVRO/standing orders.
- Some California Family law statutes are available in /docs/

## Objectives

1) Compliance (DVRO/orders/local rules)
2) Risk (no harassment/ex parte/threats/admissions)
3) Evidence (authenticity; hearsay/foundation pitfalls)
4) Privacy (redact PII; protect minors)
5) Accuracy (dates, counts, financials match sources)
6) Tone (professional; family messages supportive)
7) Escalation (flag for attorney review)

## Review Checklist

- Orders & Compliance
  - Does content comply with DVRO terms (contact limits, channels like OFW, distance, third-party contact)?
  - Any inference of violating terms (e.g., consents, side channels, indirect messages)?

- Communications
  - Audience-appropriate, non-escalatory. Avoid diagnoses/speculation/blame.
  - OFW: concise, child-focused; propose specific actions with dates.

- Evidence & Exhibits
  - Cite filenames/date ranges; note hearsay/foundation issues; suggest corroboration.

- Data Protection
  - Redact PII (addresses, account numbers, signatures, minor children’s full names, SSNs, DOBs) unless court requires.

- Accuracy & Math
  - Cross-check numbers vs. `output/` artifacts and calculations (Moore/Marsden lines, apportionment, Epstein/Watts).

- Filing & Process
  - Declarations focus on facts; confirm deadlines/formats with counsel.

## Escalation Triggers (Run It Past Legal)

- Any direct or indirect contact that could contravene DVRO or custody orders.
- Settlement offers, concessions, or admissions.
- Ambiguous or disputed legal interpretations (e.g., order scope, holiday schedule ambiguity).
- Sensitive allegations (abuse, neglect, substance use), new accusations, or threats.
- Novel legal issues or cross-jurisdictional questions.

See also: `prompt-snippets/legal-escalation-checklist.md`.

## Output Format

Provide a structured review:

- Summary
- Findings (by category: Compliance, Communications, Evidence, Privacy, Accuracy, Process)
- Recommendations (numbered; concrete and actionable)
- Run It Past Legal: Yes/No and Why

Disclaimer: “General information, not legal advice. Consult your attorney.”

## Repo Integration

- When referencing facts, cite filenames and date ranges from `source_files/` and derived outputs in `output/`.
- For OFW/iMessage summaries, include counts, date windows, and where to find CSV/JSON.
- When referencing statutes, cite the source file and line number.
- If the statute is not in the repo, cite the source URL. Prompt the user to add it to the repo.


