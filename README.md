# udd-accept-vite

Small shopping-cart app: Vite + React + TypeScript frontend, Express API in `api/index.ts` (deployed as a Vercel Function).

## Run locally

```bash
npm install
cp .env.example .env   # fill in the values
npm run dev            # Vite on :5173, API on :3001 (proxied under /api)
```

## Environment variables

- `APP_USER_EMAIL`, `APP_USER_PASSWORD`: the single allowed user
- `SESSION_SECRET`: signs the httpOnly session cookie

## Build

```bash
npm run build
```
