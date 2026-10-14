# Aapka AI v7 — Enterprise Customer Operations Platform

## Implemented on existing stack
- Multi-tenant workspace files
- Operations Overview (actual metrics only)
- Customer 360 + History + timelines
- Case / Employee workspace
- Integration Center (add + test; never "Connected" without verification)
- Field mapping table
- Refund dry-run + DEMO local refund labels
- Rule-based AI investigation (evidence from OrderDB)
- Security audit hash chain
- Retention cleanup
- Billing/usage surface, RBAC role list
- System health

## Explicitly NOT claimed as done
- Full OAuth provider adapters for every vendor
- Real bank refund without provider confirmation
- SOC2/ISO certification
- MFA identity provider
- Encrypted HSM secrets manager (secrets stored server-side in workspace file — upgrade for production)
- Guaranteed 1-second or $ savings outcomes

## Deploy
Replace all files including public/. `python app.py`
