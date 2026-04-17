-- Inventory Service: Create inventory levels table
-- Migration: 001-create-inventory-levels-table.sql

-- UP
CREATE TABLE IF NOT EXISTS inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID UNIQUE NOT NULL,
  quantity_available INT NOT NULL DEFAULT 0,
  quantity_reserved INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory_levels(product_id);

-- DOWN
DROP TABLE IF EXISTS inventory_levels;
