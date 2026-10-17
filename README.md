# Caregiver Command Center

Caregiver Command Center is a private workspace where a family coordinates care for one person. Members keep legal, medical, housing, and money details in one place, assign owners to each area, upload documents, track tasks and expenses, and open a crisis view when something urgent happens.

The GitHub repository is still named `book-changes`. The project name, and the name to use if this repository is renamed later, is **caregiver-command-center**.

This app helps a family organize information. It does not provide legal, medical, or financial advice.

## What you can do

- Create an account and a family workspace, then record who the care recipient is.
- Work across eight domains: legal authority, advance directives, financial accounts, healthcare, housing and care, changes and capacity, family coordination, and benefits and funding.
- Upload documents, mark the ones needed in an emergency, and download them later.
- Add and complete tasks, including follow-up tasks generated from events such as a hospitalization or a fall.
- Track care expenses and income offsets, and record decisions, meetings, and unresolved issues.
- Open crisis mode for the emergency packet: name, contacts, and the critical documents.

Each API route loads the signed-in user from the database and returns only that user's family workspace. Updating or deleting a task, expense, document, or issue in another family returns 404. Uploaded files live outside `public/` and are downloaded through an authenticated route.

## Stack

- Next.js 16 (App Router) and React 19
- Prisma 6 with SQLite
- Auth.js (NextAuth v5) credentials sessions
- Tailwind CSS 4

## Local setup

Requirements: Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env
# Put a real AUTH_SECRET in .env (openssl rand -base64 32)
npx prisma db push
npm run dev
```

Open http://localhost:3000, create an account, and finish onboarding. The first account becomes the workspace owner.

### DATABASE_URL

`DATABASE_URL` is the SQLite file Prisma opens.

```bash
DATABASE_URL="file:./dev.db"
```

`npx prisma db push` creates that file next to `prisma/schema.prisma` (`prisma/dev.db`). The Next.js server uses the same variable. If the CLI and the server ever open different files, switch to an absolute path:

```bash
DATABASE_URL="file:/absolute/path/to/caregiver.db"
```

### AUTH_SECRET

`AUTH_SECRET` is the key Auth.js uses to sign the session cookie. The app will not keep a trustworthy login without it. Generate a long random value and keep it private:

```bash
openssl rand -base64 32
```

Set `AUTH_TRUST_HOST="true"` when a reverse proxy or hosting platform terminates HTTPS. That tells Auth.js to trust the public host header.

### UPLOAD_DIR

Document files are written to `UPLOAD_DIR` (default `./data/uploads`). The directory is not web-accessible. Downloads go through `/api/documents/[id]/file`, which checks the family first.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the app locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest against a real SQLite file (`prisma/test.db`) |
| `npm run build` / `npm start` | Production build and server |
| `npx prisma db push` | Create or update the SQLite schema |
| `npm run db:studio` | Open Prisma Studio |

GitHub Actions (`.github/workflows/ci.yml`) runs lint, test, and build on every push and pull request.

## Deploying a live demo

SQLite and the document files both need a disk that survives restarts. A small container or VM with a persistent volume is the setup this repository supports. Serverless hosts that wipe the filesystem will lose accounts, tasks, and uploads on the next deploy.

1. Provision a volume and mount it at `/data`.
2. Set:

```bash
DATABASE_URL="file:/data/caregiver.db"
UPLOAD_DIR="/data/uploads"
AUTH_SECRET="<long random value>"
AUTH_TRUST_HOST="true"
```

3. On each boot, apply the schema and start the server:

```bash
npx prisma db push
npm run build
npm start
```

Fly.io volumes, a Railway volume, or a Render persistent disk all fit this shape. Put the app behind HTTPS and point the public URL at the process. Do not commit `.env`.

Object storage (S3 or R2) and a hosted libSQL/Turso database are not wired up. The volume above is the working demo path. Switching the database would mean changing the Prisma datasource; switching documents would mean replacing `src/lib/uploads.ts`.

## Tests

`npm test` uses Vitest and a real SQLite database. The suite covers:

- signup, duplicate emails, and password checks
- onboarding (workspace plus care recipient) and a second submit that reuses the same workspace
- create, read, update, and delete for tasks, expenses, and documents, including the stored file
- trigger events that attach follow-up tasks to real domain rows
- a second family that cannot read or change the first family's tasks, expenses, documents, issues, or files

## Known limits

- There is no invite flow. Another person cannot join a workspace from the UI.
- Contacts and structured records exist in the schema and have no screens.
- Passwords cannot be reset, and email addresses are not verified.
- Registration is not rate limited.
- A document upload creates one version. Replacing a file means uploading again.
- Settings is read-only after onboarding.
- Auth.js is still the v5 beta.
- `npm audit` may still report `braces` through the Next.js ESLint plugin. The latest published `braces` release is inside the advisory range, and the finding is limited to dev tooling that expands glob patterns.
