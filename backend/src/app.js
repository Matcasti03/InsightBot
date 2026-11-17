import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

export function createApp() {
  const app = express();

  if (env.nodeEnv === 'production') app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origem nao permitida pelo CORS.'));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'insightbot-api', database: env.dataProvider, timestamp: new Date().toISOString() });
  });

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Muitas requisicoes. Tente novamente em alguns minutos.' }
    })
  );

  if (env.dataProvider === 'local') {
    const directory = process.env.LOCAL_DATA_DIR || fileURLToPath(new URL('../data', import.meta.url));
    app.use('/uploads/avatars', express.static(resolve(directory, 'uploads/avatars'), { dotfiles: 'deny', index: false }));
  }
  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
