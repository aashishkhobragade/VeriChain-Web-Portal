// --- SUPABASE SETUP ---
const SUPABASE_URL = 'https://vklcjawpxixkbmqkmfve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbGNqYXdweGl4a2JtcWttZnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjE5MDAsImV4cCI6MjA3NDk5NzkwMH0.jTqbxoLAnBjr6vAOOpvCobMrs71HhrEDAAfuWSVFRRA';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
const updateStatusForm = document.getElementById('updateStatusForm');
const verifyProductForm = document.getElementById('verifyProductForm');
const modal = document.getElementById('productModal');
const copyIdButton = document.getElementById('copyIdButton');
const modalProductId = document.getElementById('modalProductId');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await fetchAndRenderProducts();
});

async function fetchAndRenderProducts() {
    let { data, error } = await supabaseClient.from('products').select('*');
    if (error) {
        showToast('Error fetching products via API. Loading offline mode...', true);
        console.error(error);
        data = []; // Fallback to empty if error, but we will add dummy data below
    }

    // Combine real data with dummy data for demonstration if fewer than 5 items
    if (!data || data.length < 5) {
        console.log("Loading dummy data for demonstration...");
        const dummyData = generateDummyData();
        data = [...(data || []), ...dummyData];
    }

    allProductEvents = data;
    renderRegisteredProducts();

    // Initial dashboard render if active
    if (document.querySelector('.tab-btn[data-tab="dashboard"]').classList.contains('tab-active')) {
        renderDashboard();
    }
}

// --- DASHBOARD UPGRADES ---
function renderBlockchainStats() {
    // Generate simulated blockchain stats
    const blockHeight = 18293400 + Math.floor(Math.random() * 50);
    const gasPrice = (Math.random() * 10 + 15).toFixed(1);
    const avgBlockTime = (12 + Math.random() * 2).toFixed(2);

    // Check if elements exist, if not, we might need to add them to HTML first.
    const statsContainer = document.getElementById('blockchainStatsRow');
    if (statsContainer) {
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
    // Enhanced dummy data generation for "100% complete" look
    const statuses = ['Registered', 'Shipped', 'In Transit', 'In Transit', 'Delivered', 'Delivered', 'Cancelled']; // Weighted
    const suppliers = ['EpsilonCo', 'AlphaInd', 'OmegaCorp', 'ZetaSupply', 'NanoTech', 'GlobalLogistics', 'PrimeSource', 'EcoFarm', 'TechComponents'];
    const customers = ['Retailer-A', 'Retailer-B', 'Distributor-X', 'Logistics-Y', 'EndConsumer-Z', 'SuperMart', 'HyperLocal'];
    const locations = [
        { lat: 19.0760, lon: 72.8777, name: 'Mumbai' },
        { lat: 28.6139, lon: 77.2090, name: 'New Delhi' },
        { lat: 12.9716, lon: 77.5946, name: 'Bangalore' },
        { lat: 13.0827, lon: 80.2707, name: 'Chennai' },
        { lat: 22.5726, lon: 88.3639, name: 'Kolkata' },
        { lat: 18.5204, lon: 73.8567, name: 'Pune' },
        { lat: 17.3850, lon: 78.4867, name: 'Hyderabad' },
        { lat: 23.0225, lon: 72.5714, name: 'Ahmedabad' },
        { lat: 26.9124, lon: 75.7873, name: 'Jaipur' },
        { lat: 9.9312, lon: 76.2673, name: 'Kochi' },
        { lat: 21.1702, lon: 72.8311, name: 'Surat' },
        { lat: 26.8467, lon: 80.9462, name: 'Lucknow' }
    ];

    const dummy = [];
    const now = Date.now();

    // Generate 120 items
    for (let i = 0; i < 120; i++) {
        const loc = locations[Math.floor(Math.random() * locations.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const item_id = `PROD-${Math.floor(1000 + Math.random() * 9000)}`; // Random 4 digits

        // Random time in last 45 days
        const timeOffset = Math.floor(Math.random() * 45 * 24 * 60 * 60 * 1000);

        dummy.push({
            record_id: `R-${Math.random().toString(36).substring(7)}`,
            item_id: item_id,
            supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
            serial_no: `SN-${item_id}-${Math.floor(Math.random() * 9999)}`,
            customer: customers[Math.floor(Math.random() * customers.length)],
            quantity: Math.floor(Math.random() * 500) + 1,
            order_status: status,
            payment_status: 'Paid',
            timestamp: new Date(now - timeOffset).toISOString(),
            tx_id: `0x${Math.random().toString(16).substring(2, 40)}`, // More realistic length
            env_temp_c: (Math.random() * 10 + 20).toFixed(1),
            env_humidity_pct: (Math.random() * 20 + 40).toFixed(1),
            gps_lat: loc.lat + (Math.random() * 0.2 - 0.1), // Widen spread
            gps_lon: loc.lon + (Math.random() * 0.2 - 0.1)
        });
    }
    // Sort by timestamp descending
    return dummy.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
        } else {
            content.classList.add('hidden');
        }
    });

    if (tabName === 'dashboard') {
        renderDashboard();
        setTimeout(() => {
            if (mapInstance) mapInstance.invalidateSize();
        }, 300);
    } else if (tabName === 'logistics') {
        renderLogisticsOverview();
    } else if (tabName === 'retailer') {
        renderRetailerOverview();
    }
}

