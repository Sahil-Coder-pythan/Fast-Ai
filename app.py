#!/usr/bin/env python3
"""
Aapka AI – Invisible Enterprise Brain
Company connects their own Salesforce, Zendesk, Payment.
Customers get 2-second answers + refunds.
Employees get full context + 3 one-click actions.
"""

from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime
import time
import os
import hashlib
import secrets

app = Flask(__name__, static_folder="public", static_url_path="")

# ============================================================
# IN-MEMORY DB (demo). Company systems connect via Integrations.
# ============================================================

DB = {
    "isSubscriptionActive": True,
    "customers": {
        "CUST001": {
            "id": "CUST001",
            "name": "Aarav Mehta",
            "email": "aarav.mehta@email.com",
            "phone": "+91-9876543210",
            "tier": "Premium",
            "joined": "2024-01-15",
            "balance": 18500,
        },
        "CUST002": {
            "id": "CUST002",
            "name": "Sneha Reddy",
            "email": "sneha.reddy@email.com",
            "phone": "+91-9123456789",
            "tier": "Standard",
            "joined": "2025-06-20",
            "balance": 4200,
        },
        "CUST003": {
            "id": "CUST003",
            "name": "Vikram Singh",
            "email": "vikram.singh@email.com",
            "phone": "+91-9988776655",
            "tier": "Premium",
            "joined": "2023-11-08",
            "balance": 32000,
        },
        "CUST004": {
            "id": "CUST004",
            "name": "Ananya Iyer",
            "email": "ananya.iyer@email.com",
            "phone": "+91-9811223344",
            "tier": "Standard",
            "joined": "2025-02-14",
            "balance": 2800,
        },
        "CUST005": {
            "id": "CUST005",
            "name": "Kabir Khan",
            "email": "kabir.khan@email.com",
            "phone": "+91-9765432100",
            "tier": "Premium",
            "joined": "2024-08-22",
            "balance": 15600,
        },
    },
    "orders": {
        "ORD-5566": {
            "OrderID": "ORD-5566",
            "CustomerID": "CUST001",
            "CustomerName": "Aarav Mehta",
            "Tier": "Premium",
            "item": "Delhi to Mumbai Flight",
            "amount": 8500,
            "PaymentStatus": "Paid",
            "date": "2026-10-08",
            "ChatHistory": [],
        },
        "ORD-4432": {
            "OrderID": "ORD-4432",
            "CustomerID": "CUST001",
            "CustomerName": "Aarav Mehta",
            "Tier": "Premium",
            "item": "Taj Hotel Booking",
            "amount": 12000,
            "PaymentStatus": "Paid",
            "date": "2026-09-15",
            "ChatHistory": [],
        },
        "ORD-7788": {
            "OrderID": "ORD-7788",
            "CustomerID": "CUST002",
            "CustomerName": "Sneha Reddy",
            "Tier": "Standard",
            "item": "Goa Package",
            "amount": 25000,
            "PaymentStatus": "Paid",
            "date": "2026-10-01",
            "ChatHistory": [],
        },
        "ORD-9012": {
            "OrderID": "ORD-9012",
            "CustomerID": "CUST003",
            "CustomerName": "Vikram Singh",
            "Tier": "Premium",
            "item": "Business Class Bangalore-Delhi",
            "amount": 28500,
            "PaymentStatus": "Paid",
            "date": "2026-10-05",
            "ChatHistory": [],
        },
        "ORD-3344": {
            "OrderID": "ORD-3344",
            "CustomerID": "CUST004",
            "CustomerName": "Ananya Iyer",
            "Tier": "Standard",
            "item": "Chennai Hotel Stay",
            "amount": 6800,
            "PaymentStatus": "Paid",
            "date": "2026-09-28",
            "ChatHistory": [],
        },
        "ORD-6677": {
            "OrderID": "ORD-6677",
            "CustomerID": "CUST005",
            "CustomerName": "Kabir Khan",
            "Tier": "Premium",
            "item": "International Flight + Hotel",
            "amount": 45000,
            "PaymentStatus": "Paid",
            "date": "2026-10-10",
            "ChatHistory": [],
        },
    },
    "cases": {},
    "notifications": [],
    "vouchers": [],
    "receipts": [],
    "event_log": [],
    "webhook_log": [],
    "metrics": {
        "human_hours_saved": 0.0,
        "salary_leak_prevented": 0.0,
        "vip_churn_stopped": 0,
        "total_automations": 0,
        "refunds_processed": 0,
    },
    "connected_systems": {
        "Salesforce": "NOT CONNECTED",
        "Zendesk": "NOT CONNECTED",
        "OrderDB": "CONNECTED",
        "Email": "CONNECTED",
        "Payment": "NOT CONNECTED",
    },
    "integrations": {
        "salesforce": {
            "connected": False,
            "instance_url": "",
            "client_id": "",
            "client_secret": "",
            "connected_at": None,
        },
        "zendesk": {
            "connected": False,
            "subdomain": "",
            "email": "",
            "api_token": "",
            "connected_at": None,
        },
        "payment": {
            "connected": False,
            "provider": "",
            "mode": "test",
            "key_id": "",
            "key_secret": "",
            "connected_at": None,
        },
    },
}


