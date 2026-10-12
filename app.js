const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const post = (u, b) => fetch(u, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b || {})}).then(r => r.json());
const LS = (k, v) => v === undefined ? localStorage.getItem('fai_' + k) : localStorage.setItem('fai_' + k, v);
const APPS = {whatsapp:['💬','WhatsApp'], linkedin:['💼','LinkedIn'], gmail:['✉️','Gmail'], telegram:['✈️','Telegram'], slack:['🧩','Slack']};
const OK_EXT = ['xlsx','xlsm','csv','tsv','pdf','txt','json','md','log'];
let files = [], apps = new Set(JSON.parse(LS('apps') || '[]')), lastTs = Date.now() / 1000;
let on = false, busy = false, rec = null, heard = '', lang = LS('lang') || 'hi-IN', engineOk = false, REG = [];
let dirHandles = []; // multiple folders support

const show = id => document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
function toast(t, ms = 4500) { const e = $('#toast'); e.textContent = t; e.className = 'show'; clearTimeout(toast.t); toast.t = setTimeout(() => e.className = '', ms); }
const LABELS = {off:'Mic band hai — orb dabao', idle:'Taiyaar…', listening:'Sun raha hoon… boliye', thinking:'Soch raha hoon…', speaking:'Bol raha hoon…'};
function setS(s) { document.body.dataset.s = s; $('#label').textContent = LABELS[s]; }

// ================= AI ENGINE =================
['apiKey','apiBase','apiModel'].forEach(id => { $('#' + id).value = LS(id) || ''; $('#' + id).addEventListener('input', e => LS(id, e.target.value)); });
const cfg = () => ({api_key:$('#apiKey').value, api_base:$('#apiBase').value, api_model:$('#apiModel').value});
function setModels(list) { $('#modelList').innerHTML = (list || []).map(m => `<option value="${esc(m)}">`).join(''); }
function engineStat(ok, t, sub) { engineOk = ok; $('#stAi').textContent = t; $('#stAiSub').textContent = sub || '—'; $('#stAi').parentElement.classList.toggle('ok', ok); }
async function autofill() {
  const r = await post('/api/resolve', cfg());
  if (r.provider) { $('#prov').value = r.provider.id; setModels(r.models); }
  $('#apiBase').value = r.base; LS('apiBase', r.base);
  if (!$('#apiModel').value) { $('#apiModel').value = r.model; LS('apiModel', r.model); }
  return r;
}
fetch('/api/providers').then(r => r.json()).then(r => {
  REG = r.providers;
  $('#prov').innerHTML += REG.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  if ($('#apiKey').value || $('#apiBase').value) autofill();
});
$('#prov').onchange = e => {
  const p = REG.find(x => x.id === e.target.value); if (!p) return;
  $('#apiBase').value = p.base; $('#apiModel').value = p.models[0]; setModels(p.models);
  LS('apiBase', p.base); LS('apiModel', p.models[0]);
};
$('#apiKey').addEventListener('change', autofill);
$('#apiKey').addEventListener('paste', () => setTimeout(autofill, 100));
$('#apiBase').addEventListener('change', autofill);
$('#testBtn').onclick = async () => {
  const m = $('#engineMsg'); m.className = 'msg'; m.textContent = '⏳ Connect ho raha hai…';
  await autofill();
  const r = await post('/api/test', cfg());
  if (r.ok) {
    setModels(r.models); $('#apiModel').value = r.model; LS('apiModel', r.model);
    m.className = 'msg ok'; m.textContent = `✅ ${r.provider} connected · ${r.ms} ms · ${r.models.length} models`;
    engineStat(true, r.provider, r.model);
  } else {
    engineStat(false, 'Not connected', '—'); m.className = 'msg err';
    m.innerHTML = '❌ ' + esc(r.error) + (r.suggestions?.length ? '<br>Shayad ye model: ' + r.suggestions.map(s => `<button data-m="${esc(s)}">${esc(s)}</button>`).join('') : '');
    if (r.models?.length) setModels(r.models);
  }
};
$('#engineMsg').onclick = e => { if (e.target.dataset.m) { $('#apiModel').value = e.target.dataset.m; LS('apiModel', e.target.dataset.m); $('#testBtn').click(); } };

