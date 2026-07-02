# Showing a Power BI report on your screens

Source: https://help.pisignage.com/hc/en-us/articles/58058827745049-Showing-a-Power-BI-report-on-your-screens
Keywords: powerbi, integration

A step-by-step guide to putting a Microsoft Power BI report on a digital sign with piSignage — connecting your Power BI account, adding a report, and choosing exactly which page(s) each screen shows.

Connection options & approximate cost

There are three ways to get a Power BI report onto a screen. You pick one when you connect (Step 1). These costs are paid by you directly to Microsoft — piSignage adds no Power BI charge of its own. Figures are approximate (Microsoft pricing, early 2026); re-check before you commit.

Option
Best for
Approx. Microsoft cost

Sign in with Microsoft (user owns data)
The quickest, cheapest start; a few screens; one team

~$10 / month — one Power BI Pro licence for the account that signs in

Service Principal (app owns data)
Production; many screens; runs unattended for years; multiple teams

~$750 / month and up — a Power BI Embedded capacity (entry "A1" tier; larger tiers cost more)

Publish to Web (public link)
Non-confidential numbers only (lobby stats, public dashboards)

$0 — but the report is publicly viewable by anyone with the link

Quick guidance:

-
Just trying it out, or a handful of internal screens? Use Sign in with Microsoft — one Pro licence, one click, done.

-
Confidential data, many screens, must run untouched for a long time? Use a Service Principal. It costs more but doesn't break when someone changes a password or leaves the company.

-
The numbers aren't sensitive at all? Publish to Web is free — just remember anyone with the URL can see it. Set it up in Power BI itself and paste the public URL as a normal web link (not a PowerBI Report asset).

If you're unsure which options your organisation allows, ask whoever manages your Microsoft 365 / Power BI tenant.

Before you start

You need:

- A full-rights login to your piSignage account.

- A Power BI report you can already open in app.powerbi.com.

- One of:
- a Microsoft account that can sign in to Power BI (for the one-click Sign in with Microsoft option), or

- Service Principal credentials from your IT team (Tenant ID, Client ID, Client Secret) if your organisation uses that method.

You only connect Power BI once for the whole account. After that you can add as many reports to as many screens as you like.

Step 1 — Connect Power BI (one time)

- Go to Settings → Power BI Integration.

- Choose one:
-
Sign in with Microsoft (recommended for most people) — you'll be sent to Microsoft's login page. Sign in with the account that can see your reports and approve the permissions prompt. You'll return to piSignage showing Connected.

-
Service Principal tab — paste the Directory (Tenant) ID, Application (Client) ID, and Client Secret your IT team gave you, then Save credentials.

- The page shows a green Connected status (and, for the Microsoft option, the signed-in account name).

If you ever see "Power BI is not connected" while adding a report, come back here and reconnect.

Step 2 — Find your Workspace ID and Report ID

Open the report in app.powerbi.com and look at the browser URL:

https://app.powerbi.com/groups/<WORKSPACE_ID>/reports/<REPORT_ID>/ReportSection

- The value right after groups/ is the Workspace ID.

- The value right after reports/ is the Report ID.

Copy both.

Step 3 — Add the report as an asset

- Go to Assets and add a new link.

- For the link type, choose PowerBI Report.

- Fill in:
-
Name — a friendly name for this screen content.

-
Workspace ID and Report ID — from Step 2.

-
Page duration (seconds) — optional; see Step 4.

-
Pages to show — optional; see Step 4 (this is the key part).

-
Row-Level Security — optional, advanced; only used with Service Principal. Leave collapsed if you don't know what it is.

- Save. The report is now an asset you can put into any playlist / schedule like any other content.

Step 4 — Choose which page(s) the screen shows

A Power BI report often has several pages (tabs). You no longer have to split a report into separate reports just to show one page on one screen — pick the pages right here.

In the Pages to show section:

- Make sure the Workspace ID and Report ID are filled in and Power BI is connected.

- Click Load pages. piSignage fetches the report's pages and lists them by their friendly names as checkboxes.

- Tick the page(s) you want, then save.

What your selection does:

You select…
The screen shows…

Nothing
The whole report (its default page, or every page in rotation if you set a page duration). This is the original behaviour.

Exactly one page
Only that page, fixed. No rotation, regardless of page duration.

Several pages
Rotates through only those pages, in the order you ticked them — set a Page duration so it knows how long to stay on each.

Page duration controls rotation speed (seconds per page). It applies when you've selected several pages, or when you've selected nothing and want the whole report to cycle. It's ignored when a single page is pinned. Leave it blank to disable rotation.

Tips

-
Different screens, different pages, one report. Add the same report as several assets, each pinned to a different page — e.g. a "Sales" screen and an "Operations" screen from one dashboard.

-
Re-Load pages after you change the Workspace/Report ID so the list matches the new report.

- If you edit the report in Power BI and rename or delete a page you'd pinned, the screen automatically falls back to showing the whole report instead of going blank — but you should re-open the asset and re-pick the pages.

Step 5 — Put it on a screen

