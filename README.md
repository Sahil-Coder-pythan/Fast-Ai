# Aapka AI – Multi-company isolation (FINAL)

## Rule (critical)
NEVER give the same Customer link + Tool link to two companies.
Each company gets a UNIQUE pair from POST /api/company/create.

## Create links for one company
POST /api/company/create
{"name": "Stratexsoft"}

Response:
  tool_link     → company staff console
  customer_link → put on that company's app Help button

## Isolation
Refund on company A's customer_link → only company A's tool_link.
Company B never sees it. Like WhatsApp numbers.

## URLs
  /w/<workspace_id>           → Tool (console)
  /w/<workspace_id>/customer  → Customer support only (no Console link)

## Deploy
app.py + requirements.txt + public/

## Permanent company links (important)

On Render **free** plan the local disk is wiped on every redeploy. That is why old `/w/...` links disappeared.

**Fix (one-time):**
1. Render → your service → **Disks** → Create disk
2. Mount path: `/var/data`
3. Environment variable: `AAPKA_DATA=/var/data`
4. Redeploy once

After that, all company workspaces live on the disk. Links stay until you delete them from `/owner` (⋮ → Delete permanently).

Without the disk, code upgrades will still wipe data — this is Render hosting, not the app logic.

## Google Sign-In setup (staff console)

### 1. Google Cloud Console (tokens)
1. Open https://console.cloud.google.com/
2. Create a project (or select one) — e.g. "Aapka AI"
3. APIs & Services → **OAuth consent screen** → External → fill App name, support email → Save
4. APIs & Services → **Credentials** → **Create credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Name: Aapka AI Web
7. **Authorized JavaScript origins** (add both):
   - `https://YOUR-SERVICE.onrender.com`
   - `http://localhost:10000` (optional local test)
8. **Authorized redirect URIs**:
   - `https://YOUR-SERVICE.onrender.com`
   - `https://YOUR-SERVICE.onrender.com/login`
9. Create → copy **Client ID** (looks like `123456-abc.apps.googleusercontent.com`)
   - Client Secret is **not required** for this Sign-In flow (ID token only)

Same Google Cloud project works for this app. New tokens only if you create a new OAuth client.

### 2. Render Environment
| Key | Value |
|-----|--------|
| `GOOGLE_CLIENT_ID` | the Client ID from step 9 |
| `SECRET_KEY` | any long random string (e.g. openssl rand -hex 32) |
| `AAPKA_DATA` | `/var/data` (if Persistent Disk mounted) |
| `OWNER_EMAILS` | optional, e.g. `you@gmail.com` to lock /owner to your email only |

Redeploy after saving env vars.

### 3. Behaviour
- Staff pages (`/`, `/admin`, `/employee`, `/ceo`, `/owner`, company tool links) → Google login required
- Customer Help portal (`/customer`, `/w/.../customer`) → **no login** (end users)
- Profile: circular letter avatar (S for Sahil), Edit display name, Log out
- No photo upload (by design)

