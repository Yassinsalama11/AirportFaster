# AirportFaster Infrastructure Scaffold

## Local Services

Local development depends on PostgreSQL and Redis. Start them from the repository root:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Default local endpoints:

- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/airportfaster_dev`
- Redis: `redis://localhost:6379`

The application reads runtime configuration from `.env`; copy `.env.example` to `.env` and keep real secrets out of source control.

## Environment Tiers

AirportFaster is structured for three deployable tiers:

- `development`: local developer machines and disposable test databases.
- `staging`: production-like validation for migrations, Stripe webhooks, S3 uploads, email, WhatsApp templates, Sentry, and PostHog.
- `production`: customer-facing infrastructure with managed PostgreSQL, managed Redis, private/public S3-compatible buckets, CDN, Stripe live keys, Sentry, and PostHog.

Each tier must provide the same environment variable contract documented in `.env.example`. Values differ by tier; variable names do not.

## CI

GitHub Actions runs on pushes and pull requests to `main` and `develop`:

```text
install -> prisma generate -> typecheck -> lint -> test -> build
```

The CI workflow is intentionally conservative for Sprint 0. Deployment jobs, migration promotion, preview environments, and smoke tests should be added only after the core booking and admin flows are present.

## Secrets

No secrets belong in this repository. Use provider-level secret stores for deployed environments and a local `.env` file for development. `.env.example` is the public contract and must stay aligned with code references.
