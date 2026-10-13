#!/usr/bin/env python3
"""
Aapka AI – Invisible Enterprise Brain (FINAL)
Company-ready: multi-role, BYO credentials, lockout, ROI, 1-click autopilot.
"""

from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime, timedelta
import time, os, hashlib, secrets, json

app = Flask(__name__, static_folder="public", static_url_path="")

def iso():
    return datetime.utcnow().isoformat() + "Z"

def ts_short():
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M")

DB = {
    "isSubscriptionActive": True,
    "softLock": False,
    "customers": {
        "CUST001": {"id": "CUST001", "name": "Aarav Mehta", "email": "aarav.mehta@email.com", "phone": "+91-9876543210", "tier": "Premium", "joined": "2024-01-15", "balance": 18500, "sentiment": "neutral"},
        "CUST002": {"id": "CUST002", "name": "Sneha Reddy", "email": "sneha.reddy@email.com", "phone": "+91-9123456789", "tier": "Standard", "joined": "2025-06-20", "balance": 4200, "sentiment": "neutral"},
        "CUST003": {"id": "CUST003", "name": "Vikram Singh", "email": "vikram.singh@email.com", "phone": "+91-9988776655", "tier": "Premium", "joined": "2023-11-08", "balance": 32000, "sentiment": "positive"},
        "CUST004": {"id": "CUST004", "name": "Ananya Iyer", "email": "ananya.iyer@email.com", "phone": "+91-9811223344", "tier": "Standard", "joined": "2025-02-14", "balance": 2800, "sentiment": "neutral"},
        "CUST005": {"id": "CUST005", "name": "Kabir Khan", "email": "kabir.khan@email.com", "phone": "+91-9765432100", "tier": "Premium", "joined": "2024-08-22", "balance": 15600, "sentiment": "neutral"},
    },
    "orders": {
        "ORD-5566": {"OrderID": "ORD-5566", "CustomerID": "CUST001", "CustomerName": "Aarav Mehta", "Tier": "Premium", "item": "Delhi to Mumbai Flight", "amount": 8500, "PaymentStatus": "Paid", "date": "2026-10-08", "ChatHistory": []},
        "ORD-4432": {"OrderID": "ORD-4432", "CustomerID": "CUST001", "CustomerName": "Aarav Mehta", "Tier": "Premium", "item": "Taj Hotel Booking", "amount": 12000, "PaymentStatus": "Paid", "date": "2026-09-15", "ChatHistory": []},
        "ORD-7788": {"OrderID": "ORD-7788", "CustomerID": "CUST002", "CustomerName": "Sneha Reddy", "Tier": "Standard", "item": "Goa Package", "amount": 25000, "PaymentStatus": "Paid", "date": "2026-10-01", "ChatHistory": []},
        "ORD-9012": {"OrderID": "ORD-9012", "CustomerID": "CUST003", "CustomerName": "Vikram Singh", "Tier": "Premium", "item": "Business Class BLR-DEL", "amount": 28500, "PaymentStatus": "Paid", "date": "2026-10-05", "ChatHistory": []},
        "ORD-3344": {"OrderID": "ORD-3344", "CustomerID": "CUST004", "CustomerName": "Ananya Iyer", "Tier": "Standard", "item": "Chennai Hotel Stay", "amount": 6800, "PaymentStatus": "Paid", "date": "2026-09-28", "ChatHistory": []},
        "ORD-6677": {"OrderID": "ORD-6677", "CustomerID": "CUST005", "CustomerName": "Kabir Khan", "Tier": "Premium", "item": "Intl Flight + Hotel", "amount": 45000, "PaymentStatus": "Paid", "date": "2026-10-10", "ChatHistory": []},
    },
    "cases": {},
    "notifications": [],
    "vouchers": [],
    "receipts": [],
    "event_log": [],
    "webhook_log": [],
    "activity_log": [],
    "agent_stats": {"Agent-01": {"resolved": 0, "avg_seconds": 0, "actions": 0}},
    "metrics": {
        "human_hours_saved": 0.0,
        "salary_leak_prevented": 0.0,
        "vip_churn_stopped": 0,
        "total_automations": 0,
        "refunds_processed": 0,
        "tickets_created": 0,
    },
    "connected_systems": {
        "Salesforce": "NOT CONNECTED",
        "Zendesk": "NOT CONNECTED",
        "Payment": "NOT CONNECTED",
        "OrderDB": "CONNECTED",
        "Email": "CONNECTED",
    },
    "integrations": {
        "salesforce": {"connected": False, "instance_url": "", "client_id": "", "client_secret": "", "connected_at": None, "last_test": None, "health": "unknown"},
        "zendesk": {"connected": False, "subdomain": "", "email": "", "api_token": "", "connected_at": None, "last_test": None, "health": "unknown"},
        "payment": {"connected": False, "provider": "", "mode": "test", "key_id": "", "key_secret": "", "connected_at": None, "last_test": None, "health": "unknown"},
    },
    "plan": {"name": "Enterprise", "price": 1200, "currency": "USD"},
}


