// --- SUPABASE SETUP ---
const SUPABASE_URL = 'https://osuwkjjxrcdaacegrvaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdXdramp4cmNkYWFjZWdydmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODEzMDUsImV4cCI6MjA4NjY1NzMwNX0.2DUfrPvaNg3KYv9pT24vdUkbrGBebhzOTvAeLekRxUs';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;
// NOTE: Table name changed from 'products' to 'consignments'

// --- GLOBAL STATE ---
let allProductEvents = [];
let mapInstance = null;
let chartInstance = null;
let activityChartInstance = null;
let mapMarkers = [];

// --- OPEN STREET MAP / LEAFLET CONFIG ---
// Using free CartoDB Dark Matter tiles for the dark theme
const TILE_LAYER = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// --- DOM ELEMENTS ---
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');
const registerForm = document.getElementById('registerProductForm');
const updateStatusForm = document.getElementById('updateStatusForm');    // --- RETAILER PORTAL: Record Delivery ---
const recordDeliveryForm = document.getElementById('recordDeliveryForm');
if (recordDeliveryForm) {
    recordDeliveryForm.addEventListener('submit', async e => {
        e.preventDefault();
        toggleSpinner(recordDeliveryForm, true);

        const consignmentId  = document.getElementById('delivery_product_id').value;
        const consumerName   = document.getElementById('consumer_name').value;
        const retailerAddr   = (document.getElementById('retailer_deliver_address')?.value || '').trim();

        if (!consignmentId || !consumerName) {
            showToast('Please enter Consignment ID and Consumer Name.', true);
            toggleSpinner(recordDeliveryForm, false);
            return;
        }

        // Generate on-chain hash via SupplyChainTracker contract (or demo hash)
        const deliveryHash = await Web3Service.logTransfer(
            consignmentId,
            retailerAddr || consumerName,
            'retailer-to-consumer',
            `Delivered to: ${consumerName}`
        );

        // Update Supabase — also save payment details from lookup
        const lookupData = window._lookupConsignment || {};
        const { data, error } = await supabaseClient
            .from('consignments')
            .update({
                "delivered_to":       consumerName,
                "delivery_timestamp": new Date().toISOString(),
                "delivery_hash":      deliveryHash,
                "sell_by":            retailerAddr || 'Retailer',
                "total_payable_inr":  lookupData.totalPayable || null,
                "transfer_fee_inr":   lookupData.transferFee  || null
            })
            .eq('consignment_id', consignmentId);

        if (error) {
            showToast(`Error: ${error.message}`, true);
            console.error(error);
        } else {
            showToast(`Delivery Recorded! Hash: ${deliveryHash.substring(0, 10)}...`, false);
            recordDeliveryForm.reset();
            await fetchAndRenderProducts();
        }
        toggleSpinner(recordDeliveryForm, false);
    });
}

