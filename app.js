// ===== STATE =====
let uploadedFiles = [];
let connectedApps = [];
let isActive = false;
let isLightTheme = false;
let chartInstances = [];
let apiConfig = {
    key: '',
    base: '',
    model: 'gpt-4o-mini',
    found: false,
    foundIn: ''
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    setupDropZone();
    setupFileInput();
    autoResizeTextarea();
});

// ===== FILE UPLOAD =====
function setupDropZone() {
    const zone = document.getElementById('drop-zone');
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
    zone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
            document.getElementById('file-input').click();
        }
    });
}

function setupFileInput() {
    document.getElementById('file-input').addEventListener('change', (e) => {
        if (e.target.files.length) handleFiles(e.target.files);
    });
}

async function handleFiles(fileList) {
    const formData = new FormData();
    for (let f of fileList) formData.append('files', f);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success && data.files && data.files.length) {
            data.files.forEach(f => {
                if (!uploadedFiles.find(x => x.id === f.id)) uploadedFiles.push(f);
            });
            renderFileList();
            updateChecklist();
            showToast(`✅ ${data.files.length} file(s) uploaded successfully`);
            setTimeout(detectApiFromFiles, 500);
        } else {
            showToast('❌ Upload failed: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Upload error:', err);
        showToast('❌ Upload failed. Please try again.');
    }
}

function renderFileList() {
    const list = document.getElementById('file-list');
    if (!uploadedFiles.length) { list.innerHTML = ''; return; }
    list.innerHTML = uploadedFiles.map(f => `
        <div class="file-item" data-id="${f.id}">
            <span class="file-icon">${getFileEmoji(f.type)}</span>
            <div class="file-info">
                <div class="file-name">${escapeHtml(f.name)}</div>
                <div class="file-size">${formatSize(f.size)}</div>
            </div>
            <button class="file-remove" onclick="removeFile('${f.id}')" title="Remove">✕</button>
        </div>
    `).join('');
}

function removeFile(id) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== id);
    renderFileList();
    updateChecklist();
    fetch(`/api/delete/${id}`, { method: 'DELETE' }).catch(() => {});
    // Re-detect after remove
    if (uploadedFiles.length) detectApiFromFiles();
    else {
        apiConfig = { key: '', base: '', model: 'gpt-4o-mini', found: false, foundIn: '' };
        updateChecklist();
    }
}

function getFileEmoji(type) {
    const map = { pdf:'📄', csv:'📊', xlsx:'📈', xls:'📈', doc:'📝', docx:'📝', txt:'📃', json:'🗂️', log:'📋', env:'🔑', md:'📝', png:'🖼️', jpg:'🖼️', jpeg:'🖼️' };
    return map[type] || '📁';
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

// ===== AUTO DETECT API FROM FILES =====
async function detectApiFromFiles() {
    if (!uploadedFiles.length) return;
    try {
        const res = await fetch('/api/detect-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: uploadedFiles })
        });
        const data = await res.json();
        if (data.found) {
            apiConfig = {
                key: data.api_key,
                base: data.api_base,
                model: data.api_model,
                found: true,
                foundIn: data.found_in
            };
            updateChecklist();
            showToast(`✅ API Key + Model detected from: ${data.found_in}`);
        } else {
            apiConfig.found = false;
            updateChecklist();
        }
    } catch (e) {
        console.log('Detect failed', e);
    }
}

// ===== CONNECT APPS =====
function connectApp(btn) {
    const appName = btn.dataset.app;
    if (btn.classList.contains('connected')) {
        btn.classList.remove('connected');
        btn.querySelector('.app-status').textContent = 'Connect';
        connectedApps = connectedApps.filter(a => a !== appName);
        showToast(`${appName} disconnected`);
    } else {
        btn.classList.add('connected');
        btn.querySelector('.app-status').textContent = 'Connected ✓';
        if (!connectedApps.includes(appName)) connectedApps.push(appName);
        showToast(`${appName} connected`);
        fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app: appName })
        }).catch(() => {});
    }
    updateChecklist();
}

// ===== CHECKLIST =====
function updateChecklist() {
    const checkFiles = document.getElementById('check-files');
    const checkApps = document.getElementById('check-apps');
    const checkApi = document.getElementById('check-api');

    if (uploadedFiles.length > 0) {
        checkFiles.classList.add('done');
        checkFiles.querySelector('.check-icon').textContent = '✓';
    } else {
        checkFiles.classList.remove('done');
        checkFiles.querySelector('.check-icon').textContent = '○';
    }

    if (connectedApps.length > 0) {
        checkApps.classList.add('done');
        checkApps.querySelector('.check-icon').textContent = '✓';
    } else {
        checkApps.classList.remove('done');
        checkApps.querySelector('.check-icon').textContent = '○';
    }

    if (checkApi) {
        if (apiConfig.found) {
            checkApi.classList.add('done');
            checkApi.querySelector('.check-icon').textContent = '✓';
        } else {
            checkApi.classList.remove('done');
            checkApi.querySelector('.check-icon').textContent = '○';
        }
    }
}

