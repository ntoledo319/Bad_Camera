# Deploy the camera-data site (one time, ~5 minutes)

Free Cloudflare Pages site that serves U.S. camera data to the app, plus the privacy policy and
terms pages the app stores need. After setup it rebuilds itself every day.

## You need

- A free Cloudflare account (you have one).
- This repo on your Mac, with `npm ci` done and `gh` logged in (it is).

## Do it

```bash
cd ~/Downloads/Bad_Camera
npm run data:deploy
```

The script:

1. Checks everything and verifies the built site in `data-site/dist`.
2. Opens a browser to log in to Cloudflare (click **Allow**).
3. Creates the Pages project `sightline-data` and uploads the site.
4. Checks the live site (`https://sightline-data.pages.dev`).
5. Shows a link that pre-fills a **Pages-only** API token. Click **Continue to summary → Create
   Token**, copy it, paste it into the terminal (hidden). It is stored as a GitHub secret, never
   printed or saved to disk.
6. Starts the daily GitHub Actions job.

Rehearse without changing anything: `npm run data:deploy -- --dry-run`.

## After that

- **Daily at 07:23 UTC** `.github/workflows/data-site.yml` rebuilds from OpenStreetMap, verifies,
  and redeploys. Areas whose query fails keep yesterday's copy. Watch runs:
  `gh run list --workflow data-site.yml`.
- **Store listings:** use `https://sightline-data.pages.dev/privacy.html` as the privacy-policy URL
  and `/terms.html` for terms.
- **If the name was taken**, Cloudflare gives a different `*.pages.dev` address. The script prints
  it and stores it for the workflow; put it in `src/data/dataHost.ts` (`DATA_HOST`) and commit.
- **Edit the pages:** change `content/legal/policies.ts` or `tools/data-site/pages.ts`, then
  `npx tsx tools/data-site/build.ts --pages-only true` to preview locally. The next daily run
  publishes it.

## Costs and limits

Cloudflare Pages free plan (checked Oct 2026): static requests are free, 500 builds/month,
20,000 files, 25 MiB per file. This site uses one deploy a day, about 530 files, largest tile about 1.2 MB.
GitHub Actions is free for this public repo. Overpass (OpenStreetMap) is a volunteer service:
the job makes one small query per map area, pauses between them, and backs off when servers are
busy.
