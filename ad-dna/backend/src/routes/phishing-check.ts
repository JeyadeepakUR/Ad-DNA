import { FastifyPluginAsync } from 'fastify';

const WHITELIST = ['tesco.com', 'tesco.co.uk'];

function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

const phishingCheckRoute: FastifyPluginAsync = async (server) => {
  server.post('/phishing-check', async (request, reply) => {
    const { url } = request.body as { url: string };
    
    if (!url) {
      return reply.code(400).send({ error: 'URL is required' });
    }

    const domain = extractDomain(url);
    
    if (!domain) {
      return reply.code(400).send({ error: 'Invalid URL' });
    }

    const authentic = WHITELIST.some(d => domain === d || domain.endsWith(`.${d}`));

    return { authentic, domain };
  });
};

export default phishingCheckRoute;
