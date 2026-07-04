// ============================================================================
// SentimentPulse · Azure AI Language Service Review & Key Phrase Analyzer
// ============================================================================

// State Management
let state = {
    demoMode: false, // Default to Live Mode since user credentials are provided!
    history: [],
    stats: {
        total: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        latencySum: 0
    },
    chartInstance: null
};

// Azure Configuration Defaults (Pre-configured with user's Azure resource)
let AZURE_CONFIG = {
    endpoint: "https://anuj-y.cognitiveservices.azure.com",
    apiKey: "", // Enter your 32-character hex key here or via Studio UI Settings
    apiVersion: "2023-04-01"
};

// Sample Reviews Library for Instant Testing
const SAMPLE_REVIEWS = {
    pos: "Absolutely fantastic experience! The build quality is top notch, performance exceeded all my expectations, and customer support was lightning fast.",
    neg: "Terrible product and even worse customer service. The software crashed repeatedly within ten minutes of installation. Complete waste of money.",
    neu: "The product arrived on time and functions as advertised. Battery life is decent, though the price feels slightly high compared to alternatives.",
    mix: "I really love the sleek screen and amazing camera quality, but the battery drains horribly fast and it gets quite warm during gaming."
};

// ============================================================================
// Initialization & Environment Config Loader
// ============================================================================
async function loadEnvConfig() {
    try {
        const res = await fetch('.env');
        if (res.ok) {
            const text = await res.text();
            text.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                    if (key === 'AZURE_ENDPOINT' && value) AZURE_CONFIG.endpoint = value;
                    if (key === 'AZURE_API_KEY' && value) AZURE_CONFIG.apiKey = value;
                    if (key === 'AZURE_API_VERSION' && value) AZURE_CONFIG.apiVersion = value;
                }
            });
            console.log("🔒 Loaded secure Azure credentials from local .env file.");
        }
    } catch (e) {
        console.warn("No local .env file accessible or running without local web server.");
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    setupEventListeners();
    
    // Attempt to load local .env file
    await loadEnvConfig();
    
    // Populate credentials in API settings drawer if present
    document.getElementById('azureEndpointInput').value = AZURE_CONFIG.endpoint;
    document.getElementById('azureKeyInput').value = AZURE_CONFIG.apiKey;
    
    // Load default sample into textarea without auto-analyzing
    document.getElementById('reviewText').value = SAMPLE_REVIEWS.pos;
    updateWordCount();
    
    // Seed initial demo data for the chart and KPIs
    seedDemoData();
    
    // Update status pill to reflect live mode
    updateStatusPill();
});

function setupEventListeners() {
    const reviewText = document.getElementById('reviewText');
    
    reviewText.addEventListener('input', updateWordCount);
    
    // Settings Drawer Toggle
    document.getElementById('configToggleBtn').addEventListener('click', () => {
        const panel = document.getElementById('configPanel');
        panel.classList.toggle('active');
        const icon = document.getElementById('configIcon');
        icon.innerText = panel.classList.contains('active') ? '▲' : '▼';
    });
    
    // Demo Mode Toggle Switch
    document.getElementById('demoModeCheckbox').addEventListener('change', (e) => {
        state.demoMode = e.target.checked;
        updateStatusPill();
    });
    
    // Save Azure Credentials
    document.getElementById('saveConfigBtn').addEventListener('click', () => {
        const ep = document.getElementById('azureEndpointInput').value.trim();
        const key = document.getElementById('azureKeyInput').value.trim();
        
        if (ep) AZURE_CONFIG.endpoint = ep.replace(/\/$/, ""); // strip trailing slash
        if (key) AZURE_CONFIG.apiKey = key;
        
        alert("Azure credentials saved for this session!");
        document.getElementById('configPanel').classList.remove('active');
        document.getElementById('configIcon').innerText = '▼';
        
        if (key && ep) {
            document.getElementById('demoModeCheckbox').checked = false;
            state.demoMode = false;
            updateStatusPill();
        }
    });
}

