-- PostgreSQL DDL for Financial Control & CRM
-- Generated for reference as requested in requirements.

-- CRM: Clients, Intermediaries, Suppliers
CREATE TYPE entity_type AS ENUM ('client', 'intermediary', 'supplier');

CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type entity_type NOT NULL,
    contact VARCHAR(255),
    rate DECIMAL(10, 2) DEFAULT 0.00, -- Fixed rate for intermediaries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Digital Services Management
CREATE TYPE service_status AS ENUM ('active', 'expired', 'pending');

CREATE TABLE digital_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255),
    pin VARCHAR(10),
    supplier VARCHAR(255),
    cost DECIMAL(10, 2) NOT NULL,
    retail_price DECIMAL(10, 2) NOT NULL,
    profit DECIMAL(10, 2) GENERATED ALWAYS AS (retail_price - cost) STORED,
    expiration_date DATE NOT NULL,
    status service_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Credential History & Traceability
CREATE TABLE service_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES digital_services(id) ON DELETE CASCADE,
    change_description TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ANT Data Updates Module (Transactional)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intermediary_id UUID REFERENCES entities(id),
    final_client_name VARCHAR(255) NOT NULL,
    warehouse VARCHAR(255) NOT NULL, -- Almacén
    billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    base_cost DECIMAL(10, 2) DEFAULT 5.00,
    charged_rate DECIMAL(10, 2) NOT NULL, -- Pulled from intermediary.rate at time of transaction
    is_paid BOOLEAN DEFAULT FALSE,
    liquidation_id UUID, -- Reference for block liquidation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dual-Ledger Treasury
CREATE TYPE ledger_type AS ENUM ('personal', 'business');
CREATE TYPE wallet_type AS ENUM ('cash', 'bank', 'digital_wallet');

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type wallet_type NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type ledger_type NOT NULL,
    category VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    wallet_id UUID REFERENCES wallets(id),
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Constraints & Indices
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_services_expiry ON digital_services(expiration_date);
CREATE INDEX idx_transactions_intermediary ON transactions(intermediary_id);
CREATE INDEX idx_ledger_type ON ledger_entries(type);
