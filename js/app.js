/**
 * ==========================================
 * MASTERCLASS DUAL-API SPA FRONTEND ENGINE
 * ==========================================
 * Features: Dynamic Injection, Zero-Delay Routing, Robust Timers, Chart Generation
 */

const CONFIG = {
    // 🎯 INSERT YOUR API URLS HERE:
    GAS_API_URL: "https://script.google.com/macros/s/YOUR_GAS_ID/exec?key=WAKIL_MASTER_KEY_2026", 
    RENDER_API_URL: "https://bnb-faucet-bot.onrender.com/api/status",
    FRONTEND_SECRET_KEY: "WAKIL_MASTER_KEY_2026"
};

const app = {
    state: {
        liveBots: {},      // Data from Render
        historyData: [],   // Data from Google Apps Script
        timers: {},        // Stores JS setInterval IDs to prevent memory leaks
        chartInstance: null
    },

    init() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        
        // Initial Fetch
        this.fetchDualData();
        
        // Background Auto-Refresh (Live Stats: Every 60s, History: Every 5 mins)
        setInterval(() => this.fetchLiveStats(true), 60000);
        setInterval(() => this.fetchHistoryData(), 300000);

        // Listen for SPA Navigation
        window.addEventListener('hashchange', () => this.handleRoute());
    },

    updateClock() {
        document.getElementById('live-clock').innerText = new Date().toLocaleTimeString('en-US', { hour12: false });
    },

    async fetchDualData() {
        this.renderSkeletons();
        await Promise.all([this.fetchLiveStats(), this.fetchHistoryData()]);
        this.handleRoute(); // Render the screen after fetching
    },

    // --- API 1: LIVE BOT STATS (RENDER) ---
    async fetchLiveStats(isSilent = false) {
        try {
            const response = await fetch(CONFIG.RENDER_API_URL, {
                method: 'GET',
                headers: { 'Authorization': CONFIG.FRONTEND_SECRET_KEY, 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error("Render API Error");
            
            const json = await response.json();
            if (json.success && json.data) {
                this.state.liveBots = json.data;
                document.getElementById('last-updated-text').innerText = `Live Sync: ${new Date().toLocaleTimeString()}`;
                
                // If a background refresh happens while on dashboard, re-render
                if (isSilent && window.location.hash === '') this.renderDashboard();
                if (isSilent && window.location.hash.includes('#bot-')) this.handleRoute(); 
            }
        } catch (error) {
            console.error("Live Stats Fetch Failed:", error);
        }
    },

    // --- API 2: HISTORICAL DATA (GAS) ---
    async fetchHistoryData() {
        try {
            const response = await fetch(CONFIG.GAS_API_URL);
            const json = await response.json();
            if (json.success && json.history) {
                this.state.historyData = json.history;
            }
        } catch (error) {
            console.error("History Fetch Failed:", error);
        }
    },

    // --- ROUTING LOGIC ---
    handleRoute() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#bot-')) {
            const botId = hash.replace('#bot-', '');
            this.showDetailView(botId);
        } else {
            this.renderDashboard();
        }
    },

    goHome() {
        window.location.hash = '';
    },

    // --- VIEW 1: MAIN DASHBOARD ---
    renderDashboard() {
        document.getElementById('view-detail').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
        
        const botKeys = Object.keys(this.state.liveBots);
        
        // 1. Update Hero Stats
        document.getElementById('stat-total').innerText = botKeys.length || "-";
        
        let errorCount = 0;
        botKeys.forEach(k => {
            const status = this.state.liveBots[k].status.toLowerCase();
            if (status.includes('fail') || status.includes('error') || status.includes('crash')) errorCount++;
        });
        document.getElementById('stat-down').innerText = errorCount;
        document.getElementById('global-status-dot').className = `h-2 w-2 rounded-full ${errorCount > 0 ? 'bg-crimson pulse-red' : 'bg-emerald pulse-green'}`;

        // Calculate Average Ping from History
        const validPings = this.state.historyData.filter(h => h.ping > 0).map(h => h.ping);
        const avgPing = validPings.length ? Math.round(validPings.reduce((a, b) => a + b, 0) / validPings.length) : 0;
        document.getElementById('stat-ping').innerText = avgPing > 0 ? `${avgPing} ms` : "-- ms";

        // 2. Render Dynamic Grid Cards
        const grid = document.getElementById('monitors-grid');
        grid.innerHTML = '';

        botKeys.forEach(botId => {
            const botData = this.state.liveBots[botId];
            
            // Determine Colors based on Status
            const statusText = botData.status.toUpperCase();
            let dotClass = "bg-yellow-400 pulse-yellow";
            let borderColor = "hover:border-yellow-400";
            
            if (statusText.includes("SLEEPING") || statusText.includes("ONLINE")) {
                dotClass = "bg-emerald pulse-green";
                borderColor = "hover:border-cyan";
            } else if (statusText.includes("ERROR") || statusText.includes("FAIL")) {
                dotClass = "bg-crimson pulse-red";
                borderColor = "hover:border-crimson border-crimson";
            }

            // Create Card HTML
            const card = document.createElement('div');
            card.className = `glass rounded-xl p-6 relative overflow-hidden group border border-gray-700 ${borderColor} transition-all cursor-pointer`;
            card.onclick = () => window.location.hash = `#bot-${botId}`;
            
            card.innerHTML = `
                <div class="absolute -top-10 -right-10 w-32 h-32 bg-cyan opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-all"></div>
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <img src="https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=029" alt="Logo" class="w-8 h-8">
                        <h3 class="font-bold text-xl tracking-wide group-hover:text-cyan transition-colors">${botId.replace('_', ' ').toUpperCase()}</h3>
                    </div>
                    <div class="flex items-center gap-2 bg-slate px-3 py-1 rounded-full border border-gray-600">
                        <div class="h-2 w-2 rounded-full ${dotClass}"></div>
                        <span class="text-xs font-bold tracking-wider">${statusText}</span>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-6 border-t border-gray-700 pt-4">
                    <div>
                        <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Live Balance</p>
                        <p class="text-xl font-mono font-bold text-yellow-500">${botData.balance}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Next Claim</p>
                        <p class="text-xl font-mono font-bold" id="timer-dash-${botId}">--:--</p>
                    </div>
                </div>
            `;
            grid.appendChild(card);
            
            // Start the independent timer for this card
            this.startCountdownEngine(botData.next_claim_timestamp, `timer-dash-${botId}`, botId);
        });
    },

    // --- VIEW 2: DETAILED BOT VIEW ---
    showDetailView(botId) {
        const botData = this.state.liveBots[botId];
        if (!botData) return this.goHome();

        document.getElementById('view-dashboard').classList.add('hidden');
        document.getElementById('view-detail').classList.remove('hidden');

        // Populate Top Info
        document.getElementById('detail-title').innerText = botId.replace('_', ' ').toUpperCase();
        document.getElementById('detail-level').innerText = `Level: ${botData.level}`;
        document.getElementById('detail-balance').innerText = botData.balance;
        document.getElementById('detail-last-check').innerText = botData.last_update;

        // Status Badge Styling
        const badge = document.getElementById('detail-status-badge');
        const statusText = botData.status.toUpperCase();
        badge.innerText = statusText;
        
        if (statusText.includes("SLEEPING") || statusText.includes("ONLINE")) {
            badge.className = "px-4 py-2 rounded-full font-bold text-sm tracking-wide bg-emerald bg-opacity-20 text-emerald";
        } else if (statusText.includes("ERROR") || statusText.includes("FAIL")) {
            badge.className = "px-4 py-2 rounded-full font-bold text-sm tracking-wide bg-crimson bg-opacity-20 text-crimson";
        } else {
            badge.className = "px-4 py-2 rounded-full font-bold text-sm tracking-wide bg-yellow-400 bg-opacity-20 text-yellow-400";
        }

        // Setup Timer for Detail View
        this.startCountdownEngine(botData.next_claim_timestamp, 'detail-timer', `detail_${botId}`);

        // Setup Chart & Avg Ping
        const validPings = this.state.historyData.filter(h => h.ping > 0).map(h => h.ping);
        const avgPing = validPings.length ? Math.round(validPings.reduce((a, b) => a + b, 0) / validPings.length) : 0;
        document.getElementById('detail-avg-ping').innerText = avgPing > 0 ? `${avgPing} ms` : "-- ms";

        this.renderChart(this.state.historyData);
    },

    // --- ROBUST TIMER ENGINE (0% Server Load) ---
    startCountdownEngine(targetUnix, elementId, timerKey) {
        // Clear previous interval for this specific key to prevent memory leaks
        if (this.state.timers[timerKey]) clearInterval(this.state.timers[timerKey]);
        
        const timerEl = document.getElementById(elementId);
        if (!timerEl) return;
        timerEl.classList.remove('text-emerald', 'text-cyan');

        if (targetUnix <= 0) {
            timerEl.innerText = "READY 🚀";
            timerEl.classList.add('text-emerald');
            return;
        }

        this.state.timers[timerKey] = setInterval(() => {
            const nowUnix = Math.floor(Date.now() / 1000);
            const diff = targetUnix - nowUnix;

            // Failsafe: Re-check if element still exists (in case view changed)
            const el = document.getElementById(elementId);
            if (!el) {
                clearInterval(this.state.timers[timerKey]);
                return;
            }

            if (diff <= 0) {
                el.innerText = "CLAIMING... ⚙️";
                el.classList.add('text-cyan');
                clearInterval(this.state.timers[timerKey]);
            } else {
                const m = Math.floor(diff / 60).toString().padStart(2, '0');
                const s = (diff % 60).toString().padStart(2, '0');
                el.innerText = `${m}m ${s}s`;
            }
        }, 1000);
    },

    // --- CHART.JS RENDERER ---
    renderChart(historyData) {
        const ctx = document.getElementById('pingChart').getContext('2d');
        if (this.state.chartInstance) {
            this.state.chartInstance.destroy(); // Fixes "Canvas already in use" bug
        }

        if (!historyData || historyData.length === 0) return;

        const labels = historyData.map(h => h.time);
        const data = historyData.map(h => h.ping);

        this.state.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Server Ping (ms)',
                    data: data,
                    borderColor: '#06B6D4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#0F172A',
                    pointBorderColor: '#06B6D4'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' }, beginAtZero: true },
                    x: { grid: { display: false }, ticks: { color: '#94A3B8' } }
                }
            }
        });
    },

    renderSkeletons() {
        const grid = document.getElementById('monitors-grid');
        grid.innerHTML = '';
        for(let i=0; i<2; i++) {
            grid.innerHTML += `<div class="glass rounded-xl p-6 h-40 animate-pulse bg-slate-800 border border-gray-700"></div>`;
        }
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => app.init());
