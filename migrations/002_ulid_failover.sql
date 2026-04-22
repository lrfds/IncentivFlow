-- ==================== IncentivFlow — Migration 002 ====================
-- ULID Support + Failover Infrastructure + Event Versioning
-- =====================================================================

-- ==================== 1. ULID FUNCTIONS ====================

-- Crockford Base32 encoding for ULID
CREATE OR REPLACE FUNCTION ulid_to_uuid(ulid_str TEXT)
RETURNS UUID AS $$
DECLARE
  encoding TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  value NUMERIC := 0;
  hex_str TEXT;
  i INT;
  char_idx INT;
BEGIN
  IF length(ulid_str) != 26 THEN
    RAISE EXCEPTION 'Invalid ULID length: %', length(ulid_str);
  END IF;
  
  FOR i IN 1..26 LOOP
    char_idx := position(upper(substring(ulid_str FROM i FOR 1)) IN encoding) - 1;
    IF char_idx < 0 THEN
      RAISE EXCEPTION 'Invalid ULID character at position %', i;
    END IF;
    value := value * 32 + char_idx;
  END LOOP;
  
  hex_str := lpad(to_hex(value::BIGINT), 32, '0');
  
  RETURN (
    substring(hex_str FROM 1 FOR 8) || '-' ||
    substring(hex_str FROM 9 FOR 4) || '-' ||
    substring(hex_str FROM 13 FOR 4) || '-' ||
    substring(hex_str FROM 17 FOR 4) || '-' ||
    substring(hex_str FROM 21 FOR 12)
  )::UUID;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Extract timestamp from ULID-based UUID
CREATE OR REPLACE FUNCTION ulid_timestamp(id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  hex_str TEXT;
  ts_ms BIGINT;
BEGIN
  hex_str := replace(id::TEXT, '-', '');
  -- First 12 hex chars (48 bits) = timestamp in ms
  ts_ms := ('x' || substring(hex_str FROM 1 FOR 12))::BIT(48)::BIGINT;
  RETURN to_timestamp(ts_ms / 1000.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION ulid_timestamp IS 'Extract creation timestamp from ULID-encoded UUID';

-- ==================== 2. EVENT VERSIONING ====================

-- Add schema_version column to events (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'schema_version'
  ) THEN
    ALTER TABLE events ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Index for version queries
CREATE INDEX IF NOT EXISTS idx_events_schema_version 
  ON events(type, schema_version);

-- Function to check event schema compatibility
CREATE OR REPLACE FUNCTION validate_event_schema()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure schema version is positive
  IF NEW.schema_version < 1 THEN
    RAISE EXCEPTION 'Invalid schema_version: must be >= 1, got %', NEW.schema_version;
  END IF;
  
  -- Ensure version is monotonically increasing per aggregate
  IF EXISTS (
    SELECT 1 FROM events 
    WHERE aggregate_id = NEW.aggregate_id 
    AND version >= NEW.version
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Event version conflict: aggregate % already has version >= %', 
      NEW.aggregate_id, NEW.version;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_event_schema_trigger ON events;
CREATE TRIGGER validate_event_schema_trigger
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_schema();

-- ==================== 3. FAILOVER TRACKING ====================

-- Table to track cluster state
CREATE TABLE IF NOT EXISTS cluster_regions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'REPLICA',
  endpoint TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  status VARCHAR(20) NOT NULL DEFAULT 'healthy',
  lag_ms INTEGER NOT NULL DEFAULT 0,
  last_health_check TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  writes_per_day INTEGER NOT NULL DEFAULT 0,
  replication_slot VARCHAR(100),
  availability_zone VARCHAR(50),
  provider VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_role CHECK (role IN ('PRIMARY', 'REPLICA', 'PROMOTING', 'DEMOTING', 'OFFLINE')),
  CONSTRAINT valid_status CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'offline'))
);

-- Only one primary at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_primary 
  ON cluster_regions(role) WHERE role = 'PRIMARY';

COMMENT ON TABLE cluster_regions IS 'Multi-region cluster state for automatic failover';

-- Failover event log (append-only)
CREATE TABLE IF NOT EXISTS failover_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  from_region VARCHAR(50) NOT NULL,
  to_region VARCHAR(50),
  details JSONB NOT NULL DEFAULT '{}',
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failover_events_created 
  ON failover_events(created_at DESC);

-- Immutable failover events
CREATE OR REPLACE FUNCTION prevent_failover_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Failover events are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_failover_events ON failover_events;
CREATE TRIGGER no_update_failover_events
  BEFORE UPDATE OR DELETE ON failover_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_failover_event_mutation();

-- ==================== 4. PARALLEL REBUILD TRACKING ====================

CREATE TABLE IF NOT EXISTS rebuild_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  config JSONB NOT NULL DEFAULT '{}',
  progress JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_rebuild_status CHECK (
    status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'ABORTED')
  )
);

