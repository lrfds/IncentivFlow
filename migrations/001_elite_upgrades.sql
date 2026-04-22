-- IncentivFlow - Elite Upgrades Migration
-- Snapshots + Outbox + Optimistic Locking + Immutability

-- ==================== 1. SNAPSHOTS ====================
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(50) DEFAULT 'Project',
  version INTEGER NOT NULL,
  state JSONB NOT NULL,
  checksum CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_aggregate_version UNIQUE (aggregate_id, version)
);

CREATE INDEX idx_snapshots_aggregate ON snapshots(aggregate_id, version DESC);
CREATE INDEX idx_snapshots_type_created ON snapshots(aggregate_type, created_at DESC);

COMMENT ON TABLE snapshots IS 'Event sourcing snapshots for O(1) replay instead of O(n)';

-- ==================== 2. OUTBOX PATTERN ====================
CREATE TABLE IF NOT EXISTS outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  aggregate_id UUID NOT NULL,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  CONSTRAINT fk_outbox_event FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE INDEX idx_outbox_unprocessed ON outbox(processed, created_at) WHERE NOT processed;
CREATE INDEX idx_outbox_aggregate ON outbox(aggregate_id);
CREATE INDEX idx_outbox_type ON outbox(type, processed);

COMMENT ON TABLE outbox IS 'Transactional outbox for guaranteed event delivery (exactly-once processing)';

-- ==================== 3. OPTIMISTIC LOCKING ====================
-- Add version check constraint (PostgreSQL 15+)
ALTER TABLE projects ADD CONSTRAINT projects_version_positive CHECK (version >= 0);

-- Create function for version validation
CREATE OR REPLACE FUNCTION check_project_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version <= OLD.version THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_FAILED: Expected version > %, got %', OLD.version, NEW.version
      USING ERRCODE = '40001'; -- serialization_failure
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_version_check ON projects;
CREATE TRIGGER project_version_check
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION check_project_version();

COMMENT ON FUNCTION check_project_version() IS 'Enforces optimistic locking - prevents lost updates';

-- ==================== 4. EVENT IMMUTABILITY (CRITICAL) ====================
CREATE OR REPLACE FUNCTION prevent_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'EVENTS_ARE_IMMUTABLE: Cannot % event % (hash: %)', 
    TG_OP, OLD.id, OLD.hash
    USING ERRCODE = '25001'; -- immutable violation
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_events ON events;
CREATE TRIGGER no_update_events
  BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_event_mutation();

DROP TRIGGER IF EXISTS no_update_outbox ON outbox;
CREATE TRIGGER no_update_outbox
  BEFORE UPDATE OF event_id, aggregate_id, type, payload ON outbox
  FOR EACH ROW
  EXECUTE FUNCTION prevent_event_mutation();

COMMENT ON FUNCTION prevent_event_mutation() IS 'Enforces append-only event store at database level';

-- ==================== 5. SNAPSHOT INTEGRITY ====================
CREATE OR REPLACE FUNCTION verify_snapshot_checksum()
RETURNS TRIGGER AS $$
DECLARE
  computed_hash TEXT;
BEGIN
  computed_hash := encode(digest(NEW.state::text, 'sha256'), 'hex');
  
  IF computed_hash != NEW.checksum THEN
    RAISE EXCEPTION 'SNAPSHOT_CHECKSUM_MISMATCH: Expected %, got %', NEW.checksum, computed_hash;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS snapshot_checksum_check ON snapshots;
CREATE TRIGGER snapshot_checksum_check
  BEFORE INSERT OR UPDATE ON snapshots
  FOR EACH ROW
  EXECUTE FUNCTION verify_snapshot_checksum();

-- ==================== 6. RLS POLICIES (ELITE) ====================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS tenant_isolation_projects ON projects;
DROP POLICY IF EXISTS tenant_isolation_events ON events;

