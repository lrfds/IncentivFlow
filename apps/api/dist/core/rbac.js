const ROLE_PERMISSIONS = {
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
    static hasPermission(role, permission) {
        return ROLE_PERMISSIONS[role]?.includes(permission) || false;
    }
    static requirePermission(permission) {
        return async (request, reply) => {
            const user = request.user;
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
    static canAccessProject(user, projectOrgId) {
        // Multi-tenancy: usuário só acessa projetos da própria org
        return user.organizationId === projectOrgId;
    }
    static canTransitionPhase(role, fromPhase, toPhase) {
        // Regras de negócio específicas
        if (role === 'CLIENTE') {
            // Cliente só pode aprovar (APROVACAO_CLIENTE)
            return fromPhase === 'ELABORACAO' && toPhase === 'APROVACAO_CLIENTE';
        }
        if (role === 'AUDITOR')
            return false;
        // Consultores e Admins podem tudo (validação mais fina no phase-engine)
        return ['CONSULTOR', 'ADMIN'].includes(role);
    }
}
// Middleware helpers
export const requireRole = (roles) => {
    return async (request, reply) => {
        const user = request.user;
        if (!roles.includes(user.role)) {
            return reply.code(403).send({ error: 'Role não autorizado' });
        }
    };
};
const LEGACY_PERMISSION_ALIASES = {
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
export function can(role, permission) {
    const normalized = (LEGACY_PERMISSION_ALIASES[permission] ?? permission.replace(':', '.'));
    return RBAC.hasPermission(role, normalized);
}
