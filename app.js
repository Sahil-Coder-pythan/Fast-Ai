const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const APPS = {whatsapp:'💬 WhatsApp', linkedin:'💼 LinkedIn', gmail:'✉️ Gmail', telegram:'✈️ Telegram'};
const OK_EXT = ['xlsx','xlsm','csv','tsv','pdf','txt','json','md','log'];
let files = [], apps = new Set(JSON.parse(localStorage.getItem('fai_apps') || '[]')), lastTs = Date.now() / 1000, busy = false, rec = null;

const setS = s => { document.body.dataset.s = s; $('#state').textContent = {idle:'Ready', listening:'Sun raha hoon…', thinking:'Soch raha hoon…', speaking:'Bol raha hoon…'}[s]; };
function toast(t, ms = 4500) { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), ms); }
const show = id => { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); };

// ---------- API settings ----------
['apiKey','apiBase','apiModel'].forEach(id => {
  const el = $('#' + id); el.value = localStorage.getItem('fai_' + id) || '';
  el.addEventListener('input', () => localStorage.setItem('fai_' + id, el.value));
});

// ---------- files ----------
async function upload(list) {
  const arr = [...list].filter(f => OK_EXT.includes(f.name.split('.').pop().toLowerCase()));
  if (!arr.length) return toast('❌ Supported file nahi mili');
  toast(`⏳ ${arr.length} file upload ho rahi hai…`, 60000);
  for (let i = 0; i < arr.length; i += 25) {
    const fd = new FormData(); arr.slice(i, i + 25).forEach(f => fd.append('files', f));
    try { const r = await (await fetch('/api/upload', {method:'POST', body:fd})).json(); if (r.files) files.push(...r.files); }
    catch { toast('❌ Upload fail'); }
  }
  renderFiles(); toast(`✅ ${arr.length} file jud gayi`);
}
function renderFiles() {
  $('#count').textContent = files.length + ' files';
  $('#fileList').innerHTML = files.map(f => `<div class="file"><span>📄 ${esc(f.name)}</span><small>${(f.size/1024).toFixed(0)} KB</small><button data-id="${esc(f.id)}">✕</button></div>`).join('');
}
$('#fileList').onclick = async e => {
  const id = e.target.dataset.id; if (!id) return;
  await fetch('/api/delete/' + id, {method:'DELETE'}); files = files.filter(f => f.id !== id); renderFiles();
};
$('#drop').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = e => upload(e.target.files);
$('#pickFolder').onclick = () => $('#folderIn').click();
$('#folderIn').onchange = e => upload(e.target.files);
$('#drop').ondragover = e => { e.preventDefault(); $('#drop').classList.add('over'); };
$('#drop').ondragleave = () => $('#drop').classList.remove('over');
$('#drop').ondrop = e => { e.preventDefault(); $('#drop').classList.remove('over'); upload(e.dataTransfer.files); };
$('#srvBtn').onclick = async () => {
  const r = await (await fetch('/api/connect-folder', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path:$('#srvPath').value})})).json();
  if (r.error) return toast('❌ ' + r.error);
  files.push(...r.files); renderFiles(); toast(`✅ Folder se ${r.files.length} file aayi`);
};

// ---------- apps ----------
function renderApps() {
  $('#apps').innerHTML = Object.entries(APPS).map(([k, v]) => `<button class="app ${apps.has(k) ? 'on' : ''}" data-k="${k}">${v}</button>`).join('');
}
$('#apps').onclick = async e => {
  const k = e.target.dataset.k; if (!k) return;
  apps.has(k) ? apps.delete(k) : apps.add(k);
  localStorage.setItem('fai_apps', JSON.stringify([...apps])); renderApps();
  const r = await (await fetch('/api/connect', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({app:k, on:apps.has(k)})})).json();
  $('#appHint').textContent = apps.has(k) ? `Webhook URL: ${r.webhook}  — ise ${APPS[k].slice(3)} ke Cloud API / Zapier / Make me daalo.` : '';
};
$('#testMsg').onclick = () => fetch('/api/messages/test', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({app:[...apps][0] || 'whatsapp'})});
setInterval(async () => {
  try {
    const r = await (await fetch('/api/messages?since=' + lastTs)).json(); lastTs = r.now;
    r.messages.filter(m => apps.has(m.app)).forEach(m => {
      const name = (APPS[m.app] || m.app).slice(3);
      toast(`${APPS[m.app] || m.app} • ${m.from}: ${m.text}`, 8000);
      if ($('#live').classList.contains('on')) {
        addCard(`<div class="note">🔔 <b>${esc(name)}</b> — ${esc(m.from)}<br>${esc(m.text)}</div>`);
        speak(`Sir, ${name} pe ${m.from} ka message aaya hai: ${m.text}`);
      }
    });
  } catch {}
}, 4000);

