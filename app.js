const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const post = (u, b) => fetch(u, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b || {})}).then(r => r.json());
const LS = (k, v) => v === undefined ? localStorage.getItem('fai_' + k) : localStorage.setItem('fai_' + k, v);
const APPS = {whatsapp:['💬','WhatsApp'], linkedin:['💼','LinkedIn'], gmail:['✉️','Gmail'], telegram:['✈️','Telegram'], slack:['🧩','Slack']};
const OK_EXT = ['xlsx','xlsm','csv','tsv','pdf','txt','json','md','log','docx','doc','zip','xls','rtf','html','htm','xml','yaml','yml','ini','cfg','conf'];
let files = [], apps = new Set(JSON.parse(LS('apps') || '[]')), lastTs = Date.now() / 1000;
let on = false, busy = false, rec = null, heard = '', lang = LS('lang') || 'hi-IN', engineOk = false, REG = [];
let dirHandles = [];
let voiceGender = LS('voice') || 'male';
let liveChart = null, fsChart = null;
let liveChartTimer = null;
let isFullscreen = false;
let currentAudio = null; // for TTS playback

const show = id => document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
function toast(t, ms = 4500) { const e = $('#toast'); e.textContent = t; e.className = 'show'; clearTimeout(toast.t); toast.t = setTimeout(() => e.className = '', ms); }
const LABELS = {off:'Mic band hai', idle:'Taiyaar…', listening:'Sun raha hoon… boliye', thinking:'Soch raha hoon…', speaking:'Bol raha hoon…'};
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

// ================= FILES =================
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
    if (out.length >= 3000) return;
    if (h.kind === 'file') {
      if (okName(name)) out.push(await h.getFile());
    } else if (depth < 12 && !name.startsWith('.')) {
      await walk(h, out, depth + 1);
    }
  }
}

async function pickFolder() {
  if (!window.showDirectoryPicker) return $('#folderIn').click();
  try {
    const dir = await showDirectoryPicker({mode:'read'});
    dirHandles.push(dir);
    toast('📂 Folder + sub-folders scan ho rahe hain…', 60000);
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

// ================= VOICE — Silent mic + Premium TTS =================
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

function stopAudio() {
  if (currentAudio) {
    try { currentAudio.pause(); currentAudio.src = ''; } catch {}
    currentAudio = null;
  }
  speechSynthesis.cancel();
}

// Premium TTS via OpenAI (if key is OpenAI)
async function speakPremium(t) {
  const key = $('#apiKey').value.trim();
  const base = ($('#apiBase').value || '').trim();
  // Only try if looks like OpenAI
  const isOpenAI = !base || base.includes('openai.com');
  if (!key || !isOpenAI) return false;

  const voice = voiceGender === 'male' ? 'onyx' : 'nova'; // onyx = deep clear male, nova = natural female
  try {
    const r = await fetch('/api/tts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ text: t, api_key: key, api_base: base || 'https://api.openai.com/v1', voice })
    });
    if (!r.ok) return false;
    const blob = await r.blob();
    if (blob.size < 100) return false;
    stopAudio();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    return new Promise(resolve => {
      currentAudio.onended = () => { URL.revokeObjectURL(url); resolve(true); };
      currentAudio.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
      currentAudio.play().catch(() => resolve(false));
    });
  } catch {
    return false;
  }
}

function pickBrowserVoice() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const want = lang === 'hi-IN' ? 'hi' : 'en';
  const preferMale = voiceGender === 'male';
  const list = voices.filter(v => v.lang.toLowerCase().startsWith(want) || v.lang.toLowerCase().startsWith('en'));
  if (!list.length) return voices[0];

  const score = v => {
    let s = 0;
    const n = v.name.toLowerCase();
    if (/google|microsoft|samantha|daniel|alex|ravi|neerja|heera|hemant|zira|david/i.test(n)) s += 8;
    if (preferMale && /male|david|ravi|hemant|daniel|alex|mark/i.test(n)) s += 6;
    if (!preferMale && /female|zira|heera|neerja|samantha|karen|moira|nova/i.test(n)) s += 6;
    if (preferMale && /female|zira|heera|samantha/i.test(n)) s -= 4;
    if (!preferMale && /male|david|ravi|hemant/i.test(n)) s -= 4;
    if (v.localService === false) s += 2;
    return s;
  };
  list.sort((a, b) => score(b) - score(a));
  return list[0];
}

