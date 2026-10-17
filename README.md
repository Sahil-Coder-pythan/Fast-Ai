# Aapka AI — Connect + Secure Final (v9)

## Persistence (links / history never wipe on redeploy)
Set **before** creating companies:
- `MONGODB_URI` = MongoDB Atlas string
- `SECRET_KEY` = long random

Upgrade Render plan later → **no code change**. Keep same env vars.

## Two links per company (`/owner`)
| Link | Login | Who |
|------|-------|-----|
| `/w/ID` Tool | **Required** (Google / email) | Company staff |
| `/w/ID/customer` | **None** | Customers via app Help |

Guessed / random `/w/...` URLs → **404** (not auto-created).

## Connect boxes (live verify)
Company pastes **real** keys → server calls provider API:
- **Salesforce** — OAuth token on login/test/instance hosts
- **Zendesk** — `/api/v2/users/me.json`
- **Razorpay / Stripe** — key auto-detect + live auth
- **Slack webhook** — optional test post

Wrong keys → NOT connected. Right keys → CONNECTED.

## Owner permanent console
`/` and `/owner` require login. Customer portal never does.
