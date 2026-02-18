/**
 * RegisterEventForm.jsx
 * Manufacturer Product Registration form.
 * Supports 4 product tables: packaged_food, baby_products, watches, shoes.
 * All dropdowns dynamically populated from backend (real CSV data).
 * Manufacturer CANNOT create or modify product data — selection only.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    fetchTables,
    fetchProducts,
    fetchProductByUid,
    fetchSerialNumbers,
    fetchCustomers,
    registerEvent,
} from './frontend_api';

const TABLE_LABELS = {
    packaged_food: 'Packaged Food',
    baby_products: 'Baby Products',
    watches: 'Watches',
    shoes: 'Shoes',
};

const INITIAL_FORM = {
    table: '',
    productUid: '',
    serialNumber: '',
    customerId: '',
    quantity: '',
    manufacturerId: 'MFR-001',
};

const INITIAL_ERR = {
    table: '',
    productUid: '',
    serialNumber: '',
    customerId: '',
    quantity: '',
};

export default function RegisterEventForm() {
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState(INITIAL_ERR);

    // Dropdown data
    const [tables, setTables] = useState([]);
    const [products, setProducts] = useState([]);
    const [serialNumbers, setSerialNumbers] = useState([]);
    const [customers, setCustomers] = useState([]);

    // Selected product details (for info panel)
    const [selectedProduct, setSelectedProduct] = useState(null);

    // UI states
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingSerials, setLoadingSerials] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);
    const [apiError, setApiError] = useState('');

    // ── Load tables and customers on mount ──────────────────────────────────────
    useEffect(() => {
        fetchTables()
            .then(res => setTables(res.data || []))
            .catch(() => setApiError('Failed to load product categories.'));

        fetchCustomers()
            .then(res => setCustomers(res.data || []))
            .catch(() => setApiError('Failed to load customers.'));
    }, []);

    // ── Load products when table changes ────────────────────────────────────────
    useEffect(() => {
        if (!form.table) {
            setProducts([]);
            return;
        }
        setLoadingProducts(true);
        setForm(f => ({ ...f, productUid: '', serialNumber: '' }));
        setSelectedProduct(null);
        setSerialNumbers([]);

        fetchProducts({ table: form.table })
            .then(res => setProducts(res.data || []))
            .catch(() => setApiError('Failed to load products.'))
            .finally(() => setLoadingProducts(false));
    }, [form.table]);

    // ── Load product details + serial numbers when product changes ───────────────
    useEffect(() => {
        if (!form.productUid) {
            setSelectedProduct(null);
            setSerialNumbers([]);
            setForm(f => ({ ...f, serialNumber: '' }));
            return;
        }
        setLoadingSerials(true);
        setForm(f => ({ ...f, serialNumber: '' }));

        Promise.all([
            fetchProductByUid(form.productUid),
            fetchSerialNumbers(form.productUid),
        ])
            .then(([prodRes, snRes]) => {
                setSelectedProduct(prodRes.data);
                setSerialNumbers(snRes.data || []);
            })
            .catch(() => setApiError('Failed to load product details.'))
            .finally(() => setLoadingSerials(false));
    }, [form.productUid]);

    // ── Field change handler ─────────────────────────────────────────────────────
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
        setErrors(err => ({ ...err, [name]: '' }));
        setApiError('');
        setSubmitResult(null);
    }, []);

    // ── Client-side validation ───────────────────────────────────────────────────
    const validate = () => {
        const newErrors = { ...INITIAL_ERR };
        let valid = true;

        if (!form.table) { newErrors.table = 'Please select a product category.'; valid = false; }
        if (!form.productUid) { newErrors.productUid = 'Please select a product.'; valid = false; }
        if (!form.serialNumber) { newErrors.serialNumber = 'Please select a serial number.'; valid = false; }
        if (!form.customerId) { newErrors.customerId = 'Please select a customer/distributor.'; valid = false; }

        const qty = Number(form.quantity);
        if (!form.quantity) {
            newErrors.quantity = 'Quantity is required.'; valid = false;
        } else if (!Number.isInteger(qty) || qty < 1) {
            newErrors.quantity = 'Quantity must be a positive whole number.'; valid = false;
        } else if (selectedProduct && qty > selectedProduct.Stock) {
            newErrors.quantity = `Exceeds available stock (${selectedProduct.Stock} units).`; valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    // ── Submit handler ───────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setApiError('');
        setSubmitResult(null);

        try {
            const res = await registerEvent({
                productUid: form.productUid,
                serialNumber: form.serialNumber,
                customerId: form.customerId,
                quantity: Number(form.quantity),
                manufacturerId: form.manufacturerId,
            });
            setSubmitResult({ success: true, message: res.message, data: res.data });
            setForm(INITIAL_FORM);
            setSelectedProduct(null);
            setSerialNumbers([]);
            setProducts([]);
        } catch (err) {
            setApiError(err.message || 'Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Reset ────────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setForm(INITIAL_FORM);
        setErrors(INITIAL_ERR);
        setSelectedProduct(null);
        setSerialNumbers([]);
        setProducts([]);
        setSubmitResult(null);
        setApiError('');
    };

    // ── Render ───────────────────────────────────────────────────────────────────
    if (submitResult?.success) {
        return (
            <div className="success-panel">
                <div className="success-icon">✅</div>
                <h2>Event Registered Successfully</h2>
                <p className="success-subtitle">Product manufacturing event has been recorded.</p>
                <div className="success-details">
                    <div className="detail-row"><span>Event ID</span><strong>{submitResult.data.eventId}</strong></div>
                    <div className="detail-row"><span>Product</span><strong>{submitResult.data.DisplayName} ({submitResult.data.Brand})</strong></div>
                    <div className="detail-row"><span>Category</span><strong>{TABLE_LABELS[submitResult.data._table]}</strong></div>
                    <div className="detail-row"><span>Serial Number</span><strong>{submitResult.data.serialNumber}</strong></div>
                    <div className="detail-row"><span>Customer</span><strong>{submitResult.data.customerName}</strong></div>
                    <div className="detail-row"><span>Quantity</span><strong>{submitResult.data.quantity}</strong></div>
                    <div className="detail-row"><span>Event Type</span><strong className="badge">{submitResult.data.eventType}</strong></div>
                    <div className="detail-row"><span>Timestamp</span><strong>{new Date(submitResult.data.timestamp).toLocaleString()}</strong></div>
                </div>
                <button className="btn btn-primary" onClick={handleReset}>Register Another Event</button>
            </div>
        );
    }

    return (
        <form className="register-form" onSubmit={handleSubmit} noValidate>
            <div className="form-header">
                <h2>Register New Product Event</h2>
                <p>Select from existing catalog data. All fields are mandatory.</p>
            </div>

            {apiError && <div className="alert alert-error">{apiError}</div>}

            {/* ── Step 1: Product Category ── */}
            <div className="form-section">
                <h3 className="section-title">Step 1 — Select Product Category</h3>
                <div className="form-group">
                    <label htmlFor="table">Product Category *</label>
                    <select
                        id="table"
                        name="table"
                        value={form.table}
                        onChange={handleChange}
                        className={errors.table ? 'input-error' : ''}
                    >
                        <option value="">— Select category —</option>
                        {tables.map(t => (
                            <option key={t.key} value={t.key}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                    {errors.table && <span className="error-msg">{errors.table}</span>}
                </div>
            </div>

            {/* ── Step 2: Product Selection ── */}
            <div className="form-section">
                <h3 className="section-title">Step 2 — Select Product</h3>
                <div className="form-group">
                    <label htmlFor="productUid">Product *</label>
                    <select
                        id="productUid"
                        name="productUid"
                        value={form.productUid}
                        onChange={handleChange}
                        disabled={!form.table || loadingProducts}
                        className={errors.productUid ? 'input-error' : ''}
                    >
                        <option value="">
                            {!form.table ? '— Select a category first —'
                                : loadingProducts ? 'Loading products…'
                                    : '— Select product —'}
                        </option>
                        {products.map(p => (
                            <option key={p._uid} value={p._uid}>
                                [{p._uid}] {p.Brand} — {p.DisplayName} | Stock: {p.Stock} | ${p.Price_USD}
                            </option>
                        ))}
                    </select>
                    {errors.productUid && <span className="error-msg">{errors.productUid}</span>}
                </div>

                {/* Product Info Panel */}
                {selectedProduct && (
                    <div className="product-info-panel">
                        <div className="info-grid">
                            <div className="info-item"><span>Brand</span><strong>{selectedProduct.Brand}</strong></div>
                            <div className="info-item"><span>Category</span><strong>{selectedProduct.Category || selectedProduct.Type || '—'}</strong></div>
                            <div className="info-item"><span>Price</span><strong>${selectedProduct.Price_USD}</strong></div>
                            <div className="info-item"><span>Stock</span><strong className={selectedProduct.Stock < 10 ? 'stock-low' : 'stock-ok'}>{selectedProduct.Stock} units</strong></div>
                            <div className="info-item"><span>Rating</span><strong>⭐ {selectedProduct.Rating}</strong></div>
                            {selectedProduct._table === 'packaged_food' && <>
                                <div className="info-item"><span>Flavor</span><strong>{selectedProduct.Flavor}</strong></div>
                                <div className="info-item"><span>Net Weight</span><strong>{selectedProduct.Net_Weight_g}g</strong></div>
                                <div className="info-item"><span>Calories/100g</span><strong>{selectedProduct.Calories_per_100g}</strong></div>
                                <div className="info-item"><span>Packaging</span><strong>{selectedProduct.Packaging_Type}</strong></div>
                                <div className="info-item"><span>Mfg Date</span><strong>{selectedProduct.Manufacture_Date}</strong></div>
                                <div className="info-item"><span>Expiry</span><strong>{selectedProduct.Expiry_Date}</strong></div>
                            </>}
                            {selectedProduct._table === 'baby_products' && <>
                                <div className="info-item"><span>Age Group</span><strong>{selectedProduct.Age_Group}</strong></div>
                                <div className="info-item"><span>Material</span><strong>{selectedProduct.Material}</strong></div>
                                <div className="info-item"><span>Gender</span><strong>{selectedProduct.Gender}</strong></div>
                                <div className="info-item"><span>Weight</span><strong>{selectedProduct.Weight_kg} kg</strong></div>
                            </>}
                            {selectedProduct._table === 'watches' && <>
                                <div className="info-item"><span>Type</span><strong>{selectedProduct.Type}</strong></div>
                                <div className="info-item"><span>Movement</span><strong>{selectedProduct.Movement}</strong></div>
                                <div className="info-item"><span>Strap</span><strong>{selectedProduct.Strap_Material}</strong></div>
                                <div className="info-item"><span>Dial Color</span><strong>{selectedProduct.Dial_Color}</strong></div>
                                <div className="info-item"><span>Gender</span><strong>{selectedProduct.Gender}</strong></div>
                            </>}
                            {selectedProduct._table === 'shoes' && <>
                                <div className="info-item"><span>Color</span><strong>{selectedProduct.Color}</strong></div>
                                <div className="info-item"><span>Size</span><strong>{selectedProduct.Size}</strong></div>
                                <div className="info-item"><span>Gender</span><strong>{selectedProduct.Gender}</strong></div>
                            </>}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Step 3: Serial Number ── */}
            <div className="form-section">
                <h3 className="section-title">Step 3 — Select Serial Number</h3>
                <div className="form-group">
                    <label htmlFor="serialNumber">Serial Number *</label>
                    <select
                        id="serialNumber"
                        name="serialNumber"
                        value={form.serialNumber}
                        onChange={handleChange}
                        disabled={!form.productUid || loadingSerials}
                        className={errors.serialNumber ? 'input-error' : ''}
                    >
                        <option value="">
                            {!form.productUid ? '— Select a product first —'
                                : loadingSerials ? 'Loading serial numbers…'
                                    : serialNumbers.length === 0 ? 'No available serial numbers'
                                        : '— Select serial number —'}
                        </option>
                        {serialNumbers.map(sn => (
                            <option key={sn} value={sn}>{sn}</option>
                        ))}
                    </select>
                    {errors.serialNumber && <span className="error-msg">{errors.serialNumber}</span>}
                    {form.productUid && !loadingSerials && serialNumbers.length === 0 && (
                        <span className="warning-msg">⚠ All serial numbers for this product are used.</span>
                    )}
                </div>
            </div>

            {/* ── Step 4: Customer & Quantity ── */}
            <div className="form-section">
                <h3 className="section-title">Step 4 — Customer & Quantity</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="customerId">Customer / Distributor *</label>
                        <select
                            id="customerId"
                            name="customerId"
                            value={form.customerId}
                            onChange={handleChange}
                            className={errors.customerId ? 'input-error' : ''}
                        >
                            <option value="">— Select customer —</option>
                            {customers.map(c => (
                                <option key={c.customerId} value={c.customerId}>
                                    {c.name} ({c.type}, {c.region})
                                </option>
                            ))}
                        </select>
                        {errors.customerId && <span className="error-msg">{errors.customerId}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="quantity">
                            Quantity *
                            {selectedProduct && <span className="label-hint"> (max: {selectedProduct.Stock})</span>}
                        </label>
                        <input
                            id="quantity"
                            type="number"
                            name="quantity"
                            value={form.quantity}
                            onChange={handleChange}
                            min="1"
                            max={selectedProduct?.Stock || undefined}
                            placeholder="Enter quantity"
                            className={errors.quantity ? 'input-error' : ''}
                        />
                        {errors.quantity && <span className="error-msg">{errors.quantity}</span>}
                    </div>
                </div>
            </div>

            {/* ── Actions ── */}
            <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleReset}>
                    Reset
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                        <><span className="spinner" /> Registering…</>
                    ) : (
                        'Register Event'
                    )}
                </button>
            </div>
        </form>
    );
}