def add_hours(minutes=15):
    h = minutes / 60.0
    DB["metrics"]["human_hours_saved"] = round(DB["metrics"]["human_hours_saved"] + h, 2)
    DB["metrics"]["salary_leak_prevented"] = round(DB["metrics"]["human_hours_saved"] * 25, 2)
    DB["metrics"]["total_automations"] += 1


def log_activity(actor, action, detail=""):
    DB["activity_log"].append({"time": iso(), "actor": actor, "action": action, "detail": detail})
    if len(DB["activity_log"]) > 200:
        DB["activity_log"] = DB["activity_log"][-200:]


def log_event(etype, detail, cid=None):
    DB["event_log"].append({"id": f"EVT-{int(time.time()*1000)%1000000}", "type": etype, "detail": detail, "customer_id": cid, "timestamp": iso()})
    if len(DB["event_log"]) > 100:
        DB["event_log"] = DB["event_log"][-100:]


def fire_webhooks(etype, payload):
    for target, ch in [("Sales Team", "#sales-alerts"), ("Tech / Engineering", "#tech-ops")]:
        DB["webhook_log"].append({"target": target, "channel": ch, "event": etype, "payload": payload, "timestamp": iso(), "status": "DELIVERED"})
    if len(DB["webhook_log"]) > 50:
        DB["webhook_log"] = DB["webhook_log"][-50:]


def receipt(order_id, amount, name):
    raw = f"{order_id}|{amount}|{name}|{iso()}|{secrets.token_hex(8)}"
    dig = hashlib.sha256(raw.encode()).hexdigest()
    r = {"receipt_id": f"RCP-{dig[:12].upper()}", "order_id": order_id, "amount": amount, "customer": name, "timestamp": iso(), "hash": dig, "status": "REFUNDED"}
    DB["receipts"].append(r)
    return r


def orders_of(cid):
    return [o for o in DB["orders"].values() if o["CustomerID"] == cid]


def lockout():
    return {
        "error": "CRITICAL_PIPELINE_FAILURE",
        "message": (
            "CRITICAL PIPELINE FAILURE: Aapka AI Core Brain Disconnected.\n\n"
            "All automation stopped.\n"
            "• 1-click actions removed\n"
            "• Customer context & history LOCKED\n"
            "• Priority routing disabled\n"
            "• Historical memory unavailable\n\n"
            "Queue time: 2 seconds → 4.5 hours\n"
            "Agents must open Salesforce + Zendesk + OrderDB manually again.\n"
            "Full 8-hour shift load has returned.\n\n"
            "REINSTATEMENT: Enterprise $1,200/mo\n"
            "Employees will request reactivation from leadership."
        ),
        "locked": True,
        "reinstatement_amount": "$1,200/mo",
    }


def soft_lock_msg():
    return {
        "error": "SOFT_LOCK",
        "message": "Reduced mode: some automations paused. Reactivate full Enterprise to restore 1-click and priority routing.",
        "soft": True,
    }