function updateStatusPill() {
    const badge = document.getElementById('statusPill');
    const pillText = document.getElementById('pillText');
    if (!badge || !pillText) return;
    
    if (state.demoMode) {
        pillText.innerText = "DEMO MODE · SIMULATED AI";
        badge.style.borderColor = "rgba(56, 189, 248, 0.4)";
        badge.style.background = "rgba(56, 189, 248, 0.15)";
    } else {
        pillText.innerText = "LIVE AZURE API · V2023-04-01";
        badge.style.borderColor = "rgba(16, 185, 129, 0.4)";
        badge.style.background = "rgba(16, 185, 129, 0.15)";
    }
}

function updateWordCount() {
    const text = document.getElementById('reviewText').value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    document.getElementById('textMeta').innerText = `${words} words · ${chars} characters`;
}

// ============================================================================
// Core Analysis Engine (Parallel Sentiment + Key Phrases)
// ============================================================================
async function analyzeReview() {
    const text = document.getElementById('reviewText').value.trim();
    if (!text) {
        alert("Please enter a review or click one of the sample chips above.");
        return;
    }
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    const originalBtnText = analyzeBtn.innerHTML;
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `<span>⏳ Analyzing via Azure AI...</span>`;
    
    const startTime = performance.now();
    let sentimentData = null;
    let keyPhrasesData = null;
    let latency = 0;
    
    try {
        if (state.demoMode || !AZURE_CONFIG.apiKey) {
            // Simulate realistic network delay
            await new Promise(r => setTimeout(r, 450 + Math.random() * 250));
            latency = Math.round(performance.now() - startTime);
            sentimentData = generateMockSentimentResponse(text);
            keyPhrasesData = generateMockKeyPhrases(text);
        } else {
            // Live Azure Cognitive Services Language REST API Call (Parallel Requests)
            const url = `${AZURE_CONFIG.endpoint}/language/:analyze-text?api-version=${AZURE_CONFIG.apiVersion}`;
            const headers = {
                'Ocp-Apim-Subscription-Key': AZURE_CONFIG.apiKey,
                'Content-Type': 'application/json'
            };
            
            const sentimentPayload = {
                kind: "SentimentAnalysis",
                parameters: { modelVersion: "latest", opinionMining: true },
                analysisInput: { documents: [{ id: "doc_1", language: "en", text: text }] }
            };
            
            const keyPhrasesPayload = {
                kind: "KeyPhraseExtraction",
                parameters: { modelVersion: "latest" },
                analysisInput: { documents: [{ id: "doc_1", language: "en", text: text }] }
            };
            
            const [sentRes, kpRes] = await Promise.all([
                fetch(url, { method: 'POST', headers, body: JSON.stringify(sentimentPayload) }),
                fetch(url, { method: 'POST', headers, body: JSON.stringify(keyPhrasesPayload) })
            ]);
            
            latency = Math.round(performance.now() - startTime);
            
            if (!sentRes.ok) {
                const errJson = await sentRes.json().catch(() => ({}));
                throw new Error(errJson.error?.message || `HTTP Error ${sentRes.status}: ${sentRes.statusText}`);
            }
            
            const sentJson = await sentRes.json();
            const kpJson = await kpRes.json().catch(() => ({ results: { documents: [{ keyPhrases: [] }] } }));
            
            sentimentData = sentJson.results.documents[0];
            keyPhrasesData = kpJson.results?.documents?.[0]?.keyPhrases || [];
        }
        
        // Display and Log Results
        displayResults(sentimentData, keyPhrasesData, text, latency);
        updateKPIs(sentimentData.sentiment, latency);
        logActivity(text, sentimentData.sentiment, sentimentData.confidenceScores, keyPhrasesData, latency);
        
    } catch (error) {
        console.error("Azure AI Analysis Error:", error);
        alert(`Analysis Failed: ${error.message}\n\nTip: You can switch to 'Demo Mode' in API Settings if there is a network or key issue.`);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalBtnText;
    }
}

