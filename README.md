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

## Site management API

Site management requires an authenticated administrator:

- `GET /api/sites` lists configured sites.
- `POST /api/sites` creates a site.
- `PUT /api/sites/:id` replaces a site's configuration.
- `DELETE /api/sites/:id` removes a site.

A site uses `name`, `host`, `backendService`, and `backendPort`; `enabled` is
optional when creating a site. `host` must be a fully qualified domain name or
an IP address. Domain sites use HTTP-to-HTTPS redirection and Let's Encrypt;
IP sites use HTTP only. Backends must be reachable by their Docker service name
on the `reverse-proxy-manager-proxy` network.

The manager writes Traefik's watched file-provider configuration atomically.
Upstream 5xx errors are served a static fallback page. Application containers
must join the proxy network, for example by declaring it as an external network
in their Compose file.

## Container

Copy `.env.example` to `.env` and set `ACME_EMAIL` to a valid contact email
before starting Compose. Public DNS for each domain must point to the VPS, and
ports 80 and 443 must be reachable from the internet for routing and
certificate issuance.

Build and start the initial service with:

```sh
docker compose up --build
```

The health endpoint is available at `http://localhost:3000/health`. This
manager API is bound to the host's loopback interface on port 3000; use an SSH
tunnel for remote administration until the web UI is available. The SQLite
database, Traefik certificates, and generated proxy routes are stored in named
volumes.