// ===== ACTIVATE WITH TRANSITION =====
function activateSystem() {
    if (uploadedFiles.length === 0) {
        showToast('Please upload at least one file first');
        return;
    }

    // Hide setup
    document.getElementById('setup-screen').classList.remove('active');

    // Show transition (black/white)
    const trans = document.getElementById('transition-screen');
    trans.classList.add('active');

    const sub = document.getElementById('transition-sub');
    if (apiConfig.found) {
        sub.textContent = `API Key found in ${apiConfig.foundIn} • Connecting intelligence...`;
    } else {
        sub.textContent = 'Loading files in demo mode...';
    }

    // After 2.2 seconds go to active screen
    setTimeout(() => {
        trans.classList.remove('active');
        document.getElementById('active-screen').classList.add('active');
        isActive = true;

        renderConnectedList();
        renderSidebarFiles();
        updateApiStatusUI();

        // Welcome message update if API found
        if (apiConfig.found) {
            const msgArea = document.getElementById('chat-messages');
            const firstMsg = msgArea.querySelector('.msg-text');
            if (firstMsg) {
                firstMsg.innerHTML = `System is <strong>ONLINE</strong> and fully connected.<br><br>
                ✅ API Key, URL & Model auto-detected from <strong>${escapeHtml(apiConfig.foundIn)}</strong><br>
                Model: <strong>${escapeHtml(apiConfig.model)}</strong><br><br>
                I've loaded all your files. Ask me anything about past losses, projects, or recovery plans. Charts will appear automatically when needed.`;
            }
        }

        showToast(apiConfig.found ? 'NexusAI ONLINE • Real AI Connected' : 'NexusAI ONLINE • Demo Mode');
        setTimeout(() => document.getElementById('user-input').focus(), 300);
    }, 2200);
}

function deactivateSystem() {
    isActive = false;
    document.getElementById('active-screen').classList.remove('active');
    document.getElementById('setup-screen').classList.add('active');
    chartInstances.forEach(c => c.destroy());
    chartInstances = [];
    showToast('NexusAI turned OFF');
}

function renderConnectedList() {
    const el = document.getElementById('connected-list');
    if (!connectedApps.length) {
        el.innerHTML = '<p class="empty-state">No apps connected</p>';
        return;
    }
    el.innerHTML = connectedApps.map(a => `
        <div class="conn-item"><span class="dot"></span><span>${a}</span></div>
    `).join('');
}

function renderSidebarFiles() {
    const el = document.getElementById('sidebar-files');
    if (!uploadedFiles.length) {
        el.innerHTML = '<p class="empty-state">No files</p>';
        return;
    }
    el.innerHTML = uploadedFiles.map(f => `
        <div class="side-file">
            <span>${getFileEmoji(f.type)}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(f.name)}</span>
        </div>
    `).join('');
}

function updateApiStatusUI() {
    const box = document.getElementById('api-status');
    const text = document.getElementById('api-status-text');
    if (!box || !text) return;
    if (apiConfig.found) {
        box.querySelector('.status-dot').className = 'status-dot online';
        text.textContent = `Connected (${apiConfig.model})`;
    } else {
        box.querySelector('.status-dot').className = 'status-dot offline';
        text.textContent = 'Demo Mode';
    }
}

// ===== THEME =====
function toggleTheme() {
    isLightTheme = !isLightTheme;
    document.body.classList.toggle('light-theme', isLightTheme);
    document.getElementById('theme-icon').textContent = isLightTheme ? '☀️' : '🌙';
}

// ===== CHAT =====
function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function askQuick(text) {
    document.getElementById('user-input').value = text;
    sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const query = input.value.trim();
    if (!query) return;

    appendMessage(query, 'user');
    input.value = '';
    input.style.height = 'auto';

    const typingId = showTyping();

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                files: uploadedFiles,
                api_key: apiConfig.key || '',
                api_base: apiConfig.base || '',
                api_model: apiConfig.model || 'gpt-4o-mini'
            })
        });
        const data = await res.json();
        removeTyping(typingId);

        if (data.error) {
            appendMessage('Error from AI provider: ' + data.error + '\n\nFalling back to demo analysis...', 'ai');
            appendAIResponse(generateMockResponse(query));
        } else {
            appendAIResponse(data);
        }
    } catch (err) {
        removeTyping(typingId);
        appendAIResponse(generateMockResponse(query));
    }
}

