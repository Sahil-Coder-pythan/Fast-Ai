import os, re, json, uuid, time, shutil
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import requests

BASE = os.path.dirname(os.path.abspath(__file__))
UPLOADS = os.path.join(BASE, 'uploads')
os.makedirs(UPLOADS, exist_ok=True)
VERIFY_TOKEN = os.getenv('VERIFY_TOKEN', 'fastai123')   # WhatsApp webhook verify token
READABLE = {'txt', 'csv', 'tsv', 'json', 'log', 'md', 'xlsx', 'xlsm', 'pdf'}
MESSAGES, CONNECTED = [], set()

app = Flask(__name__, static_folder=None)
app.config['MAX_CONTENT_LENGTH'] = 300 * 1024 * 1024

def ext_of(n): return n.rsplit('.', 1)[-1].lower() if '.' in n else ''
def safe_name(orig):
    e = ext_of(orig); n = secure_filename(orig)
    return n if n.endswith('.' + e) and len(n) > len(e) + 1 else 'file.' + e
def info(fid):
    p = os.path.join(UPLOADS, fid)
    return {'id': fid, 'name': fid.split('_', 1)[1], 'size': os.path.getsize(p), 'type': ext_of(fid)}

@app.route('/')
def home(): return send_from_directory(BASE, 'index.html')
@app.route('/style.css')
def css(): return send_from_directory(BASE, 'style.css')
@app.route('/app.js')
def js(): return send_from_directory(BASE, 'app.js')

# ---------- FILES ----------
@app.post('/api/upload')
def upload():
    out = []
    for f in request.files.getlist('files'):
        orig = os.path.basename(f.filename or '')
        if ext_of(orig) not in READABLE: continue
        fid = uuid.uuid4().hex[:8] + '_' + safe_name(orig)
        f.save(os.path.join(UPLOADS, fid)); out.append(info(fid))
    if not out: return jsonify(error='Koi supported file nahi mili (txt, csv, xlsx, pdf, json, md, log)'), 400
    return jsonify(files=out)

@app.get('/api/files')
def files():
    return jsonify(files=[info(f) for f in sorted(os.listdir(UPLOADS)) if '_' in f])

@app.delete('/api/delete/<fid>')
def delete(fid):
    p = os.path.join(UPLOADS, secure_filename(fid))
    if os.path.isfile(p): os.remove(p)
    return jsonify(ok=True)

@app.post('/api/connect-folder')   # works when this app runs on the same PC as the folder
def connect_folder():
    path = (request.json or {}).get('path', '').strip().strip('"')
    if not os.path.isdir(path): return jsonify(error='Folder nahi mila. Poora path daalo.'), 400
    added = []
    for root, _, names in os.walk(path):
        for n in names:
            src = os.path.join(root, n)
            if ext_of(n) in READABLE and len(added) < 500 and os.path.getsize(src) < 30 * 1024 * 1024:
                fid = uuid.uuid4().hex[:8] + '_' + safe_name(n)
                shutil.copy2(src, os.path.join(UPLOADS, fid)); added.append(info(fid))
    return jsonify(files=added)

def read_text(path, limit):
    e = ext_of(path)
    try:
        if e in ('txt', 'csv', 'tsv', 'json', 'log', 'md'):
            return open(path, encoding='utf-8', errors='ignore').read(limit)
        if e in ('xlsx', 'xlsm'):
            from openpyxl import load_workbook
            wb, out = load_workbook(path, read_only=True, data_only=True), []
            for ws in wb.worksheets[:6]:
                out.append('## Sheet: ' + ws.title)
                for i, row in enumerate(ws.iter_rows(values_only=True)):
                    if i > 400: break
                    out.append(','.join('' if c is None else str(c) for c in row))
            return '\n'.join(out)[:limit]
        if e == 'pdf':
            from pypdf import PdfReader
            return '\n'.join((p.extract_text() or '') for p in PdfReader(path).pages[:20])[:limit]
    except Exception:
        pass
    return ''

# ---------- AI ----------
SYSTEM = """You are Fast AI, a business analyst for a company owner. Use ONLY the given files and exact numbers from them.
Reply in the same language/script as the question (Hindi, Hinglish or English). Never invent numbers; if data is missing, say so.
Return ONLY valid JSON:
{"spoken":"1-2 short sentences summary",
 "answer":"detailed explanation in short paragraphs",
 "kpis":[{"label":"","value":"","tone":"profit|loss|neutral"}],
 "charts":[{"title":"","type":"bar|line|doughnut","tone":"profit|loss|neutral","unit":"₹ Lakh","labels":[],"data":[]}],
 "causes":["likely reasons (say 'likely' when inferred)"],
 "solutions":["concrete actions"]}
Make a SEPARATE chart for every point you explain (yearly total, monthly trend, cause split...). causes/solutions only for loss/problem questions."""

