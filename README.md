# Aapka AI – Invisible Enterprise Brain
## COMPLETE v5.0 — Company Pilot Package

This is the **full product build** for pilot / sales use.

After you deploy and your **API key tests** pass (Razorpay/Salesforce/Zendesk test credentials), you can offer this to companies as a working pilot.

### What is complete (no more feature build required for pilot)

| Area | Included |
|------|----------|
| Customer portal | Chat, refund, order status, complex escalate, ticket help |
| Employee desk | Live cases, AI summary, timeline, 4× one-click actions |
| CEO dashboard | ROI, cancel impact, lockout, activity log, audit export, benefits |
| Integrations | Salesforce + Zendesk + Payment boxes, Connect / Test / Disconnect |
| Trust & lock-in | Cryptographic receipts, subscription kill-switch, queue-pain messaging |
| Ops | Event log, webhooks to Sales/Tech, metrics, health status |

### Routes

- `/customer`
- `/employee`
- `/ceo`
- `/integrations`

### Deploy (GitHub → Render)

**Exact file layout:**

```
app.py
requirements.txt
README.md
public/
  customer.html
  employee.html
  ceo.html
  integrations.html
```

1. Delete old files in the repo  
2. Upload this layout (keep the `public/` folder)  
3. Render: start command `python app.py`  
4. Install: `pip install -r requirements.txt`

### What company enters (only 3 boxes)

1. **Salesforce** — Instance URL, Client ID, Client Secret  
2. **Zendesk** — Subdomain, Email, API Token  
3. **Payment** — Razorpay or Stripe Key ID + Secret (prefer Test Mode first)

Connect is designed to finish in under a second (save + validate).

### Honest scope

- **Working now:** all product logic, UI, lockout, ROI, receipts, 1-click actions, connect framework  
- **Needs your test keys:** live HTTP to Razorpay/Salesforce/Zendesk (wire when keys are ready)  
- **Demo customers** in the app are samples until CRM is connected  

### Pricing reality

This package is built to **prove** 8-hour work → ~2-hour work and high switching cost.  
Monthly price ($1,200 → $50,000) depends on measured savings at the customer — the product is ready to run that pilot.

### Test checklist

1. `/customer` → Refund chahiye → status Paid→Refunded + receipt  
2. `/customer` → complex problem → case on `/employee`  
3. `/employee` → Execute all 4 actions  
4. `/ceo` → metrics move; Deactivate → portals lock; Reactivate  
5. `/integrations` → Connect + Test each box  
6. `/ceo` → Export Audit Trail  

If all pass, pilot delivery can start. Live payment/CRM API is the only remaining technical step when keys arrive.
