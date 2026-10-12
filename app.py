#!/usr/bin/env python3
"""
Aapka AI – Invisible Enterprise Brain
Complete working prototype
"""

from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime
import time
import os

app = Flask(__name__, static_folder='public', static_url_path='')

# ==================== MOCK DATABASE ====================
CUSTOMERS = {
    "CUST001": {
        "id": "CUST001",
        "name": "Rahul Sharma",
        "email": "rahul.sharma@email.com",
        "phone": "+91-9876543210",
        "plan": "Premium",
        "joined": "2024-01-15",
        "balance": 12500,
        "tickets": [
            {"id": "TKT-1023", "subject": "Flight cancellation", "status": "Open", "created": "2026-10-10", "priority": "High"},
            {"id": "TKT-0987", "subject": "Refund request for hotel", "status": "Resolved", "created": "2026-09-20", "priority": "Medium"}
        ],
        "orders": [
            {"id": "ORD-5566", "item": "Delhi to Mumbai Flight", "amount": 8500, "date": "2026-10-08", "status": "Cancelled"},
            {"id": "ORD-4432", "item": "Taj Hotel Booking", "amount": 12000, "date": "2026-09-15", "status": "Completed"}
        ],
        "chats": [
            {"from": "customer", "msg": "Mera flight cancel ho gaya, refund chahiye", "time": "2026-10-10 14:30"},
            {"from": "agent", "msg": "Sure, checking your booking...", "time": "2026-10-10 14:32"}
        ]
    },
    "CUST002": {
        "id": "CUST002",
        "name": "Priya Patel",
        "email": "priya.p@email.com",
        "phone": "+91-9123456789",
        "plan": "Standard",
        "joined": "2025-06-20",
        "balance": 3200,
        "tickets": [
            {"id": "TKT-1101", "subject": "Login issue", "status": "Open", "created": "2026-10-11", "priority": "Low"}
        ],
        "orders": [
            {"id": "ORD-7788", "item": "Goa Package", "amount": 25000, "date": "2026-10-01", "status": "Confirmed"}
        ],
        "chats": []
    }
}

KNOWLEDGE_BASE = [
    {"q": ["refund", "वापसी", "पैसे वापस", "money back"], "a": "आपका refund 5-7 working days में आपके original payment method में process हो जाएगा। Tracking ID: REF-"},
    {"q": ["ticket", "टिकट", "booking", "बुक", "book"], "a": "टिकट booking के लिए कृपया destination, date और passengers बताएं। मैं अभी book कर सकता हूँ।"},
    {"q": ["cancel", "कैंसल", "cancellation"], "a": "Cancellation policy के अनुसार 24 hours पहले free cancel होता है। आपके case में full refund eligible है।"},
    {"q": ["status", "स्टेटस", "order"], "a": "आपके recent order का status: "},
    {"q": ["hello", "hi", "नमस्ते", "hey", "hola"], "a": "नमस्ते! मैं Aapka AI हूँ – Invisible Enterprise Brain। कैसे मदद करूँ?"},
    {"q": ["help", "मदद", "support"], "a": "मैं refund, ticket booking, order status, और complex issues में help कर सकता हूँ। बताइए क्या चाहिए?"}
]

EMPLOYEE_CASES = {
    "CASE-901": {
        "id": "CASE-901",
        "customerId": "CUST001",
        "title": "Flight Cancellation + Refund Dispute",
        "status": "Escalated",
        "priority": "Critical",
        "created": "2026-10-10T14:30:00",
        "summary": "Customer Rahul Sharma का Delhi-Mumbai flight (ORD-5566) cancel हो गया। Airline ने partial refund दिया लेकिन customer full refund मांग रहा है क्योंकि cancellation airline की तरफ से था। Previous history में hotel refund successful था। Customer Premium plan पर है और 2 open tickets हैं।",
        "history": [
            {"time": "2026-10-10 14:30", "event": "Customer chat started – refund request"},
            {"time": "2026-10-10 14:45", "event": "Auto AI tried refund, airline API returned partial only"},
            {"time": "2026-10-10 15:10", "event": "Escalated to human – complex policy conflict"},
            {"time": "2026-09-20", "event": "Previous successful hotel refund (TKT-0987)"}
        ],
        "suggestedActions": [
            {
                "id": 1,
                "title": "Full Refund Approve (Policy Override)",
                "description": "Premium customer + airline fault → full ₹8500 refund approve करें। Slack approval flow trigger होगा।",
                "confidence": 92,
                "impact": "Customer retention high, cost ₹8500"
            },
            {
                "id": 2,
                "title": "Partial + Voucher Offer",
                "description": "₹5000 cash + ₹4000 travel voucher offer करें। Acceptance probability 78%.",
                "confidence": 78,
                "impact": "Cost effective, good for future bookings"
            },
            {
                "id": 3,
                "title": "Escalate to Airline Partner API",
                "description": "Airline partner के special recovery desk को auto-ticket बनाकर भेजें। Expected response 4 hours।",
                "confidence": 65,
                "impact": "Zero cost to us, may take time"
            }
        ]
    }
}

