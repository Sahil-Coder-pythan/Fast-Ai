#!/usr/bin/env python3
"""
Aapka AI – Invisible Enterprise Brain
Enterprise SaaS Platform (High-Ticket $1,200+/mo)
Full multi-role system with real state, lockout engine, ROI metrics
"""

from flask import Flask, request, jsonify, send_from_directory, redirect
from datetime import datetime
import time
import os
import hashlib
import secrets

app = Flask(__name__, static_folder='public', static_url_path='')

# ============================================================
# REACTIVE MOCK DATABASE (Real state that actually mutates)
# ============================================================

DB = {
    "isSubscriptionActive": True,

    "customers": {
        "CUST001": {
            "id": "CUST001",
            "name": "Rahul Sharma",
            "email": "rahul.sharma@email.com",
            "phone": "+91-9876543210",
            "tier": "Premium",
            "joined": "2024-01-15",
            "balance": 12500
        },
        "CUST002": {
            "id": "CUST002",
            "name": "Priya Patel",
            "email": "priya.p@email.com",
            "phone": "+91-9123456789",
            "tier": "Standard",
            "joined": "2025-06-20",
            "balance": 3200
        }
    },

    "orders": {
        "ORD-5566": {
            "OrderID": "ORD-5566",
            "CustomerID": "CUST001",
            "CustomerName": "Rahul Sharma",
            "Tier": "Premium",
            "item": "Delhi to Mumbai Flight",
            "amount": 8500,
            "PaymentStatus": "Paid",
            "date": "2026-10-08",
            "ChatHistory": []
        },
        "ORD-4432": {
            "OrderID": "ORD-4432",
            "CustomerID": "CUST001",
            "CustomerName": "Rahul Sharma",
            "Tier": "Premium",
            "item": "Taj Hotel Booking",
            "amount": 12000,
            "PaymentStatus": "Paid",
            "date": "2026-09-15",
            "ChatHistory": []
        },
        "ORD-7788": {
            "OrderID": "ORD-7788",
            "CustomerID": "CUST002",
            "CustomerName": "Priya Patel",
            "Tier": "Standard",
            "item": "Goa Package",
            "amount": 25000,
            "PaymentStatus": "Paid",
            "date": "2026-10-01",
            "ChatHistory": []
        }
    },

    "cases": {},
    "notifications": [],
    "vouchers": [],
    "receipts": [],

    "metrics": {
        "human_hours_saved": 0.0,
        "salary_leak_prevented": 0.0,
        "vip_churn_stopped": 0,
        "total_automations": 0,
        "refunds_processed": 0
    },

    "connected_systems": {
        "Salesforce": "CONNECTED",
        "Zendesk": "CONNECTED",
        "OrderDB": "CONNECTED",
        "Email": "CONNECTED",
        "SlackWebhook": "CONNECTED"
    }
}

# ============================================================
# HELPERS
# ============================================================

def generate_receipt(order_id, amount, customer_name):
    ts = datetime.utcnow().isoformat() + "Z"
    raw = f"{order_id}|{amount}|{customer_name}|{ts}|{secrets.token_hex(8)}"
    digest = hashlib.sha256(raw.encode()).hexdigest()
    receipt = {
        "receipt_id": f"RCP-{digest[:12].upper()}",
        "order_id": order_id,
        "amount": amount,
        "customer": customer_name,
        "timestamp": ts,
        "hash": digest,
        "status": "REFUNDED"
    }
    DB["receipts"].append(receipt)
    return receipt


def add_hours_saved(minutes=15):
    hours = minutes / 60.0
    DB["metrics"]["human_hours_saved"] = round(DB["metrics"]["human_hours_saved"] + hours, 2)
    DB["metrics"]["salary_leak_prevented"] = round(DB["metrics"]["human_hours_saved"] * 25, 2)
    DB["metrics"]["total_automations"] += 1


