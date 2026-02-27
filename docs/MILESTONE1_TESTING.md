# Milestone 1 – Testing Guide

Use this guide to verify that the Core Architecture & Weather Alert Engine works after you’ve added cities and buildings in the admin.

---

## What’s working (what to test)

| Area | Status | What to verify |
|------|--------|----------------|
| **Cities & buildings** | ✅ | You added them in admin; confirm they appear in DB and in Admin → Cities / Buildings. |
| **NWS integration** | ✅ | Hourly forecast is fetched by city (NWS office + grid). Test via forecast API or alert script. |
| **Alert rules per city** | ✅ | Each city has `alert_temp_delta` (°F) and `alert_window_hours`. Edit in Admin → Cities → edit city. |
| **Sudden fluctuation logic** | ✅ | Compares current temp vs temp at end of window; triggers if change ≥ threshold. |
| **Daily summary** | ✅ | First 24h of forecast → avg/min/max; compares to previous day. |
| **Alert events (internal)** | ✅ | When triggered, rows are written to `alert_logs` and can create `messages` for recipients. |
| **Database** | ✅ | Tables: `cities`, `buildings`, `recipients`, `alert_logs`, `messages`, `temperature_snapshots`. |

---

## 1. Quick checks in the app

- **Admin → Cities**
  - Your cities list.
  - Click a city: confirm **Alert temp delta** and **Alert window (hours)** and NWS grid (office, gridX, gridY) are set.

- **Admin → Buildings**
  - Buildings listed; each linked to a city.
  - At least one building **active** so alerts can generate messages.

- **Recipients (if you use messaging)**
  - Admin → Recipients (or equivalent): recipients linked to buildings so that when an alert is created, messages can be created.

---

## 2. Test NWS forecast (per city)

**Option A – Browser (needs auth)**
- Log in as admin.
- Call: `GET /api/weather/forecast/[cityId]`
  - Replace `[cityId]` with a real city ID from your DB.
- Response should include hourly forecast points (e.g. `time`, `tempF`).

**Option B – curl (with token)**
```bash
# 1. Get token (use your admin email/password)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YOUR_PASSWORD"}' | jq -r '.token')

# 2. Get city ID from Admin UI or: GET /api/cities

# 3. Fetch forecast for that city
curl -s "http://localhost:3000/api/weather/forecast/YOUR_CITY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

You should see hourly data for that city’s NWS grid.

---

## 3. Test alert logic (without sending messages)

This runs the **sudden fluctuation** and **daily summary** logic for a city and prints results. It does not call the cron endpoint or create alert logs.

```bash
npx tsx scripts/test-alert-logic.ts "New York"
```

- Replace `"New York"` with any city name you have in the DB.
- You’ll see:
  - Current temp, future temp (at window end), change (°F), threshold.
  - Whether an alert **would** trigger (`ALERT STATUS: TRIGGERED` vs `Normal`).
  - Daily summary: avg/min/max and daily Δ.

If the script fails, check:
- `.env` / `.env.local` has `POSTGRES_URL`.
- City exists and has valid `nws_office`, `nws_grid_x`, `nws_grid_y`.
- NWS API is reachable (no firewall blocking `api.weather.gov`).

---

## 4. Test full flow: trigger alert check (creates alert_logs)

This runs the real cron logic: for each active city it evaluates sudden fluctuation and, if threshold is met, creates an `alert_logs` row and can create messages.

**Start the app:**
```bash
npm run dev
```

**Trigger the check-alerts cron once:**
```bash
curl -X POST "http://localhost:3000/api/cron/check-alerts" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

- Use the same value as `CRON_SECRET` in `.env.local`.
- If the forecast actually has a big enough temp change within the city’s window, you should get:
  - A new row in `alert_logs` with `alert_type = 'sudden_fluctuation'`.
  - Rows in `messages` if you have recipients/buildings set up.

**Check that alert events exist:**
```sql
SELECT id, city_id, alert_type, temperature_data, threshold_used, triggered_at, processed
FROM alert_logs
ORDER BY triggered_at DESC
LIMIT 10;
```

---

## 5. Test daily summary (once per day)

Same idea as check-alerts, but for the daily summary alert type:

```bash
curl -X POST "http://localhost:3000/api/cron/daily-summary" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Then check:
```sql
SELECT * FROM alert_logs WHERE alert_type = 'daily_summary' ORDER BY triggered_at DESC LIMIT 5;
```

---

## 6. Things to look for (common issues)

| Issue | What to check |
|-------|----------------|
| **“City not found” in test script** | City name must match DB exactly (e.g. `"New York"`). Use name from Admin → Cities. |
| **No forecast / NWS errors** | City has correct NWS office and grid (e.g. NYC: OKX, 33, 35). Use Admin → Cities → edit or city search. |
| **Alert never triggers** | Real forecast might not have a ≥ threshold change in the window. Lower `alert_temp_delta` (e.g. to 2) or shorten `alert_window_hours` temporarily to test. |
| **Cron returns 401** | Request must include header `x-cron-secret` with the same value as `CRON_SECRET` in env. |
| **No rows in alert_logs** | Either no active cities, or no city’s forecast met the threshold. Run `scripts/test-alert-logic.ts` to see “would trigger” for that city. |
| **Messages not created** | Need at least one building and recipient (and building active). Check `recipients` and `buildings` tables and Admin UI. |

---

## 7. Cron schedule (production)

On Vercel, cron runs on a schedule. For Milestone 1 the important ones are:

- **Check alerts (sudden fluctuation):** e.g. every hour (`0 * * * *`) → `/api/cron/check-alerts`
- **Daily summary:** e.g. once per day at 7:00 (`0 7 * * *`) → `/api/cron/daily-summary`

Add these in **Vercel → Project Settings → Cron Jobs** (or via `vercel.json` as in `SETUP.md`). Ensure `CRON_SECRET` is set in Vercel env.

---

## Summary

- **Working:** Cities/buildings in admin, NWS hourly forecast per city, configurable degree/window per city, sudden fluctuation + daily summary logic, `alert_logs` and internal alert events.
- **Test without cron:** Use `npx tsx scripts/test-alert-logic.ts "City Name"`.
- **Test full flow:** Call `POST /api/cron/check-alerts` and `POST /api/cron/daily-summary` with `x-cron-secret`, then inspect `alert_logs` (and `messages` if recipients exist).