// --- RETAILER: Consignment Lookup & Payment ---
(function initRetailerLookup() {
    const lookupBtn   = document.getElementById('retailer_lookup_btn');
    const lookupInput = document.getElementById('retailer_lookup_id');
    if (!lookupBtn || !lookupInput) return;

    // helper: set text content safely
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };

    // Stage label map
    const stageLabel = (p) => {
        if (p.delivered_to && p.delivered_to !== 'Pending') return { text: 'Delivered ✓', cls: 'text-green-400' };
        if ((p.sell_by && p.sell_by !== 'Pending') || (p.transferred_to && p.transferred_to !== 'Pending'))
            return { text: 'In Transit', cls: 'text-yellow-400' };
        return { text: 'Registered', cls: 'text-sky-400' };
    };

    lookupBtn.addEventListener('click', async () => {
        const id = lookupInput.value.trim();
        if (!id) { showToast('Please enter a Consignment ID.', true); return; }

        // toggle loading state
        lookupBtn.disabled = true;
        lookupBtn.textContent = 'Fetching...';

        const resultDiv   = document.getElementById('retailer_lookup_result');
        const notFoundDiv = document.getElementById('retailer_lookup_notfound');
        resultDiv.classList.add('hidden');
        notFoundDiv.classList.add('hidden');

        // Query Supabase
        const { data, error } = await supabaseClient
            .from('consignments')
            .select('*')
            .eq('consignment_id', id)
            .maybeSingle();

        lookupBtn.disabled = false;
        lookupBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg> Fetch Details`;

        if (error || !data) {
            // Also try from in-memory data (dummy / offline mode)
            const offline = (window.allProductEvents || []).find(p =>
                (p.consignment_id || '').toLowerCase() === id.toLowerCase()
            );
            if (!offline) {
                notFoundDiv.classList.remove('hidden');
                return;
            }
            return populateLookup(offline);
        }
        populateLookup(data);
    });

    function populateLookup(p) {
        // Parse stored detail for unit price — stored as 'product_detail' text
        // Unit price stored in security_fee_inr or we derive from product_detail pattern "Qty x Price"
        const unitPrice   = parseFloat(p.unit_price_inr || p.security_fee_inr || 1000);
        const qty         = parseInt(p.quantity) || 1;
        const transferFee = Math.round((window.ethInrRate || 250000) * 0.0005);
        const subtotal    = unitPrice * qty;
        const totalPayable = subtotal + transferFee;

        // Store on window so delivery handler can save it
        window._lookupConsignment = { ...p, totalPayable, transferFee };

        // Populate detail cards
        setEl('lk-id',      p.consignment_id);
        setEl('lk-type',    p.product_type);
        setEl('lk-detail',  p.product_detail);
        setEl('lk-qty',     qty);
        setEl('lk-mfr',     p.created_by);
        setEl('lk-retailer', p.retailer_address || '—');
        setEl('lk-invoice', p.invoice_id || '—');

        const stg = stageLabel(p);
        const stageEl = document.getElementById('lk-stage');
        if (stageEl) { stageEl.textContent = stg.text; stageEl.className = `text-sm font-semibold ${stg.cls}`; }

        // Payment breakdown
        setEl('lk-unit-price',  unitPrice.toLocaleString('en-IN'));
        setEl('lk-qty-summary', qty);
        setEl('lk-transfer-fee', transferFee.toLocaleString('en-IN'));
        setEl('lk-total',       totalPayable.toLocaleString('en-IN'));

        // Auto-fill the delivery form
        const deliveryIdEl = document.getElementById('delivery_product_id');
        if (deliveryIdEl) deliveryIdEl.value = p.consignment_id;

        const retailerDeliverEl = document.getElementById('retailer_deliver_address');
        if (retailerDeliverEl && p.retailer_address) retailerDeliverEl.value = p.retailer_address;

        // Show result
        document.getElementById('retailer_lookup_result').classList.remove('hidden');
    }

    // Allow Enter key on input
    lookupInput.addEventListener('keydown', e => { if (e.key === 'Enter') lookupBtn.click(); });
})();

// --- RETAILER PORTAL: Record Delivery ---

const verifyProductForm = document.getElementById('verifyProductForm');
const modal = document.getElementById('productModal');
const copyIdButton = document.getElementById('copyIdButton');
const modalProductId = document.getElementById('modalProductId');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

async function initApp() {
    const overlay = document.getElementById('initOverlay');
    const getProgress = () => document.getElementById('initProgress');
    const getLog = () => document.getElementById('initLog');

    if (!overlay) return;

    const safetyTimeout = setTimeout(() => {
        if (overlay.style.display !== 'none') {
            console.warn("Forcing overlay removal due to timeout.");
            overlay.style.display = 'none';
        }
    }, 8000);

    try {
        const steps = [
            { msg: "Initializing VeriChain Core 2.0...", time: 800 },
            { msg: "Connecting to Supabase Cloud...", time: 1200 },
            { msg: "Syncing Schema Definitions...", time: 600 },
            { msg: "Verifying Integrity...", time: 1000 },
            { msg: "System Ready.", time: 200 }
        ];

        let currentProgress = 0;
        const stepSize = 100 / steps.length;
        const log = getLog();
        const progress = getProgress();

        for (const step of steps) {
            if (log) {
                const p = document.createElement('p');
                p.textContent = `> ${step.msg}`;
                p.className = 'typewriter-cursor';
                log.appendChild(p);
                log.scrollTop = log.scrollHeight;
            }

            await new Promise(r => setTimeout(r, step.time));

            if (log && log.lastElementChild) {
                log.lastElementChild.classList.remove('typewriter-cursor');
            }

            if (progress) {
                currentProgress += stepSize;
                progress.style.width = `${currentProgress}%`;
            }
        }

        await fetchAndRenderProducts();

    } catch (err) {
        console.error("Init Error:", err);
    } finally {
        clearTimeout(safetyTimeout);
        overlay.classList.add('opacity-0', 'pointer-events-none', 'transition-opacity', 'duration-500');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
}

async function fetchAndRenderProducts() {
    // Query the new 'consignments' table
    let { data, error } = await supabaseClient.from('consignments').select('*');
    if (error) {
        showToast('Error fetching consignments. Loading offline mode...', true);
        console.error(error);
        data = [];
    }

    if (!data || data.length < 5) {
        console.log("Loading dummy data for demonstration...");
        const dummyData = generateDummyData();
        data = [...(data || []), ...dummyData];
    }

    allProductEvents = data || [];
    renderRegisteredProducts();

    if (document.querySelector('.tab-btn[data-tab="dashboard"]').classList.contains('tab-active')) {
        renderDashboard();
    }
}

// --- DASHBOARD UPGRADES ---
function renderBlockchainStats() {
    const blockHeight = 18293400 + Math.floor(Math.random() * 50);
    const gasPrice = (Math.random() * 10 + 15).toFixed(1);
    const avgBlockTime = (12 + Math.random() * 2).toFixed(2);

    const statsContainer = document.getElementById('blockchainStatsRow');
    if (statsContainer) {
        // ... (Existing blockchain stats HTML generation is fine to keep conceptual) ...
        statsContainer.innerHTML = `
            <div class="card p-4 flex items-center justify-between">
                <div>
                    <p class="text-slate-400 text-xs uppercase font-semibold">Block Height</p>
                    <p class="text-xl font-bold text-white font-mono">#${blockHeight.toLocaleString()}</p>
                </div>
                <div class="p-2 bg-indigo-900/30 rounded-lg text-indigo-400">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </div>
            </div>
            <div class="card p-4 flex items-center justify-between">
                <div>
                    <p class="text-slate-400 text-xs uppercase font-semibold">Gas Price (Gwei)</p>
                    <p class="text-xl font-bold text-white font-mono">${gasPrice}</p>
                </div>
                <div class="p-2 bg-pink-900/30 rounded-lg text-pink-400">
                     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
            </div>
            <div class="card p-4 flex items-center justify-between">
                <div>
                    <p class="text-slate-400 text-xs uppercase font-semibold">Avg Block Time</p>
                    <p class="text-xl font-bold text-white font-mono">${avgBlockTime}s</p>
                </div>
                <div class="p-2 bg-teal-900/30 rounded-lg text-teal-400">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
            </div>
         `;
    }
}

function generateDummyData() {
    const creators = ['EpsilonCo', 'AlphaInd', 'OmegaCorp', 'ZetaSupply'];
    const types = ['Electronics', 'Pharmaceuticals', 'Auto Parts', 'Luxury Goods'];
    const retailerAddrs = ['0xABC1...def2', 'RetailerNorth', '0x9fE3...a1b2', 'RetailerSouth'];

    const locations = [
        { lat: 19.0760, lon: 72.8777 }, { lat: 28.6139, lon: 77.2090 },
        { lat: 12.9716, lon: 77.5946 }, { lat: 13.0827, lon: 80.2707 }
    ];

    const dummy = [];
    const now = Date.now();

    for (let i = 0; i < 20; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const id_val = `CSG-${Math.floor(1000 + Math.random() * 9000)}`;
        const creator = creators[Math.floor(Math.random() * creators.length)];
        const loc = locations[Math.floor(Math.random() * locations.length)];
        const retailerAddr = retailerAddrs[Math.floor(Math.random() * retailerAddrs.length)];
        const hasTransfer = Math.random() > 0.5;
        const hasSell     = Math.random() > 0.5;
        const hasDelivery = Math.random() > 0.8;

        const timeOffset = Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);
        const createdTime = new Date(now - timeOffset).toISOString();
        const demoHash = () => `0x${Array(64).fill(0).map(() => Math.floor(Math.random()*16).toString(16)).join('')}`;

        const timestamp = Date.now();
        const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

        dummy.push({
            "consignment_id":      id_val,
            "invoice_id":          `INV-VRC-${timestamp}-${randSuffix}`,
            "product_type":        type,
            "product_detail":      `High-quality ${type} consignment.`,
            "quantity":            Math.floor(Math.random() * 200) + 10,
            "created_by":          creator,
            "retailer_address":    retailerAddr,
            "security_fee_inr":    Math.round((window.ethInrRate || 250000) * 0.001),
            "transferred_to":      hasTransfer ? "Logistics-A" : 'Pending',
            "transfer_timestamp":  hasTransfer ? new Date(now - timeOffset + 100000).toISOString() : null,
            "transfer_hash":       hasTransfer ? demoHash() : null,
            "sell_by":             hasSell ? retailerAddr : 'Pending',
            "sell_timestamp":      hasSell ? new Date(now - timeOffset + 200000).toISOString() : null,
            "sell_hash":           hasSell ? demoHash() : null,
            "delivered_to":        hasDelivery ? "Customer-Z" : 'Pending',
            "delivery_timestamp":  hasDelivery ? new Date(now - timeOffset + 300000).toISOString() : null,
            "delivery_hash":       hasDelivery ? demoHash() : null,
            "created_at":          createdTime,
            // client-side visual helpers for map
            _visual_lat: loc.lat + (Math.random() * 0.1),
            _visual_lon: loc.lon + (Math.random() * 0.1)
        });
    }
    return dummy;
}

// --- UI LOGIC & HELPERS ---
function toggleSpinner(form, show) {
    const button = form.querySelector('.submit-button');
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.spinner');

    if (show) {
        button.disabled = true;
        buttonText.style.opacity = '0';
        spinner.classList.remove('hidden');
    } else {
        setTimeout(() => {
            button.disabled = false;
            buttonText.style.opacity = '1';
            spinner.classList.add('hidden');
        }, 300);
    }
}

function switchTab(tabName) {
    tabs.forEach(tab => {
        const tabButton = tab;
        if (tabButton.dataset.tab === tabName) {
            tabButton.classList.add('tab-active');
            tabButton.classList.remove('text-slate-500');
        } else {
            tabButton.classList.remove('tab-active');
            tabButton.classList.add('text-slate-500');
        }
    });
    contents.forEach(content => {
        if (content.id === tabName) {
            content.classList.remove('hidden');
            content.classList.add('fade-in');
            // Force opacity 1 to ensure visibility in case animation fails
            content.style.opacity = '1';
        } else {
            content.classList.add('hidden');
            content.style.opacity = '0';
        }
    });

    if (tabName === 'dashboard') {
        renderDashboard();
        setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 300);
    } else if (tabName === 'logistics') {
        renderLogisticsOverview();
    } else if (tabName === 'retailer') {
        renderRetailerOverview();
    }
}

function renderLogisticsOverview() {
    const list = document.getElementById('logisticsRecentList');
    const shipments = allProductEvents.filter(p =>
        p["transferred_to"] && p["transferred_to"] !== 'Pending' && (!p["delivered_to"] || p["delivered_to"] === 'Pending')
    ).slice(0, 5);

    if (shipments.length === 0) {
        list.innerHTML = '<p class="text-slate-500 text-sm">No active shipments found.</p>';
        return;
    }

    list.innerHTML = shipments.map(p => `
        <div class="flex justify-between items-center bg-slate-800/30 p-2 rounded">
            <div>
                <p class="text-xs text-sky-400 font-semibold uppercase">In Transit</p>
                <p class="text-sm text-white font-medium">${p["consignment_id"]}</p>
                <p class="text-xs text-slate-500">To: ${p["transferred_to"]}</p>
            </div>
            <div class="text-right">
                <p class="text-xs text-slate-400">${new Date(p["transfer_timestamp"] || Date.now()).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function renderRetailerOverview() {
    const list = document.getElementById('retailerInventoryList');
    const inventory = allProductEvents.filter(p =>
        p["sell_by"] && p["sell_by"] !== 'Pending'
    ).slice(0, 5);

    if (inventory.length === 0) {
        list.innerHTML = '<p class="text-slate-500 text-sm">No inventory records found.</p>';
        return;
    }

    list.innerHTML = inventory.map(p => `
        <div class="flex justify-between items-center border-b border-slate-700/50 pb-2 last:border-0">
            <div class="flex items-center">
                 <div class="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                 <div>
                    <p class="text-sm text-white">${p["consignment_id"]}</p>
                    <p class="text-xs text-slate-500">${p["created_by"]} · Qty: ${p["quantity"] || '—'}</p>
                 </div>
            </div>
            <span class="text-xs font-mono text-slate-400">${p["product_type"]}</span>
        </div>
    `).join('');
}

function renderDashboard() {
    renderBlockchainStats();

    const totalProducts = allProductEvents.length;

    const shippedCount = allProductEvents.filter(p =>
        (
            (p["transferred_to"] && p["transferred_to"] !== 'Pending') ||
            (p["sell_by"] && p["sell_by"] !== 'Pending')
        ) &&
        (!p["delivered_to"] || p["delivered_to"] === 'Pending')
    ).length;

    const deliveredCount = allProductEvents.filter(p =>
        p["delivered_to"] && p["delivered_to"] !== 'Pending'
    ).length;

    document.getElementById('stat-total').textContent = totalProducts;
    document.getElementById('stat-transit').textContent = shippedCount;
    document.getElementById('stat-delivered').textContent = deliveredCount;

    updateStatusChart(allProductEvents);
    updateMap(allProductEvents);
    renderActivityChart(allProductEvents);
    renderTransactions(allProductEvents);
}

function renderActivityChart(events) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    // ... (Chart logic remains similar, just need timestamp from somewhere) ...
    // Using current time distribution for demo as specific timestamps might be null
    if (activityChartInstance) activityChartInstance.destroy();

    // Simple placeholder chart for now to avoid breaking
    activityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
            datasets: [{
                label: 'Activity',
                data: [5, 12, 8, 15, 20],
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderTransactions(events) {
    const list = document.getElementById('recentTransactionsList');
    const recent = events.slice(0, 10);

    list.innerHTML = recent.map((e, index) => `
        <div class="tx-item mb-2 pb-2 border-b border-slate-800/50 last:border-0" 
             style="animation-delay: ${index * 100}ms">
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-xs font-semibold text-sky-400 bg-sky-900/20 px-2 py-0.5 rounded">Consignment</span>
                    <span class="text-slate-300 text-sm ml-2 font-medium">${e["consignment_id"] || e["Product id"] || '—'}</span>
                </div>
                <span class="text-xs text-slate-500">Just now</span>
            </div>
            <div class="mt-1 flex justify-between items-center">
                <p class="text-xs text-slate-500 font-mono tx-hash truncate w-48 transition-colors hover:text-sky-400 cursor-pointer">
                    ${e["transfer_hash"] || e["delivery_hash"] || e["sell_hash"] || e["Transfer blockchain hash"] || 'Pending...'}
                </p>
            </div>
        </div>
    `).join('');
}

function updateStatusChart(events) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const statusCounts = { 'Registered': 0, 'In Transit': 0, 'Sold': 0, 'Delivered': 0 };

    events.forEach(p => {
        if (p["delivered_to"] && p["delivered_to"] !== 'Pending') {
            statusCounts['Delivered']++;
        } else if (p["transferred_to"] && p["transferred_to"] !== 'Pending') {
            statusCounts['In Transit']++;
        } else if (p["sell_by"] && p["sell_by"] !== 'Pending') {
            statusCounts['Sold']++;
        } else {
            statusCounts['Registered']++;
        }
    });

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#38bdf8', // In Transit (Sky Blue)
                    '#5eead4', // Sold (Teal/Cyan - distinct but thematic)
                    '#10b981', // Delivered (Emerald)
                    '#64748b'  // Registered (Slate)
                ],
                // Remap colors to match keys order: Registered, In Transit, Sold, Delivered? 
                // Wait, Object.values might be insertion order. 
                // Better to map explicitly or ensure init order.
                // Init order: Registered, In Transit, Sold, Delivered.
                // Colors below correspond to: Registered, In Transit, Sold, Delivered.
                backgroundColor: [
                    '#64748b', // Registered (Slate)
                    '#38bdf8', // In Transit (Info Blue)
                    '#818cf8', // Sold (Indigo - distinct)
                    '#34d399'  // Delivered (Soft Green)
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '85%', // Ultra minimalist thin ring
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        usePointStyle: true,
                        boxWidth: 8,
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(56, 189, 248, 0.2)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: true,
                    boxPadding: 4
                }
            }
        }
    });
}