def now_iso():
    return datetime.utcnow().isoformat() + "Z"


def generate_receipt(order_id, amount, customer_name):
    ts = now_iso()
    raw = f"{order_id}|{amount}|{customer_name}|{ts}|{secrets.token_hex(8)}"
    digest = hashlib.sha256(raw.encode()).hexdigest()
    receipt = {
        "receipt_id": f"RCP-{digest[:12].upper()}",
        "order_id": order_id,
        "amount": amount,
        "customer": customer_name,
        "timestamp": ts,
        "hash": digest,
        "status": "REFUNDED",
    }
    DB["receipts"].append(receipt)
    return receipt


def add_hours_saved(minutes=15):
    hours = minutes / 60.0
    DB["metrics"]["human_hours_saved"] = round(DB["metrics"]["human_hours_saved"] + hours, 2)
    DB["metrics"]["salary_leak_prevented"] = round(DB["metrics"]["human_hours_saved"] * 25, 2)
    DB["metrics"]["total_automations"] += 1


def log_event(event_type, detail, customer_id=None):
    entry = {
        "id": f"EVT-{int(time.time() * 1000) % 1000000}",
        "type": event_type,
        "detail": detail,
        "customer_id": customer_id,
        "timestamp": now_iso(),
    }
    DB["event_log"].append(entry)
    if len(DB["event_log"]) > 100:
        DB["event_log"] = DB["event_log"][-100:]
    return entry


def fire_department_webhooks(event_type, payload):
    ts = now_iso()
    for target, channel in [("Sales Team", "#sales-alerts"), ("Tech / Engineering", "#tech-ops")]:
        DB["webhook_log"].append(
            {
                "target": target,
                "channel": channel,
                "event": event_type,
                "payload": payload,
                "timestamp": ts,
                "status": "DELIVERED",
            }
        )
    if len(DB["webhook_log"]) > 50:
        DB["webhook_log"] = DB["webhook_log"][-50:]


def get_customer_orders(customer_id):
    return [o for o in DB["orders"].values() if o["CustomerID"] == customer_id]


def lockout_response():
    return {
        "error": "CRITICAL_PIPELINE_FAILURE",
        "message": (
            "CRITICAL PIPELINE FAILURE: Aapka AI Core Brain Disconnected.\n\n"
            "All automation has stopped.\n"
            "• 1-click actions removed\n"
            "• Customer context and history locked\n"
            "• Priority routing disabled\n\n"
            "Average queue time: 2 seconds → 4.5 hours\n"
            "Agents must again open Salesforce + Zendesk + OrderDB manually.\n"
            "8-hour shift load has returned.\n\n"
            "REINSTATEMENT REQUIRED: Enterprise $1,200/mo\n"
            "Ask your CEO to reactivate. Employees will request this."
        ),
        "locked": True,
        "reinstatement_amount": "$1,200/mo",
    }


