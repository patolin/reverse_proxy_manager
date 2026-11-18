# Development Plan and Coding Guidelines

This document guides implementation of the reverse proxy manager described in
[`features.md`](./features.md). The repository currently contains the
specification only; establish the application structure and tooling before
implementing features.

## Product and architecture decisions

- Use Node.js and JavaScript for the application, Docker Compose for VPS
  deployment, and SQLite for the initial database.
- Use an ORM with migrations to keep schema changes repeatable and make a
  future database change feasible. Verify database portability rather than
  assuming it.
- Prefer Traefik for dynamic container routing and automated Let's Encrypt
  certificates. Persist its certificate data. Document that public DNS must
  point to the VPS and the required inbound ports must be reachable.
- Use a Material Design component library for the frontend.
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
   - Choose the Node.js server and frontend structure, package manager, code
     style, linting, and test runners.
   - Add local development configuration and a Docker Compose baseline.
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
   - Add repository checkout, build, and start workflows using validated inputs
     and fixed, allowlisted operations.
   - Require an administrator to trigger deployments and show progress and
     actionable errors.
   - Protect credentials and avoid exposing deployment secrets in logs.
7. **Build the Material Design UI**
   - Implement login, site management, deployment controls, and status/error
     views.
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
- Use structured logging and avoid logging the full contents of requests or
  deployment environments.
- Use small, focused modules and descriptive names. Add comments only when they
  explain non-obvious decisions.
- Keep dependency additions necessary and maintained; document security-relevant
  configuration and defaults.

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
