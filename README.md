# PicSafe Food

Food product safety analysis app built with Vite, React, TypeScript, Tailwind, and Supabase.

## Development Setup

This repository is standardized on **npm**.

### Requirements

- Node.js 20+
- npm 10+

### Install and run

```sh
# 1) Clone
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2) Create local env file
cp .env.example .env

# 3) Install dependencies
npm install

# 4) Start local dev server
npm run dev
```

### Quality checks

```sh
npm run lint
npm test
npm run build
```

## Environment Variables

Use `.env.example` as the source of truth for required variables:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

Do not commit `.env` or other secret-bearing files.

## Security Note

This project previously tracked a real `.env` file. Any secrets that were committed in the past should be treated as compromised and rotated in the provider dashboards (Supabase, API providers, and any other affected services).

## Tech Stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase
