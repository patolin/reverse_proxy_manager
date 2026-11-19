# Reverse Proxy Manager

A Node.js application for managing sites and deployments on a VPS. The current
increment provides the service foundation and container health endpoint.

## Requirements

- Node.js 20.19 or newer
- npm
- GNU Make (for the convenience commands below)
- Docker and Docker Compose (for container use)

## Local development

```sh
npm install
npm run dev:api
```

In another terminal, start the web development server:

```sh
npm run dev:web
```

The API listens on port `3000` by default. The Vite server proxies API requests
to it and serves the web interface on `http://127.0.0.1:5173`. Set `PORT` to
change the API port. `GET /health` returns `{"status":"ok"}` when the process
is responding.

Run the test suite with:

```sh
npm test
```

Build the production web assets with:

```sh
npm run build
```

The frontend currently ships in English. Edit the [English message catalog](./client/src/messages.js)
to change UI wording, and keep named placeholders intact when translating
messages. Messages returned by the server are outside the frontend catalog.

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

## GitHub Compose deployments

From a site's **Deploy** action, an administrator can queue a deployment from a
public GitHub repository, branch, and Compose YAML file. The Compose service
named by the site's backend must join the external proxy network:

```yaml
services:
  web:
    build: .
    networks:
      - proxy

networks:
  proxy:
    external: true
    name: reverse-proxy-manager-proxy
```

The manager API writes a job to a separate SQLite queue. A dedicated worker
clones the repository and runs `docker compose up --detach --build
--remove-orphans` with a site-specific project name. Job status is visible in
the UI. Deployments are limited to public GitHub URLs; private repository
credentials are not supported.

The worker alone receives the Docker socket. Because a Compose file can request
host mounts, privileged containers, or other powerful capabilities, deploy
only code you trust. The web application itself does not receive Docker socket
access.

## Container

Copy `.env.example` to `.env` and replace its example values. Set `ACME_EMAIL`
to a valid contact email before starting Compose. Public DNS for each domain
must point to the VPS, and
ports 80 and 443 must be reachable from the internet for routing and
certificate issuance. Set `ADMIN_HOST` to a domain for HTTPS access to the
manager UI; leave it unset to use an SSH tunnel to the loopback-bound API port.

Build and start the services in the background with:

```sh
make run
```

Stop the containers with `make stop`; named volumes are preserved. Run the
test suite with `make test`.

Create an administrator in the Compose database by exporting `ADMIN_USERNAME`
and `ADMIN_PASSWORD` through a private environment mechanism and running:

```sh
docker compose run --rm -e ADMIN_USERNAME -e ADMIN_PASSWORD app npm run admin:create
```

The health endpoint is available at `http://localhost:3000/health`. When
`ADMIN_HOST` is configured, the manager UI is routed through Traefik with
HTTPS. Otherwise, use an SSH tunnel to access the loopback-bound API and UI.
The SQLite database, Traefik certificates, and generated proxy routes are
stored in named volumes. Deployment queue records and checked-out repositories
use separate volumes.
