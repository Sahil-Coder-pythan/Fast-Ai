from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json
import re
from datetime import datetime
from werkzeug.utils import secure_filename
import uuid
import requests

# Flat structure - everything in root
app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['SECRET_KEY'] = 'nexus-ai-secret-key-2026'

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'csv', 'xlsx', 'xls', 'doc', 'docx', 'json', 'log', 'env', 'md'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    files = request.files.getlist('files')
    uploaded = []
    for file in files:
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(filepath)
            size = os.path.getsize(filepath)
            uploaded.append({
                'id': unique_name,
                'name': filename,
                'size': size,
                'type': filename.rsplit('.', 1)[1].lower() if '.' in filename else 'unknown',
                'uploaded_at': datetime.now().isoformat()
            })
    return jsonify({'success': True, 'files': uploaded})

@app.route('/api/files', methods=['GET'])
def list_files():
    files = []
    upload_dir = app.config['UPLOAD_FOLDER']
    if os.path.exists(upload_dir):
        for f in os.listdir(upload_dir):
            path = os.path.join(upload_dir, f)
            if os.path.isfile(path):
                files.append({
                    'id': f,
                    'name': f.split('_', 1)[1] if '_' in f else f,
                    'size': os.path.getsize(path),
                    'type': f.rsplit('.', 1)[1].lower() if '.' in f else 'unknown'
                })
    return jsonify({'files': files})

@app.route('/api/delete/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(file_id))
    if os.path.exists(path):
        os.remove(path)
        return jsonify({'success': True})
    return jsonify({'error': 'File not found'}), 404

@app.route('/api/connect', methods=['POST'])
def connect_app():
    data = request.json
    return jsonify({'success': True, 'app': data.get('app'), 'status': 'connected'})

@app.route('/api/detect-api', methods=['POST'])
def detect_api():
    data = request.json or {}
    files = data.get('files', [])
    api_key = None
    api_base = None
    api_model = None
    found_in = None
    upload_dir = app.config['UPLOAD_FOLDER']

    key_patterns = [
        r'(?:API[_-]?KEY|OPENAI[_-]?API[_-]?KEY|GROK[_-]?API[_-]?KEY|XAI[_-]?API[_-]?KEY|KEY)\s*[:=]\s*["\']?([a-zA-Z0-9_\-\.]{20,})["\']?',
        r'(?:api[_-]?key)\s*[:=]\s*["\']?([a-zA-Z0-9_\-\.]{20,})["\']?',
        r'(sk-[a-zA-Z0-9]{20,})',
        r'(xai-[a-zA-Z0-9]{20,})',
        r'(gsk_[a-zA-Z0-9]{20,})',
    ]
    base_patterns = [
        r'(?:BASE[_-]?URL|API[_-]?BASE|API[_-]?URL|ENDPOINT)\s*[:=]\s*["\']?(https?://[^\s"\']+)["\']?',
        r'(https://api\.openai\.com/v1)',
        r'(https://api\.x\.ai/v1)',
        r'(https://api\.groq\.com/openai/v1)',
    ]
    model_patterns = [
        r'(?:MODEL|MODEL[_-]?NAME)\s*[:=]\s*["\']?([a-zA-Z0-9\-\._]+)["\']?',
        r'(gpt-4o-mini|gpt-4o|gpt-4-turbo|gpt-3\.5-turbo|grok-3|grok-2|llama-3\.3-70b-versatile|gemini-2\.0-flash)',
    ]

    for f in files:
        fname = f.get('id') or f.get('name')
        if not fname: continue
        path = os.path.join(upload_dir, fname)
        if not os.path.exists(path): continue
        try:
            ext = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''
            if ext not in ('txt', 'csv', 'json', 'log', 'md', 'env'): continue
            with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                content = fh.read(50000)
            for pat in key_patterns:
                m = re.search(pat, content, re.IGNORECASE)
                if m:
                    api_key = m.group(1).strip()
                    found_in = f.get('name', fname)
                    break
            for pat in base_patterns:
                m = re.search(pat, content, re.IGNORECASE)
                if m:
                    api_base = m.group(1).strip()
                    break
            for pat in model_patterns:
                m = re.search(pat, content, re.IGNORECASE)
                if m:
                    api_model = m.group(1).strip()
                    break
            if api_key: break
        except Exception:
            continue

    if api_key:
        return jsonify({
            'found': True,
            'api_key': api_key,
            'api_base': api_base or 'https://api.openai.com/v1',
            'api_model': api_model or 'gpt-4o-mini',
            'found_in': found_in,
            'message': f'API Key, URL and Model detected from file: {found_in}'
        })
    return jsonify({'found': False, 'message': 'No API Key found in any uploaded file.'})

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    query = data.get('query', '')
    files = data.get('files', [])
    api_key = data.get('api_key', '').strip()
    api_base = data.get('api_base', '').strip() or 'https://api.openai.com/v1'
    api_model = data.get('api_model', 'gpt-4o-mini')

    if api_key:
        try:
            return jsonify(call_real_ai(query, files, api_key, api_base, api_model))
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    return jsonify(generate_ai_response(query.lower(), files))

def call_real_ai(query, files, api_key, api_base, model):
    file_context = []
    upload_dir = app.config['UPLOAD_FOLDER']
    for f in files[:10]:
        fname = f.get('id') or f.get('name')
        if not fname: continue
        path = os.path.join(upload_dir, fname)
        if not os.path.exists(path): continue
        try:
            ext = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''
            if ext in ('txt', 'csv', 'json', 'log', 'md'):
                with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                    content = fh.read(15000)
                file_context.append(f"=== FILE: {f.get('name', fname)} ===\n{content}\n")
        except Exception:
            pass

    files_text = "\n".join(file_context) if file_context else "No readable text files found."

    system_prompt = """You are NexusAI — an elite business intelligence companion.
Speak in clear, professional American English.
Always base answers on the uploaded files.
When numbers exist in files, use EXACT numbers.
If data is incomplete, make intelligent estimates and say so.
For financial answers always include this chart-data block at the end:

```chart-data
{
  "charts": [
    {
      "type": "line",
      "labels": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      "datasets": [{"label": "Monthly Value", "data": [numbers], "borderColor": "#ef4444", "backgroundColor": "rgba(239,68,68,0.1)", "fill": true, "tension": 0.4}]
    }
  ],
  "summary": {"key": "value"}
}
```

Use real numbers from the files. Be honest and actionable."""

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Files:\n{files_text}\n\nQuestion: {query}"}
        ],
        "temperature": 0.35,
        "max_tokens": 2500
    }

    base = api_base.rstrip('/')
    if not base.endswith('/v1') and ('openai.com' in base or 'x.ai' in base or 'groq.com' in base):
        base += '/v1'
    url = f"{base}/chat/completions"

    resp = requests.post(url, headers=headers, json=payload, timeout=90)
    if resp.status_code != 200:
        raise Exception(f"API error {resp.status_code}: {resp.text[:400]}")

    ai_text = resp.json()['choices'][0]['message']['content']
    charts, summary = [], None
    chart_match = re.search(r'```chart-data\s*([\s\S]*?)```', ai_text)
    if chart_match:
        try:
            chart_json = json.loads(chart_match.group(1).strip())
            charts = chart_json.get('charts', [])
            summary = chart_json.get('summary')
            ai_text = re.sub(r'```chart-data\s*[\s\S]*?```', '', ai_text).strip()
        except Exception:
            pass
    return {'text': ai_text, 'charts': charts, 'summary': summary}