// ================= FILES (multi-folder support) =================
const okName = n => OK_EXT.includes(n.split('.').pop().toLowerCase());
async function upload(list) {
  const arr = [...list].filter(f => okName(f.name));
  if (!arr.length) return toast('❌ Supported file nahi mili');
  for (let i = 0; i < arr.length; i += 20) {
    toast(`⏳ Upload ${Math.min(i + 20, arr.length)}/${arr.length}…`, 60000);
    const fd = new FormData(); arr.slice(i, i + 20).forEach(f => fd.append('files', f));
    try { const r = await (await fetch('/api/upload', {method:'POST', body:fd})).json(); if (r.files) files.push(...r.files); } catch { toast('❌ Upload fail'); }
  }
  renderFiles(); toast(`✅ ${arr.length} file jud gayi`);
}
function renderFiles() {
  const kb = files.reduce((a, f) => a + f.size, 0) / 1024;
  $('#stFiles').textContent = files.length + ' files';
  $('#stSize').textContent = kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB';
  $('#fileList').innerHTML = files.slice(-80).reverse().map(f =>
    `<div class="file"><span>📄 ${esc(f.name)}</span><small>${(f.size / 1024).toFixed(0)} KB</small><button data-id="${esc(f.id)}">✕</button></div>`
  ).join('');
  if (files.length > 0) $('#addMoreBtn').style.display = 'block';
}
$('#fileList').onclick = async e => {
  const id = e.target.dataset.id; if (!id) return;
  await fetch('/api/delete/' + id, {method:'DELETE'});
  files = files.filter(f => f.id !== id);
  renderFiles();
};

async function walk(dir, out, depth = 0) {
  for await (const [name, h] of dir.entries()) {
    if (out.length >= 2500) return;
    if (h.kind === 'file') {
      if (okName(name)) out.push(await h.getFile());
    } else if (depth < 10 && !name.startsWith('.')) {
      await walk(h, out, depth + 1);
    }
  }
}

async function pickFolder() {
  if (!window.showDirectoryPicker) return $('#folderIn').click();
  try {
    const dir = await showDirectoryPicker({mode:'read'});
    dirHandles.push(dir);
    toast('📂 Folder scan ho raha hai…', 60000);
    const out = [];
    await walk(dir, out);
    await upload(out);
  } catch (e) {
    if (e.name !== 'AbortError') toast('❌ ' + e.message);
  }
}

$('#fmBtn').onclick = pickFolder;
$('#addMoreBtn').onclick = pickFolder;
$('#folderIn').onchange = e => upload(e.target.files);
$('#drop').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = e => upload(e.target.files);
$('#drop').ondragover = e => { e.preventDefault(); $('#drop').classList.add('over'); };
$('#drop').ondragleave = () => $('#drop').classList.remove('over');
$('#drop').ondrop = e => { e.preventDefault(); $('#drop').classList.remove('over'); upload(e.dataTransfer.files); };
$('#srvBtn').onclick = async () => {
  const r = await post('/api/connect-folder', {path:$('#srvPath').value});
  if (r.error) return toast('❌ ' + r.error);
  files.push(...r.files); renderFiles(); toast(`✅ Folder se ${r.files.length} file aayi`);
};