function speakBrowser(t, done) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = /[\u0900-\u097F]/.test(t) ? 'hi-IN' : 'en-IN';
  u.rate = 0.95;
  u.pitch = voiceGender === 'male' ? 0.9 : 1.05;
  u.volume = 1;
  const v = pickBrowserVoice();
  if (v) u.voice = v;
  u.onstart = () => setS('speaking');
  u.onend = u.onerror = () => done?.();
  speechSynthesis.speak(u);
}

async function speak(t, done) {
  if (!t) return done?.();
  setS('speaking');
  stopAudio();

  // Try premium first
  const ok = await speakPremium(t);
  if (ok) {
    done?.();
    return;
  }
  // Fallback browser
  speakBrowser(t, done);
}

function afterTurn() {
  busy = false;
  if (on) setTimeout(listenLoop, 100);
  else setS('off');
}

function announce(t) {
  if (busy) return;
  busy = true;
  try { if (rec) rec.abort(); } catch {}
  rec = null;
  speak(t, afterTurn);
}

// ========== SILENT MIC (no restart beeps) ==========
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
  rec.continuous = true;   // keep continuous so no restart click
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
      // soft stop — only when we have final text
      try { rec.stop(); } catch {}
    } else {
      $('#heard').textContent = heard ? '“' + heard + '”' : '';
    }
  };

  rec.onerror = e => {
    // completely ignore no-speech / aborted — no sound, no restart spam
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      micOff();
      toast('Mic permission Allow karo');
    }
  };

  rec.onend = () => {
    rec = null;
    const q = heard.trim();
    heard = '';
    if (q && on && !busy) {
      ask(q);
    } else if (on && !busy) {
      // quiet restart
      setTimeout(listenLoop, 150);
    }
  };

  try {
    rec.start();
    setS('listening');
  } catch {
    rec = null;
    setTimeout(listenLoop, 400);
  }
}

function micOn() {
  on = true;
  stopAudio();
  busy = false;
  listenLoop();
}

function micOff() {
  on = false;
  busy = false;
  try { if (rec) rec.abort(); } catch {}
  rec = null;
  stopAudio();
  $('#heard').textContent = '';
  setS('off');
}

$('#mic').onclick = () => on ? micOff() : micOn();
$('#stop').onclick = micOff;

$('#lang').textContent = lang === 'hi-IN' ? 'हिं' : 'EN';
$('#lang').onclick = () => {
  lang = lang === 'hi-IN' ? 'en-IN' : 'hi-IN';
  LS('lang', lang);
  $('#lang').textContent = lang === 'hi-IN' ? 'हिं' : 'EN';
  if (on) { micOff(); micOn(); }
};

function updateVoiceBtn() {
  $('#voiceBtn').textContent = voiceGender === 'male' ? '🔊 Ladka' : '🔊 Ladki';
}
updateVoiceBtn();
$('#voiceBtn').onclick = () => {
  voiceGender = voiceGender === 'male' ? 'female' : 'male';
  LS('voice', voiceGender);
  updateVoiceBtn();
  toast(voiceGender === 'male' ? 'Awaaz: Ladka (Onyx / Natural)' : 'Awaaz: Ladki (Nova / Natural)');
};

$('#start').onclick = () => {
  show('live');
  setS('off');
  startLiveChart();
  micOn();
  checkOrientation();
};
$('#back').onclick = () => {
  micOff();
  stopLiveChart();
  exitFullscreen();
  show('setup');
};

// ================= LIVE CHART =================
const CHART_PRESETS = [
  { title: 'Revenue Trend (Last 6 Months)', type: 'line', labels: ['May','Jun','Jul','Aug','Sep','Oct'], data: [42,48,51,47,55,61], color: '#818cf8' },
  { title: 'Profit vs Loss Overview', type: 'bar', labels: ['Q1','Q2','Q3','Q4'], data: [18,12,22,9], color: '#22c55e' },
  { title: 'Expense Breakdown', type: 'doughnut', labels: ['Salary','Rent','Marketing','Ops','Other'], data: [35,18,22,15,10], color: '#f59e0b' },
  { title: 'Monthly Sales Growth', type: 'bar', labels: ['Jan','Feb','Mar','Apr','May','Jun'], data: [28,32,30,38,41,45], color: '#06b6d4' },
  { title: 'Customer Acquisition', type: 'line', labels: ['W1','W2','W3','W4','W5','W6'], data: [120,145,132,168,190,210], color: '#a855f7' },
  { title: 'Category-wise Revenue', type: 'doughnut', labels: ['Product A','Product B','Service','Other'], data: [40,25,22,13], color: '#ef4444' },
  { title: 'Yearly Performance', type: 'bar', labels: ['2021','2022','2023','2024','2025'], data: [85,92,78,105,118], color: '#22c55e' },
  { title: 'Cash Flow Snapshot', type: 'line', labels: ['Mon','Tue','Wed','Thu','Fri','Sat'], data: [12,18,9,22,15,28], color: '#818cf8' }
];
let chartIndex = 0;

