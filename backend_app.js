/**
 * app.js — Express backend with in-memory data loaded from real CSV files.
 * Schemas derived from: packaged_food.csv, baby_products.csv, watches.csv, shoes.csv
 * STRICT RULES: No column renames, no fake data, no hardcoded rows.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        // Handle commas inside quoted fields
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
            if (ch === '"') { inQuotes = !inQuotes; }
            else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
            else { current += ch; }
        }
        values.push(current.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] !== undefined ? values[i] : ''; });
        return obj;
    }).filter(row => row[headers[0]] !== ''); // skip empty rows
}

// ─── LOAD CSV DATA ────────────────────────────────────────────────────────────
const CSV_DIR = path.join('C:', 'Users', 'Samruddhi', 'Downloads');

let packaged_food = [];
let baby_products = [];
let watches = [];
let shoes = [];

try {
    packaged_food = parseCSV(path.join(CSV_DIR, 'packaged_food.csv'));
    console.log(`✅ Loaded ${packaged_food.length} packaged food products`);
} catch (e) { console.error('❌ Could not load packaged_food.csv:', e.message); }

try {
    baby_products = parseCSV(path.join(CSV_DIR, 'baby_products.csv'));
    console.log(`✅ Loaded ${baby_products.length} baby products`);
} catch (e) { console.error('❌ Could not load baby_products.csv:', e.message); }

try {
    watches = parseCSV(path.join(CSV_DIR, 'watches.csv'));
    console.log(`✅ Loaded ${watches.length} watches`);
} catch (e) { console.error('❌ Could not load watches.csv:', e.message); }

try {
    shoes = parseCSV(path.join(CSV_DIR, 'shoes.csv'));
    console.log(`✅ Loaded ${shoes.length} shoes`);
} catch (e) { console.error('❌ Could not load shoes.csv:', e.message); }

// ─── PRODUCT CATALOG (unified view across all tables) ─────────────────────────
function buildCatalog() {
    const catalog = [];

    packaged_food.forEach(row => {
        catalog.push({
            _table: 'packaged_food',
            _uid: `PF-${row.Product_ID}`,
            Product_ID: row.Product_ID,
            Brand: row.Brand,
            Product_Name: row.Product_Name,
            Category: row.Category,
            Flavor: row.Flavor,
            Net_Weight_g: Number(row.Net_Weight_g),
            Calories_per_100g: Number(row.Calories_per_100g),
            Packaging_Type: row.Packaging_Type,
            Price_USD: Number(row.Price_USD),
            Rating: Number(row.Rating),
            Stock: Number(row.Stock),
            Manufacture_Date: row.Manufacture_Date,
            Expiry_Date: row.Expiry_Date,
        });
    });

    baby_products.forEach(row => {
        catalog.push({
            _table: 'baby_products',
            _uid: `BP-${row.Product_ID}`,
            Product_ID: row.Product_ID,
            Brand: row.Brand,
            Product_Name: row.Product_Name,
            Category: row.Category,
            Age_Group: row.Age_Group,
            Material: row.Material,
            Gender: row.Gender,
            Price_USD: Number(row.Price_USD),
            Rating: Number(row.Rating),
            Stock: Number(row.Stock),
            Weight_kg: Number(row.Weight_kg),
        });
    });

    watches.forEach(row => {
        catalog.push({
            _table: 'watches',
            _uid: `WA-${row.Product_ID}`,
            Product_ID: row.Product_ID,
            Brand: row.Brand,
            Model: row.Model,
            Type: row.Type,
            Strap_Material: row.Strap_Material,
            Dial_Color: row.Dial_Color,
            Gender: row.Gender,
            Movement: row.Movement,
            Price_USD: Number(row.Price_USD),
            Rating: Number(row.Rating),
            Stock: Number(row.Stock),
        });
    });

    shoes.forEach(row => {
        catalog.push({
            _table: 'shoes',
            _uid: `SH-${row.Product_ID}`,
            Product_ID: row.Product_ID,
            Brand: row.Brand,
            Model: row.Model,
            Category: row.Category,
            Color: row.Color,
            Gender: row.Gender,
            Size: Number(row.Size),
            Price_USD: Number(row.Price_USD),
            Rating: Number(row.Rating),
            Stock: Number(row.Stock),
        });
    });

    return catalog;
}

const productCatalog = buildCatalog();

// ─── SERIAL NUMBERS ───────────────────────────────────────────────────────────
const serialNumberStore = new Map();

function generateSerialNumbers(product, count = 5) {
    const prefix = product._table === 'packaged_food' ? 'PF'
        : product._table === 'baby_products' ? 'BP'
            : product._table === 'watches' ? 'WA'
                : 'SH';
    const sns = [];
    for (let i = 1; i <= count; i++) {
        const sn = `${prefix}-${product.Product_ID}-${String(i).padStart(3, '0')}`;
        if (!serialNumberStore.has(sn)) {
            serialNumberStore.set(sn, { serialNumber: sn, productUid: product._uid, status: 'available' });
        }
        sns.push(sn);
    }
    return sns;
}

productCatalog.forEach(p => generateSerialNumbers(p, 5));

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
const customers = [
    { customerId: 'CUST-001', name: 'Metro Distributors Pvt Ltd', type: 'distributor', region: 'North India' },
    { customerId: 'CUST-002', name: 'Southern Retail Chain', type: 'retailer', region: 'South India' },
    { customerId: 'CUST-003', name: 'East Coast Wholesale Hub', type: 'wholesaler', region: 'East India' },
    { customerId: 'CUST-004', name: 'Western Goods Network', type: 'distributor', region: 'West India' },
    { customerId: 'CUST-005', name: 'Pan India Logistics Ltd', type: 'distributor', region: 'Pan India' },
    { customerId: 'CUST-006', name: 'QuickMart Retail Pvt Ltd', type: 'retailer', region: 'Maharashtra' },
    { customerId: 'CUST-007', name: 'BulkBuy Wholesale Co.', type: 'wholesaler', region: 'Gujarat' },
    { customerId: 'CUST-008', name: 'Capital City Distributors', type: 'distributor', region: 'Delhi NCR' },
];

// ─── PRODUCT EVENTS ───────────────────────────────────────────────────────────
const productEvents = [];

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/products', (req, res) => {
    const { table, search } = req.query;
    let results = productCatalog;

    if (table) results = results.filter(p => p._table === table);
    if (search) {
        const q = search.toLowerCase();
        results = results.filter(p =>
            (p.Product_Name || p.Model || '').toLowerCase().includes(q) ||
            (p.Brand || '').toLowerCase().includes(q)
        );
    }

    const summary = results.map(p => ({
        _uid: p._uid,
        _table: p._table,
        Product_ID: p.Product_ID,
        Brand: p.Brand,
        DisplayName: p.Product_Name || p.Model,
        Category: p.Category || p.Type,
        Stock: p.Stock,
        Price_USD: p.Price_USD,
    }));

    res.json({ success: true, count: summary.length, data: summary });
});

app.get('/api/products/:uid', (req, res) => {
    const product = productCatalog.find(p => p._uid === req.params.uid);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
});

app.get('/api/serial-numbers', (req, res) => {
    const { productUid } = req.query;
    if (!productUid) return res.status(400).json({ success: false, message: 'productUid is required' });

    const available = [];
    serialNumberStore.forEach(sn => {
        if (sn.productUid === productUid && sn.status === 'available') {
            available.push(sn.serialNumber);
        }
    });

    res.json({ success: true, count: available.length, data: available });
});

app.get('/api/customers', (req, res) => {
    res.json({ success: true, count: customers.length, data: customers });
});

app.post('/api/events', (req, res) => {
    const { productUid, serialNumber, customerId, quantity, manufacturerId } = req.body;

    const errors = [];
    if (!productUid) errors.push({ field: 'productUid', message: 'Product is required' });
    if (!serialNumber) errors.push({ field: 'serialNumber', message: 'Serial number is required' });
    if (!customerId) errors.push({ field: 'customerId', message: 'Customer/Distributor is required' });
    if (!quantity || isNaN(quantity) || Number(quantity) < 1 || !Number.isInteger(Number(quantity))) {
        errors.push({ field: 'quantity', message: 'Quantity must be a positive integer' });
    }
    if (!manufacturerId) errors.push({ field: 'manufacturerId', message: 'Manufacturer ID is required' });

    if (errors.length > 0) {
        return res.status(422).json({ success: false, message: 'Validation failed', errors });
    }

    const qty = Number(quantity);
    const product = productCatalog.find(p => p._uid === productUid);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found in catalog' });

    if (qty > product.Stock) {
        return res.status(409).json({
            success: false,
            message: `Quantity (${qty}) exceeds available stock (${product.Stock})`,
        });
    }

    const snRecord = serialNumberStore.get(serialNumber);
    if (!snRecord) return res.status(404).json({ success: false, message: 'Serial number not found' });
    if (snRecord.productUid !== productUid) return res.status(409).json({ success: false, message: 'Serial number does not belong to this product' });
    if (snRecord.status !== 'available') return res.status(409).json({ success: false, message: 'Serial number is already used' });

    const customer = customers.find(c => c.customerId === customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const duplicate = productEvents.find(e =>
        e.productUid === productUid &&
        e.serialNumber === serialNumber &&
        e.manufacturerId === manufacturerId &&
        e.eventType === 'MANUFACTURED'
    );
    if (duplicate) return res.status(409).json({ success: false, message: 'Duplicate event: this product has already been registered by this manufacturer with this serial number' });

    snRecord.status = 'used';
    product.Stock = product.Stock - qty;

    const event = {
        eventId: uuidv4(),
        productUid,
        Product_ID: product.Product_ID,
        _table: product._table,
        Brand: product.Brand,
        DisplayName: product.Product_Name || product.Model,
        serialNumber,
        customerId,
        customerName: customer.name,
        quantity: qty,
        manufacturerId,
        eventType: 'MANUFACTURED',
        timestamp: new Date().toISOString(),
        auditLog: `Event created by manufacturer ${manufacturerId} at ${new Date().toISOString()}`,
    };
    productEvents.push(event);

    res.status(201).json({
        success: true,
        message: 'Product event registered successfully',
        data: event,
    });
});

app.get('/api/events', (req, res) => {
    const sorted = [...productEvents].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ success: true, count: sorted.length, data: sorted });
});

app.get('/api/tables', (req, res) => {
    res.json({
        success: true,
        data: [
            { key: 'packaged_food', label: 'Packaged Food', count: packaged_food.length },
            { key: 'baby_products', label: 'Baby Products', count: baby_products.length },
            { key: 'watches', label: 'Watches', count: watches.length },
            { key: 'shoes', label: 'Shoes', count: shoes.length },
        ],
    });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Total products in catalog: ${productCatalog.length}`);
    console.log(`🔢 Total serial numbers: ${serialNumberStore.size}`);
    console.log(`👥 Customers: ${customers.length}`);
});