def get_customer_orders(customer_id):
    return [o for o in DB["orders"].values() if o["CustomerID"] == customer_id]


def lockout_response():
    return {
        "error": "CRITICAL_PIPELINE_FAILURE",
        "message": (
            "CRITICAL PIPELINE FAILURE: Aapka AI Core Brain Disconnected.\n\n"
            "Reverting to manual legacy ticket systems.\n"
            "Average queue times will increase from 2 seconds to 4.5 hours.\n"
            "Historical customer emotional context has been locked.\n\n"
            "Contact your CEO to reinstate the Enterprise subscription."
        ),
        "locked": True
    }


# ============================================================
# AI ENGINE (Dynamic, Tier-Aware, State-Mutating)
# ============================================================

def process_chat(message, customer_id):
    if not DB["isSubscriptionActive"]:
        return lockout_response()

    lower = message.lower().strip()
    customer = DB["customers"].get(customer_id)
    if not customer:
        return {
            "reply": "Please select a valid customer or provide Customer ID.",
            "type": "error",
            "confidence": 0.3
        }

    tier = customer["tier"]
    is_premium = tier == "Premium"
    priority_prefix = "PRIORITY (Premium Tier) — " if is_premium else ""

    # ---------- REFUND ----------
    if any(w in lower for w in ["refund", "वापसी", "पैसे वापस", "money back"]):
        orders = get_customer_orders(customer_id)
        paid_orders = [o for o in orders if o["PaymentStatus"] == "Paid"]

        if not paid_orders:
            return {
                "reply": f"{priority_prefix}आपके सभी orders पहले से refunded हैं या कोई eligible order नहीं मिला।",
                "type": "info",
                "confidence": 0.9
            }

        order = paid_orders[0]
        order["PaymentStatus"] = "Refunded"
        order["ChatHistory"].append({
            "role": "customer",
            "msg": message,
            "time": datetime.utcnow().isoformat() + "Z"
        })

        receipt = generate_receipt(order["OrderID"], order["amount"], order["CustomerName"])
        add_hours_saved(15)
        DB["metrics"]["refunds_processed"] += 1
        if is_premium:
            DB["metrics"]["vip_churn_stopped"] += 1

        reply = (
            f"{priority_prefix}REFUND EXECUTED SUCCESSFULLY\n\n"
            f"Order: {order['item']} ({order['OrderID']})\n"
            f"Amount: Rs.{order['amount']}\n"
            f"PaymentStatus: Paid → Refunded\n\n"
            f"Cryptographic Receipt\n"
            f"Receipt ID: {receipt['receipt_id']}\n"
            f"Hash: {receipt['hash'][:24]}...\n"
            f"Timestamp: {receipt['timestamp']}\n\n"
            f"Amount will reflect in 5-7 working days.\n"
            f"Customer satisfaction locked."
        )
        return {
            "reply": reply,
            "type": "refund_executed",
            "confidence": 0.98,
            "receipt": receipt,
            "order": order,
            "metrics_delta": {"hours": 0.25, "salary": 6.25}
        }

    # ---------- COMPLEX ISSUE ----------
    if any(w in lower for w in ["complex", "complex problem", "bahut complex", "help karo", "serious", "escalate", "problem"]):
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
            "created": datetime.utcnow().isoformat() + "Z",
            "summary": (
                f"Customer {customer['name']} ({tier}) raised a complex issue.\n"
                f"Full context loaded from Salesforce + Zendesk + Order DB.\n"
                f"Open orders: {len(get_customer_orders(customer_id))}.\n"
                f"This requires human decision with AI-recommended actions."
            ),
            "history": [
                {"time": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "event": "Customer triggered complex issue in chat"},
                {"time": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "event": "AI loaded full customer context + order history"},
                {"time": datetime.utcnow().strftime("%Y-%m-%d %H:%M"), "event": f"Routed to {'Premium' if is_premium else 'Standard'} queue"}
            ],
            "actions": [
                {
                    "id": 1,
                    "color": "red",
                    "title": "Trigger Backend DB Hard-Reset & Resync",
                    "description": "Force full resync of customer record across Salesforce, Zendesk and Order DB. Clears cache conflicts.",
                    "impact": "High – Data consistency restored"
                },
                {
                    "id": 2,
                    "color": "yellow",
                    "title": "Escalate Priority Ticket to Slack/Teams Webhook",
                    "description": "Push real-time alert to #customer-critical channel with full context payload.",
                    "impact": "Medium – Human manager notified in < 30s"
                },
                {
                    "id": 3,
                    "color": "green",
                    "title": "Auto-Generate $20 Compensation Voucher Code",
                    "description": "Issue a one-time $20 / Rs.1,600 goodwill voucher and attach to customer account.",
                    "impact": "Retention – High emotional recovery"
                }
            ]
        }
        DB["cases"][case_id] = case
        DB["notifications"].append({
            "id": f"NOTIF-{case_id}",
            "caseId": case_id,
            "message": f"New Complex Case from {customer['name']} ({tier})",
            "priority": case["priority"],
            "time": datetime.utcnow().isoformat() + "Z",
            "read": False
        })
        add_hours_saved(20)
        if is_premium:
            DB["metrics"]["vip_churn_stopped"] += 1

        reply = (
            f"{priority_prefix}Complex case detected.\n\n"
            f"Full customer context + history loaded.\n"
            f"Case {case_id} created and pushed to Employee Desk.\n"
            f"{'Routed to PREMIUM queue' if is_premium else 'Routed to standard queue'}.\n\n"
            f"Employee will see 3 ready actions and can resolve with 1 click.\n"
            f"You will receive update within 30-90 seconds."
        )
        return {
            "reply": reply,
            "type": "complex_escalated",
            "confidence": 0.94,
            "caseId": case_id,
            "metrics_delta": {"hours": 0.33}
        }

    # ---------- STATUS ----------
    if any(w in lower for w in ["status", "स्टेटस", "order status", "meri order"]):
        orders = get_customer_orders(customer_id)
        if not orders:
            return {"reply": f"{priority_prefix}No orders found.", "type": "info", "confidence": 0.8}
        lines = [f"- {o['item']} ({o['OrderID']}) → {o['PaymentStatus']} – Rs.{o['amount']}" for o in orders]
        reply = f"{priority_prefix}Your Orders:\n\n" + "\n".join(lines)
        add_hours_saved(8)
        return {"reply": reply, "type": "status", "confidence": 0.95}

    # ---------- TICKET / BOOKING ----------
    if any(w in lower for w in ["ticket", "टिकट", "book", "booking", "बुक"]):
        add_hours_saved(10)
        return {
            "reply": (
                f"{priority_prefix}Ticket Booking Engine Ready\n\n"
                f"Tell me: From → To, Date, Passengers.\n"
                f"I can confirm and generate booking reference in < 3 seconds.\n"
                f"(Demo seat available: Delhi-Mumbai 15 Oct – Rs.7,200)"
            ),
            "type": "booking",
            "confidence": 0.9
        }

    # ---------- GREETING ----------
    if any(w in lower for w in ["hello", "hi", "नमस्ते", "hey", "hola"]):
        return {
            "reply": (
                f"{priority_prefix}Namaste {customer['name']}!\n"
                f"Aapka AI – Invisible Enterprise Brain online.\n"
                f"Tier: {tier}\n\n"
                f"I can process refunds, show order status, book tickets, "
                f"or escalate complex issues with full context to your support team."
            ),
            "type": "greeting",
            "confidence": 0.97
        }

    # Fallback
    add_hours_saved(5)
    return {
        "reply": (
            f"{priority_prefix}I understood your request.\n"
            f"For best results try: refund, order status, ticket book, or say 'complex problem'."
        ),
        "type": "fallback",
        "confidence": 0.6
    }


