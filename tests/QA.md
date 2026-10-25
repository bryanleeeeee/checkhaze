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


## Public custom-domain E2E — 25 October 2026, approximately 15:14–15:18 SGT

- https://checkhaze.com loaded over HTTPS with the latest brighter UI.
- PM2.5 and PSI loaded independently; initial missing PSI recovered. All five PM2.5 regions populated.
- Selecting Tampines updated the selected place, East region scene and activity planner.
- Playground preset and Save to my day created a local saved activity and exposed calendar recheck.
- Living-room preset produced 325 m³/h from 25 m² × 2.6 m × 5 ACH.
- Air quality, My day, Haze outlook and Haze guide navigation worked.
- Lighting keyboard selection switched to Evening preview; Auto restored; pause button changed to Play motion.
- Local two-hour weather, hourly history and multi-week outlooks loaded.
- Combined next-day/four-day outlook initially unavailable; Retry returned partial data. External source completeness is not guaranteed or reported as a pass.
- Four-week history loaded progressively, with missing dates visible and CSV enabled once observations arrived.
- Automated suite passed: toolkit calculations, all route handlers, invalid parameters, upstream/empty/partial responses, retry recovery, independent concurrent Worker I/O, completed-value caching, frontend timeouts/stale data/deduplication, geometry, PM band boundaries, time/weather themes and previews. Build and ESM validation passed.
- Mobile layout was checked at 375px in the preceding design pass without horizontal overflow.
- Not exercised in this cloud browser: real phone GPS consent/location, notification delivery, actual GPU WebGL (Canvas fallback rendered), and Blender execution.
