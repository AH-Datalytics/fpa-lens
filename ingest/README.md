# Tropical weather ingest

Python pipeline behind **`/environment/tropical-weather`**. Runs on a ~15-minute
cron (`.github/workflows/tropical-ingest.yml`), pulls National Hurricane Center
products, normalizes them to GeoJSON/JSON, and uploads everything — plus a
`manifest.json` index recording the current mode and any active storms — to the
public tropical Vercel Blob store. The dashboard reads that manifest directly
from the browser, so a data update never requires a deploy or a commit.

Originally built by Jeff Asher as the standalone
[AH-Datalytics/gulf-watch](https://github.com/AH-Datalytics/gulf-watch) project;
the `gulfwatch` package name is kept so fixes can still be traded with upstream.

## What it produces

| Blob path | Contents |
| --- | --- |
| `manifest.json` | Mode (`quiet`/`active`), storm list, outlook pointers, per-product `errors` |
| `storms/<id>/cone.geojson` | NHC forecast cone |
| `storms/<id>/track.geojson` | Official forecast track + points |
| `storms/<id>/wwlines.geojson` | Coastal watch/warning segments |
| `storms/<id>/models.geojson` | A-deck model guidance tracks |
| `storms/<id>/intensity.json` | Per-model max-sustained-wind series |
| `storms/<id>/probs.json` | Wind speed probabilities at named points |
| `storms/<id>/text.json` | Public advisory + forecast discussion |
| `outlook.geojson` / `outlook.json` | Seven-day genesis outlook (quiet mode) |

Per-product failures are recorded in `manifest.json`'s `errors` list and surfaced
in the page's "Some products are temporarily unavailable" disclosure; the run
still exits 0. Only a whole-run failure exits non-zero.

## Environment

Two variables, both deliberately prefixed so they can never be confused with the
repo's other two blob stores (`BLOB_READ_WRITE_TOKEN` is the lakefront forecast
store; `CMS_MEDIA_BLOB_TOKEN` is Payload media). Do not point them at each other.

- `TROPICAL_BLOB_READ_WRITE_TOKEN` — read/write token for the tropical store
- `TROPICAL_BLOB_BASE_URL` — that store's public base URL

They live in GitHub Actions secrets. The frontend separately needs
`NEXT_PUBLIC_TROPICAL_BLOB_BASE_URL` (same value as `TROPICAL_BLOB_BASE_URL`) in
Vercel, since the browser fetches the manifest itself.

## Running locally

```bash
pip install -r ingest/requirements.txt
cd ingest
TROPICAL_BLOB_READ_WRITE_TOKEN=... TROPICAL_BLOB_BASE_URL=... python ingest.py
```

It prints one summary line (`mode`, storm count, error count).

## Tests

```bash
python -m pytest ingest/tests/ -q
```

Network access is faked throughout; no live NHC or blob calls.

## Data sources and credits

- National Hurricane Center — current storms, cone/track/watch-warning graphics,
  A-deck model guidance, tropical weather outlook
- National Weather Service — active alerts (fetched client-side by the page)
- NOAA CO-OPS — tide gauge observations (fetched client-side)
- Iowa Environmental Mesonet — NEXRAD radar tiles (fetched client-side)
