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
