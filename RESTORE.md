# Pathly November 2026 — restore and run

The formal working directory is `/Users/conths/Desktop/Pathly`.
Remote: https://github.com/Looly322/Pathly.git
Branch: `recovery-2026-11`. Earlier Git history is preserved.

## Fresh restore

```sh
git clone --branch recovery-2026-11 https://github.com/Looly322/Pathly.git
cd Pathly
npm ci
cp .env.example .env.local
cp backend/.env.example backend/.env
```

Requires Node >=22.12 and Python 3 (tested with 3.14). Backend runtime uses only Python standard library; see backend/requirements.txt.
Set `VITE_AMAP_KEY` in .env.local and the matching `AMAP_JS_KEY` and `AMAP_SECURITY_CODE` in backend/.env. Keep `VITE_AMAP_SERVICE_HOST=/_AMapService`. Security code is backend-only. Optional `OPEN_TRIP_MAP_API_KEY` improves global live-place retrieval. Open-Meteo and Wikimedia public queries require no key in this implementation.

```sh
chmod 600 .env.local backend/.env
npm run dev
```

Open http://localhost:5173 . Python listens at 127.0.0.1:8787. Check port ownership before starting: dev reuses an already-running backend. Stop only the identified previous Pathly process, not unrelated services. Vite proxies /api and /_AMapService. The local preview requires these processes to remain running; it is not permanent hosting.

```sh
npm test
npm run test:global
npm run build
```

All runtime images, fonts and the supplied November video are committed directly in Git, not Git LFS. Built dist and node_modules are regenerated. Do not publicly serve backend or local .env files.

## What GitHub intentionally does not store

Real API credentials; browser localStorage history, favorites and drafts; runtime SQLite/image/weather caches; raw Codex conversation extracts and build/dependency folders. Configure credentials again after losing the Mac. Store them separately in a secure password manager. Browser records are local to the original browser/profile/origin and are not cloud-synced by this backup. Existing original directories and their caches have not been deleted.

The desktop copy retains the required private .env files, ignored by Git with mode 600. See reports/quality-repair/REPORT.md for current feature limitations and recovery evidence. The optional OpenTripMap key is not currently configured; fallback data is clearly labelled.