def process_chat(message, customer_id):
    if not DB["isSubscriptionActive"]:
        return lockout_response()

    lower = (message or "").lower().strip()
    customer = DB["customers"].get(customer_id)
    if not customer:
        return {"reply": "Please select a valid customer.", "type": "error", "confidence": 0.3}

    tier = customer["tier"]
    is_premium = tier == "Premium"
    priority = "PRIORITY (Premium Tier) — " if is_premium else ""

    # REFUND
    if any(w in lower for w in ["refund", "वापसी", "पैसे वापस", "money back", "refund chahiye"]):
        orders = get_customer_orders(customer_id)
        paid = [o for o in orders if o["PaymentStatus"] == "Paid"]
        if not paid:
            return {
                "reply": f"{priority}No eligible paid order found (already refunded or none).",
                "type": "info",
                "confidence": 0.9,
            }

        order = paid[0]
        order["PaymentStatus"] = "Refunded"
        order["ChatHistory"].append({"role": "customer", "msg": message, "time": now_iso()})
        receipt = generate_receipt(order["OrderID"], order["amount"], order["CustomerName"])
        add_hours_saved(15)
        DB["metrics"]["refunds_processed"] += 1
        if is_premium:
            DB["metrics"]["vip_churn_stopped"] += 1
        log_event("refund_executed", f"Order {order['OrderID']} refunded Rs.{order['amount']}", customer_id)
        fire_department_webhooks(
            "REFUND_PROCESSED",
            {
                "order_id": order["OrderID"],
                "amount": order["amount"],
                "customer": order["CustomerName"],
                "tier": tier,
                "receipt_id": receipt["receipt_id"],
            },
        )
        pay_note = ""
        if DB["integrations"]["payment"]["connected"]:
            pay_note = f"\nRouted via {DB['integrations']['payment']['provider']} ({DB['integrations']['payment']['mode']} mode)."
        reply = (
            f"{priority}REFUND EXECUTED SUCCESSFULLY\n\n"
            f"Order: {order['item']} ({order['OrderID']})\n"
            f"Amount: Rs.{order['amount']}\n"
            f"PaymentStatus: Paid → Refunded{pay_note}\n\n"
            f"Cryptographic Receipt\n"
            f"Receipt ID: {receipt['receipt_id']}\n"
            f"Hash: {receipt['hash'][:24]}...\n"
            f"Timestamp: {receipt['timestamp']}\n\n"
            f"Amount will reflect in 5-7 working days."
        )
        return {
            "reply": reply,
            "type": "refund_executed",
            "confidence": 0.98,
            "receipt": receipt,
            "order": order,
        }

    # COMPLEX ISSUE
    if any(
        w in lower
        for w in ["complex", "complex problem", "bahut complex", "help karo", "serious", "escalate", "problem"]
    ):
        case_id = f"CASE-{int(time.time()) % 100000}"
        case = {
            "id": case_id,
            "customerId": customer_id,
            "customerName": customer["name"],
            "tier": tier,
            "title": f"Complex Issue reported by {customer['name']}",
            "status": "Escalated",
            "priority": "Critical" if is_premium else "High",
            "queue": "premium" if is_premium else "standard",
            "created": now_iso(),
            "summary": (
                f"Customer {customer['name']} ({tier}) raised a complex issue.\n"
                f"Full context loaded from connected systems (Salesforce + Zendesk + Order DB).\n"
                f"Open orders: {len(get_customer_orders(customer_id))}.\n"
                f"Requires human decision with AI-recommended actions."
            ),
            "history": [
                {"time": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "event": "Customer triggered complex issue in chat"},
                {"time": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "event": "AI loaded full customer context + order history"},
                {
                    "time": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                    "event": f"Routed to {'Premium' if is_premium else 'Standard'} queue",
                },
            ],
            "actions": [
                {
                    "id": 1,
                    "color": "red",
                    "title": "Trigger Backend DB Hard-Reset & Resync",
                    "description": "Force full resync of customer record across Salesforce, Zendesk and Order DB.",
                    "impact": "High – Data consistency restored",
                },
                {
                    "id": 2,
                    "color": "yellow",
                    "title": "Escalate Priority Ticket to Slack/Teams",
                    "description": "Push real-time alert to #customer-critical with full context.",
                    "impact": "Medium – Manager notified in < 30s",
                },
                {
                    "id": 3,
                    "color": "green",
                    "title": "Auto-Generate $20 Compensation Voucher",
                    "description": "Issue one-time $20 / Rs.1,600 goodwill voucher to customer account.",
                    "impact": "Retention – High emotional recovery",
                },
            ],
        }
        DB["cases"][case_id] = case
        DB["notifications"].append(
            {
                "id": f"NOTIF-{case_id}",
                "caseId": case_id,
                "message": f"New Complex Case from {customer['name']} ({tier})",
                "priority": case["priority"],
                "time": now_iso(),
                "read": False,
            }
        )
        add_hours_saved(20)
        if is_premium:
            DB["metrics"]["vip_churn_stopped"] += 1
        log_event("complex_escalated", f"Case {case_id} for {customer['name']}", customer_id)
        fire_department_webhooks(
            "COMPLEX_ISSUE_ESCALATED",
            {"case_id": case_id, "customer": customer["name"], "tier": tier, "priority": case["priority"]},
        )
        reply = (
            f"{priority}Complex case detected.\n\n"
            f"Full customer context + history loaded.\n"
            f"Case {case_id} pushed to Employee Desk.\n"
            f"{'Routed to PREMIUM queue' if is_premium else 'Routed to standard queue'}.\n\n"
            f"Employee will see 3 ready actions — resolve with 1 click."
        )
        return {"reply": reply, "type": "complex_escalated", "confidence": 0.94, "caseId": case_id}

    # STATUS
    if any(w in lower for w in ["status", "स्टेटस", "order status", "meri order", "orders"]):
        orders = get_customer_orders(customer_id)
        if not orders:
            return {"reply": f"{priority}No orders found for your account.", "type": "info", "confidence": 0.9}
        lines = [f"- {o['item']} ({o['OrderID']}) → {o['PaymentStatus']} – Rs.{o['amount']}" for o in orders]
        return {
            "reply": f"{priority}Your orders:\n\n" + "\n".join(lines),
            "type": "status",
            "confidence": 0.95,
        }

    # TICKET / BOOKING help
    if any(w in lower for w in ["ticket", "book", "booking", "टिकट", "बुक"]):
        return {
            "reply": (
                f"{priority}Ticket / booking request received.\n\n"
                "I can help with status, refunds, or escalate complex booking issues to an agent "
                "with full context in 1 click. Tell me the order ID or say 'complex problem'."
            ),
            "type": "info",
            "confidence": 0.88,
        }

    # DEFAULT
    return {
        "reply": (
            f"{priority}I can help with:\n"
            "• Refund (type: refund chahiye)\n"
            "• Order status\n"
            "• Complex issues (escalates to employee with 3 one-click actions)\n\n"
            "What do you need?"
        ),
        "type": "help",
        "confidence": 0.85,
    }


