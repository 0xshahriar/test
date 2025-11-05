# Tinkling Tales Platform

This repository contains a static Bootstrap-based front-end and a Google Apps Script backend for the Tinkling Tales (@tinklingtales) storefront, including customer-facing pages, admin tools, and deployment guidance.

## Contents

- `frontend/`: Bootstrap 5 HTML pages, shared assets, and admin dashboard UI.
- `apps_script/`: Google Apps Script sources for the web app endpoints.
- `docs/DEPLOYMENT.md`: Step-by-step guide to deploy the Apps Script and host the front-end.

## Google Sheets Structure

Create a Google Spreadsheet named **Tinkling Tales Platform** with the following tabs and headers:

### `Users`
| Column | Notes |
| --- | --- |
| Email | Primary identifier for each account. |
| Name | Display name. |
| Salt | Random salt used for hashing. |
| PasswordHash | SHA-256 hash of the salted password. |
| Role | `customer` or `admin`. |
| Token | Session token issued on login. |
| TokenExpiry | ISO timestamp for session expiration. |
| Verified | `TRUE`/`FALSE` flag for email confirmation. |
| VerificationCode | Latest verification token sent to the user. |
| ResetCode | One-time password reset code. |
| ResetExpiry | ISO timestamp for reset code expiration. |
| CreatedAt | ISO timestamp for record creation. |
| UpdatedAt | ISO timestamp for last update. |

### `Products`
| Column | Notes |
| --- | --- |
| ID | Unique product identifier. |
| Title | Product name displayed in listings. |
| Description | Full product description (supports rich text). |
| Price | Decimal price stored as a string. |
| Category | Primary collection/category. |
| Tags | Comma-separated tags for search. |
| ImageUrl | Public URL for the main product image. |
| Inventory | Available stock count. |
| Status | `active` or `draft`. |
| CreatedAt | ISO timestamp for record creation. |
| UpdatedAt | ISO timestamp for last update. |

### `Orders`
| Column | Notes |
| --- | --- |
| ID | Unique order identifier. |
| UserEmail | Email of the customer who placed the order. |
| ItemsJSON | JSON payload describing items (id, title, price, quantity). |
| Total | Numeric total for the order. |
| Status | Fulfilment state (`pending`, `confirmed`, `delivered`, `cancelled`). |
| PaymentStatus | `paid` / `unpaid`. |
| CreatedAt | ISO timestamp for record creation. |
| UpdatedAt | ISO timestamp for last update. |

Customers may cancel their own orders while they remain in the `pending` state; once an order is moved to `confirmed` or `delivered`, cancellation is blocked automatically.

Customers can also delete their accounts from the storefront. The Apps Script backend erases the user profile alongside related orders and contact records to honour the request.

### `Contacts`
| Column | Notes |
| --- | --- |
| ID | Unique contact message identifier. |
| Name | Sender name. |
| Email | Sender email. |
| Subject | Topic of the inquiry. |
| Message | Message body. |
| Status | `new`, `in_progress`, or `archived`. |
| CreatedAt | ISO timestamp for submission time. |

### `Settings`
| Column | Notes |
| --- | --- |
| Key | Setting name (e.g., `adminCode`). |
| Value | Value associated with the key. |

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
