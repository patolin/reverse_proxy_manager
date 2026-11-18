# Reverse Proxy Manager

A Node.js application for managing sites and deployments on a VPS. The current
increment provides the service foundation and container health endpoint.

## Requirements

- Node.js 20 or newer
- npm
- Docker and Docker Compose (for container use)

## Local development

```sh
npm install
npm start
```

The service listens on port `3000` by default. Set `PORT` to use another valid
port. `GET /health` returns `{"status":"ok"}` when the process is responding.

Run the test suite with:

```sh
npm test
```

## Create the initial administrator

Set `DATABASE_PATH` if the database should not use the default
`./data/app.sqlite`. Provide `ADMIN_USERNAME` and `ADMIN_PASSWORD` through a
local secret manager or another private environment mechanism, then run:

```sh
npm run admin:create
```

The username must be 3-64 characters and use letters, numbers, `.`, `_`, or
`-`. Passwords must be at least 12 characters. Avoid putting the password
directly in shell commands or source-controlled files.

## Authentication API

- `POST /api/auth/login` accepts a JSON `username` and `password`, and sets an
  HTTP-only, same-site session cookie on success.
- `GET /api/auth/me` returns the authenticated administrator.
- `POST /api/auth/logout` revokes the current session.

Login failures are rate-limited. Sessions expire after 12 hours and are stored
as hashes in SQLite. The cookie is marked `Secure` when `NODE_ENV=production`.

## Container

Build and start the initial service with:

```sh
docker compose up --build
```

The health endpoint is available at `http://localhost:3000/health`. This
initial Compose setup is for development; production proxy routing and
secrets management will be added in subsequent increments. The SQLite database
is stored in the `manager_data` named volume.
