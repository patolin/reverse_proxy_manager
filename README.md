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

## Container

Build and start the initial service with:

```sh
docker compose up --build
```

The health endpoint is available at `http://localhost:3000/health`. This
initial Compose setup is for development; production proxy routing and
secrets management will be added in subsequent increments. The SQLite database
is stored in the `manager_data` named volume.