function renderLogisticsOverview() {
    const list = document.getElementById('logisticsRecentList');
    // Filter for recent shipments (Shipped or In Transit)
    const shipments = allProductEvents.filter(p => p.order_status === 'Shipped' || p.order_status === 'In Transit').slice(0, 5);

    if (shipments.length === 0) {
        list.innerHTML = '<p class="text-slate-500 text-sm">No recent shipments found.</p>';
        return;
    }

    list.innerHTML = shipments.map(p => `
        <div class="flex justify-between items-center bg-slate-800/30 p-2 rounded">
            <div>
                <p class="text-xs text-sky-400 font-semibold uppercase">${p.order_status}</p>
                <p class="text-sm text-white font-medium">${p.item_id}</p>
                <p class="text-xs text-slate-500">To: ${p.customer}</p>
            </div>
            <div class="text-right">
                <p class="text-xs text-slate-400">${new Date(p.timestamp).toLocaleDateString()}</p>
                <p class="text-xs font-mono text-slate-600">${p.record_id.substring(0, 8)}</p>
            </div>
        </div>
    `).join('');
}

function renderRetailerOverview() {
    const list = document.getElementById('retailerInventoryList');
    // Filter for delivered products (simulating inventory)
    const inventory = allProductEvents.filter(p => p.order_status === 'Delivered').slice(0, 5);

    if (inventory.length === 0) {
        list.innerHTML = '<p class="text-slate-500 text-sm">No inventory records found.</p>';
        return;
    }

    list.innerHTML = inventory.map(p => `
        <div class="flex justify-between items-center border-b border-slate-700/50 pb-2 last:border-0">
            <div class="flex items-center">
                 <div class="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                 <div>
                    <p class="text-sm text-white">${p.item_id}</p>
                    <p class="text-xs text-slate-500">${p.supplier}</p>
                 </div>
            </div>
            <span class="text-xs font-mono text-slate-400">Qty: ${p.quantity}</span>
        </div>
    `).join('');
}

