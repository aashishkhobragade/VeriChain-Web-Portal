/**
 * Seed Script — populates MongoDB with master data.
 * Run once: node backend_seed.js
 * Safe to re-run (uses upsert).
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/manufacturer_db';

const products = [
    { productId: 'PROD-001', name: 'Industrial Valve X200', supplierId: 'SUP-101', supplierName: 'Apex Components Ltd.', category: 'Mechanical', status: 'ACTIVE' },
    { productId: 'PROD-002', name: 'Smart Sensor Module S5', supplierId: 'SUP-102', supplierName: 'TechParts Global', category: 'Electronics', status: 'ACTIVE' },
    { productId: 'PROD-003', name: 'Hydraulic Pump HP-400', supplierId: 'SUP-103', supplierName: 'FluidTech Industries', category: 'Hydraulics', status: 'ACTIVE' },
    { productId: 'PROD-004', name: 'Control Board CB-7', supplierId: 'SUP-104', supplierName: 'CircuitWave Pvt Ltd.', category: 'Electronics', status: 'ACTIVE' },
    { productId: 'PROD-005', name: 'Precision Gear Set G12', supplierId: 'SUP-105', supplierName: 'MechPro Supplies', category: 'Mechanical', status: 'ACTIVE' },
];

const serialNumbers = [
    { serialNumber: 'SN-001-A1', productId: 'PROD-001', status: 'available' },
    { serialNumber: 'SN-001-A2', productId: 'PROD-001', status: 'available' },
    { serialNumber: 'SN-001-A3', productId: 'PROD-001', status: 'available' },
    { serialNumber: 'SN-002-B1', productId: 'PROD-002', status: 'available' },
    { serialNumber: 'SN-002-B2', productId: 'PROD-002', status: 'available' },
    { serialNumber: 'SN-002-B3', productId: 'PROD-002', status: 'available' },
    { serialNumber: 'SN-003-C1', productId: 'PROD-003', status: 'available' },
    { serialNumber: 'SN-003-C2', productId: 'PROD-003', status: 'available' },
    { serialNumber: 'SN-004-D1', productId: 'PROD-004', status: 'available' },
    { serialNumber: 'SN-004-D2', productId: 'PROD-004', status: 'available' },
    { serialNumber: 'SN-004-D3', productId: 'PROD-004', status: 'available' },
    { serialNumber: 'SN-005-E1', productId: 'PROD-005', status: 'available' },
    { serialNumber: 'SN-005-E2', productId: 'PROD-005', status: 'available' },
];

const customers = [
    { customerId: 'CUST-001', name: 'NorthStar Distributors', type: 'distributor', region: 'North America', contactEmail: 'orders@northstar.com' },
    { customerId: 'CUST-002', name: 'EuroTrade Wholesale', type: 'wholesaler', region: 'Europe', contactEmail: 'procurement@eurotrade.eu' },
    { customerId: 'CUST-003', name: 'AsiaPac Logistics', type: 'distributor', region: 'Asia Pacific', contactEmail: 'supply@asiapac.com' },
    { customerId: 'CUST-004', name: 'MidEast Supply Co.', type: 'retailer', region: 'Middle East', contactEmail: 'info@midsupply.ae' },
    { customerId: 'CUST-005', name: 'Global Parts Hub', type: 'distributor', region: 'Global', contactEmail: 'hub@globalparts.io' },
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');
        console.log('\n🎉 Database seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
}

seed();