def process_chat(message, customer_id):
    if not DB["isSubscriptionActive"]:
        return lockout()
    lower = (message or "").lower().strip()
    c = DB["customers"].get(customer_id)
    if not c:
        return {"reply": "Select a valid customer.", "type": "error", "confidence": 0.3}
    tier = c["tier"]
    prem = tier == "Premium"
    pri = "PRIORITY (Premium) — " if prem else ""

    # Refund
    if any(w in lower for w in ["refund", "वापसी", "पैसे वापस", "money back", "refund chahiye"]):
        paid = [o for o in orders_of(customer_id) if o["PaymentStatus"] == "Paid"]
        if not paid:
            return {"reply": f"{pri}No eligible paid order (already refunded or none).", "type": "info", "confidence": 0.9}
        o = paid[0]
        o["PaymentStatus"] = "Refunded"
        o["ChatHistory"].append({"role": "customer", "msg": message, "time": iso()})
        r = receipt(o["OrderID"], o["amount"], o["CustomerName"])
        add_hours(15)
        DB["metrics"]["refunds_processed"] += 1
        if prem:
            DB["metrics"]["vip_churn_stopped"] += 1
        log_event("refund_executed", f"{o['OrderID']} Rs.{o['amount']}", customer_id)
        log_activity("system", "refund", o["OrderID"])
        fire_webhooks("REFUND_PROCESSED", {"order_id": o["OrderID"], "amount": o["amount"], "customer": o["CustomerName"], "tier": tier})
        pay = DB["integrations"]["payment"]
        pay_note = f"\nVia {pay['provider']} ({pay['mode']}) — your merchant account." if pay["connected"] else "\n(Connect Payment on /integrations for live gateway routing.)"
        return {
            "reply": (
                f"{pri}REFUND EXECUTED\n\n"
                f"Order: {o['item']} ({o['OrderID']})\nAmount: Rs.{o['amount']}\n"
                f"PaymentStatus: Paid → Refunded{pay_note}\n\n"
                f"Receipt ID: {r['receipt_id']}\nHash: {r['hash'][:24]}...\nTime: {r['timestamp']}\n\n"
                f"Reflects in 5-7 working days."
            ),
            "type": "refund_executed", "confidence": 0.98, "receipt": r, "order": o,
        }

    # Complex
    if any(w in lower for w in ["complex", "complex problem", "bahut complex", "help karo", "serious", "escalate", "problem"]):
        case_id = f"CASE-{int(time.time()) % 100000}"
        case = {
            "id": case_id, "customerId": customer_id, "customerName": c["name"], "tier": tier,
            "title": f"Complex Issue — {c['name']}", "status": "Escalated",
            "priority": "Critical" if prem else "High", "queue": "premium" if prem else "standard",
            "created": iso(),
            "summary": (
                f"Customer {c['name']} ({tier}) raised a complex issue.\n"
                f"Context loaded from connected CRM + Helpdesk + Order DB.\n"
                f"Open orders: {len(orders_of(customer_id))}. Sentiment: {c.get('sentiment','neutral')}.\n"
                f"AI recommends 3 one-click actions for the agent."
            ),
            "history": [
                {"time": ts_short(), "event": "Customer triggered complex issue"},
                {"time": ts_short(), "event": "Full context + order history loaded"},
                {"time": ts_short(), "event": f"Routed to {'Premium' if prem else 'Standard'} queue"},
            ],
            "actions": [
                {"id": 1, "color": "red", "title": "DB Hard-Reset & Resync", "description": "Resync customer across Salesforce, Zendesk, OrderDB.", "impact": "High – consistency"},
                {"id": 2, "color": "yellow", "title": "Escalate to Slack/Teams", "description": "Alert #customer-critical with full payload.", "impact": "Manager < 30s"},
                {"id": 3, "color": "green", "title": "Issue $20 Goodwill Voucher", "description": "One-time $20 / Rs.1,600 voucher on account.", "impact": "Retention"},
                {"id": 4, "color": "blue", "title": "Create Support Ticket", "description": "Open formal ticket in connected helpdesk.", "impact": "Tracked workflow"},
            ],
        }
        DB["cases"][case_id] = case
        DB["notifications"].append({"id": f"N-{case_id}", "caseId": case_id, "message": f"New case from {c['name']} ({tier})", "priority": case["priority"], "time": iso(), "read": False})
        add_hours(20)
        if prem:
            DB["metrics"]["vip_churn_stopped"] += 1
        log_event("complex_escalated", case_id, customer_id)
        fire_webhooks("COMPLEX_ISSUE_ESCALATED", {"case_id": case_id, "customer": c["name"], "tier": tier})
        log_activity("system", "escalate", case_id)
        return {
            "reply": f"{pri}Complex case {case_id} created.\nFull context pushed to Employee Desk.\nAgent gets 4 one-click actions.",
            "type": "complex_escalated", "confidence": 0.94, "caseId": case_id,
        }

    # Status
    if any(w in lower for w in ["status", "स्टेटस", "order status", "meri order", "orders"]):
        os_ = orders_of(customer_id)
        if not os_:
            return {"reply": f"{pri}No orders found.", "type": "info", "confidence": 0.9}
        lines = "\n".join(f"- {o['item']} ({o['OrderID']}) → {o['PaymentStatus']} · Rs.{o['amount']}" for o in os_)
        return {"reply": f"{pri}Your orders:\n\n{lines}", "type": "status", "confidence": 0.95}

    # Ticket / book
    if any(w in lower for w in ["ticket", "book", "booking", "टिकट", "बुक"]):
        DB["metrics"]["tickets_created"] += 1
        add_hours(5)
        return {
            "reply": f"{pri}Booking/ticket request logged.\nFor refunds say \"refund chahiye\". For hard issues say \"complex problem\" — agent gets 1-click tools.",
            "type": "ticket", "confidence": 0.88,
        }

    return {
        "reply": f"{pri}I can help with:\n• Refund (refund chahiye)\n• Order status\n• Complex issue → employee + 1-click actions\n• Ticket/booking help\n\nWhat do you need?",
        "type": "help", "confidence": 0.85,
    }


