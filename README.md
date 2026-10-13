# Aapka AI – Invisible Enterprise Brain

Company connects **their own** Salesforce, Zendesk, and Payment Gateway.  
Customers get 2-second answers and refunds.  
Employees get full context + 3 one-click actions.

## Routes

| Path | Purpose |
|------|---------|
| `/customer` | Customer chat (refund, status, complex escalate) |
| `/employee` | Agent desk – summary, history, 3 Execute buttons |
| `/ceo` | ROI metrics + subscription lockout |
| `/integrations` | Company enters CRM / Helpdesk / Payment credentials |

## Run locally

```bash
pip install -r requirements.txt
python app.py
```

## Deploy (Render)

1. Connect this repo  
2. Build: `pip install -r requirements.txt`  
3. Start: `python app.py`  
4. Env: `PORT` is set by Render  

## How company uses Integrations

1. Open `/integrations`  
2. Fill Salesforce / Zendesk / Payment fields  
3. Click **Connect** then **Test Connection**  
4. Refunds and context use the company’s connected systems structure  

Payment: money stays in the company’s merchant account (Test mode by default).

## Demo flow

1. `/customer` → select customer → “refund chahiye” or “complex problem”  
2. `/employee` → open case → Execute one of 3 actions  
3. `/ceo` → see hours saved / deactivate to lock portals  
