import { prisma } from './prisma.js';
/**
 * Row-Level Security (RLS) Implementation
 *
 * Strategy:
 * 1. PostgreSQL RLS policies (database level)
 * 2. Application-level guards (defense in depth)
 * 3. Organization scoping on all queries
 */
export class RLS {
    /**
     * Set PostgreSQL session variable for RLS
     * Call this at start of each request
     */
    static async setTenantContext(organizationId, userId) {
        // Set session variables for Postgres RLS policies
        await prisma.$executeRawUnsafe(`SELECT set_config('app.org_id', $1, true), set_config('app.user_id', $2, true)`, organizationId, userId);
    }
    /**
     * Middleware to enforce tenant isolation
     */
    static async withTenant(organizationId, userId, fn) {
        await this.setTenantContext(organizationId, userId);
        try {
            return await fn();
        }
        finally {
            // Clear context
            await prisma.$executeRawUnsafe(`SELECT set_config('app.org_id', '', true), set_config('app.user_id', '', true)`);
        }
    }
}
/**
 * SQL Migrations for RLS (run via prisma migrate)
 *
 * These would be in a migration file:
 */
export const RLS_MIGRATIONS = `
-- Enable RLS on all tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_read_models ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their organization
CREATE POLICY tenant_isolation_organizations ON organizations
  USING (id = current_setting('app.org_id', true)::uuid);

CREATE POLICY tenant_isolation_users ON users
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY tenant_isolation_clients ON clients
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY tenant_isolation_projects ON projects
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY tenant_isolation_events ON events
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY tenant_isolation_documents ON documents
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id = current_setting('app.org_id', true)::uuid
    )
  );

-- Admin bypass (for migrations, etc)
CREATE POLICY admin_bypass ON organizations
  FOR ALL
  TO postgres
  USING (true);

-- Function to verify tenant access
CREATE OR REPLACE FUNCTION verify_tenant_access(target_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN target_org_id = current_setting('app.org_id', true)::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;
/**
 * Application-level guards (defense in depth)
 */
export function assertTenantAccess(resourceOrgId, contextOrgId) {
    if (resourceOrgId !== contextOrgId) {
        throw new Error('Access denied: cross-tenant access attempted');
    }
}
export function sanitizeForRole(data, role) {
    // Remove sensitive fields based on role
    const sanitized = { ...data };
    if (role === 'CLIENTE') {
        // Clients can't see internal notes, costs, etc.
        delete sanitized.internalNotes;
        delete sanitized.costEstimate;
    }
    if (role === 'AUDITOR') {
        // Auditors get read-only, no PII
        delete sanitized.contactPhone;
    }
    return sanitized;
}