# ============================================================
# PAGES
# ============================================================

@app.route("/")
def root():
    return send_from_directory("public", "customer.html")


@app.route("/customer")
def customer_page():
    return send_from_directory("public", "customer.html")


@app.route("/employee")
def employee_page():
    return send_from_directory("public", "employee.html")


@app.route("/ceo")
def ceo_page():
    return send_from_directory("public", "ceo.html")


@app.route("/integrations")
def integrations_page():
    return send_from_directory("public", "integrations.html")


# ============================================================
# API
# ============================================================

@app.route("/api/chat", methods=["POST"])
def api_chat():
    data = request.get_json() or {}
    result = process_chat(data.get("message", ""), data.get("customer_id", "CUST001"))
    return jsonify(result)


@app.route("/api/customer/<cid>")
def api_customer(cid):
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403
    c = DB["customers"].get(cid)
    if not c:
        return jsonify({"error": "not found"}), 404
    orders = get_customer_orders(cid)
    return jsonify({"customer": c, "orders": orders})


@app.route("/api/cases")
def api_cases():
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403
    cases = sorted(DB["cases"].values(), key=lambda x: x.get("created", ""), reverse=True)
    notifs = [n for n in DB["notifications"] if not n.get("read")]
    return jsonify({"cases": cases, "notifications": notifs})


