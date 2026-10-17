# Aapka AI — Invisible Enterprise Brain (Company Final)

Multi-tenant customer-support automation console.

## Give each company TWO links

Create them at **https://YOUR-APP.onrender.com/owner** (owner panel).

1. **Tool link** (staff only)  
   `https://YOUR-APP.onrender.com/w/WORKSPACE_ID`

2. **Customer link** (put on app Help button)  
   `https://YOUR-APP.onrender.com/w/WORKSPACE_ID/customer`

Same company name always produces the same workspace id.  
Company A never sees Company B data.

## Render setup

Build: `pip install -r requirements.txt`  
Start: `python app.py` (uses PORT from Render)

### Environment variables

| Name | Required | Meaning |
|------|----------|---------|
| `MONGODB_URI` | Recommended | MongoDB Atlas free string — history survives redeploy |
| `SECRET_KEY` | Recommended | Long random string for sessions |
| `AAPKA_DATA` | Optional | e.g. `/var/data` if Render disk mounted |

## What works without company API keys

- Customer refund → receipt + hash + case on Agent Desk (DEMO local status)
- Complex problem → escalated case + 1-click actions
- ROI / History / Operations (this workspace only)
- Subscription lockout

## Live bank refund

Only after the **company** pastes their Payment gateway keys in Integration boxes and their provider confirms. Without keys = DEMO label only.

## Isolation rule

Never share one Tool/Customer pair across two companies.
