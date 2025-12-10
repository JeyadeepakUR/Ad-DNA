import { FastifyPluginAsync } from 'fastify';
import registry from '../registry';

const statsRoute: FastifyPluginAsync = async (server) => {
  server.get('/stats', async (request, reply) => {
    const stats = registry.getStats();
    return stats;
  });
};

export default statsRoute;