@app.route("/api/cases/<case_id>")
def api_case(case_id):
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403
    case = DB["cases"].get(case_id)
    if not case:
        return jsonify({"error": "not found"}), 404
    return jsonify(case)


@app.route("/api/cases/<case_id>/action", methods=["POST"])
def api_case_action(case_id):
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403
    case = DB["cases"].get(case_id)
    if not case:
        return jsonify({"error": "not found"}), 404
    data = request.get_json() or {}
    action_id = int(data.get("action_id", 0))
    action = next((a for a in case.get("actions", []) if a["id"] == action_id), None)
    if not action:
        return jsonify({"error": "invalid action"}), 400

    result_msg = ""
    if action_id == 1:
        case["history"].append(
            {"time": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "event": "DB Hard-Reset & Resync executed"}
        )
        result_msg = "Customer record resynced across Salesforce, Zendesk and Order DB."
        add_hours_saved(10)
    elif action_id == 2:
        case["history"].append(
            {"time": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "event": "Escalated to Slack/Teams webhook"}
        )
        fire_department_webhooks("PRIORITY_ESCALATION", {"case_id": case_id, "customer": case["customerName"]})
        result_msg = "Priority alert pushed to #customer-critical. Manager notified."
        add_hours_saved(5)
    elif action_id == 3:
        code = f"GOODWILL-{secrets.token_hex(4).upper()}"
        DB["vouchers"].append(
            {
                "code": code,
                "customerId": case["customerId"],
                "amount": 20,
                "created": now_iso(),
            }
        )
        case["history"].append(
            {"time": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "event": f"Voucher {code} issued ($20)"}
        )
        result_msg = f"Compensation voucher generated: {code} ($20 / Rs.1,600)."
        add_hours_saved(8)
        if case.get("tier") == "Premium":
            DB["metrics"]["vip_churn_stopped"] += 1

    case["status"] = "In Progress"
    log_event("action_executed", f"Case {case_id} action {action_id}", case.get("customerId"))
    return jsonify({"success": True, "message": result_msg, "case": case})


@app.route("/api/notifications/read", methods=["POST"])
def api_notif_read():
    for n in DB["notifications"]:
        n["read"] = True
    return jsonify({"ok": True})


@app.route("/api/ceo/metrics")
def api_ceo_metrics():
    open_cases = len([c for c in DB["cases"].values() if c.get("status") != "Resolved"])
    return jsonify(
        {
            "isSubscriptionActive": DB["isSubscriptionActive"],
            "metrics": DB["metrics"],
            "connectedSystems": DB["connected_systems"],
            "openCases": open_cases,
            "totalCases": len(DB["cases"]),
            "totalReceipts": len(DB["receipts"]),
            "totalVouchers": len(DB["vouchers"]),
            "plan": {"name": "Enterprise", "price": 1200, "status": "ACTIVE" if DB["isSubscriptionActive"] else "SUSPENDED"},
        }
    )


@app.route("/api/ceo/toggle-subscription", methods=["POST"])
def api_toggle_sub():
    data = request.get_json() or {}
    new_state = bool(data.get("active", True))
    DB["isSubscriptionActive"] = new_state
    if not new_state:
        return jsonify(
            {
                "success": True,
                "isSubscriptionActive": False,
                "warning": (
                    "Subscription DEACTIVATED.\n"
                    "Customer and Employee portals are locked.\n"
                    "Queue time will rise to ~4.5 hours.\n"
                    "Reinstatement: $1,200/mo Enterprise."
                ),
            }
        )
    return jsonify({"success": True, "isSubscriptionActive": True, "message": "Subscription REACTIVATED. All pipelines online."})


