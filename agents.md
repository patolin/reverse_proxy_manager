# Development Plan and Coding Guidelines

This document guides implementation of the reverse proxy manager described in
[`features.md`](./features.md). The repository currently contains the
initial application foundation, administrator authentication, site management,
Traefik configuration, and web interface. Continue with the remaining
deployment workflow and operational hardening.

## Product and architecture decisions

- Use Node.js ES modules, Express, React with Vite, and Material UI. Docker
  Compose is the VPS deployment baseline.
- Use SQLite through Drizzle ORM and checked-in SQL migrations. Keep database
  operations behind a persistence boundary; verify portability rather than
  assuming it.
- Use Traefik's file provider for generated routes. Write configuration
  atomically, persist ACME data, and do not give the manager a Docker socket.
- Limit the initial deployment workflow to public GitHub repositories with a
  Compose file. Only the dedicated worker receives the Docker socket; the
  administrator must deploy code they trust.
- Route public traffic on standard ports 80/443. Domain names use HTTPS and
  Let's Encrypt; IP-address routes use HTTP. Public DNS and inbound firewall
  access are deployment prerequisites.
- Use a static fallback service for upstream 5xx responses and test the
  generated Traefik configuration.
- Treat Docker control as a privileged capability. Do not expose an unrestricted
  Docker socket to the web application. Keep deployment operations in a
  separately constrained worker or API, and permit only validated,
  allowlisted actions.
- Do not execute arbitrary shell commands or interpolate repository, domain, or
  other user input into commands.
- Provide an explicit static fallback for failed or unavailable upstreams;
  verify the selected proxy configuration actually serves it.

## Implementation plan

1. **Confirm scope and operational requirements**
   - Decide whether the manager owns application deployment as well as proxy
     configuration.
   - Define supported GitHub repository/build workflows, deployment actions,
     domain requirements, certificate challenge, and admin recovery process.
   - Set limits for permitted repositories, images, commands, networks, and
     resource use.
2. **Establish the project**
   - Maintain the Node.js server, Vite frontend, package manager, code style,
     and test runner configuration.
   - Maintain local development setup and Docker Compose deployment.
   - Add configuration validation, database migrations, and operational
     logging.
3. **Implement authentication and authorization**
   - Add secure password hashing, protected sessions, CSRF defenses, and
     login throttling.
   - Add a safe console-based initial administrator setup.
   - Restrict user management and all administrative actions to authorized
     users.
4. **Implement site and proxy management**
   - Add validated site CRUD and enable/disable operations.
   - Reconcile site settings into Traefik routes for domains or IP/port access
     to internal application ports.
   - Report invalid configuration and proxy update failures clearly.
5. **Add HTTPS and unavailable-site behavior**
   - Configure Traefik ACME/Let's Encrypt and persistent certificate storage.
   - Add an explicit static fallback for unhealthy or unavailable backends.
   - Verify successful certificate issuance prerequisites and fallback behavior.
6. **Implement constrained GitHub deployments**
   - Maintain the public-GitHub Compose worker and its validated queue inputs.
   - Require an administrator to trigger deployments and show progress and
     actionable errors.
   - Keep Docker socket access in the worker and avoid exposing secrets or
     command output in logs.
7. **Build the Material Design UI**
   - Maintain login and site management screens; add deployment controls and
     deployment status/error views as the deployment feature is implemented.
   - Confirm destructive actions and make validation errors accessible.
8. **Harden, validate, and document operations**
   - Test security boundaries, failure behavior, clean deployment, and
     recovery.
   - Document VPS installation, DNS/TLS prerequisites, admin bootstrap,
     backups, upgrades, rollback, and troubleshooting.

Deliver the first milestone as authentication, manual site/route management,
HTTPS, and fallback behavior. Add GitHub deployment after the privileged
Docker-operation boundary has been designed and tested.

## JavaScript and Node.js practices

- Use a supported Node.js LTS release and pin the package manager and runtime
  expectations in project configuration and documentation.
- Prefer modern JavaScript modules and `async`/`await`; keep asynchronous errors
  explicit and handle them at appropriate request or job boundaries.
- Validate all external input at system boundaries, including HTTP requests,
  environment variables, repository identifiers, domains, and ports. Use
  schemas or existing validation helpers rather than scattered ad hoc checks.
- Keep HTTP handlers thin. Put domain behavior in focused services and isolate
  database, proxy, and deployment-worker interactions behind clear interfaces.
- Use parameterized ORM/database operations. Do not construct SQL or shell
  commands from untrusted input.
- Keep secrets in environment-provided secret storage, never in source,
  committed configuration, client bundles, or logs.
- Return deliberate HTTP status codes and safe error messages. Log actionable
  server-side context without passwords, tokens, cookies, or other secrets.
- Preserve secure HTTP headers and only trust the configured reverse-proxy hop
  when the application is not directly exposed.
- Use structured logging and avoid logging the full contents of requests or
  deployment environments.
- Use small, focused modules and descriptive names. Add comments only when they
  explain non-obvious decisions.
- Keep dependency additions necessary and maintained; document security-relevant
  configuration and defaults.
- Keep user-facing frontend copy in the English message catalog, including
  accessibility labels and browser metadata. Use complete messages with named
  placeholders for dynamic values so translations can reorder them. Keep
  protocol values and server-provided errors separate from UI copy.

## Testing and quality practices

- Follow the repository's chosen test and lint commands once established; add
  consistent scripts to `package.json` and document them.
- Add focused unit tests for validation, authorization decisions, and core
  business logic.
- Add integration tests for database migrations and persistence, proxy
  configuration generation, and deployment-worker boundaries.
- Add end-to-end tests for critical user flows: admin setup/login, site
  management, route behavior, and deployment triggering.
- Test negative and failure paths, including invalid input, unauthorized
  requests, unavailable upstreams, certificate/configuration failures, and
  deployment errors.
- Keep tests deterministic: isolate external services, use temporary test data,
  and do not call production systems or real Let's Encrypt endpoints in routine
  test runs.
- Run formatting, linting, relevant tests, and a production build before
  considering a change complete. Report any checks that could not be run.
- Current checks are `npm test`, `npm run build`, and
  `ACME_EMAIL=admin@example.test docker compose config -q`. Docker image builds
  additionally require an available Docker daemon.
- Do not weaken or remove a test just to make a change pass; fix the behavior
  or update the test only when the intended requirement has changed.

## Change workflow

- Read relevant code and existing project instructions before editing; follow
  established patterns where they are sound.
- Make the smallest change that fully addresses the task and update directly
  related documentation.
- Add tests for introduced behavior and regressions, and verify the exact
  requirement rather than a proxy for it.
- Review the final diff for unrelated changes, exposed secrets, unsafe
  privileges, and missing error handling.
