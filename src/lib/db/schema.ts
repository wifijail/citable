/**
 * Database schema. Every statement is idempotent (`if not exists`), and the app
 * runs them automatically on its first query, so a fresh Neon/Supabase database
 * needs no manual setup. Later additions are appended as `alter table … add column
 * if not exists`, so existing databases upgrade in place.
 */
export const SCHEMA_STATEMENTS: readonly string[] = [
  `create table if not exists scans (
    id text primary key,
    url text not null,
    final_url text not null,
    score integer not null,
    grade text not null,
    plan text not null,
    locale text not null,
    ip_hash text,
    report jsonb not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists scans_ip_created_idx on scans (ip_hash, created_at desc)`,
  `create index if not exists scans_created_idx on scans (created_at desc)`,

  `create table if not exists leads (
    id bigserial primary key,
    email text not null,
    source text not null,
    scanned_url text,
    score integer,
    locale text not null,
    created_at timestamptz not null default now(),
    unique (email, source)
  )`,

  `create table if not exists contact_messages (
    id bigserial primary key,
    name text,
    email text not null,
    topic text not null,
    message text not null,
    locale text not null,
    created_at timestamptz not null default now()
  )`,

  `create table if not exists checkouts (
    claim_token text primary key,
    product text not null,
    provider text not null,
    locale text not null,
    email text,
    created_at timestamptz not null default now()
  )`,

  `create table if not exists licenses (
    id bigserial primary key,
    license_key text not null unique,
    idempotency_key text not null unique,
    email text,
    plan text not null,
    product text not null,
    provider text not null,
    customer_ref text,
    subscription_ref text,
    status text not null default 'active',
    period_end timestamptz,
    claim_token text,
    locale text not null default 'en',
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists licenses_claim_idx on licenses (claim_token)`,
  `create index if not exists licenses_subscription_idx on licenses (provider, subscription_ref)`,
  `create index if not exists licenses_customer_idx on licenses (provider, customer_ref)`,

  `create table if not exists payment_requests (
    id bigserial primary key,
    claim_token text not null unique,
    product text not null,
    email text not null,
    reference text not null,
    message text,
    locale text not null,
    status text not null default 'pending',
    license_id bigint,
    consent_at timestamptz not null,
    consent_version text not null,
    created_at timestamptz not null default now(),
    decided_at timestamptz
  )`,
  `create index if not exists payment_requests_status_idx on payment_requests (status, created_at desc)`,

  // 2026-09: consent records and optional contact name.
  `alter table leads add column if not exists consent_at timestamptz`,
  `alter table leads add column if not exists consent_version text`,
  `alter table contact_messages add column if not exists consent_at timestamptz`,
  `alter table contact_messages add column if not exists consent_version text`,
  `alter table contact_messages alter column name drop not null`,
];