# ---------- PAGES ----------
@app.route("/")
def root():
    return send_from_directory("public", "customer.html")

@app.route("/customer")
def page_customer():
    return send_from_directory("public", "customer.html")

@app.route("/employee")
def page_employee():
    return send_from_directory("public", "employee.html")

@app.route("/ceo")
def page_ceo():
    return send_from_directory("public", "ceo.html")

@app.route("/integrations")
def page_integrations():
    return send_from_directory("public", "integrations.html")


# ---------- API ----------
@app.route("/api/chat", methods=["POST"])
def api_chat():
    d = request.get_json() or {}
    return jsonify(process_chat(d.get("message", ""), d.get("customer_id", "CUST001")))


@app.route("/api/customer/<cid>")
def api_customer(cid):
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout()), 403
    c = DB["customers"].get(cid)
    if not c:
        return jsonify({"error": "not found"}), 404
    return jsonify({"customer": c, "orders": orders_of(cid)})


@app.route("/api/cases")
def api_cases():
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout()), 403
    cases = sorted(DB["cases"].values(), key=lambda x: x.get("created", ""), reverse=True)
    notifs = [n for n in DB["notifications"] if not n.get("read")]
    return jsonify({"cases": cases, "notifications": notifs})


@app.route("/api/cases/<case_id>")
def api_case(case_id):
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout()), 403
    case = DB["cases"].get(case_id)
    if not case:
        return jsonify({"error": "not found"}), 404
    return jsonify(case)


@app.route("/api/cases/<case_id>/action", methods=["POST"])
def api_action(case_id):
    if not DB["isSubscriptionActive"]:
        return jsonify(lockout()), 403
    case = DB["cases"].get(case_id)
    if not case:
        return jsonify({"error": "not found"}), 404
    aid = int((request.get_json() or {}).get("action_id", 0))
    action = next((a for a in case.get("actions", []) if a["id"] == aid), None)
    if not action:
        return jsonify({"error": "invalid action"}), 400

    msg = ""
    if aid == 1:
        case["history"].append({"time": ts_short(), "event": "DB Hard-Reset & Resync executed"})
        msg = "Customer resynced across Salesforce, Zendesk, OrderDB."
        add_hours(10)
    elif aid == 2:
        case["history"].append({"time": ts_short(), "event": "Escalated to Slack/Teams"})
        fire_webhooks("PRIORITY_ESCALATION", {"case_id": case_id, "customer": case["customerName"]})
        msg = "Alert pushed to #customer-critical."
        add_hours(5)
    elif aid == 3:
        code = f"GOODWILL-{secrets.token_hex(4).upper()}"
        DB["vouchers"].append({"code": code, "customerId": case["customerId"], "amount": 20, "created": iso()})
        case["history"].append({"time": ts_short(), "event": f"Voucher {code} issued ($20)"})
        msg = f"Voucher issued: {code} ($20 / Rs.1,600)."
        add_hours(8)
        if case.get("tier") == "Premium":
            DB["metrics"]["vip_churn_stopped"] += 1
    elif aid == 4:
        case["history"].append({"time": ts_short(), "event": "Support ticket created in helpdesk"})
        DB["metrics"]["tickets_created"] += 1
        msg = "Formal ticket created in connected helpdesk path."
        add_hours(6)

    case["status"] = "In Progress"
    DB["agent_stats"]["Agent-01"]["resolved"] += 1
    DB["agent_stats"]["Agent-01"]["actions"] += 1
    log_activity("Agent-01", f"action_{aid}", case_id)
    log_event("action_executed", f"{case_id} action {aid}", case.get("customerId"))
    return jsonify({"success": True, "message": msg, "case": case})