-- Projects RLS
CREATE POLICY tenant_isolation_projects
  ON projects
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- Events RLS  
CREATE POLICY tenant_isolation_events
  ON events
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- Snapshots RLS (via join to projects)
CREATE POLICY tenant_isolation_snapshots
  ON snapshots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = snapshots.aggregate_id 
      AND p.organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid
    )
  );

-- ==================== 7. HELPER FUNCTIONS ====================

-- Verify event chain integrity
CREATE OR REPLACE FUNCTION verify_event_chain(p_aggregate_id UUID)
RETURNS TABLE(version INTEGER, valid BOOLEAN, expected_hash TEXT, actual_hash TEXT) AS $$
DECLARE
  rec RECORD;
  prev_hash TEXT := NULL;
  computed_hash TEXT;
BEGIN
  FOR rec IN 
    SELECT * FROM events 
    WHERE aggregate_id = p_aggregate_id 
    ORDER BY version ASC
  LOOP
    computed_hash := encode(
      digest(
        COALESCE(prev_hash, '') || 
        rec.type || 
        rec.payload::text || 
        rec.version::text || 
        rec.aggregate_id::text ||
        rec.created_at::text,
        'sha256'
      ),
      'hex'
    );
    
    RETURN QUERY SELECT 
      rec.version,
      (computed_hash = rec.hash AND rec.prev_hash IS NOT DISTINCT FROM prev_hash),
      computed_hash,
      rec.hash;
    
    prev_hash := rec.hash;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_event_chain IS 'Verifies hash chain integrity for an aggregate';

-- Get project state at specific version (time travel)
CREATE OR REPLACE FUNCTION project_at_version(p_project_id UUID, p_version INTEGER)
RETURNS JSONB AS $$
DECLARE
  snapshot_rec RECORD;
  events_to_apply INTEGER;
BEGIN
  -- Find latest snapshot before version
  SELECT * INTO snapshot_rec
  FROM snapshots
  WHERE aggregate_id = p_project_id AND version <= p_version
  ORDER BY version DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No snapshot found, would need full replay');
  END IF;
  
  events_to_apply := p_version - snapshot_rec.version;
  
  RETURN jsonb_build_object(
    'snapshot_version', snapshot_rec.version,
    'target_version', p_version,
    'events_to_apply', events_to_apply,
    'state', snapshot_rec.state
  );
END;
$$ LANGUAGE plpgsql;

-- ==================== 8. MONITORING VIEWS ====================

CREATE OR REPLACE VIEW v_outbox_stats AS
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE NOT processed) as unprocessed,
  COUNT(*) FILTER (WHERE NOT processed AND attempts >= 3) as failing,
  MIN(created_at) FILTER (WHERE NOT processed) as oldest_unprocessed,
  MAX(attempts) as max_attempts
FROM outbox;

CREATE OR REPLACE VIEW v_event_chain_health AS
SELECT
  aggregate_id,
  COUNT(*) as event_count,
  MAX(version) as latest_version,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event,
  -- Check for gaps
  MAX(version) - COUNT(*) as version_gaps
FROM events
GROUP BY aggregate_id
HAVING MAX(version) != COUNT(*); -- Find aggregates with missing versions

CREATE OR REPLACE VIEW v_snapshot_coverage AS
SELECT
  p.id as project_id,
  p.code,
  p.version as current_version,
  s.version as latest_snapshot,
  p.version - COALESCE(s.version, 0) as events_since_snapshot,
  CASE 
    WHEN s.version IS NULL THEN 'NO_SNAPSHOT'
    WHEN p.version - s.version > 200 THEN 'STALE'
    WHEN p.version - s.version > 100 THEN 'DUE'
    ELSE 'FRESH'
  END as snapshot_status
FROM projects p
LEFT JOIN LATERAL (
  SELECT version FROM snapshots 
  WHERE aggregate_id = p.id 
  ORDER BY version DESC 
  LIMIT 1
) s ON true
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW v_snapshot_coverage IS 'Monitor snapshot freshness for performance';

-- Grant permissions
GRANT SELECT ON v_outbox_stats, v_event_chain_health, v_snapshot_coverage TO PUBLIC;