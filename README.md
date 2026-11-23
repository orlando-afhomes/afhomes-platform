# AFHomes Platform

Next.js web application for AFHomes: sales network, customers, VIP contracts, payments, commissions, membership and Stay Points. It is a frontend prototype on typed in-memory mock data. There is no backend, database or deployment yet.

## Stack

Next.js (App Router), React, TypeScript, shadcn/ui on Base UI, Tailwind CSS 4, TanStack Query and Table, Lucide, Vitest and Testing Library. Check `package.json` for exact versions.

The planned full-stack setup uses Firebase Auth, SQL Connect with PostgreSQL, and private Cloud Storage for Firebase. The owner can use Vercel for a sample-data demo. Firebase App Hosting is the first production choice after staging verification, with Cloud Run as the fallback. See the [Localhost → Staging → Production roadmap](docs/implementation/02-full-stack/README.md) for the order and required approvals.

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

- [AGENTS.md](AGENTS.md) sets the operating rules. Only the project owner controls Git staging, commits, and pushes.
- [Business rules](docs/business-rules/01-roles-and-permissions.md) are authoritative for business behavior.
- [Development guides](docs/development/README.md) describe the technical design.
- [Implementation index](docs/implementation/README.md) links to the feature roadmap, full-stack environment guides, and decision register.
