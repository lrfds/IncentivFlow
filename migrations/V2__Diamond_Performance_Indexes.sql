-- ============================================================
-- IncentivFlow Diamond: Índices de Performance Elite
-- Executar após prisma migrate deploy
-- ============================================================

-- 1. Índice GIN em payload de eventos (Red Zone & Audit Chain queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_payload_gin
  ON events USING GIN (payload jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_metadata_gin
  ON events USING GIN (metadata jsonb_path_ops);

-- 2. Índice GIN em metadata de clientes (Score de Elegibilidade 360°)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_metadata_gin
  ON clients USING GIN (metadata jsonb_path_ops);

-- 3. Índice parcial para Red Zone (60 dias) — projetos ativos com prazo definido
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_deadline_active
  ON projects (submission_deadline)
  WHERE deleted_at IS NULL
    AND status = 'EM_ANDAMENTO'
    AND submission_deadline IS NOT NULL;

-- 4. Índice parcial para Outbox Worker — apenas mensagens não processadas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_pending
  ON outbox (created_at)
  WHERE processed = false;

-- 5. View Materializada: Red Zone (Capital em Risco — 60 dias)
CREATE MATERIALIZED VIEW IF NOT EXISTS project_read_models AS
  SELECT
    p.id,
    p.organization_id,
    p.client_id,
    c.name            AS client_name,
    p.code,
    p.title,
    p.current_phase   AS phase,
    p.status,
    p.value_approved  AS approved_value,
    p.value_captured  AS captured_value,
    CASE
      WHEN p.value_approved > 0
      THEN ROUND((p.value_captured / p.value_approved * 100)::numeric, 2)
      ELSE 0
    END               AS capture_percent,
    p.submission_deadline,
    EXTRACT(DAY FROM p.submission_deadline - NOW())::INT AS days_to_deadline,
    p.updated_at
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.deleted_at IS NULL
WITH DATA;

-- Índice único na view materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_prm_id ON project_read_models (id);
CREATE INDEX IF NOT EXISTS idx_prm_org_phase ON project_read_models (organization_id, phase);
CREATE INDEX IF NOT EXISTS idx_prm_org_status ON project_read_models (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_prm_days_deadline ON project_read_models (days_to_deadline);

-- Refresh automático (chamar após qualquer update em projects)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY project_read_models;
