-- Dupsy's Timeless Treasure Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('rings', 'necklaces', 'bracelets', 'earrings', 'custom')),
    price DECIMAL(10, 2) NOT NULL,
    material VARCHAR(150) NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT NOT NULL,
    availability BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(20) NOT NULL UNIQUE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    preferred_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered')),
    payment_link TEXT,
    pickup_location TEXT,
    pickup_contact_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security on products and bookings
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Note: No public RLS policies are created.
-- All database access is restricted to the Express backend using the Supabase Service Role Key.

-- Seed Data: Sample Jewelry Products
INSERT INTO public.products (id, name, category, price, material, image_url, description, availability)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'The Sovereign Solitaire Ring', 'rings', 1850.00, '18k Solid Yellow Gold & Diamond', '/images/sovereign-ring.jpg', 'An exquisite hand-crafted 18k solid yellow gold band holding a flawless round brilliant diamond cut for maximum brilliance.', true),
    ('22222222-2222-2222-2222-222222222222', 'Celestial Horizon Pendant', 'necklaces', 2400.00, '18k Solid Yellow Gold', '/images/celestial-pendant.jpg', 'An elegant pendant featuring handcrafted golden geometric curves framing a radiant center gemstone cut.', true),
    ('33333333-3333-3333-3333-333333333333', 'Aura Linked Cuff Bracelet', 'bracelets', 1250.00, '14k Yellow Gold', '/images/aura-cuff.jpg', 'Solid luxury linked cuff designed for effortless daily elegance and subtle wrist statement.', true),
    ('44444444-4444-4444-4444-444444444444', 'Elysian Drop Earrings', 'earrings', 980.00, '18k Gold & Freshwater Pearl', '/images/elysian-earrings.jpg', 'Suspended luxury drop earrings featuring lustrous natural pearls cradled in textured solid gold hardware.', true),
    ('55555555-5555-5555-5555-555555555555', 'Royal Heritage Signet Ring', 'rings', 1600.00, '18k Yellow Gold & Onyx', '/images/heritage-ring.jpg', 'A bold statement signet piece featuring deep black onyx set in carved yellow gold.', true),
    ('66666666-6666-6666-6666-666666666666', 'Bespoke Custom Atelier Piece', 'custom', 3500.00, 'Custom Gold & Selected Gemstones', '/images/custom-atelier.jpg', 'Commission a one of a kind masterpiece designed in collaboration with master goldsmith Dupsy.', true)
ON CONFLICT (id) DO NOTHING;

-- Migration: Add Paystack fields & pickup fields to bookings (safe to run on existing tables)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_contact_number VARCHAR(100);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paystack_ref VARCHAR(100);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2) DEFAULT 0.00;