# ==================== AI ENGINE ====================
def get_ai_response(message, customer_id=None):
    lower = message.lower()
    customer = CUSTOMERS.get(customer_id) if customer_id else None

    for kb in KNOWLEDGE_BASE:
        if any(k in lower for k in kb["q"]):
            answer = kb["a"]
            if any(w in lower for w in ["refund", "वापसी", "पैसे"]):
                if customer and any(o["status"] == "Cancelled" for o in customer["orders"]):
                    order = next(o for o in customer["orders"] if o["status"] == "Cancelled")
                    answer = (
                        f"✅ आपका refund process शुरू हो गया है!\n\n"
                        f"Order: {order['item']} (₹{order['amount']})\n"
                        f"Refund Amount: ₹{order['amount']}\n"
                        f"Tracking ID: REF-{str(int(time.time()))[-6:]}\n\n"
                        f"5-7 working days में आपके account में आ जाएगा। Customer khush! 😊"
                    )
                else:
                    answer += str(int(time.time()))[-6:]
            if any(w in lower for w in ["status", "स्टेटस"]):
                if customer:
                    latest = customer["orders"][0]
                    answer += f"{latest['item']} → {latest['status']} (₹{latest['amount']})"
            if any(w in lower for w in ["ticket", "बुक", "booking", "book"]):
                answer = (
                    "✈️ Ticket Booking Ready!\n\n"
                    "कृपया बताएं:\n1. From → To\n2. Date\n3. Passengers\n\n"
                    "मैं 2 second में book कर दूंगा। (Demo: Delhi-Mumbai 15 Oct के लिए 1 seat available ₹7200)"
                )
            return {"reply": answer, "type": "instant", "confidence": 0.95}

    # Complex / escalate
    if customer:
        return {
            "reply": (
                f"मैं समझ गया। आपके account ({customer['name']}) की पूरी history check कर ली।\n\n"
                "यह complex case लगता है। मैंने employee dashboard पर full summary + 3 ready solutions भेज दिए हैं। "
                "Employee 1 click में action ले सकता है।\n\nआपको 30 seconds में response मिलेगा।"
            ),
            "type": "escalate",
            "confidence": 0.7,
            "caseId": "CASE-901"
        }

    return {
        "reply": (
            "मैं Aapka AI – Invisible Enterprise Brain हूँ। मैं company के सभी data "
            "(emails, chats, Salesforce, Zendesk) से connected हूँ।\n\n"
            "कृपया अपना Customer ID बताएं (e.g. CUST001) या सीधा सवाल पूछें: refund, ticket book, status आदि।"
        ),
        "type": "general",
        "confidence": 0.6
    }

# ==================== ROUTES ====================
@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/employee')
def employee():
    return send_from_directory('public', 'employee.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json() or {}
    message = data.get('message', '')
    customer_id = data.get('customerId')
    if not message:
        return jsonify({"error": "Message required"}), 400

    start = time.time()
    result = get_ai_response(message, customer_id)
    latency = int((time.time() - start) * 1000)

    return jsonify({
        **result,
        "latencyMs": latency,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source": "Invisible Enterprise Brain v1.0"
    })

@app.route('/api/customer/<cid>')
def get_customer(cid):
    cust = CUSTOMERS.get(cid)
    if not cust:
        return jsonify({"error": "Customer not found"}), 404
    return jsonify(cust)

@app.route('/api/employee/case/<cid>')
def get_case(cid):
    c = EMPLOYEE_CASES.get(cid)
    if not c:
        return jsonify({"error": "Case not found"}), 404
    customer = CUSTOMERS.get(c["customerId"])
    return jsonify({**c, "customer": customer})

@app.route('/api/employee/cases')
def list_cases():
    return jsonify(list(EMPLOYEE_CASES.values()))

@app.route('/api/employee/action', methods=['POST'])
def execute_action():
    data = request.get_json() or {}
    case_id = data.get('caseId')
    action_id = data.get('actionId')
    c = EMPLOYEE_CASES.get(case_id)
    if not c:
        return jsonify({"error": "Case not found"}), 404

    action = next((a for a in c["suggestedActions"] if a["id"] == action_id), None)
    if not action:
        return jsonify({"error": "Invalid action"}), 400

    c["status"] = "Resolved"
    c["resolvedAction"] = action["title"]
    c["resolvedAt"] = datetime.utcnow().isoformat() + "Z"

    return jsonify({
        "success": True,
        "message": f"✅ Action executed successfully!\n\n\"{action['title']}\"\n\nCustomer को notification भेज दिया गया। Case closed.",
        "case": c
    })

@app.route('/api/status')
def status():
    return jsonify({
        "name": "Aapka AI – Invisible Enterprise Brain",
        "version": "1.0.0",
        "status": "Online",
        "connectedSystems": ["Salesforce (mock)", "Zendesk (mock)", "Email", "Chat History", "Order DB"],
        "customersLoaded": len(CUSTOMERS),
        "uptime": time.time()
    })

if __name__ == '__main__':
    print("\n🚀 Aapka AI – Invisible Enterprise Brain")
    print("   Customer Chat : http://localhost:3000")
    print("   Employee Desk : http://localhost:3000/employee\n")
    app.run(host='0.0.0.0', port=3000, debug=False)
