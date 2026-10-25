# Data-loading verification — 24 October 2026 (Singapore)

Live checks executed against the actual Worker route handlers and official upstream services from the executor. Production browser authentication was not bypassed. Preview network does not permit the upstream services; browser checks cover loading/failure controls and mobile layout.

- Current PM2.5 and PSI: HTTP 200, all five regions, observation 21:00 SGT. Initial requests took 12.0 s and 0.3 s respectively.
- Legacy combined current endpoint: HTTP 200, both metrics.
- Local weather: HTTP 200, 47 areas, validity 21:00–23:00 SGT.
- Haze/four-day outlook: weather, regional narrative, situation and forecast graphic available.
- Extended outlook: Singapore fortnightly, regional subseasonal and seasonal cards available.
- Hourly history: first request had one failed PM2.5 date; retry returned 49 observations for each metric with no errors.
- Eight weekly chunks: first pass returned all 28 PSI dates and 27 PM2.5 dates. Retrying the affected PM2.5 chunk recovered the missing date but two other date requests failed. The union of successfully loaded dates covers all 28 dates. The client retains successful days when retrying. Upstream reliability is intermittent; a single-pass guarantee is not claimed.

Automated checks: node tests/toolkit.test.mjs; node tests/loading.test.mjs; node tests/frontend-loading.test.mjs. Additional real-data DOM harness exercised rendering of historical metrics and partial failures. Build and Worker artifact validation passed.

Coverage: progressive independent air readings, source failure, timeout, empty response, partial result, retry recovery, stale readings, request deduplication, invalid history parameters, all weekly chunks, CSV and statistical calculations. Partial endpoint responses are no longer retained in the route cache, so retry can refill gaps. History has a 65-second browser timeout to allow paced upstream requests to complete.

Mobile preview: 375 px content and scroll width, source panel and retry controls inspected. No production signed-in end-to-end claim.

Final browser result: history completed with PM2.5 28/28 days and PSI 28/28 days, 100% completed-date coverage. Outlook retry recovered the four-day weather forecast; next-day haze graphic and regional narrative remained unavailable from the official source.
