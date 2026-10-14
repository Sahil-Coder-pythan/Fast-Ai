
const NAV=[
{g:"Enterprise Ops",i:[
  {id:"ops-overview",l:"Operations Overview",icon:"fa-gauge-high"},
  {id:"ops-c360",l:"Customer 360",icon:"fa-id-card"},
  {id:"ops-cases",l:"Case Management",icon:"fa-folder-open"},
  {id:"ops-orders",l:"Order & Payment Intel",icon:"fa-credit-card"},
  {id:"ops-refund",l:"Refund Automation",icon:"fa-money-bill-transfer"},
  {id:"ops-ai",l:"AI Operations",icon:"fa-robot"},
  {id:"ops-integ",l:"Integration Center",icon:"fa-plug"},
  {id:"ops-map",l:"Field Mapping",icon:"fa-diagram-project"},
  {id:"ops-employee",l:"Employee Workspace",icon:"fa-headset"},
  {id:"ops-analytics",l:"Analytics & Impact",icon:"fa-chart-line"},
  {id:"ops-health",l:"System Health",icon:"fa-heart-pulse"},
  {id:"ops-billing",l:"Billing & Usage",icon:"fa-file-invoice-dollar"},
  {id:"ops-rbac",l:"Admin & Roles",icon:"fa-users-gear"},
]},
{g:"History",i:[
  {id:"hist-overview",l:"History Overview",icon:"fa-clock-rotate-left"},
  {id:"hist-customers",l:"Customer History",icon:"fa-address-book"},
  {id:"hist-orders",l:"Order History",icon:"fa-box"},
  {id:"hist-refunds",l:"Refund History",icon:"fa-receipt"},
  {id:"hist-activity",l:"Activity History",icon:"fa-user-gear"},
  {id:"hist-api",l:"API & System Logs",icon:"fa-server"},
  {id:"hist-security",l:"Security Audit",icon:"fa-shield-halved"},
  {id:"hist-impact",l:"Business Impact",icon:"fa-chart-pie"},
  {id:"hist-archive",l:"Archived / Jobs",icon:"fa-box-archive"},
  {id:"hist-retention",l:"Retention & Privacy",icon:"fa-user-shield"},
]},
{g:"Classic",i:[
  {id:"home",l:"Home",icon:"fa-home"},
  {id:"command",l:"Command Center",icon:"fa-table-cells"},
  {id:"live-queue",l:"Live Queue",icon:"fa-comments"},
  {id:"autopilot",l:"1-Click Autopilot",icon:"fa-bolt"},
  {id:"lockout",l:"Context Lockout",icon:"fa-lock"},
  {id:"int-sf",l:"Salesforce (builtin)",icon:"fa-cloud"},
  {id:"int-zd",l:"Zendesk (builtin)",icon:"fa-headset"},
  {id:"int-pay",l:"Payment (builtin)",icon:"fa-wallet"},
  {id:"about",l:"About",icon:"fa-circle-info"},
]},
];
let cur="home",S=null,hits=[];
const all=()=>NAV.flatMap(g=>g.i.map(x=>({...x,g:g.g})));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function toggleMenu(force){const o=force===undefined?!document.getElementById("drawer").classList.contains("open"):!!force;document.getElementById("drawer").classList.toggle("open",o);document.getElementById("overlay").classList.toggle("open",o)}

