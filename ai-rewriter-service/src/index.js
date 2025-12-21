/**
 * AI Rewriter Service - Fastify Server
 * 
 * This service provides:
 * - Health check endpoint
 * - Manual trigger for rewriting (optional)
 * 
 * Main functionality is in the rewrite-latest.js script
 * which is designed to run as a cron job.
 */

import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

const PORT = process.env.PORT || 3001;

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'ai-rewriter-service' };
});

// Optional: Manual trigger endpoint
fastify.post('/rewrite/latest', async (request, reply) => {
  try {
    // Import and run the rewrite script
    const { rewriteLatest } = await import('./scripts/rewrite-latest.js');
    const result = await rewriteLatest();
    return { success: true, result };
  } catch (error) {
    fastify.log.error(error);
    reply.code(500);
    return { success: false, error: error.message };
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`AI Rewriter Service running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

