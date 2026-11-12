# AFHomes Platform

Next.js web application for AFHomes: sales network, customers, VIP contracts, payments, commissions, membership and Stay Points. It is a frontend prototype on typed in-memory mock data. There is no backend, database or deployment yet.

## Stack

Next.js (App Router), React, TypeScript, shadcn/ui on Base UI, Tailwind CSS 4, TanStack Query and Table, Lucide, Vitest and Testing Library. Check `package.json` for exact versions.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest run
npm run lint
npm run build
npx tsc --noEmit
```

Mock business data lives in browser memory only. A full page reload restores the seed data. The sign-in screens use temporary mock accounts that are removed when real authentication is added.

## Documentation

- `AGENTS.md`: operating rules for contributors and AI agents. Only the project owner commits or pushes.
- `docs/business-rules/`: authoritative business behavior (01 to 14).
- `docs/development/`: technical design.
- `docs/implementation/`: feature roadmap and decision log.