function appendMessage(text, role) {
    const container = document.getElementById('chat-messages');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = `message ${role}-message`;
    div.innerHTML = `
        <div class="msg-avatar">${role === 'ai' ? 'N' : 'You'}</div>
        <div class="msg-content">
            <div class="msg-header">
                <span class="msg-name">${role === 'ai' ? 'NexusAI' : 'You'}</span>
                <span class="msg-time">${time}</span>
            </div>
            <div class="msg-text">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function appendAIResponse(data) {
    const container = document.getElementById('chat-messages');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = 'message ai-message';

    let chartsHtml = '';
    if (data.charts && data.charts.length) {
        chartsHtml = '<div class="charts-container">';
        data.charts.forEach((chart, i) => {
            chartsHtml += `
                <div class="chart-box">
                    <div class="chart-title">${getChartTitle(chart, i)}</div>
                    <canvas id="chart_${Date.now()}_${i}"></canvas>
                </div>`;
        });
        chartsHtml += '</div>';
    }

    let summaryHtml = '';
    if (data.summary) {
        summaryHtml = '<div class="summary-cards">';
        for (const [key, val] of Object.entries(data.summary)) {
            summaryHtml += `
                <div class="summary-card">
                    <div class="label">${key.replace(/_/g, ' ')}</div>
                    <div class="value">${val}</div>
                </div>`;
        }
        summaryHtml += '</div>';
    }

    const textHtml = formatText(data.text || '');

    div.innerHTML = `
        <div class="msg-avatar">N</div>
        <div class="msg-content">
            <div class="msg-header">
                <span class="msg-name">NexusAI</span>
                <span class="msg-time">${time}</span>
            </div>
            <div class="msg-text">${textHtml}</div>
            ${summaryHtml}
            ${chartsHtml}
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    if (data.charts && data.charts.length) {
        setTimeout(() => {
            data.charts.forEach((chartConfig, i) => {
                const canvas = div.querySelectorAll('canvas')[i];
                if (canvas) renderChart(canvas.id, chartConfig);
            });
            container.scrollTop = container.scrollHeight;
        }, 60);
    }
}

function getChartTitle(chart, index) {
    if (chart.datasets && chart.datasets[0]) return chart.datasets[0].label || `Chart ${index + 1}`;
    return `Analysis Chart ${index + 1}`;
}

function renderChart(canvasId, config) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const isLight = document.body.classList.contains('light-theme');
    const textColor = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

    const chart = new Chart(ctx, {
        type: config.type || 'line',
        data: { labels: config.labels, datasets: config.datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: textColor, font: { family: 'Inter', size: 11 } } }
            },
            scales: (config.type !== 'doughnut' && config.type !== 'pie') ? {
                x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
                y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } }
            } : undefined
        }
    });
    chartInstances.push(chart);
}

function formatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')
        .replace(/## (.*?)(\n|$)/g, '<h3>$1</h3>')
        .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
        .replace(/^- (.*)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
}

function showTyping() {
    const container = document.getElementById('chat-messages');
    const id = 'typing_' + Date.now();
    const div = document.createElement('div');
    div.className = 'message ai-message';
    div.id = id;
    div.innerHTML = `
        <div class="msg-avatar">N</div>
        <div class="msg-content">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ===== MOCK =====
function generateMockResponse(query) {
    const q = query.toLowerCase();
    if (q.includes('loss') || q.includes('nuksan') || q.includes('last year') || q.includes('previous') || q.includes('नुकसान')) {
        return {
            text: `Sir, I've thoroughly analyzed the files you uploaded.\n\n**Last Year's Total Loss: ₹ 2.16 Crore**\n\n### Monthly Loss Trend\nLosses peaked in July (₹28.3 Lakhs). Root causes: Marketing Waste 28%, Ops Inefficiency 22%, Inventory 18%, Receivables 20%.\n\n**Recommendation:** Target max loss this year ₹45 Lakhs (79% reduction).`,
            charts: [{
                type: 'line',
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                datasets: [{ label: 'Monthly Loss (₹ Lakhs)', data: [12.5,18.2,15.8,22.1,19.4,25.6,28.3,21.7,16.9,14.2,11.8,9.5], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4 }]
            }],
            summary: { total_loss: '₹ 2.16 Cr', peak_month: 'July', target_reduction: '79%' }
        };
    }
    if (q.includes('improve') || q.includes('recover') || q.includes('profit') || q.includes('plan') || q.includes('सुधार')) {
        return {
            text: `Sir, here is the recovery plan based on your files:\n\n1. Marketing Optimization → +₹48L\n2. Inventory Cleanup → +₹32L\n3. Receivables Acceleration → +₹41L\n4. Operational Efficiency → +₹29L\n\n**Projected Profit: ₹1.05 Cr | Break-even: Month 5**`,
            charts: [{
                type: 'bar',
                labels: ['Q1','Q2','Q3','Q4'],
                datasets: [{ label: 'Projected Recovery (₹ Lakhs)', data: [35,58,72,95], backgroundColor: ['rgba(34,197,94,0.7)','rgba(34,197,94,0.8)','rgba(34,197,94,0.9)','#10b981'] }]
            }],
            summary: { projected_profit: '₹1.05 Cr', break_even: 'Month 5', roi: '340%' }
        };
    }
    return {
        text: `I'm online and ready, Sir.\n\nI have access to **${uploadedFiles.length} file(s)**.\n\nAsk me about last year's loss, recovery plan, or any specific project.`,
        charts: [],
        summary: null
    };
}

// ===== UTILS =====
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function autoResizeTextarea() {
    const ta = document.getElementById('user-input');
    if (!ta) return;
    ta.addEventListener('input', () => {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    });
        }
        
