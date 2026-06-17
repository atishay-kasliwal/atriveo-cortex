# Git push → Cloudflare deploy

Pushes to **`main`** trigger [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):

| Job | Target |
|-----|--------|
| `deploy-api` | Worker `cortex-api` → `cortex.atriveo.com/api/*` |
| `deploy-ui` | Pages `cortex-ui` → `cortex.atriveo.com` |

Manual deploy: **Actions → Deploy to Cloudflare → Run workflow**.

## One-time GitHub secrets

In **GitHub → atriveo-cortex → Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with **Workers Scripts Edit** + **Cloudflare Pages Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | `a4e4f5c1214af712b0f5f48ef7c722ec` |

Create token: [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Edit Cloudflare Workers** template (includes Pages).

### CLI (optional)

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo atishay-kasliwal/atriveo-cortex
gh secret set CLOUDFLARE_ACCOUNT_ID --repo atishay-kasliwal/atriveo-cortex
# paste values when prompted
```

## Cloudflare secrets (not in GitHub)

These stay on Cloudflare only:

| Secret | Where | Purpose |
|--------|-------|---------|
| `DATABASE_URL` | Worker secret (`wrangler secret put DATABASE_URL`) | Neon PostgreSQL |

```bash
cd workers/cortex-api
npx wrangler secret put DATABASE_URL
```

## Pages production env (dashboard)

SSR prefetch needs this on the **Pages project** (not in the workflow):

| Variable | Value |
|----------|-------|
| `API_URL` | `https://cortex.atriveo.com` |

Set in [Cloudflare Pages → cortex-ui → Settings → Environment variables](https://dash.cloudflare.com/) → Production.

## Verify after push

```bash
curl -s https://cortex.atriveo.com/api/health
curl -sI https://cortex.atriveo.com/ | head -1
```

GitHub Actions tab should show both jobs green.

## Local deploy (unchanged)

```bash
npm run worker:deploy
npm run pages:deploy
```