// ================= INTEGRATIONS =================
function renderApps() {
  $('#apps').innerHTML = Object.entries(APPS).map(([k, [i, n]]) =>
    `<button class="app ${apps.has(k) ? 'on' : ''}" data-k="${k}"><span>${i} ${n}</span><small>${apps.has(k) ? '● Connected' : 'Tap to connect'}</small></button>`
  ).join('');
  $('#stApps').textContent = apps.size + ' active';
}
$('#apps').onclick = async e => {
  const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return;
  apps.has(k) ? apps.delete(k) : apps.add(k);
  LS('apps', JSON.stringify([...apps]));
  renderApps();
  const r = await post('/api/connect', {app:k, on:apps.has(k)});
  $('#appHint').textContent = apps.has(k) ? `Webhook URL: ${r.webhook} — ise ${APPS[k][1]} ke Cloud API / Zapier / Make me daalo.` : '';
};
$('#testMsg').onclick = () => post('/api/messages/test', {app:[...apps][0] || 'whatsapp'});
setInterval(async () => {
  try {
    const r = await (await fetch('/api/messages?since=' + lastTs)).json();
    lastTs = r.now;
    r.messages.filter(m => apps.has(m.app)).forEach(m => {
      const n = (APPS[m.app] || ['', m.app])[1];
      toast(`${n} • ${m.from}: ${m.text}`, 8000);
      if ($('#live').classList.contains('on')) {
        addCard(`<div class="note">🔔 <b>${esc(n)}</b> — ${esc(m.from)}<br>${esc(m.text)}</div>`);
        announce(`Sir, ${n} pe ${m.from} ka message aaya hai: ${m.text}`);
      }
    });
  } catch {}
}, 4000);

// ================= VOICE (true continuous, no beep restart lag) =================
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

function speak(t, done) {
  if (!t || !window.speechSynthesis) return done?.();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = /[\u0900-\u097F]/.test(t) ? 'hi-IN' : 'en-IN';
  u.rate = 1.05;
  u.onstart = () => setS('speaking');
  u.onend = u.onerror = () => done?.();
  speechSynthesis.speak(u);
}

function afterTurn() {
  busy = false;
  if (on) setTimeout(listenLoop, 80); // almost immediate restart
  else setS('off');
}

function announce(t) {
  if (busy) return;
  busy = true;
  try { rec?.abort(); } catch {}
  speak(t, afterTurn);
}

function listenLoop() {
  if (!on || busy || rec) return;
  if (!SR) {
    on = false;
    setS('off');
    return toast('Voice ke liye Chrome / Edge use karo');
  }
  heard = '';
  rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = true;          // true continuous
  rec.maxAlternatives = 1;

  rec.onresult = e => {
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else heard = e.results[i][0].transcript;
    }
    if (final.trim()) {
      heard = final.trim();
      $('#heard').textContent = '“' + heard + '”';
      // stop current recognition so we can process
      try { rec.stop(); } catch {}
    } else {
      $('#heard').textContent = heard ? '“' + heard + '”' : '';
    }
  };

  rec.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      micOff();
      toast('Mic permission Allow karo');
    }
    // ignore "no-speech" and "aborted" — just restart
  };

  rec.onend = () => {
    rec = null;
    const q = heard.trim();
    heard = '';
    if (q && on && !busy) {
      ask(q);
    } else if (on && !busy) {
      setTimeout(listenLoop, 120);
    }
  };

  try {
    rec.start();
    setS('listening');
  } catch {
    rec = null;
    setTimeout(listenLoop, 300);
  }
}

function micOn() {
  on = true;
  speechSynthesis.cancel();
  busy = false;
  listenLoop();
}

function micOff() {
  on = false;
  busy = false;
  try { rec?.abort(); } catch {}
  rec = null;
  speechSynthesis.cancel();
  $('#heard').textContent = '';
  setS('off');
}

const toggleMic = () => on ? micOff() : micOn();
$('#mic').onclick = toggleMic;
$('#stop').onclick = micOff;
$('#lang').textContent = lang === 'hi-IN' ? 'हिं' : 'EN';
$('#lang').onclick = () => {
  lang = lang === 'hi-IN' ? 'en-IN' : 'hi-IN';
  LS('lang', lang);
  $('#lang').textContent = lang === 'hi-IN' ? 'हिं' : 'EN';
  if (on) { micOff(); micOn(); }
};