CREATE TABLE IF NOT EXISTS rebuild_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rebuild_job_id UUID NOT NULL REFERENCES rebuild_jobs(id),
  chunk_index INTEGER NOT NULL,
  aggregate_ids TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  events_processed INTEGER DEFAULT 0,
  migrations_applied INTEGER DEFAULT 0,
  snapshots_used INTEGER DEFAULT 0,
  snapshots_created INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  CONSTRAINT valid_chunk_status CHECK (
    status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')
  )
);

CREATE INDEX IF NOT EXISTS idx_rebuild_chunks_job 
  ON rebuild_chunks(rebuild_job_id, chunk_index);

-- ==================== 5. LAMPORT CLOCK TABLE ====================

CREATE TABLE IF NOT EXISTS lamport_clocks (
  region_id VARCHAR(50) PRIMARY KEY REFERENCES cluster_regions(id),
  counter BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to increment Lamport clock
CREATE OR REPLACE FUNCTION lamport_tick(p_region_id VARCHAR(50))
RETURNS BIGINT AS $$
DECLARE
  new_counter BIGINT;
BEGIN
  UPDATE lamport_clocks 
  SET counter = counter + 1, last_updated = NOW()
  WHERE region_id = p_region_id
  RETURNING counter INTO new_counter;
  
  IF NOT FOUND THEN
    INSERT INTO lamport_clocks (region_id, counter)
    VALUES (p_region_id, 1)
    RETURNING counter INTO new_counter;
  END IF;
  
  RETURN new_counter;
END;
$$ LANGUAGE plpgsql;

-- Function to receive remote Lamport clock
CREATE OR REPLACE FUNCTION lamport_receive(
  p_region_id VARCHAR(50), 
  p_remote_counter BIGINT
)
RETURNS BIGINT AS $$
DECLARE
  local_counter BIGINT;
  new_counter BIGINT;
BEGIN
  SELECT counter INTO local_counter 
  FROM lamport_clocks 
  WHERE region_id = p_region_id;
  
  new_counter := GREATEST(COALESCE(local_counter, 0), p_remote_counter) + 1;
  
  INSERT INTO lamport_clocks (region_id, counter, last_updated)
  VALUES (p_region_id, new_counter, NOW())
  ON CONFLICT (region_id) DO UPDATE
  SET counter = new_counter, last_updated = NOW();
  
  RETURN new_counter;
END;
$$ LANGUAGE plpgsql;

-- ==================== 6. MONITORING VIEWS ====================

-- Cluster health overview
CREATE OR REPLACE VIEW v_cluster_health AS
SELECT 
  cr.id,
  cr.name,
  cr.role,
  cr.status,
  cr.lag_ms,
  cr.consecutive_failures,
  cr.writes_per_day,
  lc.counter as lamport_counter,
  cr.last_health_check,
  EXTRACT(EPOCH FROM (NOW() - cr.last_health_check)) as seconds_since_check,
  CASE 
    WHEN cr.consecutive_failures >= 3 THEN 'CRITICAL'
    WHEN cr.lag_ms > 1000 THEN 'HIGH'
    WHEN cr.lag_ms > 500 THEN 'MEDIUM'
    ELSE 'LOW'
  END as risk_level
FROM cluster_regions cr
LEFT JOIN lamport_clocks lc ON cr.id = lc.region_id
ORDER BY cr.priority ASC;

-- Rebuild job progress
CREATE OR REPLACE VIEW v_rebuild_progress AS
SELECT 
  rj.id,
  rj.status,
  rj.organization_id,
  COUNT(rc.id) as total_chunks,
  COUNT(rc.id) FILTER (WHERE rc.status = 'COMPLETED') as completed_chunks,
  COUNT(rc.id) FILTER (WHERE rc.status = 'FAILED') as failed_chunks,
  SUM(rc.events_processed) as total_events_processed,
  SUM(rc.migrations_applied) as total_migrations,
  SUM(rc.snapshots_used) as total_snapshots_used,
  SUM(rc.snapshots_created) as total_snapshots_created,
  rj.started_at,
  rj.completed_at,
  EXTRACT(EPOCH FROM (COALESCE(rj.completed_at, NOW()) - rj.started_at)) * 1000 as duration_ms
FROM rebuild_jobs rj
LEFT JOIN rebuild_chunks rc ON rj.id = rc.rebuild_job_id
GROUP BY rj.id;

-- Event schema version distribution
CREATE OR REPLACE VIEW v_event_schema_versions AS
SELECT 
  type,
  schema_version,
  COUNT(*) as event_count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM events
GROUP BY type, schema_version
ORDER BY type, schema_version;

COMMENT ON VIEW v_cluster_health IS 'Real-time cluster health with risk assessment';
COMMENT ON VIEW v_rebuild_progress IS 'Parallel rebuild job progress tracking';
COMMENT ON VIEW v_event_schema_versions IS 'Event schema version distribution for migration planning';