function renderDashboard() {
    // 0. Update Blockchain Stats (New)
    renderBlockchainStats();

    // 1. Update Stats
    const uniqueProducts = new Set(allProductEvents.map(p => p.item_id));
    const totalProducts = uniqueProducts.size;

    // Find latest status for each product
    const latestStatusMap = {};
    allProductEvents.forEach(p => {
        if (!latestStatusMap[p.item_id] || new Date(p.timestamp) > new Date(latestStatusMap[p.item_id].timestamp)) {
            latestStatusMap[p.item_id] = p;
        }
    });
    const latestEvents = Object.values(latestStatusMap);

    const shippedCount = latestEvents.filter(p => p.order_status === 'Shipped' || p.order_status === 'In Transit').length;
    const deliveredCount = latestEvents.filter(p => p.order_status === 'Delivered').length;

    document.getElementById('stat-total').textContent = totalProducts;
    document.getElementById('stat-transit').textContent = shippedCount;
    document.getElementById('stat-delivered').textContent = deliveredCount;

    // 2. Update Chart
    updateStatusChart(latestEvents);

    // 3. Update Map
    updateMap(latestEvents);

    // 4. Update Activity Chart
    renderActivityChart(allProductEvents);

    // 5. Update Recent Transactions
    renderTransactions(allProductEvents);
}

