# Deployment Guide

Follow these steps to deploy the Google Apps Script backend and host the Bootstrap front-end on GitHub Pages.

## 1. Set Up the Google Sheet
1. Create a new Google Spreadsheet named **Tinkling Tales Platform**.
2. Add the tabs and headers exactly as described in [`README.md`](../README.md#google-sheets-structure).
3. In the `Settings` tab, insert a row with `adminCode` in the `Key` column and a secure random string in `Value`.

## 2. Create the Apps Script Project
1. In the spreadsheet, go to **Extensions → Apps Script** to open the Script Editor.
2. Replace the default `Code.gs` with the contents of [`apps_script/Code.gs`](../apps_script/Code.gs).
3. Under **Project Settings**, enable the V8 runtime and add the spreadsheet ID (found in the sheet URL) to the `SPREADSHEET_ID` constant in the script.
4. Review the script for scopes such as `MailApp` (used for verification/reset emails) and adjust if needed.

## 3. Deploy as a Web App
1. Click **Deploy → Test deployments → Select type → Web app**.
2. Set **Execute as** to `Me` and **Who has access** to `Anyone` (or restrict to trusted Google accounts and adjust CORS in the script).
3. Copy the deployment URL; you will use this in the front-end `api.js` file.
4. Whenever you update the script, create a new deployment version and update the front-end URL.

## 4. Configure OAuth Scopes (Optional)
- If you enable Drive uploads for product images, add the necessary scopes in the Apps Script manifest and review Google Workspace admin approvals.

## 5. Front-end Hosting on GitHub Pages
1. Fork or upload the contents of the `frontend/` directory into a GitHub repository.
2. Commit the files and push to the `main` branch.
3. In the GitHub repository settings, enable **Pages** and point it at the `main` branch (root directory).
4. Update the `API_BASE_URL` constant in `frontend/assets/js/api.js` with the Apps Script web app URL.
5. Wait for Pages to publish. Visit the live URL to confirm.

## 6. Local Testing
- You can open the HTML files locally in a browser for static rendering. API calls will work as long as CORS is configured to allow `file://` or use a local web server (e.g., `npx serve frontend`).

## 7. Maintenance Checklist
- Rotate the admin code regularly and update the sheet.
- Monitor the `Users` sheet for suspicious sign-ups or expired tokens that need cleanup.
- Back up the spreadsheet (File → Version history) before major changes.
- Periodically review Apps Script logs and quotas.

