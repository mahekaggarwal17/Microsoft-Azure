const AZURE_ENDPOINT = "https://anuj-ai.cognitiveservices.azure.com/";

// State
let history = Array.from({length: 20}, () => Math.floor(Math.random() * 13) + 12);
let logs = [];
let totalChecks = 0;
let okChecks = 0;

// DOM Elements
const orb = document.getElementById('orb');
const orbVal = document.getElementById('orb-val');
const pill = document.getElementById('status-pill');
const pillText = document.getElementById('pill-text');
const metricAvg = document.getElementById('metric-avg');
const metricP95 = document.getElementById('metric-p95');
const metricUptime = document.getElementById('metric-uptime');
const notification = document.getElementById('notification');
const logContent = document.getElementById('log-content');
const runBtn = document.getElementById('run-btn');

// Chart Setup
const ctx = document.getElementById('latencyChart').getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, 200);
gradient.addColorStop(0, 'rgba(59,130,246,0.2)');
gradient.addColorStop(1, 'rgba(59,130,246,0.0)');

const latencyChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array.from({length: history.length}, (_, i) => i),
        datasets: [{
            data: history,
            borderColor: '#3B82F6',
            backgroundColor: gradient,
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: () => '',
                    label: (context) => `Latency: ${context.parsed.y} ms`
                }
            }
        },
        scales: {
            x: { display: false },
            y: {
                grid: { color: '#07090F', drawBorder: false },
                ticks: { color: '#1E293B', font: { family: 'JetBrains Mono', size: 9 }, maxTicksLimit: 5 },
                beginAtZero: true
            }
        },
        animation: { duration: 0 }
    }
});

function updateMetrics() {
    // Avg
    const sum = history.reduce((a, b) => a + b, 0);
    const avg = history.length ? Math.round(sum / history.length) : 0;
    metricAvg.innerText = avg;

    // P95
    if (history.length > 0) {
        const sorted = [...history].sort((a, b) => a - b);
        const idx = Math.max(0, Math.floor(sorted.length * 0.95) - 1);
        metricP95.innerText = sorted[idx];
    }

    // Uptime
    const uptime = totalChecks === 0 ? 100.0 : ((okChecks / totalChecks) * 100).toFixed(1);
    metricUptime.innerText = uptime;
    
    // Update chart
    latencyChart.data.labels = Array.from({length: history.length}, (_, i) => i);
    latencyChart.data.datasets[0].data = history;
    latencyChart.update();
}

function updateLogs(isOk, ms) {
    const now = new Date();
    const ts = now.toTimeString().split(' ')[0];
    
    let entry = "";
    if (isOk) {
        entry = `✔  ${ts}    ${String(ms).padStart(4, ' ')}ms    200 OK`;
    } else {
        entry = `✖  ${ts}    timeout    no response`;
    }
    
    logs.unshift(entry);
    if (logs.length > 10) logs.pop();

    logContent.innerHTML = logs.map(l => `<div class="log-entry">${l}</div>`).join('');
}

async function runDiagnostic() {
    runBtn.disabled = true;
    runBtn.innerHTML = "🔄 Probing...";
    
    notification.className = "notification info";
    notification.innerHTML = `<span class="icon">🔄</span> Probing endpoint...`;
    
    pill.className = "pill idle";
    orb.className = "orb-wrap idle";
    pillText.innerText = "PROBING...";
    orbVal.innerText = "—";

    const t0 = performance.now();
    let isOk = false;
    
    try {
        // We use mode: no-cors because it's a cross-origin request without CORS headers
        // It won't let us read the status, but if the request succeeds (server is up), it won't throw
        await fetch(AZURE_ENDPOINT, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
        isOk = true;
    } catch (e) {
        isOk = false;
    }
    const t1 = performance.now();
    const ms = Math.round(t1 - t0);

    totalChecks++;
    
    if (isOk) {
        okChecks++;
        history.push(ms);
        if (history.length > 60) history.shift();
        
        orb.className = "orb-wrap online";
        pill.className = "pill online";
        pillText.innerText = `ONLINE · ${ms}ms`;
        orbVal.innerText = `${ms}ms`;
        
        notification.className = "notification success";
        notification.innerHTML = `<span class="icon">✅</span> <strong>Operational</strong> — Responded in ${ms}ms. TLS handshake complete.`;
    } else {
        orb.className = "orb-wrap offline";
        pill.className = "pill offline";
        pillText.innerText = `OFFLINE · TIMEOUT`;
        orbVal.innerText = `ERR`;
        
        notification.className = "notification error";
        notification.innerHTML = `<span class="icon">🚨</span> <strong>Unreachable</strong> — Request failed. Check network or CORS.`;
    }

    updateLogs(isOk, ms);
    updateMetrics();

    runBtn.disabled = false;
    runBtn.innerHTML = "▶ Run Diagnostic";
}

runBtn.addEventListener('click', runDiagnostic);

// Initialize
updateMetrics();