Add the Power BI asset to a playlist (and schedule/group) exactly like any image or video. The player loads the live report, keeps the session token refreshed automatically in the background, and applies your page selection.

Editing a report later

Open the asset and click into its link details. You can change the Workspace/Report ID, page duration, and page selection, then Update. Click Load pages again if you changed the report. Your previously selected pages are shown so you can see what's currently configured.

Note: you cannot rename a Power BI link in place — if you need a different name, delete it and create a new one.

Troubleshooting

Symptom
Likely cause / fix

"Power BI is not connected" in the add/edit form
No credential saved, or it broke (password change, MFA, admin sign-out, expired secret). Go to Settings → Power BI Integration and reconnect.

"Load pages" shows an error
Workspace ID or Report ID is wrong, the connected account can't see that report, or Power BI isn't connected. Double-check the IDs from the Power BI URL and that the report opens for the signed-in account.

Screen shows an error message ("Access denied", "Report not found", "Temporarily unavailable")
See If a screen shows an error message below.

Screen shows the wrong / all pages
No pages were selected, or the pinned page was renamed/deleted in Power BI. Re-open the asset, Load pages, re-tick the right pages, Update.

Pages don't rotate
You pinned a single page (single page never rotates), or no Page duration is set for a multi-page selection. Set a duration.

Report stops after a while
Usually a connection that went stale (sign-out, secret expired). Reconnect under Settings; the player recovers on its own once the credential is healthy.

If a screen shows an error message

When a Power BI report can't be loaded, the screen displays a clean error page (dark background, large message) instead of going blank. The page retries automatically every 5 minutes, so once you fix the underlying issue, the screen recovers on its own — you don't need to restart the player or re-deploy the playlist.

At the bottom of each error page is a small line of technical details (screen ID, asset ID, timestamp). Include those if you contact support.

Three messages are possible:

"Access denied · 403"

Power BI accepted the sign-in but refused to hand over the report. Almost always one of these:

-
(Service Principal) The app isn't a member of the workspace. In Power BI, open the workspace → Access → add your application as Member or Admin (Contributor is not enough for embed tokens).

-
(Service Principal) The workspace isn't on a paid capacity. Service-principal embedding requires the workspace to be assigned to a Power BI Embedded, Premium, or Fabric capacity (a regular Pro workspace returns 403 here). Open the workspace settings and set a License mode that includes a capacity — this is the ~$750/mo "A1" tier mentioned under Connection options.

-
(Service Principal) Your tenant blocks service-principal API access. A Power BI admin must go to Admin portal → Tenant settings → "Allow service principals to use Power BI APIs" and enable it for the app (or its security group).

-
(Row-Level Security) The RLS username is set, but the dataset has no matching role. Either clear the RLS fields on the asset, or add the role to the dataset in Power BI.

"Report not found · 404"

Power BI couldn't find that workspace + report combination. Common causes:

-
The report was deleted or re-published in Power BI. Re-publishing can produce a new Report ID. Open the report in app.powerbi.com, copy the fresh Report ID from the URL, and update the asset in piSignage (Edit → paste new Report ID → Load pages → Update).

-
The Workspace ID or Report ID is wrong. Copy/paste mistake, or the wrong GUID. Verify both against the URL in app.powerbi.com.

-
(Service Principal) The app isn't a member of the workspace. When the app can't see the workspace at all, Power BI returns "not found" rather than "access denied", to avoid revealing whether the workspace exists. Add the app as in the 403 case above.

-
The report lives in "My workspace". Personal workspaces are invisible to external apps. Move the report into a regular (group) workspace in Power BI.

"Temporarily unavailable"

Anything else — usually the Power BI connection itself needs attention:

-
The Microsoft sign-in expired or was revoked (password change, MFA prompt, admin sign-out, long period of inactivity). Go to Settings → Power BI Integration and reconnect.

-
(Service Principal) The client secret expired or was rotated. Service-principal secrets typically last 6–24 months. Ask your IT team for a fresh secret, then update it under Settings → Power BI Integration.

-
The asset configuration in piSignage is missing or corrupt — rare; re-save the asset.

-
Brief network or Microsoft outage. No action needed; the screen will recover on its next retry.

Quick FAQ

Do viewers need Power BI licenses? People walking past the sign aren't signed in — there are no per-viewer sessions. Licensing depends on the connection method — see Connection options & approximate cost above.

Can two screens show different pages of the same report? Yes — add the report as two assets and pin a different page on each.

Will rotation order match my selection? Yes. Multi-page rotation cycles in the order you ticked the pages.

What happens if I pick pages but no duration? With several pages and no duration, the screen shows the first selected page (no rotation). Add a duration to make it cycle.

I changed the report in Power BI — do I need to do anything? If you renamed/added/removed pages, re-open the asset, click Load pages, and re-pick. Data and visual changes need nothing — the screen always shows the live report.

A screen is showing an "Access denied" or "Report not found" page — do I need to restart anything after fixing it? No. The error page re-checks every 5 minutes and recovers on its own once you've fixed the workspace permissions, capacity assignment, or Report ID. Walk away — it'll come back.
