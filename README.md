# Aapka AI – Invisible Enterprise Brain (FINAL)

Company-ready multi-role SaaS demo + connector framework.

## Routes

| Path | Role |
|------|------|
| `/customer` | Chat · refund · status · complex escalate · ticket |
| `/employee` | Cases · AI summary · timeline · 1-click actions |
| `/ceo` | ROI · cancel impact · lockout · activity log |
| `/integrations` | Company enters Salesforce / Zendesk / Payment keys |

## Systems included

1. Multi-role routing  
2. BYO credentials (Connect / Test / Disconnect)  
3. Real-time PaymentStatus mutation  
4. Cryptographic receipts  
5. Tier priority (Premium)  
6. Complex escalation pipeline  
7. 1-click Auto-Pilot (4 actions)  
8. Context Lockout kill-switch  
9. Live ROI counters  
10. Employee dependency messaging  
11. Context memory (locked on cancel)  
12. Sales + Tech webhooks  
13. Activity log (admin trail)  
14. Integration health status  
15. Test Connection  
16–20. Cancel impact, value report, billing toggle  

## Run

```bash
pip install -r requirements.txt
python app.py
```

## GitHub → Render

Upload structure:

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

## Demo customers

Sample only until company connects CRM. Real customers come from their Salesforce after Connect.

## Payment safety

Keys belong to the company. Refunds route through their merchant account. Default Test Mode.
