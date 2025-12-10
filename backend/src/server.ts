import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import uploadRoute from './routes/upload';
import generateDnaRoute from './routes/generate-dna';
import verifyRoute from './routes/verify';
import verifyDnaRoute from './routes/verify-dna';
import phishingCheckRoute from './routes/phishing-check';
import removeDnaRoute from './routes/remove-dna';
import statsRoute from './routes/stats';

const server = Fastify({ 
  logger: true,
  bodyLimit: 10 * 1024 * 1024
});

server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  credentials: true
});

server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

server.register(uploadRoute);
server.register(generateDnaRoute);
server.register(verifyRoute);
server.register(verifyDnaRoute);
server.register(phishingCheckRoute);
server.register(removeDnaRoute);
server.register(statsRoute);

const port = parseInt(process.env.PORT || '3001', 10);
const publicVerifyUrl = process.env.PUBLIC_VERIFY_URL || 'http://localhost:3000';

server.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
  console.log(`Public verify endpoint: ${publicVerifyUrl}`);
});