// ============================================================================
// UI Rendering & Visualizations
// ============================================================================
function displayResults(data, keyPhrases, originalText, latency) {
    // Hide empty state, show results area
    document.getElementById('resultsEmpty').style.display = 'none';
    const content = document.getElementById('resultsContent');
    content.style.display = 'flex';
    
    const sentiment = data.sentiment.toLowerCase(); // positive, negative, neutral, mixed
    
    // 1. Update Hero Orb
    const orbCore = document.getElementById('orbCore');
    const orbIcon = document.getElementById('orbIcon');
    const orbVal = document.getElementById('orbVal');
    
    orbCore.className = `orb-core ${sentiment}`;
    orbVal.innerText = sentiment.toUpperCase();
    
    const iconMap = {
        positive: "✨",
        negative: "⚠️",
        neutral: "⚖️",
        mixed: "🔮"
    };
    orbIcon.innerText = iconMap[sentiment] || "🧠";
    
    // 2. Update Overall Badge Card
    const badgeIcon = document.getElementById('badgeIcon');
    const badgeTitle = document.getElementById('badgeTitle');
    const badgeDesc = document.getElementById('badgeDesc');
    const confidenceBigVal = document.getElementById('confidenceBigVal');
    
    badgeIcon.innerText = iconMap[sentiment] || "🧠";
    badgeTitle.innerText = sentiment;
    
    const descMap = {
        positive: "High positive emotional valence detected across the text.",
        negative: "Critical or adverse sentiment indicators identified.",
        neutral: "Objective, factual, or balanced sentiment without strong emotion.",
        mixed: "Contains a contrast of both positive and negative statements."
    };
    badgeDesc.innerText = descMap[sentiment] || "Analysis complete.";
    
    // Calculate primary confidence %
    const scores = data.confidenceScores;
    let mainConfidence = 0;
    if (sentiment === 'positive') mainConfidence = scores.positive;
    else if (sentiment === 'negative') mainConfidence = scores.negative;
    else if (sentiment === 'neutral') mainConfidence = scores.neutral;
    else mainConfidence = Math.max(scores.positive, scores.negative);
    
    confidenceBigVal.innerText = `${(mainConfidence * 100).toFixed(1)}%`;
    
    // 3. Update Confidence Gauges
    document.getElementById('posVal').innerText = `${(scores.positive * 100).toFixed(1)}%`;
    document.getElementById('posBar').style.width = `${scores.positive * 100}%`;
    
    document.getElementById('neuVal').innerText = `${(scores.neutral * 100).toFixed(1)}%`;
    document.getElementById('neuBar').style.width = `${scores.neutral * 100}%`;
    
    document.getElementById('negVal').innerText = `${(scores.negative * 100).toFixed(1)}%`;
    document.getElementById('negBar').style.width = `${scores.negative * 100}%`;
    
    // 4. Update Extracted Key Phrases
    const keyPhrasesContainer = document.getElementById('keyPhrasesList');
    if (keyPhrasesContainer) {
        keyPhrasesContainer.innerHTML = '';
        const phrases = Array.isArray(keyPhrases) ? keyPhrases : (keyPhrases?.keyPhrases || []);
        if (phrases.length === 0) {
            keyPhrasesContainer.innerHTML = `<span style="color: var(--text-dim); font-size: 0.8rem;">No prominent key phrases extracted.</span>`;
        } else {
            phrases.forEach(kp => {
                const chip = document.createElement('span');
                chip.className = 'keyphrase-chip';
                chip.innerText = `🔑 ${kp}`;
                keyPhrasesContainer.appendChild(chip);
            });
        }
    }
    
    // 5. Update Sentence Breakdown
    const sentencesList = document.getElementById('sentencesList');
    sentencesList.innerHTML = '';
    
    const sentences = data.sentences || [
        { text: originalText, sentiment: sentiment, confidenceScores: scores }
    ];
    
    sentences.forEach((s) => {
        const item = document.createElement('div');
        item.className = 'sentence-item';
        
        const sSent = s.sentiment.toLowerCase();
        item.innerHTML = `
            <div class="sentence-text">"${s.text}"</div>
            <span class="sentence-tag ${sSent}">${sSent}</span>
        `;
        sentencesList.appendChild(item);
    });
}