// ---------- screens ----------
$('#start').onclick = () => { show('live'); setS('idle'); };
$('#back').onclick = () => { speechSynthesis.cancel(); show('setup'); };
$('#send').onclick = () => { const t = $('#q').value.trim(); if (t) ask(t); };
$('#q').onkeydown = e => { if (e.key === 'Enter') $('#send').click(); };
$('#empty').onclick = e => { if (e.target.tagName === 'BUTTON') ask(e.target.textContent); };

// ---------- voice ----------
function speak(t) {
  if (!t || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t); u.lang = /[\u0900-\u097F]/.test(t) ? 'hi-IN' : 'en-IN';
  u.onstart = () => setS('speaking'); u.onend = () => setS('idle'); speechSynthesis.speak(u);
}
$('#mic').onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast('Is browser me voice nahi hai — Chrome use karo');
  if (rec) return rec.stop();
  speechSynthesis.cancel(); rec = new SR(); rec.lang = 'hi-IN';
  rec.onstart = () => setS('listening');
  rec.onresult = e => ask(e.results[0][0].transcript);
  rec.onerror = () => setS('idle');
  rec.onend = () => { rec = null; if (!busy && document.body.dataset.s === 'listening') setS('idle'); };
  rec.start();
};

// ---------- ask + render ----------
const feed = $('#feed');
function addCard(html, cls = '') {
  $('#empty')?.remove();
  const d = document.createElement('div'); d.className = 'card fade ' + cls; d.innerHTML = html;
  feed.appendChild(d); feed.scrollTop = feed.scrollHeight; return d;
}
async function ask(q) {
  if (busy) return; busy = true; $('#q').value = '';
  $('#empty')?.remove();
  const me = document.createElement('div'); me.className = 'me fade'; me.textContent = q; feed.appendChild(me);
  setS('thinking'); feed.scrollTop = feed.scrollHeight;
  try {
    const r = await (await fetch('/api/analyze', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({query:q, api_key:$('#apiKey').value, api_base:$('#apiBase').value, api_model:$('#apiModel').value})})).json();
    if (r.error) throw new Error(r.error);
    render(r);
  } catch (e) { addCard('❌ ' + esc(e.message)); setS('idle'); }
  busy = false;
}
function render(r) {
  if (r.kpis?.length) addCard(`<div class="kpis">${r.kpis.map(k => `<div class="kpi ${esc(k.tone)}"><small>${esc(k.label)}</small><b data-v="${esc(k.value)}">${esc(k.value)}</b></div>`).join('')}</div>`).style.cssText = 'background:none;border:0;padding:0';
  let html = `<div class="ans">${esc(r.answer).split(/\n+/).map(p => `<p>${p}</p>`).join('')}`;
  if (r.causes?.length) html += `<h5>⚠️ Loss ke sambhavit kaaran</h5><ul>${r.causes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  if (r.solutions?.length) html += `<h5>✅ Samadhan</h5><ul>${r.solutions.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  addCard(html + '</div>');
  (r.charts || []).forEach((c, i) => setTimeout(() => chart(c), 400 + i * 700));
  speak(r.spoken || '');
}
function chart(c) {
  const card = addCard(`<h4>${esc(c.title)}</h4><div class="cv"><canvas></canvas></div>`, 'chart');
  const type = c.type || 'bar', pie = type === 'doughnut';
  const col = {profit:'#22c55e', loss:'#ef4444'}[c.tone] || '#818cf8';
  new Chart(card.querySelector('canvas'), {type, data:{labels:c.labels, datasets:[{label:c.title, data:c.data, borderColor:col, borderWidth:pie ? 0 : 3,
    backgroundColor: pie ? ['#818cf8','#22c55e','#f59e0b','#ef4444','#06b6d4','#e879f9','#a3e635'] : type === 'line' ? col + '33' : col + 'cc',
    fill:type === 'line', tension:.4, borderRadius:8, pointRadius:4}]},
    options:{responsive:true, maintainAspectRatio:false, animation:{duration:1800, easing:'easeOutQuart'},
      plugins:{legend:{display:pie, labels:{color:'#cbd5e1'}}, tooltip:{callbacks:{label:x => ` ${x.formattedValue} ${c.unit || ''}`}}},
      scales: pie ? {} : {x:{ticks:{color:'#94a3b8'}, grid:{display:false}}, y:{beginAtZero:true, ticks:{color:'#94a3b8'}, grid:{color:'#ffffff14'}, title:{display:!!c.unit, text:c.unit, color:'#94a3b8'}}}}});
}

renderApps();
fetch('/api/files').then(r => r.json()).then(r => { files = r.files; renderFiles(); });
