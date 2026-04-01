-- ============================================================
-- VeriChain — New Supabase Schema for Consignment Tracking
-- ============================================================
-- Run this in your Supabase SQL Editor.
-- 
-- IMPORTANT: Back up any data in the old `products` table before running.
-- After running, update the app to use table name "consignments".
-- ============================================================

-- Step 1: Drop the old table (ONLY run after backing up your data!)
-- DROP TABLE IF EXISTS public.products;

-- Step 2: Create the new `consignments` table
CREATE TABLE public.consignments (

  -- ── Identity ─────────────────────────────────────────────
  consignment_id      text        NOT NULL,        -- e.g. "CSG-PROD-A100" or Invoice ID
  invoice_id          text,                        -- auto-generated: "INV-VRC-<ts>-<rand>"

  -- ── Product Info ─────────────────────────────────────────
  product_type        text,                        -- e.g. "Electronics", "Pharma"
  product_detail      text,                        -- description
  quantity            integer     NOT NULL DEFAULT 1,  -- units in this consignment

  -- ── Parties ──────────────────────────────────────────────
  created_by          text,                        -- Manufacturer name
  retailer_address    text,                        -- NEW: Retailer wallet/identifier address

  -- ── Financial ────────────────────────────────────────────
  security_fee_inr    numeric,                     -- Registration fee in INR (0.001 ETH)
  transfer_fee_inr    numeric,                     -- Per-stage transfer fee in INR (0.0005 ETH)
  total_payable_inr   numeric,                     -- Total amount payable by retailer (qty × unit_price + fees)

  -- ── Stage 1: Manufacturer → Logistics ────────────────────
  transferred_to      text        NOT NULL DEFAULT 'Pending',  -- Logistics provider name
  transfer_timestamp  timestamptz,
  transfer_hash       text,                        -- keccak256 hash from SupplyChainTracker.sol

  -- ── Stage 2: Logistics → Retailer ────────────────────────
  sell_by             text        NOT NULL DEFAULT 'Pending',  -- Retailer name
  sell_timestamp      timestamptz,
  sell_hash           text,                        -- keccak256 hash from SupplyChainTracker.sol

  -- ── Stage 3: Retailer → Consumer ─────────────────────────
  delivered_to        text        NOT NULL DEFAULT 'Pending',  -- Consumer name
  delivery_timestamp  timestamptz,
  delivery_hash       text,                        -- keccak256 hash from SupplyChainTracker.sol

  -- ── Meta ─────────────────────────────────────────────────
  created_at          timestamptz DEFAULT now(),

  CONSTRAINT consignments_pkey PRIMARY KEY (consignment_id)
);

-- Step 3: Enable Row Level Security (recommended)
ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;

-- Step 4: Allow anonymous reads and inserts (adjust as needed for your auth setup)
CREATE POLICY "Allow anon read"   ON public.consignments FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON public.consignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON public.consignments FOR UPDATE USING (true);

-- ============================================================
-- Column Reference (for developers)
-- ============================================================
-- consignment_id      → Was: "Product id"
-- product_type        → Was: "Product type"
-- product_detail      → Was: "Product detail"
-- quantity            → Was: "Quantity" (now a real column, not embedded in detail)
-- created_by          → Was: "Created by"
-- retailer_address    → NEW
-- security_fee_inr    → NEW (replaces ETH fee display)
-- transferred_to      → Was: "Transferred to supplier"
-- transfer_timestamp  → Was: "Transfer timestamp"
-- transfer_hash       → Was: "Transfer blockchain hash"
-- sell_by             → Was: "Sell by"
-- sell_timestamp      → Was: "Sell timestamp"
-- sell_hash           → Was: "Sell blockchain hash"
-- delivered_to        → Was: "Delivered to"
-- delivery_timestamp  → Was: "Delivery timestamp"
-- delivery_hash       → Was: "Delivery blockchain hash"
-- ============================================================
