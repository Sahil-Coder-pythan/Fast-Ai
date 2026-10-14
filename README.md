# Aapka AI – Invisible Enterprise Brain (SHIP v6)

White Enterprise Console. No dark theme pages for agent/connect.

## Routes
- `/` Console (hamburger menu + bottom search)
- `/customer` Customer chat (light UI)
- `/employee`, `/ceo`, `/integrations` → redirect into white console modules

## Deploy layout
```
app.py
requirements.txt
README.md
public/
  admin.html
  admin-app.js
  customer.html
  employee.html
  ceo.html
  integrations.html
```

Start: `python app.py`

## Design
- White screens only for console
- Top ☰ opens full module list
- Bottom search (ChatGPT-style)
- Salesforce / Zendesk / Payment forms open **on the same white page**
- Sample profiles on customer chat are demo-only until CRM is connected

## Test
1. `/` — clean home, search, menu
2. Search “payment” — white connect form only
3. `/customer` — refund / complex problem
4. Console → Cases / Autopilot — execute
5. Lockout toggle under Trust
