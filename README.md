# Tinkling Tales Platform

This repository contains a static Bootstrap-based front-end and a Google Apps Script backend for the Tinkling Tales (@tinklingtales) storefront, including customer-facing pages, admin tools, and deployment guidance.

## Contents

- `frontend/`: Bootstrap 5 HTML pages, shared assets, and admin dashboard UI.
- `apps_script/`: Google Apps Script sources for the web app endpoints.
- `docs/DEPLOYMENT.md`: Step-by-step guide to deploy the Apps Script and host the front-end.

## Google Sheets Structure

Create a Google Spreadsheet named **Tinkling Tales Platform** with the following tabs and headers:

### `Users`
| Email | Name | Salt | PasswordHash | Role | Token | TokenExpiry | Verified | VerificationCode | ResetCode | ResetExpiry | CreatedAt | UpdatedAt |
|-------|------|------|--------------|------|-------|-------------|----------|------------------|-----------|-------------|-----------|-----------|
- `Role`: `customer` or `admin`.
- `TokenExpiry`, `ResetExpiry`: ISO strings.

### `Products`
| ID | Title | Description | Price | Category | Tags | ImageUrl | Inventory | Status | CreatedAt | UpdatedAt |

### `Orders`
| ID | UserEmail | ItemsJSON | Total | Status | PaymentStatus | CreatedAt | UpdatedAt |

### `Contacts`
| ID | Name | Email | Subject | Message | Status | CreatedAt |

### `Settings`
| Key | Value |
- Store `adminCode` for admin sign-ups and other configuration flags here.

Populate the first row of each sheet with the headers above. The Apps Script assumes headers start at row 1.

## Security Notes & Next Steps

- **Secrets management:** Move the admin signup code and any API keys to Google Apps Script Properties instead of sheet storage for production.
- **Transport security:** Host the static site over HTTPS (GitHub Pages is HTTPS by default). Ensure Apps Script web app is deployed with the “Anyone with the link” option and rely on token checks server-side.
- **Rate limiting & monitoring:** Add throttling (e.g., via PropertiesService counters) for login/signup/contact actions to deter abuse.
- **CORS & preflight:** The sample script adds permissive `Access-Control-Allow-Origin` headers. Consider restricting origins once deployment domains are known and handle `OPTIONS` requests if using advanced fetch options.
- **Input validation:** Client-side validation is provided for UX, but the server sanitizes inputs. Expand sanitization to whitelist HTML, reject large payloads, and escape data before injecting into HTML.
- **Email workflows:** The password reset/verification stubs rely on `MailApp`. Configure DMARC/SPF and monitor quota usage. Consider integrating a transactional email service if volume increases.
- **Token storage:** Tokens are saved in the `Users` sheet; rotate regularly and consider expiring sessions when passwords change.
- **File uploads:** Product image uploads via Drive require OAuth scopes. The example uses URLs for simplicity. Ensure Drive permissions prevent unauthorized access.

Refer to `docs/DEPLOYMENT.md` for deployment instructions and `apps_script/Code.gs` for backend logic.