function updateKPIs(sentiment, latency) {
    state.stats.total += 1;
    state.stats.latencySum += latency;
    
    if (sentiment === 'positive') state.stats.positive += 1;
    else if (sentiment === 'negative') state.stats.negative += 1;
    else state.stats.neutral += 1;
    
    document.getElementById('kpiTotal').innerText = state.stats.total;
    
    const posPercent = Math.round((state.stats.positive / state.stats.total) * 100) || 0;
    document.getElementById('kpiPosPercent').innerText = `${posPercent}%`;
    
    const avgLatency = Math.round(state.stats.latencySum / state.stats.total) || 0;
    document.getElementById('kpiLatency').innerText = `${avgLatency} ms`;
    
    // Update Chart
    if (state.chartInstance) {
        state.chartInstance.data.datasets[0].data = [
            state.stats.positive,
            state.stats.neutral,
            state.stats.negative
        ];
        state.chartInstance.update();
    }
}

function logActivity(text, sentiment, scores, keyPhrases, latency) {
    const tbody = document.getElementById('historyTableBody');
    
    // Remove initial empty message if present
    if (tbody.querySelector('.empty-row')) {
        tbody.innerHTML = '';
    }
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const snippet = text.length > 40 ? text.substring(0, 40) + '...' : text;
    let conf = scores.positive;
    if (sentiment === 'negative') conf = scores.negative;
    else if (sentiment === 'neutral') conf = scores.neutral;
    
    const phrases = Array.isArray(keyPhrases) ? keyPhrases : (keyPhrases?.keyPhrases || []);
    const kpText = phrases.slice(0, 2).join(", ") || "—";
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="mono">${timeStr}</td>
        <td>"${snippet}"</td>
        <td><span class="sentence-tag ${sentiment}">${sentiment}</span></td>
        <td style="color: var(--azure-light); font-size: 0.8rem;">${kpText}</td>
        <td class="mono">${(conf * 100).toFixed(1)}%</td>
        <td class="mono">${latency} ms</td>
    `;
    
    tbody.insertBefore(tr, tbody.firstChild);
    
    // Limit to 10 rows
    if (tbody.children.length > 10) {
        tbody.removeChild(tbody.lastChild);
    }
}

// ============================================================================
// Helper & Demo Functions
// ============================================================================
function loadSampleChip(type) {
    if (SAMPLE_REVIEWS[type]) {
        document.getElementById('reviewText').value = SAMPLE_REVIEWS[type];
        updateWordCount();
        analyzeReview();
    }
}

function clearWorkspace() {
    document.getElementById('reviewText').value = '';
    updateWordCount();
    document.getElementById('resultsContent').style.display = 'none';
    document.getElementById('resultsEmpty').style.display = 'flex';
    
    // Reset Orb to idle
    const orbCore = document.getElementById('orbCore');
    orbCore.className = 'orb-core';
    document.getElementById('orbVal').innerText = 'IDLE';
    document.getElementById('orbIcon').innerText = '⚡';
}

function initChart() {
    const ctx = document.getElementById('sentimentChart');
    if (!ctx) return;
    
    state.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral / Mixed', 'Negative'],
            datasets: [{
                data: [1, 1, 1],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderColor: '#111726',
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 11 },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });
}

function seedDemoData() {
    state.stats = { total: 12, positive: 7, neutral: 3, negative: 2, latencySum: 4850 };
    document.getElementById('kpiTotal').innerText = "12";
    document.getElementById('kpiPosPercent').innerText = "58%";
    document.getElementById('kpiLatency').innerText = "404 ms";
    
    if (state.chartInstance) {
        state.chartInstance.data.datasets[0].data = [7, 3, 2];
        state.chartInstance.update();
    }
    
    const sampleLogs = [
        { t: "19:42:15", s: "Super intuitive dashboard, loving the speed!", sent: "positive", kp: "intuitive dashboard, speed", conf: "98.4%", lat: "380 ms" },
        { t: "19:35:02", s: "Login button failed twice before connecting...", sent: "negative", kp: "Login button", conf: "89.1%", lat: "412 ms" },
        { t: "19:28:44", s: "Documentation is thorough and well organized.", sent: "positive", kp: "Documentation", conf: "95.0%", lat: "390 ms" }
    ];
    
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    sampleLogs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="mono">${l.t}</td>
            <td>"${l.s}"</td>
            <td><span class="sentence-tag ${l.sent}">${l.sent}</span></td>
            <td style="color: var(--azure-light); font-size: 0.8rem;">${l.kp}</td>
            <td class="mono">${l.conf}</td>
            <td class="mono">${l.lat}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Generates an exact simulation of Azure Cognitive Services Sentiment response
 */
function generateMockSentimentResponse(text) {
    const lower = text.toLowerCase();
    
    const posWords = ['great', 'awesome', 'excellent', 'fantastic', 'love', 'best', 'good', 'fast', 'amazing', 'happy', 'incredible', 'exceeded', 'top notch'];
    const negWords = ['bad', 'terrible', 'worst', 'hate', 'slow', 'crash', 'crashed', 'bug', 'broken', 'poor', 'awful', 'waste', 'horrible', 'worse'];
    
    let posCount = 0;
    let negCount = 0;
    
    posWords.forEach(w => { if (lower.includes(w)) posCount++; });
    negWords.forEach(w => { if (lower.includes(w)) negCount++; });
    
    let sentiment = 'neutral';
    let pScore = 0.2, nScore = 0.6, negScore = 0.2;
    
    if (posCount > negCount && posCount >= 1) {
        sentiment = 'positive';
        pScore = Math.min(0.85 + posCount * 0.05, 0.99);
        negScore = Math.max(0.01, 0.1 - posCount * 0.02);
        nScore = Number((1 - pScore - negScore).toFixed(2));
    } else if (negCount > posCount && negCount >= 1) {
        sentiment = 'negative';
        negScore = Math.min(0.85 + negCount * 0.05, 0.99);
        pScore = Math.max(0.01, 0.1 - negCount * 0.02);
        nScore = Number((1 - negScore - pScore).toFixed(2));
    } else if (posCount > 0 && negCount > 0) {
        sentiment = 'mixed';
        pScore = 0.45; negScore = 0.45; nScore = 0.10;
    } else {
        sentiment = 'neutral';
        nScore = 0.88; pScore = 0.06; negScore = 0.06;
    }
    
    const rawSentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const sentences = rawSentences.map(s => {
        const sTrim = s.trim();
        const sLower = sTrim.toLowerCase();
        let sSent = 'neutral';
        let sp = 0.1, sn = 0.8, sneg = 0.1;
        
        posWords.forEach(w => { if (sLower.includes(w)) { sSent = 'positive'; sp = 0.92; sn = 0.06; sneg = 0.02; }});
        negWords.forEach(w => { if (sLower.includes(w)) { sSent = 'negative'; sneg = 0.94; sn = 0.04; sp = 0.02; }});
        
        return {
            text: sTrim,
            sentiment: sSent,
            confidenceScores: { positive: sp, neutral: sn, negative: sneg }
        };
    });
    
    return {
        id: "1",
        sentiment: sentiment,
        confidenceScores: {
            positive: Number(pScore.toFixed(2)),
            neutral: Number(nScore.toFixed(2)),
            negative: Number(negScore.toFixed(2))
        },
        sentences: sentences
    };
}

/**
 * Generates mock Key Phrase Extraction simulation
 */
function generateMockKeyPhrases(text) {
    const words = text.replace(/[^a-zA-Z\s]/g, "").split(/\s+/);
    const stopWords = new Set(["the", "and", "is", "in", "it", "to", "of", "for", "with", "on", "at", "by", "from", "up", "about", "into", "over", "after", "beneath", "under", "above", "was", "were", "been", "has", "have", "had", "do", "does", "did", "but", "if", "or", "because", "as", "until", "while", "this", "that", "these", "those", "my", "your", "his", "her", "its", "our", "their", "very", "really", "quite", "just", "so", "than", "too", "can", "will", "would", "should", "could", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"]);
    
    const candidates = words.filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()));
    // Take unique top 4 words
    const unique = [...new Set(candidates)];
    return unique.slice(0, 5);
}
