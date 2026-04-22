// Core - Role-Based Access Control
import { FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
}

export type Permission =
  | 'project.read'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.transition'
  | 'client.read'
  | 'client.create'
  | 'client.update'
  | 'document.upload'
  | 'document.delete'
  | 'funding.read'
  | 'funding.write'
  | 'audit.read'
  | 'user.manage'
  | 'org.manage';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    'project.read', 'project.create', 'project.update', 'project.delete', 'project.transition',
    'client.read', 'client.create', 'client.update',
    'document.upload', 'document.delete',
    'funding.read', 'funding.write',
    'audit.read',
    'user.manage',
    'org.manage',
  ],
  CONSULTOR: [
    'project.read', 'project.create', 'project.update', 'project.transition',
    'client.read', 'client.create', 'client.update',
    'document.upload',
    'funding.read', 'funding.write',
    'audit.read',
  ],
  CLIENTE: [
    'project.read',
    'client.read',
    'document.upload',
    'funding.read',
  ],
  AUDITOR: [
    'project.read',
    'client.read',
    'funding.read',
    'audit.read',
  ],
};

export class RBAC {
  static hasPermission(role: string, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  }

  static requirePermission(permission: Permission) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user as JWTPayload;
      
      if (!user || !this.hasPermission(user.role, permission)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `Permissão '${permission}' necessária`,
          requiredRole: Object.entries(ROLE_PERMISSIONS)
            .filter(([, perms]) => perms.includes(permission))
            .map(([role]) => role),
        });
      }
    };
  }

  static canAccessProject(user: JWTPayload, projectOrgId: string): boolean {
    // Multi-tenancy: usuário só acessa projetos da própria org
    return user.organizationId === projectOrgId;
  }

  static canTransitionPhase(role: string, fromPhase: string, toPhase: string): boolean {
    // Regras de negócio específicas
    if (role === 'CLIENTE') {
      // Cliente só pode aprovar (APROVACAO_CLIENTE)
      return fromPhase === 'ELABORACAO' && toPhase === 'APROVACAO_CLIENTE';
    }
    
    if (role === 'AUDITOR') return false;
    
    // Consultores e Admins podem tudo (validação mais fina no phase-engine)
    return ['CONSULTOR', 'ADMIN'].includes(role);
  }
}

// Middleware helpers
export const requireRole = (roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as JWTPayload;
    if (!roles.includes(user.role)) {
      return reply.code(403).send({ error: 'Role não autorizado' });
    }
  };
};

const LEGACY_PERMISSION_ALIASES: Record<string, Permission> = {
  'project:read': 'project.read',
  'project:create': 'project.create',
  'project:write': 'project.update',
  'project:approve': 'project.transition',
  'project:transition': 'project.transition',
  'client:read': 'client.read',
  'client:write': 'client.update',
  'audit:read': 'audit.read',
  'funding:read': 'funding.read',
  'funding:write': 'funding.write',
};

export function can(role: string, permission: string): boolean {
  const normalized = (LEGACY_PERMISSION_ALIASES[permission] ?? permission.replace(':', '.')) as Permission;
  return RBAC.hasPermission(role, normalized);
}