def demo():
    return {'spoken': 'Ye demo jawab hai. Asli jawab ke liye API key daalo.',
            'answer': '⚠️ DEMO MODE — API key nahi mili, isliye ye sample data hai, aapki files ka nahi. Setup screen me API key daalo.',
            'kpis': [{'label': 'Profit (sample)', 'value': '₹ 17 Lakh', 'tone': 'profit'}, {'label': 'Loss (sample)', 'value': '₹ 6 Lakh', 'tone': 'loss'}],
            'charts': [{'title': 'Profit (sample)', 'type': 'bar', 'tone': 'profit', 'unit': '₹ Lakh', 'labels': ['2021', '2022', '2023', '2024', '2025'], 'data': [8, 11, 14, 17, 20]}],
            'causes': [], 'solutions': []}

@app.post('/api/analyze')
def analyze():
    d = request.json or {}
    key, model = d.get('api_key', '').strip(), d.get('api_model') or 'gpt-4o-mini'
    base = (d.get('api_base') or 'https://api.openai.com/v1').rstrip('/')
    if not key: return jsonify(demo())
    if not base.endswith('/v1') and any(h in base for h in ('openai.com', 'x.ai')): base += '/v1'
    ctx, budget = [], 45000
    for f in sorted(os.listdir(UPLOADS)):
        t = read_text(os.path.join(UPLOADS, f), 7000)
        if t.strip() and budget > 0:
            ctx.append(f'=== FILE: {f.split("_", 1)[-1]} ===\n{t}'); budget -= len(t)
    body = {'model': model, 'temperature': 0.3, 'max_tokens': 3000,
            'messages': [{'role': 'system', 'content': SYSTEM},
                         {'role': 'user', 'content': 'FILES:\n' + ('\n'.join(ctx) or 'No readable files') + '\n\nQUESTION: ' + d.get('query', '')}]}
    hdr = {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    try:
        r = requests.post(base + '/chat/completions', headers=hdr, json={**body, 'response_format': {'type': 'json_object'}}, timeout=90)
        if r.status_code == 400:
            r = requests.post(base + '/chat/completions', headers=hdr, json=body, timeout=90)
        if r.status_code != 200: return jsonify(error=f'API error {r.status_code}: {r.text[:300]}'), 400
        txt = r.json()['choices'][0]['message']['content']
        return jsonify(json.loads(txt[txt.find('{'): txt.rfind('}') + 1]))
    except Exception as e:
        return jsonify(error=str(e)), 400

# ---------- APPS / MESSAGES ----------
def add_msg(app_name, sender, text):
    MESSAGES.append({'ts': time.time(), 'app': app_name, 'from': sender, 'text': text})
    del MESSAGES[:-200]

@app.post('/api/connect')
def connect():
    d = request.json or {}
    (CONNECTED.add if d.get('on') else CONNECTED.discard)(d.get('app'))
    return jsonify(ok=True, webhook=f"{request.host_url}api/webhook/{d.get('app')}")

@app.route('/api/webhook/<name>', methods=['GET', 'POST'])   # WhatsApp Cloud API / Zapier / Make
def webhook(name):
    if request.method == 'GET':
        if request.args.get('hub.verify_token') == VERIFY_TOKEN: return request.args.get('hub.challenge', '')
        return 'forbidden', 403
    d = request.get_json(silent=True) or {}
    if name == 'whatsapp' and 'entry' in d:
        for e in d['entry']:
            for ch in e.get('changes', []):
                v = ch.get('value', {})
                names = {c.get('wa_id'): c.get('profile', {}).get('name') for c in v.get('contacts', [])}
                for m in v.get('messages', []):
                    add_msg('whatsapp', names.get(m.get('from')) or m.get('from'), (m.get('text') or {}).get('body', '[media]'))
    else:
        add_msg(name, d.get('from', 'Unknown'), d.get('text', ''))
    return jsonify(ok=True)

@app.get('/api/messages')
def messages():
    since = float(request.args.get('since', 0))
    return jsonify(messages=[m for m in MESSAGES if m['ts'] > since], now=time.time())

@app.post('/api/messages/test')
def test_msg():
    add_msg((request.json or {}).get('app', 'whatsapp'), 'Rahul Sharma', 'Sir, kal ki meeting 4 baje shift kar do?')
    return jsonify(ok=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