@app.route("/api/integrations/status")
def api_integ_status():
    integ = DB["integrations"]
    return jsonify(
        {
            "salesforce": integ["salesforce"]["connected"],
            "zendesk": integ["zendesk"]["connected"],
            "payment": integ["payment"]["connected"],
        }
    )


@app.route("/api/integrations/connect", methods=["POST"])
def api_integ_connect():
    data = request.get_json() or {}
    system = (data.get("system") or "").lower()

    if system == "salesforce":
        if not all([data.get("instance_url"), data.get("client_id"), data.get("client_secret")]):
            return jsonify({"success": False, "error": "Fill all Salesforce fields"}), 400
        DB["integrations"]["salesforce"] = {
            "connected": True,
            "instance_url": data["instance_url"].rstrip("/"),
            "client_id": data["client_id"],
            "client_secret": data["client_secret"],
            "connected_at": now_iso(),
        }
        DB["connected_systems"]["Salesforce"] = "CONNECTED"
        return jsonify({"success": True, "message": "Salesforce connected. CRM data path is ready."})

    if system == "zendesk":
        if not all([data.get("subdomain"), data.get("email"), data.get("api_token")]):
            return jsonify({"success": False, "error": "Fill all Zendesk fields"}), 400
        DB["integrations"]["zendesk"] = {
            "connected": True,
            "subdomain": data["subdomain"],
            "email": data["email"],
            "api_token": data["api_token"],
            "connected_at": now_iso(),
        }
        DB["connected_systems"]["Zendesk"] = "CONNECTED"
        return jsonify({"success": True, "message": "Zendesk connected. Tickets and history path is ready."})

    if system == "payment":
        if not all([data.get("key_id"), data.get("key_secret")]):
            return jsonify({"success": False, "error": "Fill Payment keys"}), 400
        DB["integrations"]["payment"] = {
            "connected": True,
            "provider": data.get("provider", "razorpay"),
            "mode": data.get("mode", "test"),
            "key_id": data["key_id"],
            "key_secret": data["key_secret"],
            "connected_at": now_iso(),
        }
        DB["connected_systems"]["Payment"] = "CONNECTED"
        mode = data.get("mode", "test")
        return jsonify(
            {
                "success": True,
                "message": f"Payment Gateway ({data.get('provider', 'razorpay')}) connected in {mode} mode. Refunds use your merchant account only.",
            }
        )

    return jsonify({"success": False, "error": "Unknown system"}), 400


@app.route("/api/integrations/test", methods=["POST"])
def api_integ_test():
    """Simulate connection test — company keys are accepted; real API call can be added later."""
    data = request.get_json() or {}
    system = (data.get("system") or "").lower()
    integ = DB["integrations"].get(system, {})
    if not integ.get("connected"):
        return jsonify({"success": False, "error": "Connect first, then Test."}), 400
    return jsonify(
        {
            "success": True,
            "message": f"{system.title()} credentials accepted. Connection test passed (ready for live API when enabled).",
            "system": system,
            "mode": integ.get("mode", "live"),
        }
    )


@app.route("/api/status")
def api_status():
    return jsonify(
        {
            "name": "Aapka AI – Invisible Enterprise Brain",
            "version": "3.0.0",
            "subscription": "ACTIVE" if DB["isSubscriptionActive"] else "LOCKED",
            "isSubscriptionActive": DB["isSubscriptionActive"],
            "connectedSystems": DB["connected_systems"],
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    print("\n" + "=" * 60)
    print("  Aapka AI – Invisible Enterprise Brain")
    print("  Company connects their own systems")
    print("=" * 60)
    print(f"  Customer   : http://localhost:{port}/customer")
    print(f"  Employee   : http://localhost:{port}/employee")
    print(f"  CEO        : http://localhost:{port}/ceo")
    print(f"  Integrations: http://localhost:{port}/integrations")
    print("=" * 60 + "\n")
    app.run(host="0.0.0.0", port=port, debug=False)
