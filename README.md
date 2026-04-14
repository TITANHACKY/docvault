This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Storage Backend

The document API supports two backends:

- `file` (default): stores documents/comments in `data/doc-editor-db.json`
- `postgres`: stores documents/comments in PostgreSQL via Prisma

Set these environment variables in `.env.local` to use PostgreSQL:

```bash
DOC_STORE_MODE=postgres
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<db_name>
# optional for hosted providers that require SSL
PGSSL=true
```

If `DOC_STORE_MODE` is unset (or set to `file`), the app uses file storage.

## Prisma and Authentication

This project includes a Prisma-backed authentication flow with users + sessions.

Required environment variables in `.env.local`:

```bash
# storage mode options: file | postgres
DOC_STORE_MODE=postgres

# used by Prisma datasource
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<db_name>
```

Setup commands:

```bash
npx prisma generate
npx prisma migrate dev --name init_auth
```

Authentication routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

UI routes:

- `/login` for sign in / sign up
- `/docs` and `/docs/[id]` are available in guest mode or authenticated mode

## Guest Mode

If a user is not signed in, the editor works in guest mode:

- documents and comments are stored in browser local storage
- no account is required to create/edit documents

When the user signs in, guest documents/comments are synced to server storage.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
