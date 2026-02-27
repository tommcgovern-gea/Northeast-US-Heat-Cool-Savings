# Milestone 1 — Testing Guide for Client

**Project:** Northeast US Heat-Cool Savings  
**Milestone:** 1 — Core Architecture & Weather Alert Engine  
**Purpose:** Step-by-step instructions so you can verify that all MS-1 deliverables work as expected.

---

## What is Milestone 1?

Milestone 1 delivers:

- **Project setup** — App runs on the cloud with database and storage.
- **City and building setup** — Initial NYC configuration; you can manage cities and buildings.
- **Weather data** — Integration with the National Weather Service (NWS) for hourly forecasts.
- **Alert rules** — Configurable temperature-change threshold and time window per city.
- **Daily summary** — Calculation of average, min, and max temperature and change from the previous day.
- **Admin configuration** — You can configure alert rules and NWS settings per city from the admin UI.
- **Database** — Cities, buildings, recipients, and alert logs are stored and used correctly.
- **Alert events** — The system detects forecast-based temperature changes and creates internal alert events (and can send messages).

This guide walks you through testing each of these.

---

## What you need before starting

- **Admin login** — Email and password for the admin portal.
- **CRON secret** — A secret value (same as in the project’s `.env` file) for triggering cron jobs. Your developer can provide this.
- **Running app** — The application running locally (`npm run dev`) or at a deployed URL you’re given.

---

## Quick test path (5 minutes)

If you only have a few minutes, do this:

1. Log in to the **Admin** portal.
2. Open **Cities** — you should see at least one city (e.g. New York).
3. Open a city and confirm you can see and edit **Alert Temperature Delta** and **Alert Window (hours)**. Save and re-open to confirm values are saved.
4. Open **Dashboard** → **Recent Alerts**. After cron jobs have run, you should see alert types like “sudden fluctuation” or “daily summary”.
5. Open **Buildings** and **Recipients** and confirm you can view (and, if applicable, add) buildings and recipients.

If all of the above work, the main MS-1 flows are in place. The sections below give detailed steps for each deliverable.

---

## 1. Project setup (database and app)

**What we’re checking:** The app starts, connects to the database, and has the required configuration.

| Step | What to do | What you should see |
|------|------------|----------------------|
| 1.1 | Confirm with your developer that `.env` contains `POSTGRES_URL` and `CRON_SECRET`. | No “missing env” errors when the app runs. |
| 1.2 | Ensure the database schema has been applied once (e.g. `psql $POSTGRES_URL < src/lib/db/schema.sql`). | Schema applied without errors. |
| 1.3 | Run `npm install` and then `npm run dev` (or open the deployed URL). | App starts; homepage loads; no database connection errors in the console. |

**Sign-off:** The app loads and the database is connected.

---

## 2. City and building structure (NYC trial)

**What we’re checking:** You can manage cities and buildings, and the initial NYC (or trial) configuration is present.

| Step | What to do | What you should see |
|------|------------|----------------------|
| 2.1 | Run `npm run db:seed` (or ask your developer to run it once). | Console shows something like “NYC city created” with a city ID. |
| 2.2 | Log in as Admin and go to **Cities** (menu or `/admin/cities`). | A list with at least one city (e.g. New York) and NWS office/grid info. |
| 2.3 | Open a city, change name/state/NWS office/Grid X/Y, then Save. | Changes are saved; the list updates when you return. |
| 2.4 | Go to **Buildings**, add a building and link it to a city, then Save. | The new building appears in the list under that city. |

**Sign-off:** NYC (or trial city) exists, and cities and buildings can be created, edited, and listed.

---

## 3. National Weather Service (NWS) forecast integration

**What we’re checking:** The app fetches hourly forecast data from the NWS (or uses mock data if NWS is unavailable).

| Step | What to do | What you should see |
|------|------------|----------------------|
| 3.1 | Run `npm run test:alert-logic` (from the project root, or ask your developer to run it). | Output includes “NWS API Call … Status: 200” and a list of forecast temperatures. |
| 3.2 | (Optional) If you have API access, call `GET /api/weather/forecast/[cityId]` with an auth token. | Response includes a `forecast` array with hourly `time` and `tempF` for that city. |

**Sign-off:** Live NWS data is returned (or mock data if NWS is down), and the forecast structure looks correct.

---

## 4. Configurable alert logic (degree and time window)

**What we’re checking:** You can set and save the alert temperature change (e.g. °F) and the time window (hours) per city.

| Step | What to do | What you should see |
|------|------------|----------------------|
| 4.1 | In Admin, go to **Cities** and open a city (e.g. New York). | The city edit form opens. |
| 4.2 | Set **Alert Temperature Delta (°F)** (e.g. 5) and **Alert Window (hours)** (e.g. 6), then Save. | A success message and no errors. |
| 4.3 | Reload the page or open the city again. | The values are still 5°F and 6 hours. |

**Sign-off:** The degree threshold and time window are editable per city and persist after save.

---

## 5. Daily summary temperature calculation

**What we’re checking:** The system calculates daily average, min, max, and change from the previous day, and you can see the result.