function makeChartConfig(preset) {
  const isPie = preset.type === 'doughnut' || preset.type === 'pie';
  const colors = isPie ? ['#818cf8','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#e879f9'] : preset.color;
  return {
    type: preset.type,
    data: {
      labels: preset.labels,
      datasets: [{
        data: preset.data,
        backgroundColor: isPie ? colors : preset.color + 'cc',
        borderColor: isPie ? 'transparent' : preset.color,
        borderWidth: isPie ? 0 : 2.5,
        fill: preset.type === 'line',
        tension: 0.4,
        borderRadius: 6,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 650, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: isPie, labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
        tooltip: { enabled: true }
      },
      scales: isPie ? {} : {
        x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: '#ffffff0d' } }
      }
    }
  };
}

function drawLiveChart() {
  const canvas = isFullscreen ? $('#fsCanvas') : $('#liveCanvas');
  if (!canvas) return;
  const preset = CHART_PRESETS[chartIndex % CHART_PRESETS.length];
  chartIndex++;
  const titleEl = isFullscreen ? $('#fsTitle') : $('#liveChartTitle');
  if (titleEl) titleEl.textContent = preset.title;
  if (isFullscreen) {
    if (fsChart) { fsChart.destroy(); fsChart = null; }
    fsChart = new Chart(canvas, makeChartConfig(preset));
  } else {
    if (liveChart) { liveChart.destroy(); liveChart = null; }
    liveChart = new Chart(canvas, makeChartConfig(preset));
  }
}

function startLiveChart() {
  stopLiveChart();
  drawLiveChart();
  liveChartTimer = setInterval(drawLiveChart, 1000);
}
function stopLiveChart() {
  if (liveChartTimer) { clearInterval(liveChartTimer); liveChartTimer = null; }
  if (liveChart) { liveChart.destroy(); liveChart = null; }
  if (fsChart) { fsChart.destroy(); fsChart = null; }
}

function enterFullscreen() {
  if (isFullscreen) return;
  isFullscreen = true;
  $('#fsChart').classList.add('on');
  document.body.classList.add('fs-mode');
  setTimeout(drawLiveChart, 80);
}
function exitFullscreen() {
  if (!isFullscreen) return;
  isFullscreen = false;
  $('#fsChart').classList.remove('on');
  document.body.classList.remove('fs-mode');
  if (fsChart) { fsChart.destroy(); fsChart = null; }
  setTimeout(drawLiveChart, 80);
}
$('#fsExit').onclick = exitFullscreen;

function checkOrientation() {
  const landscape = window.innerWidth > window.innerHeight;
  if (landscape && $('#live').classList.contains('on') && $('#empty')) enterFullscreen();
  else if (!landscape) exitFullscreen();
}
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 200));

// ================= ASK =================
const feed = $('#feed');
function addCard(html, cls = '') {
  $('#empty')?.remove();
  stopLiveChart();
  exitFullscreen();
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
  stopLiveChart();
  exitFullscreen();
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
  if (r.kpis?.length) {
    const k = addCard(`<div class="kpis">${r.kpis.map(k =>
      `<div class="kpi ${esc(k.tone)}"><small>${esc(k.label)}</small><b>${esc(k.value)}</b></div>`
    ).join('')}</div>`);
    k.style.cssText = 'background:none;border:0;padding:0';
  }
  let h = `<div class="ans">${esc(r.answer).split(/\n+/).map(p => `<p>${p}</p>`).join('')}`;
  if (r.causes?.length) h += `<h5>⚠️ Sambhavit kaaran</h5><ul>${r.causes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  if (r.solutions?.length) h += `<h5>✅ Samadhan</h5><ul>${r.solutions.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  addCard(h + '</div>');
  (r.charts || []).forEach((c, i) => setTimeout(() => chart(c), 150 + i * 280));
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
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: pie, labels: { color: '#cbd5e1' } },
        tooltip: { callbacks: { label: x => ` ${x.formattedValue} ${c.unit || ''}` } }
      },
      scales: pie ? {} : {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#ffffff14' }, title: { display: !!c.unit, text: c.unit, color: '#94a3b8' } }
      }
    }
  });
}

renderApps();
setS('off');
fetch('/api/files').then(r => r.json()).then(r => { files = r.files; renderFiles(); });
