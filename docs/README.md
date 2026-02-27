# Documentation

Client-facing and project documentation.

---

## Client handoff — Milestone 1 testing

**For your client:** Use one of these to test all Milestone 1 (MS-1) deliverables:

| Format | File | Use |
|--------|------|-----|
| **Word** | [MILESTONE_1_CLIENT_TESTING.docx](MILESTONE_1_CLIENT_TESTING.docx) | Best for sharing: open in Word, Google Docs, or LibreOffice. |
| **Markdown** | [MILESTONE_1_CLIENT_TESTING.md](MILESTONE_1_CLIENT_TESTING.md) | Same content; good for GitHub, IDEs, or PDF export. |

The guide includes:

- What Milestone 1 delivers
- What the client needs before starting (admin login, CRON secret, running app)
- A **5-minute quick test path**
- **8 detailed sections** (one per deliverable) with:
  - What we’re checking
  - Step-by-step “What to do” and “What you should see”
  - Sign-off line
- Quick reference table
- **Appendix A** — Cron commands (copy-paste)
- **Appendix B** — Useful scripts (`db:seed`, `test:alert-logic`)

---

## Regenerating the Word document

After editing the Markdown or the generator script:

```bash
npm run generate:ms1-docx
```

Output: `docs/MILESTONE_1_CLIENT_TESTING.docx`

---

*Northeast US Heat-Cool Savings — Documentation*
