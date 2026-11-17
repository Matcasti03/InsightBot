import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

async function readEnv(folder) {
  try {
    return parse(await readFile(new URL(`../../../${folder}/.env`, import.meta.url)));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}
const backend = { ...await readEnv('backend'), ...process.env };
const frontend = { ...await readEnv('frontend'), ...process.env };
let failures = 0;
function check(valid, message) {
  console.log(`${valid ? 'OK' : 'FALHA'}: ${message}`);
  if (!valid) failures++;
  return valid;
}
function configured(value) {
  return Boolean(value && !/SEU-PROJETO|sua-service-role-key|sua-anon-key/i.test(value));
}
const local = (backend.DATA_PROVIDER ?? 'local') === 'local';
if (local) {
  if (backend.LOCAL_DATA_DIR) process.env.LOCAL_DATA_DIR = backend.LOCAL_DATA_DIR;
  const { db, localClient, dataDirectory } = await import('../local/database.js');
  check((frontend.VITE_DATA_PROVIDER ?? 'local') === 'local', 'Frontend configurado para banco local');
  check(db.prepare('PRAGMA integrity_check').get().integrity_check === 'ok', 'Integridade do SQLite');
  for (const table of ['profiles', 'health_units', 'exams', 'biopsy_samples', 'audit_logs']) {
    const result = await localClient.from(table).select('id', { count: 'exact', head: true });
    check(!result.error, `Tabela ${table}: ${result.count} registro(s)`);
  }
  const { count } = await localClient.from('profiles').select('id', { count: 'exact', head: true })
    .eq('role', 'superadmin').eq('status', 'ativo');
  check(count > 0, 'Superadmin ativo criado pelo seed');
  console.log(`Dados locais: ${dataDirectory}`);
  db.close();
}
const ready = !local && [
  check(configured(backend.SUPABASE_URL), 'SUPABASE_URL configurada'),
  check(configured(backend.SUPABASE_SERVICE_ROLE_KEY), 'Chave de servidor configurada'),
  check(configured(frontend.VITE_SUPABASE_URL), 'VITE_SUPABASE_URL configurada'),
  check(configured(frontend.VITE_SUPABASE_ANON_KEY), 'Chave publica configurada')
].every(Boolean);
if (ready) {
  check(backend.SUPABASE_URL.replace(/\/$/, '') === frontend.VITE_SUPABASE_URL.replace(/\/$/, ''),
    'Frontend e backend apontam para o mesmo projeto');
  check(backend.SUPABASE_SERVICE_ROLE_KEY !== frontend.VITE_SUPABASE_ANON_KEY,
    'Chave secreta separada da chave publica');
  const client = createClient(backend.SUPABASE_URL, backend.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) }
  });
  for (const table of ['profiles', 'health_units', 'exams', 'biopsy_samples', 'audit_logs']) {
    const { error } = await client.from(table).select('id', { count: 'exact', head: true });
    check(!error, `Tabela ${table} acessivel${error ? ` (codigo: ${error.code ?? 'indisponivel'})` : ''}`);
  }
  const { data: buckets, error: storageError } = await client.storage.listBuckets();
  check(!storageError && buckets.some(bucket => bucket.id === 'avatars' && bucket.public), 'Bucket avatars publico');
  check(!storageError && buckets.some(bucket => bucket.id === 'exams' && !bucket.public), 'Bucket exams privado');
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
  check(!error && Array.isArray(data?.users), 'Supabase Auth acessivel com a chave de servidor');
  const { count, error: adminError } = await client.from('profiles').select('id', { count: 'exact', head: true })
    .eq('role', 'superadmin').eq('status', 'ativo');
  check(!adminError && count > 0, 'Superadmin ativo criado pelo seed');
}
console.log(failures ? `Diagnostico: ${failures} pendencia(s). Consulte o README.` :
  local ? 'Banco local verificado. Supabase nao e necessario.' : 'Conexao verificada. Teste login e permissoes na interface; este comando nao valida RLS.');
process.exitCode = failures ? 1 : 0;
