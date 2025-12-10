import { FastifyPluginAsync } from 'fastify';
import { verifyFingerprint } from '../services/dnaService';

const verifyRoute: FastifyPluginAsync = async (server) => {
  server.post('/verify', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const mime = data.mimetype;
    if (mime !== 'image/jpeg' && mime !== 'image/png') {
      return reply.code(400).send({ error: 'Only JPEG and PNG images are supported' });
    }

    const buffer = await data.toBuffer();
    const result = await verifyFingerprint(buffer, mime);
    return result;
  });
};

export default verifyRoute;