| Step | What to do | What you should see |
|------|------------|----------------------|
| 5.1 | Run `npm run test:alert-logic`. | In the output, a **“Daily Summary Preview”** section with Avg Temp, Min Temp, Max Temp, and Daily Δ. |
| 5.2 | With the app running, run the daily-summary cron (see **Appendix A** below) or ask your developer to run it. | A JSON response with `citiesProcessed`, `summariesCreated`, and `timestamp`. |
| 5.3 | In Admin, go to **Dashboard** → **Recent Alerts**. | After the cron has run, rows with type **“daily summary”** and the correct date appear. |

**Sign-off:** The daily summary calculation runs (via script and cron), and daily summary alerts show on the dashboard.

---

## 6. Admin capability to configure rules per city

**What we’re checking:** All alert and NWS-related settings for a city can be changed from the admin UI and are saved.

| Step | What to do | What you should see |
|------|------------|----------------------|
| 6.1 | In Admin, go to **Cities** and open a city. | The form shows: Alert Temperature Delta, Alert Window (hours), NWS Office, Grid X, Grid Y. |
| 6.2 | Change each of these fields and Save. | Success; no validation errors. |
| 6.3 | Open the city again. | All updated values are still there. |

**Sign-off:** All rule-related fields are editable per city and persist.

---

## 7. Database structure (cities, buildings, recipients, alert logs)

**What we’re checking:** Cities, buildings, recipients, and alert logs are stored and manageable from the admin UI.

| Step | What to do | What you should see |
|------|------------|----------------------|
| 7.1 | **Cities:** In Admin → Cities, list, create, edit, and (if applicable) soft-delete a city. | Operations succeed and the list reflects changes. |
| 7.2 | **Buildings:** In Admin → Buildings, list, create, and link a building to a city. | Buildings list and links to cities are correct. |
| 7.3 | **Recipients:** In Admin → Recipients, add a recipient to a building (name, email/phone, preference). | The recipient appears for that building. |
| 7.4 | Run the check-alerts or daily-summary cron (see **Appendix A**), or ask your developer to run it. | No 500 errors. |
| 7.5 | In Admin → **Dashboard** → **Recent Alerts**. | A table of alert rows with type and date (e.g. “sudden fluctuation”, “daily summary”). |

**Sign-off:** Cities, buildings, recipients, and alert logs are present and usable from the admin UI.

---

## 8. Forecast-based alerts and internal alert events

**What we’re checking:** The system detects temperature changes from the forecast and creates internal alert events (and messages where configured).

| Step | What to do | What you should see |
|------|------------|----------------------|
| 8.1 | Run the check-alerts cron (see **Appendix A**). | A JSON response with `citiesChecked`, `alertsFired`, `alertIds`, and `timestamp`. |
| 8.2 | If the forecast meets the threshold, open Admin → **Dashboard** → **Recent Alerts**. | At least one **“sudden fluctuation”** alert for a city. |
| 8.3 | Run the daily-summary cron (see **Appendix A**). | A response with `summariesCreated`; **Recent Alerts** shows **“daily summary”** entries. |
| 8.4 | In Admin → **Messages**. | After crons have run, messages of type **alert** or **daily_summary** for buildings/recipients. |

**Sign-off:** Check-alerts and daily-summary crons run successfully and produce alert events and messages visible in the admin UI.

---

## Quick reference table

| # | Deliverable | How to test |
|---|-------------|-------------|
| 1 | Project setup | App starts; `POSTGRES_URL` and `CRON_SECRET` in `.env`; schema applied. |
| 2 | City & building (NYC) | `npm run db:seed`; Admin → Cities & Buildings → create/edit/list. |
| 3 | NWS forecast | `npm run test:alert-logic`; see NWS 200 and forecast output. |
| 4 | Alert rules (degree/window) | Admin → Cities → open city → set Alert Delta & Window → Save; confirm they persist. |
| 5 | Daily summary | `npm run test:alert-logic` → “Daily Summary Preview”; run daily-summary cron → Recent Alerts. |
| 6 | Admin config per city | Admin → Cities → edit all rule fields → Save → re-open to confirm. |
| 7 | DB (cities, buildings, recipients, alerts) | Admin: Cities, Buildings, Recipients; run crons → check Recent Alerts. |
| 8 | Alert events | Run check-alerts and daily-summary cron with `x-cron-secret`; check Recent Alerts and Messages. |

---

## Appendix A — Cron commands

Replace `YOUR_CRON_SECRET` with the value from the project’s `.env`. Replace `http://localhost:3000` with your app URL if different.

**Check for sudden temperature fluctuations (e.g. run hourly):**

```bash
curl -X POST http://localhost:3000/api/cron/check-alerts -H "x-cron-secret: YOUR_CRON_SECRET"
```

**Generate daily temperature summaries (e.g. run once per day):**

```bash
curl -X POST http://localhost:3000/api/cron/daily-summary -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## Appendix B — Useful scripts

Run from the project root (or ask your developer to run them):

```bash
# Seed NYC city (one-time)
npm run db:seed

# Test alert logic and daily summary (uses DB and NWS)
npm run test:alert-logic
# Optional, for another city: npm run test:alert-logic "Boston"
```

---

If anything doesn’t match “What you should see,” note the step number and what you saw and share that with your development team.

*Milestone 1 — Core Architecture & Weather Alert Engine. Testing guide for client handoff.*