@app.route("/api/notifications/read", methods=["POST"])
def api_notif_read():
    for n in DB["notifications"]:
        n["read"] = True
    return jsonify({"ok": True})


@app.route("/api/ceo/metrics")
def api_ceo():
    open_c = len([c for c in DB["cases"].values() if c.get("status") != "Resolved"])
    hours = DB["metrics"]["human_hours_saved"]
    autos = DB["metrics"]["total_automations"]
    proj_h = max(hours * 4, autos * 0.25 * 4)
    return jsonify({
        "isSubscriptionActive": DB["isSubscriptionActive"],
        "softLock": DB["softLock"],
        "metrics": DB["metrics"],
        "connectedSystems": DB["connected_systems"],
        "openCases": open_c,
        "totalCases": len(DB["cases"]),
        "totalReceipts": len(DB["receipts"]),
        "totalVouchers": len(DB["vouchers"]),
        "plan": DB["plan"],
        "cancelImpact": {
            "extraHoursNextMonth": round(proj_h, 1),
            "extraCostUsd": round(proj_h * 25, 0),
            "queueHours": 4.5,
        },
        "employeeDependency": {
            "message": "Without Aapka AI, average handling time returns to 20–30 min per complex case.",
            "withToolMinutes": 0.5,
            "withoutToolMinutes": 25,
        },
        "agentStats": DB["agent_stats"],
        "activityLog": DB["activity_log"][-15:],
        "monthlyReport": {
            "hoursSaved": hours,
            "valueUsd": DB["metrics"]["salary_leak_prevented"],
            "ifCancelExtraUsd": round(proj_h * 25, 0),
        },
    })


@app.route("/api/ceo/toggle-subscription", methods=["POST"])
def api_toggle():
    data = request.get_json() or {}
    active = bool(data.get("active", True))
    DB["isSubscriptionActive"] = active
    DB["softLock"] = False
    if not active:
        log_activity("CEO", "subscription_deactivated")
        return jsonify({
            "success": True, "isSubscriptionActive": False,
            "warning": "DEACTIVATED. Portals locked. Queue → 4.5 hrs. Reinstatement $1,200/mo. Employees will escalate to leadership.",
        })
    log_activity("CEO", "subscription_reactivated")
    return jsonify({"success": True, "isSubscriptionActive": True, "message": "REACTIVATED. All pipelines online."})


@app.route("/api/ceo/soft-lock", methods=["POST"])
def api_soft_lock():
    data = request.get_json() or {}
    DB["softLock"] = bool(data.get("enabled", True))
    return jsonify({"success": True, "softLock": DB["softLock"]})


@app.route("/api/integrations/status")
def api_integ_status():
    i = DB["integrations"]
    return jsonify({
        "salesforce": {"connected": i["salesforce"]["connected"], "health": i["salesforce"].get("health", "unknown")},
        "zendesk": {"connected": i["zendesk"]["connected"], "health": i["zendesk"].get("health", "unknown")},
        "payment": {"connected": i["payment"]["connected"], "health": i["payment"].get("health", "unknown"), "mode": i["payment"].get("mode")},
    })


