# Original Douay-Rheims Bible

The Original Douay-Rheims Bible online: the first complete English Catholic Bible, translated from the Latin Vulgate between 1582 and 1610. Read at [douayrheimsbible.net](https://douayrheimsbible.net).

## Stack

- **SvelteKit 2** with Svelte 5
- **Cloudflare Pages** (static assets) + **Cloudflare Workers** (dynamic routes)
- **Tailwind CSS 3**
- **TypeScript**
- GitHub Actions for CI/CD with automatic CDN cache purge on deploy

## Local Development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

## Build

```bash
npm run build
```

The `prebuild` step (`scripts/prepare-data.ts`) compiles raw source data into optimised JSON bundles consumed at runtime. This runs automatically before every build.

## Deploy

Deployments are handled by GitHub Actions on push to `main`. The workflow:

1. Runs `npm run build`
2. Publishes to Cloudflare Pages via Wrangler
3. Purges the Cloudflare CDN cache

Secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`.

## Project Structure

```
src/
  routes/         # SvelteKit pages and API endpoints
    odr/          # Bible reader (routed through Worker for cache safety)
    compare/      # Side-by-side translation comparison
    search/       # Full-text search
    history/      # Editorial articles on the Bible's history
  lib/
    components/   # Shared UI components
    data/         # Data loaders and type definitions
scripts/
  prepare-data.ts # Build-time data pipeline
static/           # Favicons, webmanifest, robots.txt
```

## Routing Architecture

ODR chapter pages (`/odr/*/*`) are served through the Cloudflare Worker rather than as static assets. This ensures the HTML always references the current build's asset hashes, preventing stale-chunk MIME errors when Cloudflare's CDN caches old HTML.

## License

All rights reserved. Source available for reference.
