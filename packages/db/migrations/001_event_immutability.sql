-- Migration: Event Sourcing Immutability & RLS
-- Run after prisma migrate deploy

-- ==================== EVENT IMMUTABILITY ====================
-- Prevent UPDATE/DELETE on events table (source of truth)

CREATE OR REPLACE FUNCTION prevent_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Events are immutable. Type: %, ID: %, Attempted: %', 
    TG_TABLE_NAME, OLD.id, TG_OP
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_events ON "events";
DROP TRIGGER IF EXISTS no_delete_events ON "events";

CREATE TRIGGER no_update_events
  BEFORE UPDATE ON "events"
  FOR EACH ROW EXECUTE FUNCTION prevent_event_mutation();

CREATE TRIGGER no_delete_events
  BEFORE DELETE ON "events"
  FOR EACH ROW EXECUTE FUNCTION prevent_event_mutation();

COMMENT ON TRIGGER no_update_events ON "events" IS 
  'Event sourcing: events are append-only and immutable';

-- ==================== RLS POLICIES ====================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_read_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS tenant_isolation ON organizations;
DROP POLICY IF EXISTS tenant_isolation ON users;
DROP POLICY IF EXISTS tenant_isolation ON clients;
DROP POLICY IF EXISTS tenant_isolation ON projects;
DROP POLICY IF EXISTS tenant_isolation ON events;
DROP POLICY IF EXISTS tenant_isolation ON documents;
DROP POLICY IF EXISTS tenant_isolation ON funding_records;
DROP POLICY IF EXISTS tenant_isolation ON project_read_models;

-- Create RLS policies
CREATE POLICY tenant_isolation ON organizations
  FOR ALL
  USING (id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY tenant_isolation ON users
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY tenant_isolation ON clients
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY tenant_isolation ON projects
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY tenant_isolation ON events
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY tenant_isolation ON project_read_models
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY tenant_isolation ON phase_configs
  FOR ALL
  USING (
    organization_id IS NULL 
    OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid
  );

CREATE POLICY tenant_isolation ON documents
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid
    )
  );

CREATE POLICY tenant_isolation ON funding_records
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid
    )
  );

-- Admin bypass for migrations
CREATE POLICY admin_bypass ON organizations FOR ALL TO postgres USING (true);
CREATE POLICY admin_bypass ON users FOR ALL TO postgres USING (true);
CREATE POLICY admin_bypass ON clients FOR ALL TO postgres USING (true);
CREATE POLICY admin_bypass ON projects FOR ALL TO postgres USING (true);
CREATE POLICY admin_bypass ON events FOR ALL TO postgres USING (true);

-- ==================== HASH CHAIN VERIFICATION ====================

CREATE OR REPLACE FUNCTION verify_event_chain(p_aggregate_id uuid)
RETURNS TABLE(
  is_valid boolean,
  broken_at integer,
  total_events bigint
) AS $$
DECLARE
  rec RECORD;
  prev_hash text := NULL;
  calc_hash text;
  ver int := 0;
BEGIN
  FOR rec IN 
    SELECT id, version, type, payload, prev_hash, hash, created_at
    FROM events 
    WHERE aggregate_id = p_aggregate_id 
    ORDER BY version ASC
  LOOP
    ver := rec.version;
    
    -- Recalculate hash
    calc_hash := encode(
      digest(
        COALESCE(prev_hash, '') || 
        rec.type || 
        rec.payload::text || 
        rec.version::text || 
        p_aggregate_id::text ||
        rec.created_at::text,
        'sha256'
      ),
      'hex'
    );
    
    IF rec.hash != calc_hash OR rec.prev_hash IS DISTINCT FROM prev_hash THEN
      RETURN QUERY SELECT false, ver, (SELECT COUNT(*) FROM events WHERE aggregate_id = p_aggregate_id);
      RETURN;
    END IF;
    
    prev_hash := rec.hash;
  END LOOP;
  
  RETURN QUERY SELECT true, NULL::integer, (SELECT COUNT(*) FROM events WHERE aggregate_id = p_aggregate_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_event_chain IS 
  'Verifies SHA-256 hash chain integrity for an aggregate';

-- ==================== INDEXES FOR PERFORMANCE ====================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_aggregate_version 
  ON events(aggregate_id, version);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_org_created 
  ON events(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_hash 
  ON events(hash);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_org_phase 
  ON projects(organization_id, current_phase) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_deadline 
  ON projects(submission_deadline) WHERE deleted_at IS NULL AND submission_deadline IS NOT NULL;

-- ==================== IDEMPOTENCY TRACKING ====================

-- Add last_event_id to projects for idempotent projections
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_event_id uuid;

CREATE INDEX IF NOT EXISTS idx_projects_last_event 
  ON projects(last_event_id);

COMMENT ON COLUMN projects.last_event_id IS 
  'For idempotent CQRS projections - tracks last processed event';

-- Same for read models
ALTER TABLE project_read_models ADD COLUMN IF NOT EXISTS last_event_id uuid;

-- ==================== AUDIT FUNCTION ====================

CREATE OR REPLACE FUNCTION get_project_timeline(p_project_id uuid)
RETURNS TABLE(
  event_time timestamptz,
  event_type text,
  payload jsonb,
  user_id uuid,
  version int
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.created_at,
    e.type,
    e.payload,
    (e.metadata->>'userId')::uuid,
    e.version
  FROM events e
  WHERE e.aggregate_id = p_project_id
  ORDER BY e.version ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;