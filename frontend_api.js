/**
 * api.js — Centralized API service layer using Axios.
 * All backend calls go through here. Base URL proxied via vite.config.js.
 */

import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — normalize errors
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message =
            error.response?.data?.message ||
            error.message ||
            'An unexpected error occurred';
        return Promise.reject({ message, details: error.response?.data });
    }
);

// ── Product Tables ────────────────────────────────────────────────────────────
export const fetchTables = () => api.get('/tables');

// ── Products ──────────────────────────────────────────────────────────────────
export const fetchProducts = (params = {}) => api.get('/products', { params });
export const fetchProductByUid = (uid) => api.get(`/products/${uid}`);

// ── Serial Numbers ────────────────────────────────────────────────────────────
export const fetchSerialNumbers = (productUid) =>
    api.get('/serial-numbers', { params: { productUid } });

// ── Customers ─────────────────────────────────────────────────────────────────
export const fetchCustomers = () => api.get('/customers');

// ── Events ────────────────────────────────────────────────────────────────────
export const registerEvent = (payload) => api.post('/events', payload);
export const fetchEvents = () => api.get('/events');
