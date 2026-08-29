# Savewise

**Build the habit. Reach the goal.**

A personal savings and budgeting platform. Savewise turns an income into a plan:
goals with real deadlines, budgets that track themselves, and plain-English
insights derived from the user's own numbers.

> **Savewise does not hold or move money.** It is a planning and tracking tool.
> Balances, contributions and plans are records the user keeps — not deposits.
> There is no bank integration, no payment processing and no custody of funds.
> This is a portfolio project, and the fintech disclaimer above is honoured in
> the product copy as well as in this file.

---

## Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Demo account](#demo-account)
- [Scripts](#scripts)
- [Testing](#testing)
- [API documentation](#api-documentation)
- [Financial modelling](#financial-modelling)
- [Security](#security)
- [Design system](#design-system)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Deployment](#deployment)
- [Known limitations and next steps](#known-limitations-and-next-steps)

---

## What it does

Savewise answers seven questions, and every feature exists to answer one of them.

| Question                                   | Feature                                        |
| ------------------------------------------ | ---------------------------------------------- |
| How much do I have?                        | Dashboard overview, tracked balance            |
| Where is my money going?                   | Transactions, category analytics               |
| How much should I save?                    | Onboarding's suggested starting plan           |
| What am I saving for?                      | Savings goals with targets and deadlines       |
| Am I on track?                             | Goal pace, budget pace, projections            |
| What should I change this month?           | Rules-based insights engine                    |
| What happens if I keep this up?            | Straight-line savings projection               |

**Core features**

- **Savings goals** — target, deadline, monthly contribution. Savewise derives
  the remaining amount, the required monthly contribution, a projected
  completion date and whether the goal is ahead of or behind schedule.
- **Monthly budgets** — per-category limits with live spend aggregated from the
  ledger, plus a pace comparison (percentage of budget spent against percentage
  of the month elapsed) that warns *before* a limit is breached.
- **Transaction ledger** — income, spending and savings contributions, with
  filtering, search, date ranges and pagination.
- **Recurring savings plans** — weekly, fortnightly or monthly schedules with a
  projected finish date. Attach a plan to a goal and recorded contributions
  credit both.
- **Insights engine** — nine deterministic rules over the user's own figures.
  Explicitly *not* AI; every sentence is traceable to one comparison.
- **Analytics** — twelve months of income against spending, savings rate over
  time, category trends and a projection of the current pace.
- **Onboarding** — a five-step flow that turns a stated income into a working
  account: preferences saved, a first budget drafted, a first goal created.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  client/  React + TypeScript + Vite                              │
│                                                                   │
│  pages  →  features  →  hooks (TanStack Query)  →  services      │
│                                       │                           │
│                              store (Zustand: auth, theme, toasts) │
└───────────────────────────────────────┼──────────────────────────┘
                                        │  httpOnly cookies, JSON
┌───────────────────────────────────────┼──────────────────────────┐
│  server/  Express + TypeScript        ▼                           │
│                                                                   │
│  route  →  middleware  →  controller  →  service  →  model       │
│            (auth,           (thin)       (business    (Mongoose)  │
│             validate,                     logic)                  │
│             rate limit)                                           │
└───────────────────────────────────────┬──────────────────────────┘
                                        │
                                   ┌────▼────┐
                                   │ MongoDB │
                                   └─────────┘

           ┌──────────────────────────────────────────┐
           │  shared/  consumed by both, as TS source │
           │  money · finance engine · Zod schemas    │
           │  domain constants · wire contracts       │
           └──────────────────────────────────────────┘
```

### The decisions worth explaining

**A `shared` workspace, consumed as TypeScript source.** The money primitives,
the financial calculation engine, the domain vocabulary and every request schema
live in one package that both sides import. A savings rate is computed by the
same function on the server and in the browser; a validation rule the API
enforces is the rule the form shows while you type. There is no build step —
`tsx` and `tsup` compile it for the server, Vite compiles it for the browser.

**Integer money, everywhere.** Every amount in the database, over the wire and
in the UI is a whole number of minor units (kobo). `₦10,000.00` is `1000000`.
Floating point never touches a balance. See [Financial modelling](#financial-modelling).

**Budgets store intent, not actuals.** A budget document holds planned income,
planned savings and a limit per category. `spent` is **never stored** — it is
aggregated from the transaction ledger on every read. That costs one extra
aggregation per request and buys correctness: there is no denormalised counter
to drift when a transaction is edited, back-dated, deleted or recategorised.

**Ownership is a query filter, not a comparison.** Every service scopes its
queries by the `userId` from the verified session. There is no code path that
loads a document by id alone and then checks who owns it. The consequence is
that another user's resource returns **404, not 403** — "you may not see this"
confirms it exists.

**Thin controllers.** Controllers read validated input, call one service and
shape an HTTP response. Business logic lives in services; validation lives in
Zod schemas; authentication lives in middleware.

**Derived values are computed on read.** Percent complete, required monthly
contribution and projected completion depend on today's date, so a stored copy
would be stale the moment it was written. They are computed by the shared
finance engine when a goal is serialised.

---

## Tech stack

**Frontend** — React 18, TypeScript (strict), Vite 6, Tailwind CSS 3,
React Router 6, Motion 11, Recharts 2, React Hook Form + Zod, TanStack Query 5,
Zustand 5, Axios.

**Backend** — Node 20, Express 4, TypeScript (strict), MongoDB 7 + Mongoose 8,
JWT (`jsonwebtoken`), bcryptjs, Zod, Helmet, CORS, `express-rate-limit`, Pino.

**Tooling** — Vitest 3 (three projects: node, node + in-memory Mongo, jsdom),
Testing Library, Supertest, `mongodb-memory-server`, ESLint 9 (type-aware),
Prettier, npm workspaces.

TypeScript runs with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
`noUnusedLocals` and `verbatimModuleSyntax`. There is no `any` in application
code and no `@ts-ignore` anywhere.

---

## Project structure

```
savewise/
├── shared/                     Contracts shared by both sides
│   └── src/
│       ├── money.ts            Integer money primitives and formatting
│       ├── finance.ts          The calculation engine (pure functions)
│       ├── period.ts           Month keys and date helpers
│       ├── constants.ts        Domain vocabulary — categories, statuses
│       ├── types.ts            Wire contracts (DTOs)
│       ├── schemas/            Zod request schemas
│       └── __tests__/          56 unit tests
│
├── server/
│   ├── src/
│   │   ├── config/             env (validated), database, logger
│   │   ├── models/             Mongoose schemas and indexes
│   │   ├── middleware/         authenticate, validate, rate limit, errors
│   │   ├── services/           Business logic
│   │   ├── controllers/        Thin HTTP adapters
│   │   ├── routes/             Route table
│   │   ├── utils/              AppError, tokens, cookies, http
│   │   ├── scripts/seed.ts     Development seed
│   │   ├── app.ts              Express app factory
│   │   └── server.ts           Process lifecycle
│   └── tests/                  100 integration tests
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             Design system primitives
│   │   │   ├── motion/         Reusable motion primitives
│   │   │   ├── charts/         Recharts wrappers, theme-aware
│   │   │   ├── marketing/      Landing page sections
│   │   │   └── brand/          Logo
│   │   ├── features/           Domain UI: goals, budget, transactions…
│   │   ├── pages/              Route components
│   │   ├── layouts/            App shell, marketing shell, auth shell
│   │   ├── routes/             Route table and guards
│   │   ├── services/           API client and domain services
│   │   ├── store/              Zustand: auth, theme, toasts
│   │   ├── hooks/              Query hooks, currency, page metadata
│   │   ├── lib/                cn, motion config, query keys, money fields
│   │   └── test/               Test setup and render helpers
│   └── public/
│
├── .env.example                Every variable, documented
├── eslint.config.js            Type-aware lint config
├── vitest.config.ts            Three test projects
└── package.json                npm workspaces
```

---

## Getting started

### Prerequisites

- Node.js 20 or later
- MongoDB 7 — locally, via Docker, or MongoDB Atlas

### Setup

```bash
git clone <repository-url> savewise
cd savewise
npm install
```

Create your environment file and generate secrets:

```bash
cp .env.example .env
```

Then fill in the three secrets. Each must be at least 32 characters, and
`JWT_SECRET` and `JWT_REFRESH_SECRET` must differ — the server refuses to start
otherwise:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
openssl rand -base64 48   # COOKIE_SECRET
```

Start MongoDB (Docker):

```bash
npm run db:up      # docker run -d --name savewise-mongo -p 27017:27017 mongo:7
```

Seed the demo data and start both servers:

```bash
npm run seed
npm run dev
```

- Web client — <http://localhost:5173>
- API — <http://localhost:5000>
- Health check — <http://localhost:5000/health>

---

## Environment variables

A single `.env` at the repository root serves both workspaces: the API loads it
with dotenv, and Vite loads it through `envDir`. It is validated by a Zod schema
at boot, and **the process exits with a readable error rather than starting on
invalid configuration**.

| Variable                 | Required | Default                 | Notes                                                        |
| ------------------------ | -------- | ----------------------- | ------------------------------------------------------------ |
| `NODE_ENV`               |          | `development`           | `development` \| `test` \| `production`                      |
| `PORT`                   |          | `5000`                  | API port                                                     |
| `LOG_LEVEL`              |          | `info`                  | Pino level                                                   |
| `MONGODB_URI`            | ✔        | —                       | `mongodb://` or `mongodb+srv://`                             |
| `JWT_SECRET`             | ✔        | —                       | ≥ 32 chars. Signs access tokens                              |
| `JWT_REFRESH_SECRET`     | ✔        | —                       | ≥ 32 chars, must differ from `JWT_SECRET`                    |
| `JWT_EXPIRES_IN`         |          | `15m`                   | Access token lifetime                                        |
| `JWT_REFRESH_EXPIRES_IN` |          | `30d`                   | Refresh token lifetime                                       |
| `COOKIE_SECRET`          | ✔        | —                       | ≥ 32 chars. Signs auth cookies                               |
| `COOKIE_SECURE`          |          | `false`                 | **Must** be `true` in production; enforced by the env schema |
| `COOKIE_DOMAIN`          |          | —                       | Blank for host-only cookies                                  |
| `CLIENT_URL`             |          | `http://localhost:5173` | Comma-separated CORS allowlist                               |
| `RATE_LIMIT_WINDOW_MS`   |          | `900000`                | 15 minutes                                                   |
| `RATE_LIMIT_MAX`         |          | `300`                   | Requests per window, general API                             |
| `AUTH_RATE_LIMIT_MAX`    |          | `10`                    | Failed auth attempts per window                              |
| `SEED_DEMO_EMAIL`        |          | `demo@savewise.local`   | Development only                                             |
| `SEED_DEMO_PASSWORD`     |          | `DemoPassword123!`      | Development only                                             |
| `VITE_API_URL`           |          | `…:5000/api`            | Read by the browser at build time                            |
| `VITE_APP_URL`           |          | `…:5173`                | Public origin, for canonical URLs                            |

`.env` is gitignored. `.env.example` documents every variable and contains no
real values.

---

## Demo account

`npm run seed` creates a demo account with twelve months of plausible Nigerian
household finances — a ₦520,000 salary, an annual rent lump sum, four savings
goals, four monthly budgets and three savings plans.

```
Email     demo@savewise.local
Password  DemoPassword123!
```

> **Development credentials only.** They are defined in `.env.example`, seeded
> only when `NODE_ENV` is not `production`, and must never be reused anywhere
> real. The seed script refuses to run against a production database.

The seed is idempotent — rerunning it rebuilds the demo account from scratch
without touching anything else — and its randomness is seeded, so two runs
produce identical data.

---

## Scripts

Run from the repository root.

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | API and web client together, with reload                  |
| `npm run dev:server`| API only                                                   |
| `npm run dev:client`| Web client only                                            |
| `npm run build`     | Type-check and build both workspaces                       |
| `npm start`         | Run the built API                                          |
| `npm run seed`      | Rebuild the demo account                                   |
| `npm test`          | The whole suite — shared, server and client                |
| `npm run typecheck` | `tsc --noEmit` across all three workspaces                 |
| `npm run lint`      | Type-aware ESLint                                          |
| `npm run format`    | Prettier                                                   |
| `npm run db:up`     | Start MongoDB in Docker                                    |
| `npm run db:down`   | Remove the MongoDB container                               |

---

## Testing

```bash
npm test                          # everything — 179 tests
npx vitest run --project shared   # 56  pure unit tests
npx vitest run --project server   # 100 API integration tests
npx vitest run --project client   # 23  component tests
```

**`shared` (56)** — the money primitives and the calculation engine. These cover
the cases that matter: the classic floating-point traps, rounding at the
half-way boundary, an allocation that must not lose a kobo, and every derived
figure the product shows. Two genuine bugs were found and fixed by writing
them — `toMinor(1.005)` rounding to 100 kobo instead of 101, and compact
formatting rendering `₦1.2m` as `₦1m`.

**`server` (100)** — real HTTP against a real MongoDB (in-memory, but a genuine
`mongod`). Mocking Mongoose would test the mocks; the behaviour worth verifying
lives in the database. Coverage includes:

- registration, login, `/me`, logout, password change
- refresh-token rotation, and **reuse detection revoking the whole session family**
- that a password is never stored or returned in the clear, and no token ever
  appears in a response body
- that a wrong password and an unknown account are indistinguishable
- **cross-account access on every resource** — read, update, delete, contribute
- unauthenticated access to all fifteen protected routes
- NoSQL operator injection, mass assignment, oversized payloads, non-integer money
- goal contributions under concurrency (ten simultaneous writes, none lost)
- budget spend aggregating live from the ledger
- the insights engine's rules

**`client` (23)** — component behaviour with the real providers. Form validation
refusing invalid input *before* a request is made; money converting to integer
minor units; the dashboard's loading, error and empty states; progress exposed
to assistive technology; a 500's message never reaching the screen.

Writing these found a real UX bug: the modal's focus timer stole focus 50ms
after opening, overriding `autoFocus` and swallowing keystrokes from anyone who
started typing immediately.

---

## API documentation

Base URL `http://localhost:5000/api`. All responses use one envelope.

**Success**

```json
{ "success": true, "data": { } }
```

**Error**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the highlighted fields",
    "details": { "password": ["Include an uppercase letter"] }
  }
}
```

| Code                  | Status | Meaning                          |
| --------------------- | ------ | -------------------------------- |
| `VALIDATION_ERROR`    | 400/422| Input rejected; see `details`    |
| `UNAUTHENTICATED`     | 401    | No valid session                 |
| `INVALID_CREDENTIALS` | 401    | Sign-in failed                   |
| `FORBIDDEN`           | 403    | Not permitted                    |
| `NOT_FOUND`           | 404    | No such resource *for this user* |
| `CONFLICT`            | 409    | Duplicate                        |
| `PAYLOAD_TOO_LARGE`   | 413    | Body over 100kb                  |
| `RATE_LIMITED`        | 429    | Too many requests                |
| `INTERNAL_ERROR`      | 500    | Logged; never detailed to client |

### Authentication

Tokens travel exclusively in **httpOnly cookies** — none is ever returned in a
response body, and page JavaScript cannot read them.

| Method | Path                        | Auth | Description                             |
| ------ | --------------------------- | ---- | --------------------------------------- |
| POST   | `/auth/register`            | —    | Create an account and start a session   |
| POST   | `/auth/login`               | —    | Sign in                                 |
| POST   | `/auth/refresh`             | 🍪   | Rotate the token pair                   |
| POST   | `/auth/logout`              | 🍪   | Revoke the session, clear cookies       |
| GET    | `/auth/me`                  | ✔    | The signed-in user                      |
| POST   | `/auth/change-password`     | ✔    | Change password; revokes every session  |

```bash
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@savewise.local","password":"DemoPassword123!"}'
```

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6a9200c449763c508cd8454a",
      "firstName": "Chinedu",
      "lastName": "Okafor",
      "email": "demo@savewise.local",
      "currency": "NGN",
      "monthlyIncome": 52000000,
      "onboardingCompleted": true
    }
  }
}
```

### Goals

| Method | Path                    | Description                                    |
| ------ | ----------------------- | ---------------------------------------------- |
| GET    | `/goals`                | List with a derived overview; `?status=&category=` |
| POST   | `/goals`                | Create                                         |
| GET    | `/goals/:id`            | One goal with progress                         |
| PATCH  | `/goals/:id`            | Update                                         |
| DELETE | `/goals/:id`            | Delete; contribution history is kept, detached |
| POST   | `/goals/:id/contribute` | Record a contribution — writes a ledger row too |

```bash
curl -b cookies.txt -X POST http://localhost:5000/api/goals/<id>/contribute \
  -H 'Content-Type: application/json' -d '{"amount":5500000}'
```

```json
{
  "success": true,
  "data": {
    "goal": {
      "name": "Emergency Fund",
      "currentAmount": 5500000,
      "targetAmount": 120000000,
      "progress": {
        "remainingAmount": 114500000,
        "percentComplete": 4.58,
        "requiredMonthlyContribution": 11450000,
        "projectedCompletionDate": "2028-06-29T00:00:00.000Z",
        "pace": "behind"
      }
    },
    "transaction": { "type": "saving", "amount": 5500000 },
    "milestoneReached": null
  }
}
```

### Transactions

| Method | Path                | Description                                |
| ------ | ------------------- | ------------------------------------------ |
| GET    | `/transactions`     | Paginated list with a summary              |
| POST   | `/transactions`     | Create                                     |
| GET    | `/transactions/:id` | One transaction                            |
| PATCH  | `/transactions/:id` | Update (refused for goal contributions)    |
| DELETE | `/transactions/:id` | Delete; reverses a goal balance if linked  |

Query parameters: `page`, `pageSize` (max 100), `type`, `category`, `search`,
`from`, `to`, `month`, `goalId`, `sort`, `order`.

### Budgets, plans, analytics, insights

| Method | Path                     | Description                                    |
| ------ | ------------------------ | ---------------------------------------------- |
| GET    | `/budgets`               | Trailing months, or one via `?month=YYYY-MM`   |
| GET    | `/budgets/current`       | This month, or `null`                          |
| POST   | `/budgets`               | Create                                         |
| PATCH  | `/budgets/:id`           | Update                                         |
| DELETE | `/budgets/:id`           | Delete                                         |
| GET    | `/plans`                 | List with projections                          |
| POST   | `/plans`                 | Create                                         |
| PATCH  | `/plans/:id`             | Update                                         |
| DELETE | `/plans/:id`             | Delete                                         |
| POST   | `/plans/:id/contribute`  | Record a scheduled contribution                |
| GET    | `/analytics/overview`    | The whole dashboard in one request             |
| GET    | `/analytics/spending`    | Twelve-month income and spending               |
| GET    | `/analytics/savings`     | Cumulative savings and a projection            |
| GET    | `/analytics/categories`  | Category and bucket breakdown                  |
| GET    | `/insights`              | Generated insights for a month                 |
| GET    | `/notifications`         | In-app notifications                           |
| GET    | `/users/me`              | Profile                                        |
| PATCH  | `/users/me`              | Update profile                                 |
| PATCH  | `/users/me/preferences`  | Update preferences                             |
| POST   | `/users/me/onboarding`   | Complete onboarding, draft a budget and goal   |

Every route above requires a session. `GET /health` is the only unauthenticated
non-auth endpoint.

---

## Financial modelling

### Integer money

Every monetary value is an integer count of **minor units** — kobo for NGN,
cents for USD. `₦10,000.00` is stored, transmitted and computed as `1000000`.

IEEE-754 doubles represent every integer up to 2^53 − 1 exactly, so integer
arithmetic is exact. Rounding can only occur when scaling by a non-integer
factor, and every such operation funnels through one helper, so the rounding
policy — **half away from zero** — is defined in exactly one place.

```ts
addMinor(toMinor(0.1), toMinor(0.2)) === toMinor(0.3); // 10 + 20 === 30, exactly
```

Two subtleties the tests pin down:

- **`toMinor` scales via the string exponent, not a multiplication.** `1.005 * 100`
  is `100.49999999999999` as a double and rounds *down* to 100 kobo, when a user
  expects 101. `Number('1.005e2')` parses directly to exactly `100.5`.
- **`allocate` uses the largest-remainder method.** Splitting `1000` three ways
  yields `[334, 333, 333]` — summing to exactly 1000, with no unit invented or lost.

### The calculation engine

`shared/src/finance.ts` is pure: no database, no network, and `now` is always
injected, which is what makes date-dependent behaviour testable at all.

| Function                                | Answers                                       |
| --------------------------------------- | --------------------------------------------- |
| `calculateSavingsRate`                  | What share of income was kept                 |
| `calculateMonthlyCashFlow`              | Income, spending, savings and what is left    |
| `calculateBudgetUsage`                  | Spent, remaining, overspend and health        |
| `calculateGoalProgress`                 | Everything a goal card shows                  |
| `calculateRequiredMonthlyContribution`  | What it costs per month to hit the deadline   |
| `calculateProjectedCompletion`          | When the current rate finishes the goal       |
| `calculatePlanProjection`               | Contributions left and a finish date          |
| `projectSavingsGrowth`                  | Where the current habit leads                 |
| `buildStartingPlan`                     | The suggested onboarding split                |

Deliberate choices:

- `calculateSavingsRate` returns `0` for a zero income, never `NaN` or `Infinity`.
- `calculateChange` returns `null` when the base period is zero — growth from
  nothing is not a percentage.
- `calculateRequiredMonthlyContribution` rounds **up**: under-contributing misses
  the date, and a user would rather be told ₦41,667 than ₦41,666.
- `calculateBudgetUsage` never returns a negative remainder; an overspend is a
  separate, positive field.
- `projectSavingsGrowth` models **no interest or investment return**. Savewise
  tracks money the user holds; it does not promise a yield.
- `buildStartingPlan` caps its suggestion at half of income, so the "plan" always
  leaves enough to live on. It is labelled a *suggested starting plan* everywhere
  it appears — a rule of thumb applied to a number the user typed, not advice.

### Data model

| Collection    | Notes                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| `User`        | `passwordHash` is `select: false`; unique index on `email`              |
| `Session`     | Hashed refresh tokens, rotation family, TTL index on `expiresAt`        |
| `Transaction` | The ledger. Positive amounts; direction lives in `type`                 |
| `SavingsGoal` | Balance moved only by the contribution service                          |
| `Budget`      | Intent only. Category lines embedded; `spent` never stored              |
| `SavingsPlan` | A schedule and a projection                                             |
| `Notification`| In-app only, deduplicated, TTL-expired after 90 days                    |

**Indexes**

```
User          { email: 1 }                          unique
Session       { tokenHash: 1 } unique · { userId: 1 } · { family: 1 }
              { expiresAt: 1 } TTL
Transaction   { userId: 1, date: -1 }               the workhorse
              { userId: 1, category: 1, date: -1 }
              { userId: 1, type: 1, date: -1 }
              { userId: 1, goalId: 1, date: -1 }    sparse
SavingsGoal   { userId: 1, status: 1, priority: -1, createdAt: -1 }
              { userId: 1, deadline: 1 }            sparse
              { userId: 1, name: 1 }                unique, case-insensitive
Budget        { userId: 1, month: 1 }               unique
SavingsPlan   { userId: 1, status: 1, createdAt: -1 }
Notification  { userId: 1, createdAt: -1 } · { createdAt: 1 } TTL 90d
```

Monthly rollups are computed inside MongoDB with a `$dateToString` grouping
rather than pulling transactions into Node — response size is a function of the
window (twelve points), not of how long the user has been saving.

### The goal-balance invariant

A contribution touches two documents — the goal balance and a new ledger row —
and they must not diverge. MongoDB multi-document transactions require a replica
set, which a single-node development deployment is not, so rather than assume an
unavailable primitive the writes are ordered so each step is individually atomic:

1. `$inc` the goal balance — a single-document update, safe under concurrency.
2. Insert the ledger row.
3. If step 2 fails, reverse step 1.

The residual risk is a process crash between 1 and 2, which would overstate a
goal by one contribution. That is recoverable — the ledger is the source of
truth and can rebuild the balance — and is a documented trade-off rather than an
oversight. A replica-set deployment would upgrade this to a real transaction
with a two-line change.

---

## Security

Treated as a fintech application throughout, even though it holds no funds.

### Authentication

- **bcrypt** at cost 12. Passwords are capped at 72 bytes because bcrypt
  silently ignores anything beyond that — better to reject than to let someone
  believe a 200-character passphrase is being hashed in full.
- **httpOnly, signed, `sameSite` cookies.** No token is ever exposed to page
  JavaScript, so an XSS foothold cannot walk away with a session. `secure` is
  required in production and the env schema refuses to boot without it.
- **Short-lived access tokens** (15m) with a **rotating refresh token** (30d).
  Each refresh mints a new token and retires the old one.
- **Reuse detection.** Presenting a retired refresh token means it was copied,
  so the entire rotation family is revoked. A stolen token buys one request and
  costs the attacker the session. *(Covered by a test.)*
- **Separate secrets** for access and refresh tokens; the env schema rejects
  reusing one for both.
- **Timing-equalised login.** A bcrypt comparison runs even when no account
  matches, so response time cannot enumerate registered users. Wrong password
  and unknown account return byte-identical responses. *(Covered by a test.)*
- **Password change requires the current password** and revokes every session.

### Authorization

- Every query is scoped by the `userId` from the verified session. A
  client-supplied `userId` is impossible — the field is not in any schema.
- Another user's resource is a **404**, not a 403.
- All fifteen protected route groups are tested unauthenticated, and every
  resource is tested for cross-account read, update, delete and contribute.

### Input

- **Zod at the edge.** Every mutating route validates before a controller runs,
  and the parsed result *replaces* the raw input.
- **`.strict()` schemas** drop unknown keys, which is what stops mass assignment
  at the door. `role`, `currentAmount` and `userId` cannot be smuggled in.
- **NoSQL injection** is prevented by validation — `{ email: { $gt: '' } }` is
  rejected as not-a-string before any query is built. Mongoose's `sanitizeFilter`
  is enabled globally as a second layer, with the handful of deliberate operator
  uses marked `mongoose.trusted()`.
- **Regex metacharacters in search are escaped**, so `(a+)+$` is literal text
  rather than a denial-of-service.
- Control characters are stripped from free text; bodies are capped at 100kb.

### Transport and headers

- **Helmet** with a `default-src 'none'` CSP — the API serves JSON, so the
  strictest policy is also the simplest. HSTS in production.
- **CORS with an explicit allowlist**, never a reflector. `credentials: true`
  with a reflected origin would let any site read an authenticated response.
- `trust proxy` is set to one hop, so `X-Forwarded-For` cannot be spoofed to
  bypass the rate limiter.

### Rate limiting

Three tiers, because the threat models differ:

| Tier    | Window | Limit | Keyed on              |
| ------- | ------ | ----- | --------------------- |
| `api`   | 15 min | 300   | IP                    |
| `auth`  | 15 min | 10    | IP **+ hashed email** |
| `write` | 1 min  | 60    | IP                    |

Keying auth on IP alone would let one attacker behind a shared NAT lock out an
office; keying on email alone would let an attacker lock a victim out of their
own account. The pair throttles credential stuffing without either side effect,
and successful sign-ins do not count against the limit.

### Errors and logging

- Centralised handling: known failures become the documented envelope,
  everything else becomes an opaque 500.
- **Stack traces never reach production responses.** Duplicate-key messages are
  written by hand rather than echoing an index name.
- Pino **redacts** `authorization`, `cookie`, `set-cookie`, and every password,
  hash and token field. A debug line must not become a breach.
- Every request carries a correlation id, echoed as `x-request-id`.

### What is deliberately absent

No bank connections. No payment processing. No KYC. No custody. The application
stores what the user enters and nothing else.

---

## Design system

The visual language should say *"your money is organised here"* — trustworthy,
calm and specific, not a generic SaaS dashboard.

**Two designed palettes, not one inverted.** Light is warm paper and deep
evergreen — a printed statement rather than a glowing screen. Dark is a forest
at night: the greens lift in saturation and lightness so they still read as
brand rather than sludge, and surfaces separate by *value* because shadows are
nearly invisible on a near-black canvas. Every colour is an HSL triplet in a CSS
custom property, so both themes are a token swap at the root.

**Typography.** Instrument Serif for display headlines — the only place it
appears at size, and what gives the page its voice in the first second. Inter
for everything else, with `cv11` so `1` and `l` do not read alike in an
interface that is mostly numbers, and **tabular figures on every amount** so a
counting animation never shifts the layout.

**Restraint as a system.** Five text sizes and four display sizes. Two radii —
`lg` for controls, `xl`/`2xl` for surfaces. One easing curve for the entire
product. Elevation means *interactivity*, not importance.

**Motion.** Three principles: motion explains rather than decorates; one
vocabulary, so the whole product decelerates identically; small distances
(8–20px) and short durations (0.4–0.7s). Nothing loops, nothing drifts, nothing
moves because the page is idle. Reusable primitives — `FadeIn`, `SlideUp`,
`ScaleIn`, `Stagger`, `StaggerItem`, `FloatingCard`, `AnimatedNumber`,
`Progress` — mean every entrance in the product is identical.

`prefers-reduced-motion` is honoured in two layers: the primitives swap to
distance-free variants, and the stylesheet collapses any CSS transition that
slipped past. Crucially the variants keep their *final visible state* — removing
the animation outright would leave viewport-triggered content permanently
invisible.

**The landing page** is an argument, not a feature list: name the problem, show
the shape of the solution, demonstrate it three ways, let the reader try an
interactive dashboard preview, state the effort honestly, then ask. Every
product visual is built in React rather than screenshotted — a fraction of the
weight of a retina PNG, sharp at any density, responsive, theme-aware, and
incapable of going stale.

---

## Accessibility

Not a checklist item; built in.

- **Real elements.** Buttons are `<button>`, links are `<a>`. No `div` with an
  onClick anywhere.
- **Dialogs** move focus in, trap Tab and Shift+Tab, restore focus to the
  trigger on close, close on Escape, and are labelled with `aria-modal`. Backdrop
  clicks only dismiss when the press *started* on the backdrop, so a text
  selection that drifts outside does not discard a half-filled form.
- **Forms** generate a shared id for label and control, wire `aria-describedby`
  to both hint *and* error, set `aria-invalid`, and announce errors with
  `role="alert"`.
- **Tabs** implement the ARIA pattern properly — arrow keys, Home, End, and only
  the selected tab in the page's tab order.
- **Status is never colour alone.** Every badge shows a word; every progress bar
  carries `aria-valuenow`; a goal that is behind schedule says so.
- **Animated numbers** put the settled value in `aria-label` and hide the
  animating text, so a screen reader hears "₦420,000" once rather than sixty
  intermediate numbers.
- **Icon-only buttons** take a required `label` prop, so an unnamed control is
  impossible to write.
- Skip links, visible focus rings on everything, `aria-live` regions for toasts
  (assertive for errors, polite otherwise), and semantic heading structure.

---

## Performance

- **Route-level code splitting.** The landing page does not download the
  charting library, the dashboard or the settings forms. Recharts (447kB) sits
  in its own chunk that marketing pages never load.
- **Manual chunks** for React, Recharts and Motion — large, rarely-changing
  dependencies that should stay cached across deploys.
- **One request per screen.** The dashboard is a single `/analytics/overview`
  call rather than six; the server already knows how to compute a savings rate,
  and doing it once there also guarantees every surface agrees.
- **Aggregation in the database.** Monthly rollups group by a `$dateToString`
  month key inside MongoDB.
- **Pagination everywhere**, capped at 100 per page by schema.
- **Stable sort keys** so pagination is deterministic when rows share a date.
- **`placeholderData`** keeps the previous page visible while the next loads.
- **Precise cache invalidation** from one place, so a contribution refreshes the
  goal, the ledger, the budget, the analytics and the insights together.
- No web fonts blocking first paint; the theme is applied by a tiny inline
  script before first paint, so a returning dark-mode user never sees a flash.

---

## Deployment

`npm run build` produces `server/dist` (bundled with tsup, shared inlined) and
`client/dist` (static assets).

**Before going live**

1. `NODE_ENV=production` and `COOKIE_SECURE=true` — the env schema enforces the
   second.
2. Fresh, distinct secrets for `JWT_SECRET`, `JWT_REFRESH_SECRET` and
   `COOKIE_SECRET`.
3. `CLIENT_URL` set to the real origin (comma-separate multiple).
4. `MONGODB_URI` pointing at a replica set — Atlas provides one, which also
   upgrades the contribution write to a real transaction.
5. Serve the client behind a CDN with SPA fallback to `index.html`.
6. Terminate TLS at the proxy; `trust proxy` is already set to one hop.
7. Indexes are built explicitly at boot in production (`syncIndexes`), so a cold
   start cannot race the first query.

`GET /health` reports database connectivity and returns 503 when degraded —
suitable as a container readiness probe.

---

## Known limitations and next steps

Stated plainly, because a portfolio project that pretends to be finished is less
interesting than one that knows where its edges are.

- **Rate limiting is in-memory.** Correct for a single process; a multi-instance
  deployment needs a Redis store. One config change.
- **No multi-document transaction on contribution.** See
  [the invariant](#the-goal-balance-invariant) — compensating writes today, a
  real transaction once a replica set is available.
- **Billing is not implemented.** The pricing tiers are positioning; every CTA
  creates the same free account, and the page says so.
- **Recurring plans do not auto-post.** By design: Savewise moves no money, so a
  contribution is always an explicit user action. A scheduled reminder job would
  be the natural next step.
- **Email is unverified and unchangeable.** Changing it is an identity change
  that needs a verification flow, so it is out of scope rather than half-done.
- **No CSV import or export.** The single most requested feature this would need
  next, and the reason the ledger is modelled the way it is.
- **No end-to-end browser tests.** The suite covers units, API integration and
  components; a Playwright pass over the register → onboard → dashboard journey
  would close the loop.

---

## Licence

MIT. A portfolio project by [princechimuanya18@gmail.com](mailto:princechimuanya18@gmail.com).

Savewise is a fintech *simulation*. It processes no real funds, connects to no
financial institution, and offers no financial advice.
