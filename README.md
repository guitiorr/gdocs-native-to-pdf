# Google Docs → PDF Auto-Rebuilder

A small Google Apps Script that watches a Google Doc and automatically rebuilds a PDF in the same Drive folder whenever the doc changes. The PDF keeps the same file ID across rebuilds, so any share link you've posted (LinkedIn, personal site, email signature) stays valid forever.

## Why

You edit a single source of truth — a Google Doc — and an always-up-to-date PDF lives next to it at a stable URL. No manual "File → Download → PDF" → re-upload → update links dance. Great for:

- CVs and resumes shared on LinkedIn or a personal site
- Public-facing documents (price lists, menus, specs) where the link is embedded in many places
- Any "latest version" document that downstream consumers reference by URL

## How it works

1. A time-based trigger fires every 5 minutes inside Google's infrastructure (not your machine — runs even when your laptop is off).
2. Each run checks the source Doc's `lastUpdated` timestamp against the last successful export time stored in script properties.
3. If unchanged, the run exits immediately (cheap no-op).
4. If changed, it exports the Doc as a PDF using Google's native renderer (same engine as "File → Download → PDF" in the Docs UI).
5. It looks for an existing PDF with the configured name in the Doc's parent folder:
   - **Exists** → overwrites content in-place via `Drive.Files.update`. **File ID is preserved**, so share links don't break.
   - **Doesn't exist** → creates a new file (first run only).

## Requirements

- A Google account
- A **native Google Doc** as the source (not a .docx — those need a different conversion path with lower fidelity)
- The source Doc must live inside a folder (not Drive root)

## Setup

### 1. Create the Apps Script project

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. Delete the boilerplate and paste in the script (`Code.gs` in this repo).
3. Update the config at the top:
   ```javascript
   const SOURCE_DOC_ID = 'YOUR_GOOGLE_DOC_ID';
   const PDF_NAME      = 'my-document.pdf';
   ```
   Get the Doc ID from the URL: `docs.google.com/document/d/<THIS_PART>/edit`.

### 2. Enable the Advanced Drive Service

Needed for the in-place overwrite that preserves file IDs.

- Left sidebar → **Services** (the `+` icon) → find **Drive API** → **Add**. Default version is fine.

### 3. Install the trigger

- Function dropdown at the top of the editor → select `installTrigger` → click **Run**.
- Google will prompt for permissions the first time. Grant them (you're authorizing your own script to access your Drive).
- Verify: left sidebar → **Triggers** (clock icon). You should see one row for `rebuildPdfIfChanged`, time-based, every 5 minutes.

### 4. Force the first run

The trigger won't fire immediately — it runs on Google's schedule.

- Function dropdown → `rebuildPdfIfChanged` → **Run**.
- Check the **Executions** tab (separate from Triggers) for a green "Completed" status.
- Check your Drive folder — the PDF should be there.

### 5. Get the permanent share link

1. Open the new PDF in Drive → **Share** → set to "Anyone with the link can view".
2. Copy the link. **This URL is stable for the lifetime of the PDF** — paste it on LinkedIn, your website, anywhere.

Two link formats to choose from:

- **Preview** (opens Drive's PDF viewer): `https://drive.google.com/file/d/<ID>/view`
- **Direct download** (triggers download immediately): `https://drive.google.com/uc?export=download&id=<ID>`

## Daily use

Edit the source Doc in Google Docs. Within 5 minutes the PDF updates in place. Same link, fresh content. That's the entire workflow.

## Operations

### Verify it's running

- **Triggers tab** (sidebar → clock icon): confirms the schedule is installed.
- **Executions tab** (sidebar → separate clock icon): every fire is logged with status and console output. Failed runs show in red — click to expand the error.

### Monitoring

Google emails you on repeated failures and may auto-disable the trigger after several consecutive errors. If rebuilds silently stop:

1. Check Executions for red rows.
2. Check Triggers — if the row is gone, re-run `installTrigger`.

### Don't do these

- **Don't manually delete the PDF in Drive.** Next rebuild creates a new file with a new ID, breaking every link you've already shared.
- **Don't rename `PDF_NAME` after going live.** The script finds the existing PDF by filename — a rename causes it to create a new file instead of updating the old one.
- **Don't move the source Doc to Drive root.** Script needs a parent folder.

### Resetting

If you change `SOURCE_DOC_ID` and want to force the next run to export regardless of timestamps:

```javascript
function resetExportFlag() {
  PropertiesService.getScriptProperties().deleteProperty('lastExportedAt');
}
```

Run it once, then run `rebuildPdfIfChanged`.

## Limits and caveats

- **Latency:** worst case is your trigger interval (5 min by default). Tighten with `.everyMinutes(1)` in `installTrigger` if needed — well within Apps Script's daily runtime quota for a workload this small.
- **No true real-time.** Google Docs doesn't expose an `onEdit` trigger like Sheets does. Polling is the only option in pure Apps Script.
- **.docx sources won't work.** This script targets native Google Docs only. .docx requires a conversion hop that loses formatting fidelity (dividers, spacing, custom fonts).
- **Account inactivity:** if you don't log into your Google account for ~6 months, Apps Script projects may be suspended. A single login resets the clock.

## File

- `Code.gs` — the entire script. Two functions: `rebuildPdfIfChanged` (the worker, called by the trigger) and `installTrigger` (one-time setup).

## License

MIT — do whatever you want with it.
