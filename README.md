# Aapka AI — Invisible Enterprise Brain (Pilot)

Multi-company support automation console. **No Google login required** — open link and use.

## Files (GitHub root)

```
app.py
requirements.txt
README.md
public/
  admin.html
  admin-app.js
  customer.html
  owner.html
  login.html
  ceo.html
  employee.html
  integrations.html
```

## GitHub पर upload कैसे करें

1. https://github.com → अपना `Fast-Ai` repo खोलो  
2. हर file: **Add file → Upload files** या VS Code / GitHub Desktop से push  
3. `app.py`, `requirements.txt`, `README.md` **repo root** पर  
4. `public/` folder के अंदर सारी HTML/JS  
5. Commit → Render auto-deploy (या Manual Deploy)

**एक file का आधा code कट जाए** तो: छोटी file पहले, या GitHub Desktop / `git push` इस्तेमाल करो (web paste बड़ी files के लिए कमज़ोर है)।

## Render Environment

| KEY | VALUE |
|-----|--------|
| (optional) SECRET_KEY | कोई random string |
| (optional) AAPKA_DATA | `/var/data` — सिर्फ जब paid Disk लगा हो |

Google login **बंद** है। `GOOGLE_CLIENT_ID` जरूरी नहीं।

## 6 Dashboards (Tool link खोलने पर)

1. **Overview / Home** — आज का summary  
2. **Employee / Agent Desk** — cases, reply, actions  
3. **CEO / ROI** — hours saved style metrics (measured on this workspace)  
4. **Integrations** — Salesforce, Zendesk, Payment… company अपनी keys डाले  
5. **History & Audit** — सिर्फ **इस** company के records  
6. **Customer portal** — अलग **Customer link** से  

Menu (☰) या search से modules खोलो।

## 30,000 कंपनियों को क्या भेजना है

हर कंपनी के लिए **सिर्फ 2 links**:

| Link | किसके लिए |
|------|-----------|
| **Tool link** `/w/XXXX` | Staff + CEO — console |
| **Customer link** `/w/XXXX/customer` | कंपनी अपने ऐप के **Help** बटन पर लगाए |

**कैसे बनाएँ**

1. खोलो: `https://YOUR-RENDER-URL/owner`  
2. कंपनी का नाम लिखो → **Create Company Links**  
3. दोनों links Copy → **सिर्फ उसी कंपनी** को भेजो  
4. अगली कंपनी = फिर Create → नए दो links  

एक company का refund / data दूसरी company के tool पर **नहीं** जाता (अलग workspace id)।

## Company को एक लाइन में message (copy)

```
Aapka AI setup:
1) Staff console: [TOOL_LINK]
2) Customer Help URL (app में लगाएँ): [CUSTOMER_LINK]
Integrations में अपनी Salesforce/Zendesk/Payment keys डालकर Connect करें।
```

## Real vs Demo

- **Real:** multi-company isolation, owner link generator, local order status + receipt hash, credential forms  
- **Demo until company connects:** bank/Stripe money move, live Salesforce/Zendesk sync  
- Connect success **provider + सही keys** पर निर्भर — कोई 97% guarantee hardcode नहीं  

## Local run

```bash
pip install -r requirements.txt
python app.py
```

Port: `PORT` env या 10000.