async function histPanel(title,url,renderFn){
  const main=document.getElementById("main");
  main.innerHTML=card(title,'<p class="text-sm text-gray-400">Loading…</p>');
  try{
    const r=await fetch(url);
    const d=await r.json();
    if(!r.ok){main.innerHTML=card(title,`<p class="text-sm text-red-600">${esc(d.error||d.message||"Error")}</p>`);return}
    main.innerHTML=card(title, renderFn(d));
  }catch(e){main.innerHTML=card(title,`<p class="text-sm text-red-600">${esc(String(e))}</p>`)}
}
async function goCustomer(cid){
  const main=document.getElementById("main");
  main.innerHTML=card("Customer "+cid,"Loading timeline…");
  try{
    const [p,t]=await Promise.all([
      fetch("/api/history/customers/"+cid).then(r=>r.json()),
      fetch("/api/history/customers/"+cid+"/timeline").then(r=>r.json()),
    ]);
    main.innerHTML=card("Customer "+esc(cid),`
      <p class="text-sm mb-2">${esc(p.name)} · ${esc(p.tier)} · ${esc(p.email_masked)}</p>
      <p class="text-xs text-gray-500 mb-3">${esc((p.source_systems||[]).join(" · "))}</p>
      <h3 class="text-sm font-semibold mb-2">Timeline</h3>
      ${table(["Time","Type","Detail","Status"],(t.timeline||[]).map(e=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc(String(e.timestamp||"").slice(0,19))}</td><td>${esc(e.type)}</td><td class="text-xs">${esc(e.detail)}</td><td>${esc(e.status)}</td></tr>`))}
    `);
  }catch(e){main.innerHTML=card("Customer",esc(String(e)))}
}
async function runCleanup(){
  const r=await fetch("/api/history/retention-cleanup",{method:"POST"});
  const d=await r.json();
  alert(d.success?"Cleanup completed": (d.error||"Failed"));
  if(cur&&cur.startsWith("hist-")) go(cur);
}


async function runDryRefund(){
  const oid=(document.getElementById("dryOid")||{}).value||"";
  const el=document.getElementById("dryOut");
  if(el)el.textContent="Running dry-run…";
  const r=await fetch("/api/ops/refund/dry-run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_id:oid.trim()})});
  const d=await r.json();
  if(el)el.textContent=JSON.stringify(d,null,2);
}
async function runInvestigate(){
  const cid=(document.getElementById("invCid")||{}).value||"CUST001";
  const el=document.getElementById("invOut");
  if(el)el.textContent="Investigating…";
  const r=await fetch("/api/ops/investigate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer_id:cid})});
  const d=await r.json();
  if(el)el.textContent=JSON.stringify(d,null,2);
}
async function addInteg(){
  const body={
    name:(document.getElementById("inName")||{}).value,
    provider:(document.getElementById("inProvider")||{}).value,
    base_url:(document.getElementById("inUrl")||{}).value,
    api_key:(document.getElementById("inKey")||{}).value,
    type:"api",
    environment:"Sandbox",
    auth_method:"api_key",
  };
  const r=await fetch("/api/ops/integrations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();
  const m=document.getElementById("inMsg");
  if(m)m.textContent=d.success?(d.message||"Saved"):(d.error||"Failed");
  if(d.success) setTimeout(()=>go("ops-integ"),500);
}

function buildDrawer(filter=""){const q=(filter||"").toLowerCase();document.getElementById("drawerNav").innerHTML=NAV.map(g=>{const items=g.i.filter(i=>!q||i.l.toLowerCase().includes(q)||i.id.includes(q));if(!items.length)return"";return `<div class="px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">${g.g}</div>`+items.map(i=>`<button type="button" class="w-full text-left px-4 py-2.5 flex items-center gap-2 ${cur===i.id?"bg-gray-900 text-white":"hover:bg-gray-100 text-gray-800"}" onclick="go('${i.id}')"><i class="fas ${i.icon} text-xs w-4 text-center opacity-70"></i><span>${i.l}</span></button>`).join("")}).join("")}
function go(id){cur=id;toggleMenu(false);const sh=document.getElementById("searchHits");if(sh)sh.classList.add("hidden");const bs=document.getElementById("bottomSearch");if(bs)bs.value="";const it=all().find(x=>x.id===id);document.getElementById("topSub").textContent=it?it.l:"Console";buildDrawer();render()}
function bottomSearch(q){const box=document.getElementById("searchHits");q=(q||"").trim().toLowerCase();if(!q){box.classList.add("hidden");hits=[];return}hits=all().filter(i=>i.l.toLowerCase().includes(q)||i.id.includes(q)||i.g.toLowerCase().includes(q));if(!hits.length){box.innerHTML='<div class="p-4 text-sm text-gray-400">No modules found</div>';box.classList.remove("hidden");return}
box.innerHTML=hits.slice(0,12).map(i=>`<button type="button" class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0" onclick="go('${i.id}')"><i class="fas ${i.icon} text-gray-400 w-5 text-center"></i><div><div class="text-sm font-medium">${i.l}</div><div class="text-[10px] text-gray-400">${i.g}</div></div></button>`).join("");box.classList.remove("hidden")}
function pickFirstHit(){if(hits[0])go(hits[0].id)}
function card(t,b){return `<div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4"><h2 class="font-semibold text-base mb-3 text-gray-900">${t}</h2>${b}</div>`}
function kpi(l,v,c="text-indigo-600"){return `<div class="bg-white border border-gray-200 rounded-xl p-4"><p class="text-xs text-gray-500">${l}</p><p class="text-2xl font-bold ${c} mt-1">${v}</p></div>`}
function table(hs,rows){if(!rows.length)return '<p class="text-sm text-gray-500">No rows yet. Run a refund or complex case from Customers.</p>';return `<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-gray-500 border-b">${hs.map(h=>`<th class="py-2 pr-2 font-medium">${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`}

function connectForm(system){
  if(system==="salesforce"){const x=(S&&S.integrations&&S.integrations.salesforce)||{};return card("Salesforce CRM",`<p class="text-xs text-gray-500 mb-3">Status: <strong class="${x.connected?"text-emerald-600":"text-gray-700"}">${x.connected?"CONNECTED":"NOT CONNECTED"}</strong> · health: ${esc(x.health||"unknown")}</p>
    <div class="grid sm:grid-cols-2 gap-3 mb-3">
      <input id="sf-url" placeholder="Instance URL" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white">
      <input id="sf-client" placeholder="Client ID" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white">
      <input id="sf-secret" type="password" placeholder="Client Secret" class="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white">
    </div>
    <div class="flex flex-wrap gap-2">
      <button type="button" onclick="doConnect('salesforce')" class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl">Connect</button>
      <button type="button" onclick="doTest('salesforce')" class="border border-gray-200 text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50">Test</button>
      <button type="button" onclick="doDisc('salesforce')" class="text-sm text-gray-500 px-3 py-2.5">Disconnect</button>
    </div><p id="sf-msg" class="text-xs mt-3 text-gray-600"></p>`)}
  if(system==="zendesk"){const x=(S&&S.integrations&&S.integrations.zendesk)||{};return card("Zendesk Helpdesk",`<p class="text-xs text-gray-500 mb-3">Status: <strong class="${x.connected?"text-emerald-600":"text-gray-700"}">${x.connected?"CONNECTED":"NOT CONNECTED"}</strong></p>
    <div class="grid sm:grid-cols-2 gap-3 mb-3">
      <input id="zd-sub" placeholder="Subdomain" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
      <input id="zd-email" placeholder="Admin email" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
      <input id="zd-token" type="password" placeholder="API Token" class="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
    </div>
    <div class="flex flex-wrap gap-2">
      <button type="button" onclick="doConnect('zendesk')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl">Connect</button>
      <button type="button" onclick="doTest('zendesk')" class="border border-gray-200 text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50">Test</button>
      <button type="button" onclick="doDisc('zendesk')" class="text-sm text-gray-500 px-3 py-2.5">Disconnect</button>
    </div><p id="zd-msg" class="text-xs mt-3 text-gray-600"></p>`)}
  if(system==="payment"){const x=(S&&S.integrations&&S.integrations.payment)||{};return card("Payment Gateway",`<p class="text-xs text-gray-500 mb-3">Status: <strong class="${x.connected?"text-emerald-600":"text-gray-700"}">${x.connected?"CONNECTED":"NOT CONNECTED"}</strong> · money stays on company merchant account</p>
    <div class="grid sm:grid-cols-2 gap-3 mb-3">
      <select id="pay-provider" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="razorpay">Razorpay</option><option value="stripe">Stripe</option></select>
      <select id="pay-mode" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="test">Test Mode (safe)</option><option value="live">Live Mode</option></select>
      <input id="pay-key" placeholder="Key ID" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
      <input id="pay-secret" type="password" placeholder="Secret" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
    </div>
    <div class="flex flex-wrap gap-2">
      <button type="button" onclick="doConnect('payment')" class="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl">Connect</button>
      <button type="button" onclick="doTest('payment')" class="border border-gray-200 text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50">Test</button>
      <button type="button" onclick="doDisc('payment')" class="text-sm text-gray-500 px-3 py-2.5">Disconnect</button>
    </div><p id="pay-msg" class="text-xs mt-3 text-gray-600"></p>`)}
  return ""
}
async function doConnect(system){let body={system};
  if(system==="salesforce"){body.instance_url=(document.getElementById("sf-url")||{}).value?.trim();body.client_id=(document.getElementById("sf-client")||{}).value?.trim();body.client_secret=(document.getElementById("sf-secret")||{}).value?.trim()}
  if(system==="zendesk"){body.subdomain=(document.getElementById("zd-sub")||{}).value?.trim();body.email=(document.getElementById("zd-email")||{}).value?.trim();body.api_token=(document.getElementById("zd-token")||{}).value?.trim()}
  if(system==="payment"){body.provider=(document.getElementById("pay-provider")||{}).value;body.mode=(document.getElementById("pay-mode")||{}).value;body.key_id=(document.getElementById("pay-key")||{}).value?.trim();body.key_secret=(document.getElementById("pay-secret")||{}).value?.trim()}
  const msgId=system==="salesforce"?"sf-msg":system==="zendesk"?"zd-msg":"pay-msg";
  const el=document.getElementById(msgId);if(el)el.textContent="Connecting…";
  try{const r=await fetch("/api/integrations/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(el)el.textContent=d.success?("✓ "+d.message):(d.error||"Failed");await load(false);render()}catch(e){if(el)el.textContent=String(e)}}
async function doTest(system){const msgId=system==="salesforce"?"sf-msg":system==="zendesk"?"zd-msg":"pay-msg";const el=document.getElementById(msgId);if(el)el.textContent="Testing…";
  try{const r=await fetch("/api/integrations/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system})});const d=await r.json();if(el)el.textContent=d.success?("✓ "+d.message):(d.error||"Failed");await load(false);render()}catch(e){if(el)el.textContent=String(e)}}
async function doDisc(system){if(!confirm("Disconnect "+system+"?"))return;await fetch("/api/integrations/disconnect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system})});await load(false);render()}

function render(){
  const main=document.getElementById("main");if(!S){main.innerHTML='<p class="text-center text-gray-400 text-sm py-24">Loading live data…</p>';return}
  const m=S.metrics||{},ci=S.cancelImpact||{},integ=S.integrations||{};
  const views={
    "ops-overview":()=>histPanel("Operations Overview","/api/ops/overview",d=>`<div class="grid grid-cols-2 gap-3 mb-3">${kpi("Cases",(d.actual||{}).cases_total||0)}${kpi("Investigating",(d.actual||{}).cases_investigating||0,"text-amber-600")}${kpi("Resolved",(d.actual||{}).cases_resolved||0,"text-emerald-600")}${kpi("Refunds",(d.actual||{}).confirmed_refunds||0)}</div><p class="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl">${esc(d.demo_notice||"")}</p><p class="text-xs text-gray-500 mt-2">Est. hours: ${esc((d.estimated||{}).employee_hours_saved)} — ${esc((d.estimated||{}).method||"")}</p>`),
    "ops-c360":()=>histPanel("Customer 360","/api/history/customers",d=>table(["ID","Name","Tier","Orders"],(d.customers||[]).map(c=>`<tr class="border-b border-gray-100"><td class="py-2"><button type="button" class="text-indigo-600" onclick="goCustomer('${esc(c.customer_id)}')">${esc(c.customer_id)}</button></td><td>${esc(c.name)}</td><td>${esc(c.tier)}</td><td>${c.order_count}</td></tr>`))),
    "ops-cases":()=>histPanel("Cases","/api/ops/employee-workspace",d=>table(["Case","Customer","Priority","Status"],(d.assigned_cases||[]).map(c=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc(c.id)}</td><td>${esc(c.customerName)}</td><td>${esc(c.priority)}</td><td>${esc(c.status)}</td></tr>`))),
    "ops-orders":()=>histPanel("Orders & Payments","/api/history/orders",d=>table(["Order","Payment","Refund","Amt"],(d.orders||[]).map(o=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc(o.order_id)}</td><td>${esc(o.payment_status)}</td><td>${esc(o.refund_status)}</td><td>${esc(o.amount)}</td></tr>`))),
    "ops-refund":()=>card("Refund Automation",`<p class="text-sm text-gray-600 mb-3">Dry-run only — no money movement.</p><input id="dryOid" placeholder="ORD-5566" class="w-full border rounded-xl px-3 py-2 text-sm mb-2"><button type="button" onclick="runDryRefund()" class="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl">Dry-run</button><pre id="dryOut" class="text-xs bg-gray-50 p-3 rounded-xl mt-3 whitespace-pre-wrap"></pre>`),
    "ops-ai":()=>card("AI Operations",`<p class="text-sm text-gray-600 mb-3">Evidence-based investigation (rule engine).</p><select id="invCid" class="w-full border rounded-xl px-3 py-2 text-sm mb-2"><option>CUST001</option><option>CUST002</option><option>CUST003</option><option>CUST004</option><option>CUST005</option></select><button type="button" onclick="runInvestigate()" class="bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-xl">Investigate</button><pre id="invOut" class="text-xs bg-gray-50 p-3 rounded-xl mt-3 whitespace-pre-wrap"></pre>`),
    "ops-integ":()=>histPanel("Integration Center","/api/ops/integrations",d=>`<pre class="text-xs bg-gray-50 p-2 rounded-xl mb-2 overflow-auto">${esc(JSON.stringify({builtin:d.builtin,custom:d.custom},null,2))}</pre>
      <div class="grid gap-2 mt-2"><input id="inName" placeholder="Name" class="border rounded-xl px-3 py-2 text-sm"><input id="inProvider" placeholder="Provider" class="border rounded-xl px-3 py-2 text-sm"><input id="inUrl" placeholder="https://..." class="border rounded-xl px-3 py-2 text-sm"><input id="inKey" type="password" placeholder="API key" class="border rounded-xl px-3 py-2 text-sm"><button type="button" onclick="addInteg()" class="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-xl">Save integration</button><p id="inMsg" class="text-xs text-gray-500"></p></div>`),
    "ops-map":()=>histPanel("Field Mapping","/api/ops/field-mappings",d=>table(["Source","Internal","Status"],(d.mappings||[]).map(m=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc(m.source_field)}</td><td>${esc(m.internal_field)}</td><td>${esc(m.status)}</td></tr>`))),
    "ops-employee":()=>histPanel("Employee Workspace","/api/ops/employee-workspace",d=>table(["Case","Customer","Priority"],(d.priority_queue||[]).map(c=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc(c.id)}</td><td>${esc(c.customerName)}</td><td>${esc(c.priority)}</td></tr>`))),
    "ops-analytics":()=>histPanel("Analytics","/api/ops/overview",d=>`<div class="grid grid-cols-2 gap-3">${kpi("Hours est",(d.estimated||{}).employee_hours_saved||0)}${kpi("USD est",(d.estimated||{}).operating_cost_saved_usd||0,"text-emerald-600")}</div>`),
    "ops-health":()=>histPanel("System Health","/api/ops/health",d=>`<pre class="text-xs bg-gray-50 p-3 rounded-xl overflow-auto">${esc(JSON.stringify(d,null,2))}</pre>`),
    "ops-billing":()=>histPanel("Billing","/api/ops/billing",d=>`<p class="text-sm">${esc(d.plan)} · ${esc(d.status)} · $${esc(d.price_usd)}/mo</p><pre class="text-xs bg-gray-50 p-3 rounded-xl mt-2">${esc(JSON.stringify(d.usage,null,2))}</pre>`),
    "ops-rbac":()=>histPanel("Roles","/api/ops/rbac",d=>`<ul class="text-sm">${(d.roles||[]).map(r=>`<li class="border-b py-2">${esc(r)}</li>`).join("")}</ul>`),
    home:()=>`<div class="text-center py-8"><h1 class="text-2xl font-semibold tracking-tight">Aapka AI</h1><p class="text-sm text-gray-500 mt-2 max-w-sm mx-auto">Search modules below or open Menu. Connect forms stay on this white screen.</p></div>
      <div class="grid grid-cols-2 gap-3 mb-4">${kpi("Hours saved",(m.human_hours_saved||0).toFixed(2),"text-cyan-600")}${kpi("USD saved",(m.salary_leak_prevented||0).toFixed(0),"text-emerald-600")}${kpi("VIP protected",m.vip_churn_stopped||0,"text-amber-600")}${kpi("Automations",m.total_automations||0,"text-violet-600")}</div>
      ${card("Workspace",`<ul class="text-sm space-y-1.5 text-gray-700"><li>Open cases: <strong>${(S.openCases||[]).length}</strong></li><li>Orders in workspace: <strong>${(S.orders||[]).length}</strong> (sample until CRM connected)</li><li>Subscription: <strong>${S.isSubscriptionActive?"ACTIVE":"LOCKED"}</strong></li></ul>
      <p class="text-[11px] text-gray-400 mt-3">Sample profiles exist only for demo. After Salesforce connect, company customers replace this list.</p>`)}`,
    command:()=>card("Command Center",`<div class="text-sm space-y-2">${[["Open cases",(S.openCases||[]).length],["Refunds done",m.refunds_processed||0],["Tickets",m.tickets_created||0],["Webhook events",(S.webhook_log||[]).length]].map(([a,b])=>`<div class="flex justify-between border-b border-gray-100 py-2"><span class="text-gray-600">${a}</span><strong>${b}</strong></div>`).join("")}</div>`),
    "agent-desk":()=>card("Agent Desk",`<p class="text-sm text-gray-600 mb-3">Handle escalated cases with 1-click actions on this white screen.</p>
      <button type="button" onclick="go('cases')" class="text-sm bg-gray-900 text-white px-4 py-2.5 rounded-xl mr-2">Open cases</button>
      <button type="button" onclick="go('autopilot')" class="text-sm border border-gray-200 px-4 py-2.5 rounded-xl">Autopilot</button>
      <p class="text-[11px] text-gray-400 mt-3">No separate dark employee page — everything stays in Console.</p>`),
    "live-queue":()=>card("Live Queue",`${table(["Time","Message"],(S.notifications||[]).map(n=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs text-gray-500">${esc((n.time||"").slice(0,19))}</td><td>${esc(n.message)}</td></tr>`))}<a href="/customer" class="inline-block mt-4 text-sm bg-indigo-600 text-white px-4 py-2.5 rounded-xl">Open customer chat</a>`),
    refunds:()=>card("Refunds Engine",table(["Receipt","Order","Amount"],(S.receipts||[]).slice().reverse().map(r=>`<tr class="border-b border-gray-100"><td class="py-2 font-mono text-xs">${esc(r.receipt_id)}</td><td>${esc(r.order_id)}</td><td>Rs.${esc(r.amount)}</td></tr>`))),
    orders:()=>card("Orders & Payments",table(["Order","Customer","Status","Amt"],(S.orders||[]).map(o=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs font-mono">${esc(o.OrderID)}</td><td>${esc(o.CustomerName)}</td><td>${esc(o.PaymentStatus)}</td><td>${esc(o.amount)}</td></tr>`))),
    vip:()=>card("VIP Lane",table(["Name","Tier","Balance"],(S.premiumCustomers||[]).map(c=>`<tr class="border-b border-gray-100"><td class="py-2">${esc(c.name)}</td><td>${esc(c.tier)}</td><td>Rs.${esc(c.balance)}</td></tr>`))),
    tickets:()=>card("Ticket Desk",`<p class="text-3xl font-bold">${m.tickets_created||0}</p><p class="text-xs text-gray-500 mt-1">Created from chat + autopilot</p>`),
    sentiment:()=>card("Sentiment",table(["Customer","Tier","Sentiment"],(S.customers||[]).map(c=>`<tr class="border-b border-gray-100"><td class="py-2">${esc(c.name)}</td><td>${esc(c.tier)}</td><td>${esc(c.sentiment||"neutral")}</td></tr>`))),
    cases:()=>card("Open Cases",table(["Case","Customer","Priority","Status"],(S.openCases||[]).map(c=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs font-mono">${esc(c.id)}</td><td>${esc(c.customerName)}</td><td>${esc(c.priority)}</td><td>${esc(c.status)}</td></tr>`))),
    autopilot:()=>{const c=(S.openCases||[])[0];if(!c)return card("1-Click Autopilot",`<p class="text-sm text-gray-500">No open case. From Customers, send “complex problem”.</p>`);return card("Autopilot — "+esc(c.id),`<p class="text-sm text-gray-600 mb-3">${esc(c.customerName)} · ${esc(c.tier)}</p><div class="grid gap-2">${(c.actions||[]).map(a=>`<button type="button" onclick="runAction('${esc(c.id)}',${a.id})" class="text-left border border-gray-200 rounded-xl p-3 hover:bg-gray-50 text-sm"><div class="font-medium">#${a.id} ${esc(a.title)}</div><div class="text-xs text-gray-500 mt-1">${esc(a.description)}</div></button>`).join("")}</div>`)},
    context:()=>{const c=(S.cases||[])[0];return c?card("Context Memory",`<pre class="text-xs bg-gray-50 p-3 rounded-xl whitespace-pre-wrap text-gray-700">${esc(c.summary)}</pre>`):card("Context Memory",`<p class="text-sm text-gray-500">No case context yet.</p>`)},
    sla:()=>{const s=S.sla||{};return card("SLA Board",`<p class="text-sm">Target ack <strong>${s.targetAckSeconds||90}s</strong> · With tool <strong>${s.automatedMinutes||0.5} min</strong> · Without <strong>${s.manualMinutes||25} min</strong></p>`)},
    "agent-perf":()=>card("Agent Performance",`<pre class="text-xs bg-gray-50 p-3 rounded-xl">${esc(JSON.stringify(S.agent_stats||{},null,2))}</pre>`),
    playbooks:()=>card("Playbooks",`<div class="space-y-2">${(S.playbooks||[]).map(p=>`<div class="border border-gray-200 rounded-xl p-3 text-sm"><strong>${esc(p.name)}</strong><ol class="text-xs text-gray-600 mt-1 list-decimal pl-4">${(p.steps||[]).map(s=>`<li>${esc(s)}</li>`).join("")}</ol></div>`).join("")}</div>`),
    rules:()=>card("Automation Rules",table(["ID","Trigger","Active"],(S.automationRules||[]).map(r=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs font-mono">${esc(r.id)}</td><td>${esc(r.trigger)}</td><td>${r.active?"YES":"NO"}</td></tr>`))),
    webhooks:()=>card("Sales & Tech Alerts",table(["Time","Target","Event"],(S.webhook_log||[]).slice().reverse().map(w=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc((w.timestamp||"").slice(0,19))}</td><td>${esc(w.target)}</td><td>${esc(w.event)}</td></tr>`))),
    receipts:()=>card("Crypto Receipts",table(["Receipt","Hash","Order"],(S.receipts||[]).slice().reverse().map(r=>`<tr class="border-b border-gray-100"><td class="py-2 font-mono text-xs">${esc(r.receipt_id)}</td><td class="font-mono text-[10px]">${esc((r.hash||"").slice(0,16))}…</td><td>${esc(r.order_id)}</td></tr>`))),
    vouchers:()=>card("Vouchers",table(["Code","Customer","$"],(S.vouchers||[]).map(v=>`<tr class="border-b border-gray-100"><td class="py-2 font-mono text-xs">${esc(v.code)}</td><td>${esc(v.customerId)}</td><td>${esc(v.amount)}</td></tr>`))),
    escalation:()=>card("Escalation Pipeline",table(["Case","Customer","Status"],(S.cases||[]).map(c=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs font-mono">${esc(c.id)}</td><td>${esc(c.customerName)}</td><td>${esc(c.status)}</td></tr>`))),
    "int-overview":()=>card("Integration Health",table(["System","Status"],Object.entries(S.connectedSystems||{}).map(([k,v])=>`<tr class="border-b border-gray-100"><td class="py-2">${esc(k)}</td><td class="text-xs font-medium">${esc(v)}</td></tr>`))),
    "int-sf":()=>connectForm("salesforce"),
    "int-zd":()=>connectForm("zendesk"),
    "int-pay":()=>connectForm("payment"),
    "int-email":()=>card("Email Channel",`<p class="text-sm">Status: <strong>${esc((S.connectedSystems||{}).Email||"—")}</strong></p>`),
    "int-slack":()=>card("Slack / Teams",`<p class="text-sm">Webhook events logged: <strong>${(S.webhook_log||[]).length}</strong></p>`),
    "int-test":()=>card("Connection Tests",`<p class="text-sm leading-relaxed">Salesforce last test: <strong>${esc((integ.salesforce||{}).last_test||"never")}</strong><br>Zendesk last test: <strong>${esc((integ.zendesk||{}).last_test||"never")}</strong><br>Payment last test: <strong>${esc((integ.payment||{}).last_test||"never")}</strong></p><p class="text-xs text-gray-500 mt-2">Open each integration module to Connect + Test on this page.</p>`),
    roi:()=>`<div class="grid grid-cols-2 gap-3">${kpi("Hours",(m.human_hours_saved||0).toFixed(2))}${kpi("USD",(m.salary_leak_prevented||0).toFixed(0),"text-emerald-600")}${kpi("VIP",m.vip_churn_stopped||0,"text-amber-600")}${kpi("Auto",m.total_automations||0)}</div>`,
    hours:()=>card("Hours Saved",`<p class="text-3xl font-bold text-cyan-600">${(m.human_hours_saved||0).toFixed(2)}</p>`),
    salary:()=>card("Salary Leak Prevented",`<p class="text-3xl font-bold text-emerald-600">$${(m.salary_leak_prevented||0).toFixed(0)}</p>`),
    churn:()=>card("VIP Churn Stopped",`<p class="text-3xl font-bold text-amber-600">${m.vip_churn_stopped||0}</p>`),
    "cancel-impact":()=>card("Cancel Impact",`<div class="grid grid-cols-3 gap-2 text-center mb-3"><div class="bg-red-50 rounded-xl p-3"><div class="text-[10px] text-red-600">Extra hrs</div><div class="font-bold text-red-700">+${ci.extraHoursNextMonth||0}</div></div><div class="bg-red-50 rounded-xl p-3"><div class="text-[10px] text-red-600">Extra $</div><div class="font-bold text-red-700">+$${ci.extraCostUsd||0}</div></div><div class="bg-red-50 rounded-xl p-3"><div class="text-[10px] text-red-600">Queue</div><div class="font-bold text-red-700">${ci.queueHours||4.5}h</div></div></div><p class="text-sm text-gray-600">${esc((S.employeeDependency||{}).message||"")}</p>`),
    reports:()=>card("Value Report",`<p class="text-sm">Hours <strong>${(m.human_hours_saved||0).toFixed(2)}</strong> · Value $<strong>${(m.salary_leak_prevented||0).toFixed(0)}</strong> · If cancel +$<strong>${ci.extraCostUsd||0}</strong></p>`),
    audit:()=>card("Audit Trail",`${table(["Time","Type","Detail"],(S.event_log||[]).slice().reverse().slice(0,20).map(e=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc((e.timestamp||"").slice(0,19))}</td><td>${esc(e.type)}</td><td class="text-xs">${esc(e.detail)}</td></tr>`))}<button type="button" onclick="exportAudit()" class="mt-3 text-sm bg-gray-900 text-white px-4 py-2.5 rounded-xl">Download JSON</button>`),
    activity:()=>card("Activity Log",table(["Time","Actor","Action"],(S.activity_log||[]).slice().reverse().map(a=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc((a.time||"").slice(0,19))}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td></tr>`))),
    export:()=>card("Export Center",`<button type="button" onclick="exportAudit()" class="text-sm bg-indigo-600 text-white px-4 py-2.5 rounded-xl">Export audit JSON</button>`),
    lockout:()=>card("Context Lockout",`<p class="text-sm mb-3">Subscription is <strong>${S.isSubscriptionActive?"ACTIVE":"LOCKED"}</strong>. Turning off locks customer + agent APIs and restores multi-tab pain.</p><button type="button" onclick="toggleSub()" class="border border-red-300 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-red-50">Toggle subscription</button>`),
    dependency:()=>card("Dependency Score",`<p class="text-sm">With Aapka AI: <strong>~0.5 min</strong> complex handling<br>Without: <strong>~25 min</strong> multi-system work<br><br>${esc((S.employeeDependency||{}).message||"")}</p>`),
    billing:()=>card("Billing & Plan",`<p class="text-sm">${esc((S.plan||{}).name||"Enterprise")} · $<strong>${esc((S.plan||{}).price||1200)}</strong>/mo · ${S.isSubscriptionActive?"ACTIVE":"SUSPENDED"}</p>`),
    subscription:()=>card("Subscription Control",`<button type="button" onclick="toggleSub()" class="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl">Deactivate / Reactivate</button>`),
    roles:()=>card("Roles & Access",`<ul class="text-sm space-y-1 text-gray-700"><li>Customers → /customer chat</li><li>Agents → Console cases + autopilot</li><li>Executives → ROI + lockout</li><li>Admin → integrations on this page</li></ul>`),
    settings:()=>card("Workspace Settings",`<p class="text-sm">ROI model $25/hr · Payment default test mode · White console only</p>`),
    notifications:()=>card("Alert Preferences",`<p class="text-sm">Unread queue items: <strong>${(S.notifications||[]).length}</strong> · Webhook log size: <strong>${(S.webhook_log||[]).length}</strong></p>`),
    "hist-overview":()=>histPanel("History Overview","/api/history/overview",d=>`<div class="grid grid-cols-2 gap-3 mb-3">${kpi("Events",d.total_events||0)}${kpi("Confirmed refunds",d.confirmed_refunds||0,"text-emerald-600")}${kpi("Pending refunds",d.pending_refunds||0,"text-amber-600")}${kpi("API error %",d.api_error_rate||0,"text-red-600")}</div><p class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">${esc(d.demo_notice||"")}</p><pre class="text-xs bg-gray-50 p-3 rounded-xl overflow-auto">${esc(JSON.stringify({tenant:d.tenant_id,sync:d.last_sync_status,retention:d.data_retention_status},null,2))}</pre>`),
    "hist-customers":()=>histPanel("Customer History","/api/history/customers",d=>table(["Customer","Tier","Orders","Refunds","Email"],(d.customers||[]).map(c=>`<tr class="border-b border-gray-100"><td class="py-2"><button type="button" class="text-indigo-600 text-left" onclick="goCustomer('${esc(c.customer_id)}')">${esc(c.customer_id)}</button><div class="text-xs text-gray-500">${esc(c.name)}</div></td><td>${esc(c.tier)}</td><td>${c.order_count}</td><td>${c.refund_count}</td><td class="text-xs">${esc(c.email_masked)}</td></tr>`)),
    "hist-orders":()=>histPanel("Orders","/api/history/orders",d=>table(["Order","Customer","Payment","Refund","Amt"],(d.orders||[]).map(o=>`<tr class="border-b border-gray-100"><td class="py-2 font-mono text-xs">${esc(o.order_id)}</td><td class="text-xs">${esc(o.customer_id)}</td><td>${esc(o.payment_status)}</td><td>${esc(o.refund_status)}</td><td>${esc(o.amount)}</td></tr>`)),
    "hist-refunds":()=>histPanel("Refund History","/api/history/refunds",d=>`<p class="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl mb-3">${esc(d.demo_notice||"")}</p>`+table(["Refund","Order","Status","Financial","Amt"],(d.refunds||[]).map(r=>`<tr class="border-b border-gray-100"><td class="py-2 font-mono text-xs">${esc(r.refund_request_id)}</td><td class="text-xs">${esc(r.order_id)}</td><td>${esc(r.status)}</td><td class="text-xs">${esc(r.financial_state)}</td><td>${esc(r.requested_amount)}</td></tr>`))),
    "hist-activity":()=>histPanel("Activity","/api/history/activity",d=>table(["Time","Actor","Action","Detail"],(d.activity||[]).slice(0,80).map(a=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc((a.timestamp||"").slice(0,19))}</td><td>${esc(a.actor_type)}</td><td>${esc(a.action)}</td><td class="text-xs">${esc(a.detail)}</td></tr>`))),
    "hist-api":()=>histPanel("API Logs","/api/history/api-logs",d=>table(["Time","Route","Status","ms"],(d.logs||[]).map(l=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc((l.request_timestamp||"").slice(0,19))}</td><td class="text-xs">${esc(l.api_route)}</td><td>${esc(l.http_status)}</td><td>${esc(l.duration_ms)}</td></tr>`))),
    "hist-security":()=>histPanel("Security Audit","/api/history/security-audit",d=>table(["Time","Event","Outcome","Hash"],(d.events||[]).map(e=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs">${esc((e.timestamp||"").slice(0,19))}</td><td class="text-xs">${esc(e.event_type)}</td><td>${esc(e.outcome)}</td><td class="font-mono text-[10px]">${esc((e.integrity_hash||"").slice(0,12))}…</td></tr>`))),
    "hist-impact":()=>histPanel("Business Impact","/api/history/business-impact",d=>`<div class="grid grid-cols-2 gap-3 mb-3">${kpi("Hours (est.)",d.estimated_employee_hours_saved||0)}${kpi("USD (est.)",d.estimated_operating_cost_saved_usd||0,"text-emerald-600")}${kpi("Refund req",d.refund_requests||0)}${kpi("Confirmed",d.confirmed_refunds||0)}</div><p class="text-xs text-gray-600">${esc(d.calculation_method||"")}</p><p class="text-xs text-amber-700 mt-2">${esc((d.labels&&d.labels.estimated_vs_realized)||"")}</p>`),
    "hist-archive":()=>histPanel("Deletion Jobs","/api/history/deletion-jobs",d=>table(["Job","Ran","Status"],(d.jobs||[]).map(j=>`<tr class="border-b border-gray-100"><td class="py-2 text-xs font-mono">${esc(j.job_id)}</td><td class="text-xs">${esc((j.ran_at||"").slice(0,19))}</td><td>${esc(j.status)}</td></tr>`))+`<button type="button" onclick="runCleanup()" class="mt-3 text-sm bg-gray-900 text-white px-4 py-2.5 rounded-xl">Run retention cleanup</button>`),
    "hist-retention":()=>histPanel("Retention & Privacy","/api/history/retention-policy",d=>{const p=d.policy||{};return `<div class="text-sm space-y-2">${Object.keys(p).filter(k=>String(k).endsWith("_days")).map(k=>`<div class="flex justify-between border-b border-gray-100 py-2"><span>${esc(k)}</span><strong>${esc(p[k])} days</strong></div>`).join("")}</div><button type="button" onclick="runCleanup()" class="mt-3 text-sm border px-4 py-2.5 rounded-xl">Apply cleanup</button>`}),
    about:()=>card("About Aapka AI",`<p class="text-sm text-gray-600 leading-relaxed">Invisible Enterprise Brain — company connects Salesforce, Zendesk, Payment. Refunds mutate status + crypto receipt. Complex issues escalate with 1-click actions. Cancel lockout restores 4.5h queues. All console modules read live snapshot data.</p>`),
  };
  main.innerHTML=(views[cur]||(()=>card(cur,"OK")))()
}
async function load(doRender=true){try{const r=await fetch("/api/console/snapshot");if(!r.ok){if(doRender)document.getElementById("main").innerHTML=card("API error",esc(await r.text()));return}S=await r.json();const b=document.getElementById("liveBadge");if(b){b.textContent=S.isSubscriptionActive?"Live OK":"LOCKED";b.className="text-[10px] px-2 py-1 rounded-full font-medium "+(S.isSubscriptionActive?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700")}if(doRender)render()}catch(e){if(doRender)document.getElementById("main").innerHTML=`<p class="text-center text-red-500 text-sm py-20">${esc(String(e))}</p>`}}
async function runAction(caseId,actionId){const r=await fetch("/api/cases/"+caseId+"/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action_id:actionId})});const d=await r.json();alert(d.success?d.message:(d.error||d.message||"Failed"));await load()}
async function toggleSub(){if(!S)return;const next=!S.isSubscriptionActive;if(!next&&!confirm("Deactivate? Customer & agent APIs lock. Queue impact ~4.5 hours."))return;await fetch("/api/ceo/toggle-subscription",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({active:next})});await load()}
async function exportAudit(){const r=await fetch("/api/export/audit");if(!r.ok){alert("Export failed or locked");return}const d=await r.json();const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"}));a.download="aapka-audit-"+Date.now()+".json";a.click()}
buildDrawer();
(function(){try{const g=new URLSearchParams(location.search).get('go');if(g&&all().some(x=>x.id===g))go(g);else go('home')}catch(e){go('home')}})();
load();setInterval(()=>load(true),6000);
