# AirportFaster Launch Checklist

## Infrastructure
- [ ] Production PostgreSQL provisioned and migrated
- [ ] Production Redis provisioned
- [ ] S3 bucket created, CORS configured, access keys set
- [ ] CDN configured (CloudFront or similar)
- [ ] SSL certificate provisioned
- [ ] Domain pointed to production

## Environment Variables
- [ ] All env vars from .env.example set in production
- [ ] STRIPE_SECRET_KEY is live mode key
- [ ] STRIPE_WEBHOOK_SECRET registered for production webhook endpoint
- [ ] OPENAI_API_KEY set with spend limits configured
- [ ] SMTP credentials configured and tested
- [ ] REVALIDATE_SECRET set and matches web app
- [ ] SESSION_SECRET is a strong random value (not default)

## Pre-Launch Verification
- [ ] At least one airport published and visible at /airports/[slug]
- [ ] At least one service configured with pricing
- [ ] At least one supplier assigned to the airport+service
- [ ] Stripe live mode test booking completed end-to-end
- [ ] Webhook endpoint verified in Stripe dashboard
- [ ] Email confirmation received for test booking
- [ ] Admin login works with production credentials
- [ ] Sitemap accessible at /sitemap.xml
- [ ] robots.txt accessible at /robots.txt
- [ ] Google Search Console verified
- [ ] Sentry errors flowing to production project
- [ ] PostHog analytics firing on production

## Security
- [ ] RBAC permissions verified for each admin role
- [ ] Rate limits tested under load
- [ ] All API endpoints require auth where expected
- [ ] No .env files committed to git
- [ ] Stripe webhook signature validation tested

## Performance
- [ ] Lighthouse score ≥ 90 on /airports/[slug]
- [ ] Core Web Vitals passing in Search Console
- [ ] DB indexes verified (run EXPLAIN ANALYZE on key queries)

## Post-Launch (First 48h)
- [ ] Monitor Sentry for new errors
- [ ] Monitor Stripe dashboard for payment failures
- [ ] Verify first real booking completes end-to-end
- [ ] Check PostHog funnel data is populating
