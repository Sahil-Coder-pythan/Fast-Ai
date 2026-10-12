# 🧠 Aapka AI – Invisible Enterprise Brain

> **"Company ke purane saare data, emails, chats aur software tools (Salesforce, Zendesk) se connect ho jata hai."**

Yeh ek complete working prototype hai jo aapke concept ko real product jaisa dikhata hai.

---

## ✨ Features

### Customers Ke Liye
- **2 second mein jawab** – Refund, ticket booking, order status
- Natural Hindi + English support
- Instant refund processing simulation
- Complex cases automatically escalate with full context

### Employees Ke Liye
- **Automatic full summary** – Past history + current issue
- **3 ready-made best solutions** with confidence scores
- **1-click execute** – bas ek click
- Real-time case status update

### Connected Systems (Mock)
- Salesforce (CRM data)
- Zendesk (Tickets)
- Email & Chat History
- Order & Payment Database

---

## 🚀 How to Run

```bash
cd /home/workdir/artifacts
python3 app.py
```

Phir browser mein kholo:

| Page | URL |
|------|-----|
| **Customer Chat** | http://localhost:3000 |
| **Employee Desk** | http://localhost:3000/employee |

---

## 🧪 Demo Flow (Try This)

### Customer Side
1. Customer select karo: **Rahul Sharma (CUST001)**
2. Quick buttons try karo:
   - "Mera refund chahiye" → Instant full refund process
   - "Ticket book karo..." → Booking flow
   - "Bahut complex problem hai" → Escalation to employee

### Employee Side
1. `/employee` pe jao
2. AI ne already summary + 3 solutions ready kiye hain
3. Kisi bhi solution pe **1-Click Execute** dabao
4. Case resolve ho jayega

---

## 📁 Project Structure

```
artifacts/
├── app.py                 # Backend (Flask + AI engine)
├── public/
│   ├── index.html         # Customer Chat UI
│   └── employee.html      # Employee Dashboard
└── README.md
```

---

## 🔧 Tech Stack

- **Backend**: Python + Flask
- **Frontend**: Vanilla JS + Tailwind CSS (CDN)
- **AI Engine**: Rule-based + context-aware (production mein LLM plug-in ready)
- **Data**: In-memory mock DB (Salesforce/Zendesk style)

---

## 🎯 Next Steps (Production)

1. Real LLM (GPT-4o / Claude / Grok) integrate karo
2. Actual Salesforce & Zendesk OAuth connectors
3. Vector DB for company knowledge (RAG)
4. Auth + role-based access
5. Analytics dashboard

---

**Built with ❤️ as a complete working prototype of your "Invisible Enterprise Brain" vision.**