# ============================================================
# API ROUTES
# ============================================================

@app.route('/')
def root():
    return redirect('/customer')


@app.route('/customer')
def customer_page():
    return send_from_directory('public', 'customer.html')


@app.route('/employee')
def employee_page():
    return send_from_directory('public', 'employee.html')


@app.route('/ceo')
def ceo_page():
    return send_from_directory('public', 'ceo.html')


@app.route('/api/status')
def api_status():
    return jsonify({
        "name": "Aapka AI – Invisible Enterprise Brain",
        "version": "2.0.0-Enterprise",
        "subscription": "ACTIVE" if DB["isSubscriptionActive"] else "LOCKED",
        "isSubscriptionActive": DB["isSubscriptionActive"],
        "connectedSystems": DB["connected_systems"],
        "metrics": DB["metrics"],
        "openCases": len([c for c in DB["cases"].values() if c["status"] != "Resolved"]),
        "unreadNotifications": len([n for n in DB["notifications"] if not n["read"]])
    })


@app.route('/api/chat', methods=['POST'])
def api_chat():
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403

    data = request.get_json() or {}
    message = data.get("message", "")
    customer_id = data.get("customerId")
    if not message:
        return jsonify({"error": "Message required"}), 400

    start = time.time()
    result = process_chat(message, customer_id)
    result["latencyMs"] = int((time.time() - start) * 1000)
    result["timestamp"] = datetime.utcnow().isoformat() + "Z"
    result["source"] = "Invisible Enterprise Brain v2.0"
    return jsonify(result)


