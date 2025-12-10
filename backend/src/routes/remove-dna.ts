import { FastifyPluginAsync } from 'fastify';
import registry from '../registry';

const removeDnaRoute: FastifyPluginAsync = async (server) => {
  server.delete('/remove-dna/:dna', async (request, reply) => {
    const { dna } = request.params as { dna: string };
    
    if (!dna) {
      return reply.code(400).send({ error: 'DNA is required' });
    }

    const revoked = registry.revokeDNA(dna);

    if (!revoked) {
      return reply.code(404).send({ error: 'DNA not found in registry' });
    }

    return { success: true, message: 'DNA revoked from registry', dna };
  });
};

export default removeDnaRoute;
