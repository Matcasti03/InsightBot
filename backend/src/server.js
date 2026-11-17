import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();

const server = app.listen(env.port, env.host, () => {
  console.log(`InSightBot API online em http://localhost:${env.port}`);
});

function shutdown(signal) {
  console.log(`Recebido ${signal}. Encerrando API...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
