import { FastifyPluginAsync } from 'fastify';
import sharp from 'sharp';

const uploadRoute: FastifyPluginAsync = async (server) => {
  server.post('/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const mime = data.mimetype;
    if (mime !== 'image/jpeg' && mime !== 'image/png') {
      return reply.code(400).send({ error: 'Only JPEG and PNG images are supported' });
    }

    const buffer = await data.toBuffer();
    const metadata = await sharp(buffer).metadata();

    return {
      filename: data.filename,
      size: buffer.length,
      contentType: mime,
      width: metadata.width,
      height: metadata.height,
      buffer: buffer.toString('base64')
    };
  });
};

export default uploadRoute;