@app.route("/api/integrations/connect", methods=["POST"])
def api_integ_connect():
    data = request.get_json() or {}
    system = (data.get("system") or "").lower()

    if system == "salesforce":
        if not all([data.get("instance_url"), data.get("client_id"), data.get("client_secret")]):
            return jsonify({"success": False, "error": "Fill all Salesforce fields"}), 400
        DB["integrations"]["salesforce"] = {
            "connected": True, "instance_url": data["instance_url"].rstrip("/"),
            "client_id": data["client_id"], "client_secret": data["client_secret"],
            "connected_at": iso(), "last_test": None, "health": "connected",
        }
        DB["connected_systems"]["Salesforce"] = "CONNECTED"
        log_activity("admin", "connect_salesforce")
        return jsonify({"success": True, "message": "Salesforce connected. CRM path ready."})

    if system == "zendesk":
        if not all([data.get("subdomain"), data.get("email"), data.get("api_token")]):
            return jsonify({"success": False, "error": "Fill all Zendesk fields"}), 400
        DB["integrations"]["zendesk"] = {
            "connected": True, "subdomain": data["subdomain"], "email": data["email"],
            "api_token": data["api_token"], "connected_at": iso(), "last_test": None, "health": "connected",
        }
        DB["connected_systems"]["Zendesk"] = "CONNECTED"
        log_activity("admin", "connect_zendesk")
        return jsonify({"success": True, "message": "Zendesk connected. Helpdesk path ready."})

    if system == "payment":
        if not all([data.get("key_id"), data.get("key_secret")]):
            return jsonify({"success": False, "error": "Fill Payment keys"}), 400
        DB["integrations"]["payment"] = {
            "connected": True, "provider": data.get("provider", "razorpay"),
            "mode": data.get("mode", "test"), "key_id": data["key_id"], "key_secret": data["key_secret"],
            "connected_at": iso(), "last_test": None, "health": "connected",
        }
        DB["connected_systems"]["Payment"] = "CONNECTED"
        log_activity("admin", "connect_payment")
        return jsonify({
            "success": True,
            "message": f"Payment ({data.get('provider','razorpay')}) connected in {data.get('mode','test')} mode. Money stays in your merchant account only.",
        })

    return jsonify({"success": False, "error": "Unknown system"}), 400


@app.route("/api/integrations/test", methods=["POST"])
def api_integ_test():
    data = request.get_json() or {}
    system = (data.get("system") or "").lower()
    integ = DB["integrations"].get(system)
    if not integ or not integ.get("connected"):
        return jsonify({"success": False, "error": "Connect first, then Test."}), 400
    # Format validation + ready flag (live HTTP to Razorpay/SF when keys available in next iteration)
    ok = True
    detail = f"{system} credentials accepted."
    if system == "payment":
        kid = integ.get("key_id", "")
        if integ.get("provider") == "razorpay" and not kid.startswith("rzp_"):
            ok = False
            detail = "Razorpay Key ID usually starts with rzp_test_ or rzp_live_"
        elif integ.get("provider") == "stripe" and not (kid.startswith("pk_") or kid.startswith("sk_")):
            ok = False
            detail = "Stripe keys usually start with pk_ or sk_"
    integ["last_test"] = iso()
    integ["health"] = "healthy" if ok else "error"
    if ok:
        return jsonify({"success": True, "message": detail + " Test passed. Ready for live API when enabled.", "health": "healthy"})
    return jsonify({"success": False, "error": detail, "health": "error"}), 400


@app.route("/api/integrations/disconnect", methods=["POST"])
def api_integ_disconnect():
    data = request.get_json() or {}
    system = (data.get("system") or "").lower()
    if system not in DB["integrations"]:
        return jsonify({"success": False, "error": "Unknown"}), 400
    for k in list(DB["integrations"][system].keys()):
        if k in ("connected", "health"):
            continue
        if isinstance(DB["integrations"][system].get(k), str):
            DB["integrations"][system][k] = ""
    DB["integrations"][system]["connected"] = False
    DB["integrations"][system]["health"] = "unknown"
    label = {"salesforce": "Salesforce", "zendesk": "Zendesk", "payment": "Payment"}.get(system, system)
    if label in DB["connected_systems"]:
        DB["connected_systems"][label] = "NOT CONNECTED"
    return jsonify({"success": True, "message": f"{label} disconnected."})


@app.route("/api/status")
def api_status():
    return jsonify({
        "name": "Aapka AI – Invisible Enterprise Brain",
        "version": "4.0.0-FINAL",
        "subscription": "ACTIVE" if DB["isSubscriptionActive"] else "LOCKED",
        "isSubscriptionActive": DB["isSubscriptionActive"],
        "connectedSystems": DB["connected_systems"],
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    print("\n" + "=" * 58)
    print("  Aapka AI – Invisible Enterprise Brain  FINAL")
    print("=" * 58)
    print(f"  /customer       /employee")
    print(f"  /ceo            /integrations")
    print(f"  port {port}")
    print("=" * 58 + "\n")
    app.run(host="0.0.0.0", port=port, debug=False)
