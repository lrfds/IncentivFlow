import { ClientService } from './client.service.js';
export async function registerClientRoutes(server) {
    server.get('/api/clients', { preHandler: [server.authenticate, server.authorize('client:read')] }, async (request, reply) => {
        try {
            const clients = await ClientService.listByOrganization(request.db, request.user.organizationId);
            return { clients };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'CLIENT_LIST_ERROR';
            return reply.code(500).send({ error: message, message: 'Não foi possível carregar os clientes.' });
        }
    });
    server.post('/api/clients', { preHandler: [server.authenticate, server.authorize('client:write')] }, async (request, reply) => {
        try {
            const client = await ClientService.create(request.db, {
                ...request.body,
                organizationId: request.user.organizationId,
                userId: request.user.userId,
            });
            return reply.code(201).send({ client });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'CLIENT_CREATE_ERROR';
            const statusCode = message.includes('Já existe') ? 409 : 400;
            return reply.code(statusCode).send({ error: message, message });
        }
    });
    server.get('/api/clients/:id/dossier', { preHandler: [server.authenticate, server.authorize('client:read')] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const dossier = await ClientService.getDossier(request.db, id, request.user.organizationId);
            return dossier;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'CLIENT_DOSSIER_ERROR';
            const statusCode = message.includes('não encontrado') ? 404 : 400;
            return reply.code(statusCode).send({ error: message, message });
        }
    });
}
