import { FastifyPluginAsync } from 'fastify';
import registry from '../registry';

const verifyDnaRoute: FastifyPluginAsync = async (server) => {
  server.get('/verify-dna', async (request, reply) => {
    const { dna } = request.query as { dna?: string };
    
    if (!dna) {
      return reply.code(400).send({ error: 'DNA parameter is required' });
    }

    const storedFingerprint = registry.getDNA(dna);
    
    if (!storedFingerprint) {
      return reply.send({
        status: 'unregistered',
        dnaMatch: false,
        verificationTime: Date.now()
      });
    }

    if (storedFingerprint.status === 'revoked') {
      return reply.send({
        status: 'revoked',
        dnaMatch: true,
        storedCertificate: storedFingerprint,
        verificationTime: Date.now()
      });
    }

    registry.incrementVerificationCount();

    return reply.send({
      status: 'valid',
      dnaMatch: true,
      storedCertificate: storedFingerprint,
      storedCompliance: storedFingerprint.compliance,
      verificationTime: Date.now()
    });
  });
};

export default verifyDnaRoute;
