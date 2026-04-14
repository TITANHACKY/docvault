# Doc Editor POC Tasks

## In Progress

- [x] P0-01: Multi-document routing scaffold (`/docs`, `/docs/[id]`)
- [x] P0-02: Local persistence layer (`localStorage` document store)
- [x] P0-03: Autosave title/content from editor page
- [x] P1-01: Reading time unit fix (minutes)

- [x] P0-04: Server persistence (API + DB)
      Status: completed with Pages Router API routes and file-backed DB in `src/pages/api/documents/*` and `src/lib/server/document-store.ts`.

- [ ] P0-05: Auth and permissions
      Status: started at planning level (task breakdown); implementation pending provider selection.

- [x] P1-02: Comments panel implementation
      Status: completed MVP with thread list + add comment wired to `/api/documents/[id]/comments`.

- [ ] P1-03: AI assistant panel implementation
      Status: started with explicit panel state model (`ai` panel id).

- [ ] P1-04: Templates panel implementation
      Status: started with explicit panel state model (`templates` panel id).

- [x] P1-05: Export implementation (Markdown/plain text MVP)
      Status: completed MVP with client-side downloads from current editor content.

- [x] P1-06: Slash command completeness
      Status: completed by replacing placeholder actions with concrete inserted content/blocks for advanced commands.

- [ ] P1-07: Real metadata wiring (owner + updated at)
      Status: started by introducing document timestamps in local storage model.

- [ ] P2-01: Test coverage (unit + integration)
      Status: started with task definition; test harness pending.

- [ ] P2-02: README product docs
      Status: started with task definition; docs pending after MVP behavior stabilizes.

## Next Slice

1. Implement auth and document-level permissions.
2. Expand export to PDF.
3. Complete slash commands and metadata wiring.