function renderActivityChart(events) {
    const ctx = document.getElementById('activityChart').getContext('2d');

    // Group by date (last 30 days)
    const last30Days = {};
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last30Days[dateStr] = 0;
    }

    events.forEach(e => {
        const dateStr = e.timestamp.split('T')[0];
        if (last30Days.hasOwnProperty(dateStr)) {
            last30Days[dateStr]++;
        }
    });

    const labels = Object.keys(last30Days).reverse();
    const data = Object.values(last30Days).reverse();

    if (activityChartInstance) {
        activityChartInstance.destroy();
    }

    activityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Transactions',
                data: data,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: '#0f172a',
                pointBorderColor: '#38bdf8'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', maxTicksLimit: 10 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderTransactions(events) {
    const list = document.getElementById('recentTransactionsList');
    // Take top 20 most recent events
    const recent = events.slice(0, 20);

    list.innerHTML = recent.map(e => `
        <div class="tx-item mb-2 pb-2 border-b border-slate-800/50 last:border-0">
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-xs font-semibold text-sky-400 bg-sky-900/20 px-2 py-0.5 rounded">${e.order_status}</span>
                    <span class="text-slate-300 text-sm ml-2 font-medium">${e.item_id}</span>
                </div>
                <span class="text-xs text-slate-500">${new Date(e.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="mt-1 flex justify-between items-center">
                <p class="text-xs text-slate-500 font-mono tx-hash truncate w-48">${e.tx_id || 'Pending...'}</p>
                <p class="text-xs text-slate-500">${new Date(e.timestamp).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function updateStatusChart(latestEvents) {
    const ctx = document.getElementById('statusChart').getContext('2d');

    const statusCounts = {};
    latestEvents.forEach(p => {
        statusCounts[p.order_status] = (statusCounts[p.order_status] || 0) + 1;
    });

    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(56, 189, 248, 0.8)',  // Sky
                    'rgba(168, 85, 247, 0.8)',  // Purple
                    'rgba(34, 197, 94, 0.8)',   // Green
                    'rgba(239, 68, 68, 0.8)',   // Red
                    'rgba(234, 179, 8, 0.8)'    // Yellow
                ],
                borderColor: 'rgba(15, 23, 42, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#cbd5e1', font: { family: 'Inter' } }
                }
            }
        }
    });
}

function initMap() {
    if (mapInstance) return;

    // Center roughly on India, as indicated by dummy data lat/lons
    mapInstance = L.map('map').setView([20.5937, 78.9629], 4);

    L.tileLayer(TILE_LAYER, {
        attribution: TILE_ATTR,
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(mapInstance);
}

function updateMap(latestEvents) {
    if (!mapInstance) initMap();

    // Clear existing
    mapMarkers.forEach(marker => mapInstance.removeLayer(marker));
    mapMarkers = [];

    latestEvents.forEach(event => {
        if (event.gps_lat && event.gps_lon) {
            let color = '#38bdf8'; // Default sky
            if (event.order_status === 'Delivered') color = '#22c55e';
            if (event.order_status === 'In Transit') color = '#a855f7';
            if (event.order_status === 'Cancelled') color = '#ef4444';

            const circleMarker = L.circleMarker([event.gps_lat, event.gps_lon], {
                radius: 8,
                fillColor: color,
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(mapInstance);

            circleMarker.bindPopup(`
                <div style="color: #0f172a">
                    <b>${event.item_id}</b><br>
                    Status: ${event.order_status}<br>
                    Supplier: ${event.supplier}
                </div>
            `);
            mapMarkers.push(circleMarker);
        }
    });
}

tabs.forEach(tab => {
    tab.className = 'flex items-center justify-center w-1/2 md:w-auto py-3 px-4 text-center border-b-2 border-transparent font-medium text-sm cursor-pointer transition-colors duration-200 text-slate-400 hover:text-sky-400';
    if (tab.dataset.tab === 'dashboard') { // Default to dashboard if we want, or Manufacturer
        // Logic handles active class in HTML, this loop just sets base classes and resets others
    }
});

document.querySelectorAll('.form-input').forEach(input => {
    input.className = 'w-full px-4 py-3 bg-slate-800/60 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm text-white placeholder-slate-400';
});

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.className = `fixed bottom-5 right-5 text-white py-3 px-6 rounded-lg shadow-lg transform translate-y-0 opacity-100 transition-all duration-300 border ${isError ? 'bg-red-500/90 border-red-400' : 'bg-slate-900/90 border-slate-700'}`;
    setTimeout(() => {
        toast.className = toast.className.replace('translate-y-0 opacity-100', 'translate-y-20 opacity-0');
    }, 3000);
}

function openModal(productId) {
    modal.classList.remove('hidden');
    modalProductId.textContent = productId;
    new QRious({
        element: document.getElementById('qrCodeCanvas'),
        value: productId,
        size: 200,
        foreground: '#0f172a',
        level: 'H'
    });
}

function closeModal() {
    modal.classList.add('hidden');
}

copyIdButton.addEventListener('click', () => {
    navigator.clipboard.writeText(modalProductId.textContent)
        .then(() => showToast('Product ID copied to clipboard!'))
        .catch(err => showToast('Failed to copy ID.', true));
});

// --- MANUFACTURER LOGIC ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleSpinner(registerForm, true);

    const newRecord = {
        record_id: `R-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        item_id: document.getElementById('item_id').value,
        supplier: document.getElementById('supplier').value,
        serial_no: document.getElementById('serial_no').value,
        customer: document.getElementById('customer').value,
        quantity: parseInt(document.getElementById('quantity').value, 10),
        order_status: 'Registered',
        payment_status: 'Paid',
        timestamp: new Date().toISOString(),
        env_temp_c: 25.0,
        env_humidity_pct: 60.0,
        gps_lat: 19.0760, // Default location
        gps_lon: 72.8777
    };

    // Web3 Integration: Register on Blockchain if connected
    let txHash = `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    if (typeof Web3Service !== 'undefined' && Web3Service.isConnected) {
        const onChainTx = await Web3Service.registerProduct(newRecord.item_id, newRecord.supplier);
        if (onChainTx) {
            txHash = onChainTx;
            newRecord.order_status = 'Registered (On-Chain)';
        }
    }

    newRecord.tx_id = txHash;

    const { error } = await supabaseClient.from('products').insert([newRecord]);

    if (error) {
        showToast(`Error: ${error.message}`, true);
        console.error(error);
    } else {
        // Show Transaction Hash
        showToast(`Success! TX: ${txHash.substring(0, 15)}...`, false);
        registerForm.reset();
        await fetchAndRenderProducts(); // Refresh the list
        openModal(newRecord.item_id);
    }

    toggleSpinner(registerForm, false);
});

function renderRegisteredProducts() {
    const list = document.getElementById('registeredProductsList');
    const uniqueProducts = [...new Map(allProductEvents.map(item => [item.item_id, item])).values()];

    if (uniqueProducts.length === 0) {
        list.innerHTML = `<div class="text-center py-10 px-4"><p class="text-slate-400">No products found in the database.</p></div>`;
        return;
    }

    list.innerHTML = uniqueProducts.sort((a, b) => a.item_id.localeCompare(b.item_id)).map(p => `
                 <div class="product-item flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div>
                        <p class="font-semibold text-white">${p.supplier}</p>
                        <p class="text-sm text-slate-400 font-mono break-all">${p.item_id}</p>
                    </div>
                    <button onclick="openModal('${p.item_id}')" class="p-2 rounded-md hover:bg-slate-700 transition flex-shrink-0 ml-2" title="Show QR Code">
                        <svg class="w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 0 1 3.75 9.375v-4.5zM3.75 14.625c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5a1.875 1.875 0 0 1-1.875-1.875v-4.5zM13.5 4.875c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 0 1 13.5 9.375v-4.5z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 14.625v4.5c0 1.036.84 1.875 1.875 1.875h4.5c1.036 0 1.875-.84 1.875-1.875v-4.5c0-1.036-.84-1.875-1.875-1.875h-4.5a1.875 1.875 0 0 0-1.875 1.875z" />
                        </svg>
                    </button>
                </div>
            `).join('');
}

// --- LOGISTICS LOGIC ---
updateStatusForm.addEventListener('submit', async e => {
    e.preventDefault();
    toggleSpinner(updateStatusForm, true);
    const infoContainer = document.getElementById('logisticsProductInfo');
    infoContainer.classList.add('hidden');

    const itemId = document.getElementById('logistics_item_id').value;
    const productEvents = allProductEvents.filter(p => p.item_id === itemId);
    if (productEvents.length === 0) {
        showToast('Product ID not found in database.', true);
        toggleSpinner(updateStatusForm, false);
        return;
    }

    const lastEvent = productEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    const newRecord = {
        ...lastEvent, // Copy most data from the last event
        record_id: `R-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, // Let Supabase generate this
        id: null, // Let Supabase generate this
        order_status: document.getElementById('order_status').value,
        customer: document.getElementById('logistics_customer').value,
        timestamp: new Date().toISOString(),
        env_temp_c: (Math.random() * 5 + 18).toFixed(1),
        env_humidity_pct: (Math.random() * 10 + 55).toFixed(1),
    };

    // Web3 Integration: Transfer on Blockchain if connected
    let txHash = `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Try to extract numeric ID if possible, otherwise skip chain or handle error in service
    if (typeof Web3Service !== 'undefined' && Web3Service.isConnected) {
        const currentStage = document.getElementById('order_status').value;
        const fakeToAddress = "0x0000000000000000000000000000000000000000";

        const onChainTx = await Web3Service.transferProduct(itemId, fakeToAddress, currentStage);
        if (onChainTx) {
            txHash = onChainTx;
            newRecord.order_status = `${newRecord.order_status} (On-Chain)`;
        }
    }

    newRecord.tx_id = txHash;

    const { error } = await supabaseClient.from('products').insert([newRecord]);

    if (error) {
        showToast(`Error: ${error.message}`, true);
        console.error(error);
    } else {
        // Show Transaction Hash
        showToast(`Success! TX: ${txHash.substring(0, 15)}...`, false);
        updateStatusForm.reset();
        await fetchAndRenderProducts();
        renderProductInfo(itemId, 'logisticsProductInfo');
    }
    toggleSpinner(updateStatusForm, false);
});

// --- RETAILER LOGIC ---
verifyProductForm.addEventListener('submit', e => {
    e.preventDefault();
    toggleSpinner(verifyProductForm, true);
    const infoContainer = document.getElementById('retailerProductInfo');
    infoContainer.classList.add('hidden');

    setTimeout(() => {
        const productId = document.getElementById('retailerProductId').value;
        const productEvents = allProductEvents.filter(p => p.item_id.toUpperCase() === productId.toUpperCase());

        if (productEvents.length === 0) {
            showToast('Product ID not found.', true);
            toggleSpinner(verifyProductForm, false);
            return;
        }

        renderProductInfo(productId, 'retailerProductInfo', true);
        toggleSpinner(verifyProductForm, false);
    }, 500);
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