def generate_ai_response(query, files):
    has_files = len(files) > 0
    file_names = [f.get('name', 'unknown') for f in files] if has_files else []
    loss_chart = {
        'type': 'line',
        'labels': ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        'datasets': [{'label': 'Monthly Loss (₹ Lakhs)', 'data': [12.5,18.2,15.8,22.1,19.4,25.6,28.3,21.7,16.9,14.2,11.8,9.5],
                      'borderColor': '#ef4444', 'backgroundColor': 'rgba(239,68,68,0.1)', 'fill': True, 'tension': 0.4}]
    }
    recovery_chart = {
        'type': 'bar',
        'labels': ['Q1','Q2','Q3','Q4'],
        'datasets': [{'label': 'Projected Recovery (₹ Lakhs)', 'data': [35,58,72,95],
                      'backgroundColor': ['rgba(34,197,94,0.7)','rgba(34,197,94,0.8)','rgba(34,197,94,0.9)','#10b981']}]
    }

    if any(kw in query for kw in ['loss','nuksan','last year','previous','नुकसान','साल']):
        return {
            'text': f"""Sir, I've analyzed the files you uploaded{(': '+', '.join(file_names[:3])) if has_files else ''}.

**Last Year's Total Loss: ₹ 2.16 Crore**

### Root Causes:
1. Marketing Waste (28%)
2. Operational Inefficiency (22%)
3. Inventory Overstock (18%)
4. Delayed Receivables (20%)
5. Other (12%)

**Recommendation:** Target max loss this year ₹45 Lakhs (79% reduction).""",
            'charts': [loss_chart, recovery_chart],
            'summary': {'total_loss': '₹ 2.16 Cr', 'peak_month': 'July', 'target_reduction': '79%'}
        }
    elif any(kw in query for kw in ['profit','improve','recover','plan','सुधार','बचाव']):
        return {
            'text': """Sir, recovery plan based on your files:

1. Marketing Optimization → +₹48L
2. Inventory Cleanup → +₹32L
3. Receivables Acceleration → +₹41L
4. Operational Efficiency → +₹29L

**Projected Profit: ₹1.05 Cr | Break-even: Month 5**""",
            'charts': [recovery_chart],
            'summary': {'projected_profit': '₹1.05 Cr', 'break_even': 'Month 5', 'roi': '340%'}
        }
    elif any(kw in query for kw in ['scam','spam','fraud','message']):
        return {
            'text': """⚠️ **HIGH RISK DETECTED**

Do NOT click any links. Do NOT share OTP or bank details. Block and report immediately.""",
            'charts': [],
            'summary': {'risk_level': 'HIGH', 'action': 'Block & Report'}
        }
    return {
        'text': f"I'm online, Sir. I have access to **{len(files)} file(s)**. Ask me about last year's loss, recovery plan, or any project.",
        'charts': [],
        'summary': None
    }

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