$('#start').onclick = () => {
  show('live');
  setS('off');
  // draw ready chart
  drawReadyChart();
  micOn();
};
$('#back').onclick = () => { micOff(); show('setup'); };

// ================= READY CHART (instead of big orb) =================
function drawReadyChart() {
  const canvas = $('#readyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // subtle animated bar chart
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        data: [12, 19, 8, 15, 22, 14],
        backgroundColor: ['#818cf8aa','#22c55eaa','#f59e0baa','#ef4444aa','#06b6d4aa','#a855f7aa'],
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: false,
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false, beginAtZero: true }
      }
    }
  });
}

// ================= ASK + RENDER =================
const feed = $('#feed');
function addCard(html, cls = '') {
  $('#empty')?.remove();
  const d = document.createElement('div');
  d.className = 'card fade ' + cls;
  d.innerHTML = html;
  feed.appendChild(d);
  feed.scrollTop = feed.scrollHeight;
  return d;
}

async function ask(q) {
  busy = true;
  $('#empty')?.remove();
  $('#heard').textContent = '';
  const me = document.createElement('div');
  me.className = 'me fade';
  me.textContent = q;
  feed.appendChild(me);
  setS('thinking');
  feed.scrollTop = feed.scrollHeight;

  try {
    const r = await post('/api/analyze', {query: q, ...cfg()});
    if (r.error) throw new Error(r.error);
    render(r);
  } catch (e) {
    addCard('❌ ' + esc(e.message));
    afterTurn();
  }
}

function render(r) {
  // KPIs first
  if (r.kpis?.length) {
    const k = addCard(`<div class="kpis">${r.kpis.map(k =>
      `<div class="kpi ${esc(k.tone)}"><small>${esc(k.label)}</small><b>${esc(k.value)}</b></div>`
    ).join('')}</div>`);
    k.style.cssText = 'background:none;border:0;padding:0';
  }

  // Answer
  let h = `<div class="ans">${esc(r.answer).split(/\n+/).map(p => `<p>${p}</p>`).join('')}`;
  if (r.causes?.length) h += `<h5>⚠️ Sambhavit kaaran</h5><ul>${r.causes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  if (r.solutions?.length) h += `<h5>✅ Samadhan</h5><ul>${r.solutions.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  addCard(h + '</div>');

  // Charts — faster appearance
  (r.charts || []).forEach((c, i) => setTimeout(() => chart(c), 180 + i * 320));

  speak(r.spoken || '', afterTurn);
}

function chart(c) {
  const card = addCard(`<h4>${esc(c.title)}</h4><div class="cv"><canvas></canvas></div>`, 'chart');
  const type = c.type || 'bar';
  const pie = type === 'doughnut' || type === 'pie';
  const col = {profit:'#22c55e', loss:'#ef4444'}[c.tone] || '#818cf8';

  new Chart(card.querySelector('canvas'), {
    type,
    data: {
      labels: c.labels,
      datasets: [{
        label: c.title,
        data: c.data,
        borderColor: col,
        borderWidth: pie ? 0 : 3,
        backgroundColor: pie
          ? ['#818cf8','#22c55e','#f59e0b','#ef4444','#06b6d4','#e879f9','#a3e635']
          : type === 'line' ? col + '33' : col + 'cc',
        fill: type === 'line',
        tension: 0.4,
        borderRadius: 8,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1400, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: pie, labels: { color: '#cbd5e1' } },
        tooltip: { callbacks: { label: x => ` ${x.formattedValue} ${c.unit || ''}` } }
      },
      scales: pie ? {} : {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: '#94a3b8' },
          grid: { color: '#ffffff14' },
          title: { display: !!c.unit, text: c.unit, color: '#94a3b8' }
        }
      }
    }
  });
}

// init
renderApps();
setS('off');
fetch('/api/files').then(r => r.json()).then(r => { files = r.files; renderFiles(); });
