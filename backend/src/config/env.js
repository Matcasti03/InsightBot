import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

const dataProvider = process.env.DATA_PROVIDER ?? 'local';
if (!['local', 'supabase'].includes(dataProvider)) throw new Error('DATA_PROVIDER deve ser local ou supabase.');

export const env = {
  dataProvider,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? (dataProvider === 'local' ? '127.0.0.1' : '0.0.0.0'),
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  supabaseUrl: dataProvider === 'supabase' ? required('SUPABASE_URL') : null,
  supabaseServiceRoleKey: dataProvider === 'supabase' ? required('SUPABASE_SERVICE_ROLE_KEY') : null,
  superadmin: {
    email: process.env.SUPERADMIN_EMAIL ?? 'admin@insightbot.dev',
    password: process.env.SUPERADMIN_PASSWORD ?? 'Insight@2026',
    fullName: process.env.SUPERADMIN_NAME ?? 'Gestor Master InSightBot'
  },
  seedDemo: (process.env.SEED_DEMO ?? 'true').toLowerCase() !== 'false',
  demoPassword: process.env.DEMO_PASSWORD ?? 'Insight@2026'
};
