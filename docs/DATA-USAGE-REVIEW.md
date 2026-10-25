# CheckHaze data-use review — 25 October 2026

This is a source/terms review and remediation record, not legal certification. Current primary-source terms were checked on 25 October 2026.

## Permitted data route

The PM2.5 and PSI pages expressly permit personal/commercial use under the Singapore Open Data Licence. The app now obtains readings/history and 2-hour/4-day weather through data.gov.sg API endpoints only. Source, licence link, independent status and derived-analysis notices appear on the page; exported CSV rows carry attribution and licence information.

- https://data.gov.sg/datasets/d_e1058d6974c877257e32048ab128ad83/view
- https://data.gov.sg/datasets/d_fe37906a0182569d891506e815e819b7/view
- https://data.gov.sg/open-data-licence
- https://data.gov.sg/privacy-and-terms
- https://guide.data.gov.sg/developer-guide/api-overview/api-rate-limits

The licence allows commercial/non-commercial adaptation and derived applications, requires conspicuous source/licence attribution and forbids implied government endorsement. It excludes third-party, personal-data, trademark and design rights. Data is supplied without warranties and the licence includes indemnities; it does not eliminate operator liability.

## Removed pending separate agency permission

Previous versions scraped NEA/MSS/ASMC webpage paragraphs and extracted image URLs. Those are not assumed to be licensed API datasets. Automated webpage extraction and forecast image embedding have been removed. Longer-term publications are described using agency domain names without copied articles/images. Direct links to the restricted agency sites were removed because their terms also impose homepage-notification/deep-link permission conditions. Open-data portal links remain.

- https://www.haze.gov.sg/terms-of-use — clauses 4, 6, 8
- https://www.weather.gov.sg/mobile/mobile-terms-of-use/ — clauses 4, 6, 8
- https://asmc.asean.org/terms-of-use/ — clauses 4, 6, 8

Restoring this content requires written agency permission or an expressly applicable licence. No permission request was sent. Historical git commits may contain the earlier implementation and QA observations; those are not permission to reuse agency content. Current code has the scrapers removed.

## Privacy implementation

Precise coordinates are matched to a reporting region on the device and are neither persisted nor sent by application code. Location requires an explicit user action and browser consent. No app analytics or advertising trackers are included. Google-hosted font requests were removed. Preferences, plans, health-profile choice, watch settings, room inputs and checklist use browser storage with a clear-data control. Browser notifications are opt-in and app-open only. Public sharing/calendar exports happen only on user action.

Hosting necessarily processes IP addresses and request metadata. Sites/Cloudflare log retention, overseas processing and applicable processor agreements are not controlled or verified by this source review. Do not claim that no personal data is processed. A private operator/privacy contact and, where applicable, a DPO and PDPA processes should be established before commercial/personal-data operations. Do not use the public GitHub issue tracker to collect sensitive information.

## Operational and residual items

- API calls are paced, completed data cached and 429 responses respected, including numeric Retry-After. Anonymous realtime tier currently permits six requests per ten seconds. Pacing is per Worker isolate; distributed instances can still hit shared upstream quotas. Obtain a production API key and confirm the deployment's aggregate traffic quota before scaling; never commit a key.
- No official agency logos or proprietary map tiles are used. The 3D scene is original procedural illustration; this review is not an exhaustive trademark, architecture/design-right or freedom-to-operate opinion.
- Health guidance is informational, not diagnosis or emergency monitoring. Numeric multi-week haze predictions are not invented.
- GitHub source availability is not a licence to third-party data or agency content. Downstream users must comply with the data licence/API terms themselves.
- Platform terms, hosting privacy/retention, branding clearance and any operator-specific legal obligations remain to be reviewed for the intended business model. This review cannot guarantee compliance with every law or platform policy.

## Verification

Automated tests cover current/historical/weather routes, missing/partial data, retry recovery, API-only outlook behaviour, attribution and privacy notice presence. Build and ESM validation pass. Browser review should confirm the published notice and absence of embedded agency forecast graphics.