@app.route('/api/customer/<cid>')
def api_customer(cid):
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403
    cust = DB["customers"].get(cid)
    if not cust:
        return jsonify({"error": "Not found"}), 404
    orders = get_customer_orders(cid)
    return jsonify({**cust, "orders": orders})


@app.route('/api/employee/notifications')
def api_notifications():
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403
    return jsonify({
        "notifications": DB["notifications"][-10:],
        "unread": len([n for n in DB["notifications"] if not n["read"]])
    })


@app.route('/api/employee/cases')
def api_cases():
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403
    cases = list(DB["cases"].values())
    cases.sort(key=lambda x: x["created"], reverse=True)
    return jsonify(cases)


@app.route('/api/employee/case/<case_id>')
def api_case(case_id):
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403
    case = DB["cases"].get(case_id)
    if not case:
        return jsonify({"error": "Case not found"}), 404
    customer = DB["customers"].get(case["customerId"])
    return jsonify({**case, "customer": customer})


@app.route('/api/employee/action', methods=['POST'])
def api_employee_action():
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403

    data = request.get_json() or {}
    case_id = data.get("caseId")
    action_id = data.get("actionId")
    case = DB["cases"].get(case_id)
    if not case:
        return jsonify({"error": "Case not found"}), 404

    action = next((a for a in case["actions"] if a["id"] == action_id), None)
    if not action:
        return jsonify({"error": "Invalid action"}), 400

    result_msg = ""
    extra = {}

    if action_id == 1:
        for sys in DB["connected_systems"]:
            DB["connected_systems"][sys] = "SYNCING"
        for sys in DB["connected_systems"]:
            DB["connected_systems"][sys] = "CONNECTED"
        result_msg = (
            f"Backend Hard-Reset & Resync COMPLETE\n\n"
            f"Salesforce, Zendesk, OrderDB, Email caches cleared and re-synced.\n"
            f"Customer record integrity: 100%\n"
            f"Case {case_id} marked Resolved."
        )
        add_hours_saved(25)

    elif action_id == 2:
        result_msg = (
            f"Priority Ticket pushed to Slack/Teams Webhook\n\n"
            f"Channel: #customer-critical\n"
            f"Payload delivered with full context + case {case_id}.\n"
            f"Manager notified. Expected response < 30 minutes."
        )
        add_hours_saved(12)
        extra["webhook"] = "https://hooks.slack.com/services/MOCK/ENTERPRISE/PUSHED"

    elif action_id == 3:
        code = f"AAPKA-{secrets.token_hex(3).upper()}"
        voucher = {
            "code": code,
            "value": 20,
            "currency": "USD",
            "inr": 1600,
            "customerId": case["customerId"],
            "caseId": case_id,
            "created": datetime.utcnow().isoformat() + "Z",
            "status": "ACTIVE"
        }
        DB["vouchers"].append(voucher)
        result_msg = (
            f"Compensation Voucher Generated\n\n"
            f"Code: {code}\n"
            f"Value: $20 (approx Rs.1,600)\n"
            f"Attached to customer account.\n"
            f"One-time use. Expires in 90 days."
        )
        add_hours_saved(18)
        if case["tier"] == "Premium":
            DB["metrics"]["vip_churn_stopped"] += 1
        extra["voucher"] = voucher

    case["status"] = "Resolved"
    case["resolvedAction"] = action["title"]
    case["resolvedAt"] = datetime.utcnow().isoformat() + "Z"

    for n in DB["notifications"]:
        if n.get("caseId") == case_id:
            n["read"] = True

    return jsonify({
        "success": True,
        "message": result_msg,
        "case": case,
        "extra": extra,
        "metrics": DB["metrics"]
    })


