# Railway Deployment

This is the maintained Railway deployment note. The repository keeps a single
Railway config file, `railway.toml`, so Railway does not have to choose between
conflicting TOML and JSON descriptors.

## Build

`railway.toml` sets the builder to `nixpacks`:

```toml
[build]
builder = "nixpacks"
```

If the production service is manually configured to use the `Dockerfile`
instead, confirm that setting in the Railway dashboard and update this document.
The `Dockerfile` installs font packages for SVG rendering, so the builder choice
is operationally important.

## Start And Health

Railway starts the built backend with:

```bash
npm start
```

That runs `node dist/index.js`. The service healthcheck is:

```text
GET /health
```

The route is implemented by the backend and returns JSON with `status: "ok"`
when the process is up.

## Persistent Data

Attach a Railway volume at:

```text
/app/data
```

The default runtime paths store SQLite and JSONL data under this directory:

- `DATABASE_PATH=/app/data/research.db`
- `SUBMISSIONS_PATH=/app/data/submissions`
- `DATA_PATH=/app/data`

## Environment

Set these variables for production:

```text
NODE_ENV=production
JWT_SECRET=<long random secret>
```

`PORT` defaults to `3020`; set it only if the Railway service needs an explicit
port override. Optional integrations such as Discord import and password-reset
email are documented in the README.

## First Boot

The app seeds default ontologies, rankings, models, and the default research
topic during server boot. There is no separate `deploy:init` or `deploy:start`
script.

Create an admin user after the first account exists:

```bash
railway run npx tsx create-admin-user.ts
```

`make-admin.sh` is also available when the target email is known.