function initMap() {
    if (mapInstance) return;
    mapInstance = L.map('map').setView([20.5937, 78.9629], 4);
    L.tileLayer(TILE_LAYER, { attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 19 }).addTo(mapInstance);
}

function updateMap(events) {
    if (!mapInstance) initMap();
    mapMarkers.forEach(marker => mapInstance.removeLayer(marker));
    mapMarkers = [];

    events.forEach(event => {
        // Use visual lat/lon if available (from dummy generator), otherwise skip
        if (event._visual_lat && event._visual_lon) {
            const circleMarker = L.circleMarker([event._visual_lat, event._visual_lon], {
                radius: 6,
                fillColor: '#38bdf8',
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(mapInstance);

            circleMarker.bindPopup(`
                <div style="color: #0f172a">
                    <b>${event["Product id"]}</b><br>
                    Type: ${event["Product type"]}<br>
                    Creator: ${event["Created by"]}
                </div>
            `);
            mapMarkers.push(circleMarker);
        }
    });
}

function showToast(message, isError = false) {
    // Basic toast implementation
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 text-white py-3 px-6 rounded-lg shadow-lg z-50 transition-all duration-300 ${isError ? 'bg-red-600' : 'bg-slate-800 border border-sky-500'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function openModal(productId) {
    modal.classList.remove('hidden');
    modalProductId.textContent = productId;
    new QRious({
        element: document.getElementById('qrCodeCanvas'),
        value: productId,
        size: 200, foreground: '#0f172a', level: 'H'
    });
}

function closeModal() {
    modal.classList.add('hidden');
}

if (copyIdButton) {
    copyIdButton.addEventListener('click', () => {
        navigator.clipboard.writeText(modalProductId.textContent)
            .then(() => showToast('Copied!'))
            .catch(() => showToast('Failed to copy', true));
    });
}

// --- MANUFACTURER LOGIC ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleSpinner(registerForm, true);

    const consignmentId  = document.getElementById('product_id').value;
    const productType    = document.getElementById('product_type').value;
    const productDetail  = document.getElementById('product_detail').value;
    const quantity       = parseInt(document.getElementById('product_quantity').value) || 1;
    const createdBy      = document.getElementById('created_by').value;
    const retailerAddr   = (document.getElementById('retailer_address')?.value || '').trim();

    // Auto-generate a unique Invoice ID
    const timestamp  = Date.now();
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceId  = `INV-VRC-${timestamp}-${randSuffix}`;

    // Update the invoice preview with the generated ID before submitting
    const invNumEl = document.getElementById('inv-num');
    if (invNumEl) invNumEl.textContent = invoiceId;

    // 1. BLOCKCHAIN: Register consignment on unified SupplyChainTracker contract
    const txHash = await Web3Service.registerProduct(consignmentId, productType, productDetail, createdBy, quantity, invoiceId, retailerAddr);

    if (!txHash || txHash.startsWith("TX-DEMO")) {
        // Demo mode — still proceed with DB insert for demo
        if (!txHash) {
            toggleSpinner(registerForm, false);
            return;
        }
    }

    // 2. Calculate INR fee to store
    const feeInr = Math.round((window.ethInrRate || 250000) * 0.001);

    // 3. SUPABASE: Save to new 'consignments' table with new column names
    const newRecord = {
        "consignment_id":   consignmentId,
        "invoice_id":       invoiceId,
        "product_type":     productType,
        "product_detail":   productDetail,
        "quantity":         quantity,
        "created_by":       createdBy,
        "retailer_address": retailerAddr || null,
        "security_fee_inr": feeInr,
        "transferred_to":   "Pending",
        "sell_by":          "Pending",
        "delivered_to":     "Pending"
    };

    const { error } = await supabaseClient.from('consignments').insert([newRecord]);

    if (error) {
        showToast(`Offline Mode (Blockchain TX: ${txHash.substring(0, 8)}...)`, false);
        console.error("Supabase Error:", error);
        allProductEvents.unshift(newRecord);
        renderRegisteredProducts();
        openModal(consignmentId);
    } else {
        showToast('Consignment Registered & Secured on Blockchain!', false);
        registerForm.reset();
        await fetchAndRenderProducts();
        openModal(newRecord["consignment_id"]);
    }

    toggleSpinner(registerForm, false);
});

// --- CONSIGNMENT TRACKER ---
function getProductStatus(p) {
    if ((p["delivered_to"] && p["delivered_to"] !== 'Pending')) return 'delivered';
    if ((p["transferred_to"] && p["transferred_to"] !== 'Pending') ||
        (p["sell_by"] && p["sell_by"] !== 'Pending')) return 'in-transit';
    return 'registered';
}

function renderConsignmentTracker(filter = 'all') {
    const tbody = document.getElementById('consignment-tracker-body');
    const footerEl = document.getElementById('ct-footer');
    if (!tbody) return;

    // Update active filter tab styles
    document.querySelectorAll('.ct-tab-btn').forEach(btn => {
        const isActive = btn.dataset.ctFilter === filter;
        btn.className = isActive
            ? 'ct-tab-btn px-3 py-1 rounded-md text-xs font-semibold transition bg-sky-500/20 text-sky-300 border border-sky-500/50'
            : 'ct-tab-btn px-3 py-1 rounded-md text-xs font-semibold transition bg-slate-800/60 text-slate-500 border border-slate-700 hover:text-slate-300 hover:border-slate-500';
    });

    const statusConfig = {
        'delivered':  { label: 'Delivered',  dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', bar: 'border-l-emerald-500' },
        'in-transit': { label: 'In Transit', dot: 'bg-sky-400 animate-pulse', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30', bar: 'border-l-sky-500' },
        'registered': { label: 'Registered', dot: 'bg-slate-500', badge: 'bg-slate-700/40 text-slate-400 border-slate-600/40', bar: 'border-l-slate-600' },
    };

    // Update summary pills
    const activeCount    = allProductEvents.filter(p => getProductStatus(p) === 'in-transit').length;
    const deliveredCount = allProductEvents.filter(p => getProductStatus(p) === 'delivered').length;
    const activeEl    = document.getElementById('ct-active-count');
    const deliveredEl = document.getElementById('ct-delivered-count');
    if (activeEl)    activeEl.textContent = activeCount;
    if (deliveredEl) deliveredEl.textContent = deliveredCount;

    // Filter & cap at latest 50
    const pool = filter === 'all'
        ? allProductEvents
        : allProductEvents.filter(p => getProductStatus(p) === filter);
    const latest50 = [...pool].reverse().slice(0, 50);

    if (latest50.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" class="py-12 text-center">
                <div class="flex flex-col items-center gap-2">
                    <svg class="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                    <p class="text-slate-500 text-sm">No consignments for this filter</p>
                </div>
            </td></tr>`;
        if (footerEl) footerEl.textContent = '';
        return;
    }

    tbody.innerHTML = latest50.map((p, index) => {
        const status = getProductStatus(p);
        const cfg    = statusConfig[status];
        const invoiceId    = p["invoice_id"] || p["Invoice id"] || '—';
        const consignId    = p["consignment_id"] || p["Product id"] || '—';
        const type         = p["product_type"] || p["Product type"] || '—';
        const qty          = (p["quantity"] !== undefined && p["quantity"] !== null) ? p["quantity"] : '—';
        const retailerAddr = p["retailer_address"] || '—';
        const createdAt = p["created_at"]
            ? new Date(p["created_at"]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

        // Truncate retailer address for display
        const retailerDisplay = retailerAddr.length > 14
            ? retailerAddr.substring(0, 7) + '...' + retailerAddr.substring(retailerAddr.length - 5)
            : retailerAddr;

        return `
        <tr class="group border-l-2 ${cfg.bar} hover:bg-slate-800/50 transition-colors">
            <td class="py-2.5 px-4">
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}"></span>
                    <span class="font-mono text-[11px] text-slate-500 truncate max-w-[120px]" title="${invoiceId}">${invoiceId}</span>
                </div>
            </td>
            <td class="py-2.5 px-4">
                <span class="font-mono text-xs font-bold text-white group-hover:text-sky-300 transition-colors">${consignId}</span>
                <p class="text-[11px] text-slate-500 sm:hidden mt-0.5">${type}</p>
            </td>
            <td class="py-2.5 px-4 text-xs text-slate-400 hidden sm:table-cell">${type}</td>
            <td class="py-2.5 px-4 text-center text-xs font-bold text-white hidden md:table-cell">${qty}</td>
            <td class="py-2.5 px-4 hidden md:table-cell">
                <span class="text-xs font-mono text-slate-400" title="${retailerAddr}">${retailerDisplay}</span>
            </td>
            <td class="py-2.5 px-4 text-center">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${cfg.badge}">${cfg.label}</span>
            </td>
            <td class="py-2.5 px-4 text-right text-[11px] text-slate-500 hidden lg:table-cell">${createdAt}</td>
        </tr>`;
    }).join('');

    if (footerEl) {
        const showing = latest50.length;
        const total   = pool.length;
        footerEl.textContent = showing < total
            ? `Showing ${showing} of ${total} — latest ${showing} only`
            : `${showing} consignment${showing !== 1 ? 's' : ''}`;
    }
}

function renderRegisteredProducts() {
    const list = document.getElementById('registeredProductsList');
    if (!allProductEvents || allProductEvents.length === 0) {
        list.innerHTML = `<div class="text-center py-10 px-4"><p class="text-slate-400">No consignments found.</p></div>`;
        return;
    }

    list.innerHTML = [...allProductEvents].reverse().map((p, index) => `
        <div class="product-item flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700 mb-2 tx-item"
             style="animation-delay: ${index * 100}ms">
            <div>
                <p class="font-semibold text-white group-hover:text-sky-300 transition-colors">${p["created_by"] || p["Created by"] || '—'}</p>
                <p class="text-sm text-slate-400 font-mono break-all">${p["consignment_id"] || p["Product id"] || '—'}</p>
                <p class="text-xs text-slate-500">${p["product_type"] || p["Product type"] || '—'} · Qty: ${p["quantity"] || '—'}</p>
            </div>
            <button onclick="openModal('${p["consignment_id"] || p["Product id"]}')" class="p-2 rounded-md hover:bg-slate-700 transition flex-shrink-0 ml-2 text-sky-400 hover:text-white hover:shadow-[0_0_10px_rgba(56,189,248,0.3)]">
                Scan QR
            </button>
        </div>
    `).join('');

    // Refresh consignment tracker in sync with product list
    renderConsignmentTracker('all');
}

// --- PLACEHOLDER LISTENERS FOR OTHER ROLES TO PREVENT ERRORS ---
// --- LOGISTICS LOGIC ---
if (updateStatusForm) {
    updateStatusForm.addEventListener('submit', async e => {
        e.preventDefault();
        toggleSpinner(updateStatusForm, true);

        const infoContainer = document.getElementById('logisticsProductInfo');
        if (infoContainer) infoContainer.classList.add('hidden');

        const itemId         = document.getElementById('logistics_item_id').value;
        const customer       = document.getElementById('logistics_customer').value;
        const retailerAddr   = (document.getElementById('logistics_retailer_address')?.value || '').trim();

        if (!itemId || !customer) {
            showToast('Please enter Consignment ID and Retailer Name.', true);
            toggleSpinner(updateStatusForm, false);
            return;
        }

        // Call SupplyChainTracker contract: Logistics → Retailer hash
        const transferHash = await Web3Service.logTransfer(
            itemId,
            retailerAddr || customer,
            'logistics-to-retailer',
            `Logistics handoff to: ${customer}`
        );

        // Update Supabase with new column names
        const { data, error } = await supabaseClient
            .from('consignments')
            .update({
                "sell_by":           customer,
                "sell_timestamp":    new Date().toISOString(),
                "sell_hash":         transferHash,
                "transferred_to":    customer,
                "transfer_timestamp":new Date().toISOString(),
                "transfer_hash":     transferHash,
                "retailer_address":  retailerAddr || null
            })
            .eq('consignment_id', itemId);

        if (error) {
            showToast(`Error: ${error.message}`, true);
            console.error(error);
        } else {
            showToast(`Logistics Update Successful! Hash: ${transferHash.substring(0, 10)}...`, false);
            updateStatusForm.reset();
            await fetchAndRenderProducts();
        }

        toggleSpinner(updateStatusForm, false);
    });
}

if (verifyProductForm) {
    verifyProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast("Verification disabled for schema migration.", true);
    });
}

document.querySelectorAll('.form-input').forEach(input => {
    input.className = 'w-full px-4 py-3 bg-slate-800/60 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm text-white placeholder-slate-400';
});
// --- SHARED RENDERING LOGIC ---

function renderProductInfo(productId, elementId, showVerification = false) {
    const container = document.getElementById(elementId);
    const productHistory = allProductEvents.filter(p => p.item_id.toUpperCase() === productId.toUpperCase()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const product = productHistory[0]; // Base details from the first event

    let verificationHTML = '';
    if (showVerification) {
        const isGenuine = productHistory.some(entry => entry.order_status === 'Delivered');
        verificationHTML = `
                    <div class="p-4 rounded-lg ${isGenuine ? 'bg-green-900/50 border-green-500/50' : 'bg-orange-900/50 border-orange-500/50'} border mb-4">
                        <div class="flex items-center">
                             <svg class="w-6 h-6 mr-3 flex-shrink-0 ${isGenuine ? 'text-green-400' : 'text-orange-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <div>
                                <h3 class="font-semibold ${isGenuine ? 'text-green-300' : 'text-orange-300'}">${isGenuine ? 'Product Verified' : 'Provenance Incomplete'}</h3>
                                <p class="text-sm ${isGenuine ? 'text-green-400' : 'text-orange-400'}">${isGenuine ? 'This product has a valid and complete supply chain history.' : 'This product is registered but has not completed its journey.'}</p>
                            </div>
                        </div>
                    </div>
                `;
    }

    container.innerHTML = `
                ${verificationHTML}
                <h3 class="text-xl font-semibold mb-2 text-white">${product.supplier} Product</h3>
                <p class="text-sm text-slate-400 font-mono mb-4 break-all">${product.item_id}</p>
                <div class="space-y-1 text-sm mb-4">
                    <p><strong>Serial No:</strong> ${product.serial_no}</p>
                    <p><strong>Quantity:</strong> ${product.quantity}</p>
                </div>
                <h4 class="font-semibold text-white mb-2">Provenance History</h4>
                <div class="border-t border-slate-700 pt-4 max-h-60 overflow-y-auto pr-2">
                    ${generateHistoryTimeline(productHistory)}
                </div>
             `;
    container.classList.remove('hidden');
    container.classList.add('fade-in');
}

function generateHistoryTimeline(history) {
    const statusIcons = {
        'Registered': '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>',
        'Shipped': '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-2h8a1 1 0 001-1z"></path></svg>',
        'In Transit': '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
        'Delivered': '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>',
    };

    return `
            <ol class="relative border-l border-slate-700">
                ${history.slice().reverse().map((entry) => `
                    <li class="mb-6 ml-6">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-sky-600 rounded-full -left-3 ring-8 ring-slate-800/60">
                            ${statusIcons[entry.order_status] || ''}
                        </span>
                        <div>
                            <p class="font-semibold text-white">${entry.order_status}</p>
                            <p class="text-sm text-slate-400">Holder: ${entry.customer}</p>
                            <time class="text-xs text-slate-500">${new Date(entry.timestamp).toLocaleString()}</time>
                            <div class="mt-1 text-xs font-mono bg-slate-900/80 border border-slate-700 rounded p-1 inline-block">Temp: ${entry.env_temp_c}°C | Humidity: ${entry.env_humidity_pct}%</div>
                        </div>
                    </li>
                `).join('')}
            </ol>
            `;
}