@app.route('/api/ceo/metrics')
def api_ceo_metrics():
    return jsonify({
        "isSubscriptionActive": DB["isSubscriptionActive"],
        "metrics": DB["metrics"],
        "connectedSystems": DB["connected_systems"],
        "openCases": len([c for c in DB["cases"].values() if c["status"] != "Resolved"]),
        "totalCases": len(DB["cases"]),
        "totalReceipts": len(DB["receipts"]),
        "totalVouchers": len(DB["vouchers"]),
        "pricing": {
            "tier": "Enterprise",
            "price": 1200,
            "currency": "USD",
            "period": "month",
            "status": "ACTIVE" if DB["isSubscriptionActive"] else "SUSPENDED"
        }
    })


@app.route('/api/ceo/toggle-subscription', methods=['POST'])
def api_toggle_subscription():
    data = request.get_json() or {}
    new_state = data.get("active")
    if new_state is None:
        return jsonify({"error": "active boolean required"}), 400

    DB["isSubscriptionActive"] = bool(new_state)

    if not DB["isSubscriptionActive"]:
        for k in DB["connected_systems"]:
            DB["connected_systems"][k] = "DISCONNECTED"
        return jsonify({
            "success": True,
            "isSubscriptionActive": False,
            "warning": (
                "CRITICAL: Subscription deactivated.\n"
                "Customer chat and Employee desk are now locked.\n"
                "All automation pipelines offline.\n"
                "Average resolution time will rise from 2 seconds to 4.5 hours."
            ),
            "connectedSystems": DB["connected_systems"]
        })
    else:
        for k in DB["connected_systems"]:
            DB["connected_systems"][k] = "CONNECTED"
        return jsonify({
            "success": True,
            "isSubscriptionActive": True,
            "message": "Enterprise subscription restored. All pipelines online.",
            "connectedSystems": DB["connected_systems"]
        })


@app.route('/api/orders')
def api_orders():
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout_response()), 403
    return jsonify(list(DB["orders"].values()))


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    print("\n" + "=" * 60)
    print("  Aapka AI – Invisible Enterprise Brain v2.0")
    print("  Enterprise SaaS  |  $1,200/mo tier ready")
    print("=" * 60)
    print(f"  Customer Portal : http://localhost:{port}/customer")
    print(f"  Employee Desk   : http://localhost:{port}/employee")
    print(f"  CEO Dashboard   : http://localhost:{port}/ceo")
    print("=" * 60 + "\n")
    app.run(host='0.0.0.0', port=port, debug=False)
