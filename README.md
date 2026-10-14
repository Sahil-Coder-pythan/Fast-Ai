# Aapka AI – Invisible Enterprise Brain (FINAL)

## Problem solved (Zomato / MakeMyTrip style)
Employee no longer opens Salesforce + Zendesk + OrderDB/Payment separately for each refund.
Customer triggers refund / complex issue → unified workspace → status + receipt + case + history.

## What COMPANY fills (BYO – we do not hold their bank login)

### Box 1 — Salesforce Connect
- Instance URL (https://yourorg.my.salesforce.com)
- Client ID
- Client Secret
(Optional later: username/password for full OAuth token)

### Box 2 — Zendesk Connect
- Subdomain (only the name, not full URL)
- Admin email
- API token

### Box 3 — Payment Gateway (Razorpay or Stripe)
- Provider: Razorpay | Stripe
- Mode: Test | Live
- Key ID / publishable key
- Key Secret / secret key

### Built-in (no company key required for demo)
- OrderDB workspace (local order + payment status engine)
- Email status surface
- History, cases, autopilot, lockout, ROI

## Honest labels
- DEMO_LOCAL_STATUS_FLIP = local OrderDB Paid→Refunded + receipt hash (not bank proof until Payment provider confirms)
- CONNECTED only after live API verify succeeds
- ROI hours/$ = ESTIMATED (15 min × $25), not bank P&L

## Multi-tenant
Each company workspace file isolated. Cross-tenant access blocked + audited.

## Deploy
Root: app.py, requirements.txt, README.md
Folder: public/ (admin.html, admin-app.js, customer.html, employee.html, ceo.html, integrations.html)

Start: python app.py
Routes: /  /customer  /employee  /ceo  /integrations
