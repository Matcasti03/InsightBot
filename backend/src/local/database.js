import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const dataDirectory = resolve(process.env.LOCAL_DATA_DIR || fileURLToPath(new URL('../../data', import.meta.url)));
mkdirSync(dataDirectory, { recursive: true, mode: 0o700 });
export const db = new DatabaseSync(resolve(dataDirectory, 'insightbot.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)), PRIMARY KEY(collection,id));
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS active_capsule ON records(json_extract(data,'$.capsule_id')) WHERE collection='exams' AND json_extract(data,'$.status')='em_andamento';
CREATE UNIQUE INDEX IF NOT EXISTS patient_cpf ON records(json_extract(data,'$.cpf')) WHERE collection='profiles' AND json_extract(data,'$.cpf') IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sample_lab ON records(json_extract(data,'$.lab_code')) WHERE collection='biopsy_samples' AND json_extract(data,'$.lab_code') IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unit_identity ON records(json_extract(data,'$.name'),json_extract(data,'$.city'),json_extract(data,'$.state')) WHERE collection='health_units';`);
const collections = new Set(['profiles', 'exams', 'biopsy_samples', 'health_units', 'audit_logs']);
export const rows = (table) => db.prepare('SELECT data FROM records WHERE collection=?').all(table).map(row => JSON.parse(row.data));
const get = (table, id) => { const row = db.prepare('SELECT data FROM records WHERE collection=? AND id=?').get(table, id); return row ? JSON.parse(row.data) : null; };
function save(table, row) {
  if (table === 'exams') {
    for (const field of ['patient_id', 'doctor_id', 'operator_id']) {
      if (row[field] && !get('profiles', row[field])) throw new Error('Perfil vinculado nao encontrado.');
    }
  }
  if (table === 'biopsy_samples' && !get('exams', row.exam_id)) throw new Error('Exame vinculado nao encontrado.');
  db.prepare('INSERT INTO records(collection,id,data) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data').run(table, row.id, JSON.stringify(row));
}
function defaults(table) {
  const now = new Date().toISOString();
  const common = { id: randomUUID(), created_at: now, updated_at: now };
  if (table === 'profiles') return { ...common, role: 'paciente', status: 'ativo', full_name: '', health_unit: null, avatar_url: null };
  if (table === 'exams') return { ...common, doctor_id: null, operator_id: null, status: 'agendado', report_status: 'pendente', report: null, telemetry: {}, capsule_position: {}, ai_findings: [] };
  if (table === 'biopsy_samples') return { ...common, triggered_at: now, human_validated: false, result: 'pendente', status: 'coletada' };
  return common;
}
function fields(row, selection) {
  if (!row) return null;
  if (selection.trim() === '*') return { ...row };
  const result = selection.split(',').reduce((acc, field) => {
    field = field.trim(); if (Object.hasOwn(row, field)) acc[field] = row[field]; return acc;
  }, {});
  return result;
}
function project(row, selection) {
  // Split only top-level commas so nested relationship selections stay intact.
  const tokens = selection.match(/[^,()]+(?:\([^)]*\))?/g) ?? [];
  const result = selection.trim().startsWith('*') ? { ...row } : fields(row, selection);
  for (const token of tokens) {
    const relation = token.trim().match(/^(\w+):(profiles|exams)![\w]+\(([^)]*)\)$/);
    if (!relation) continue;
    const [, alias, table, columns] = relation;
    const key = { patient: 'patient_id', doctor: 'doctor_id', operator: 'operator_id', validator: 'validated_by', exam: 'exam_id' }[alias];
    result[alias] = fields(get(table, row[key]), columns);
  }
  return result;
}
function matchOr(row, expression) {
  return (expression.match(/(?:[^,"]|"[^"]*")+/g) ?? []).some(term => {
    const [, key, op, raw] = term.match(/^([\w]+)\.(eq|ilike|is)\.(.*)$/) ?? [];
    const value = raw?.replace(/^"|"$/g, '');
    if (op === 'eq') return String(row[key]) === value;
    if (op === 'is') return value === 'null' && row[key] == null;
    if (op === 'ilike') return String(row[key] ?? '').toLocaleLowerCase().includes(value.replaceAll('%', '').toLocaleLowerCase());
    return false;
  });
}
class Query {
  constructor(table) { if (!collections.has(table)) throw new Error('Tabela desconhecida.'); this.table = table; this.filters = []; this.selection = '*'; }
  select(selection = '*', options = {}) { this.selection = selection; this.options = options; return this; }
  eq(key, value) { this.filters.push(row => row[key] === value); return this; }
  in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
  or(expression) { this.filters.push(row => matchOr(row, expression)); return this; }
  ilike(key, value) { this.filters.push(row => String(row[key] ?? '').toLowerCase().includes(value.replaceAll('%', '').toLowerCase())); return this; }
  order(key, { ascending = true } = {}) { this.sort = { key, ascending }; return this; }
  limit(value) { this.maximum = value; return this; }
  insert(value) { this.operation = 'insert'; this.payload = value; return this; }
  update(value) { this.operation = 'update'; this.payload = value; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; this.optional = true; return this; }
  then(resolvePromise, rejectPromise) { this.promise ??= Promise.resolve().then(() => this.execute()); return this.promise.then(resolvePromise, rejectPromise); }
  execute() {
    try {
      let selected = rows(this.table).filter(row => this.filters.every(filter => filter(row)));
      const count = selected.length;
      if (this.operation) {
        db.exec('BEGIN IMMEDIATE');
        try {
          selected = this.operation === 'insert'
            ? (Array.isArray(this.payload) ? this.payload : [this.payload]).map(value => ({ ...defaults(this.table), ...value }))
            : selected.map(row => ({ ...row, ...this.payload, updated_at: new Date().toISOString() }));
          for (const row of selected) save(this.table, row);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
      if (this.sort) { const { key, ascending } = this.sort; selected.sort((a,b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (ascending ? 1 : -1)); }
      if (this.maximum !== undefined) selected = selected.slice(0, this.maximum);
      if (this.one && (selected.length > 1 || (!this.optional && selected.length !== 1))) throw new Error('Registro nao encontrado ou resultado ambiguo.');
      const data = selected.map(row => project(row, this.selection));
      return { data: this.options?.head ? null : this.one ? data[0] ?? null : data, count: this.operation ? data.length : count, error: null };
    } catch (error) { return { data: null, error: { message: error.message, code: /UNIQUE/.test(error.message) ? '23505' : 'LOCAL_DB' } }; }
  }
}
function passwordHash(password, salt = randomBytes(16).toString('hex')) { return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
const tokenHash = token => createHash('sha256').update(token).digest('hex');
export function createSession(user) {
  const token = randomBytes(32).toString('hex');
  const expires = Math.floor(Date.now() / 1000) + 86400;
  db.prepare('DELETE FROM sessions WHERE expires<=?').run(Math.floor(Date.now()/1000));
  db.prepare('INSERT INTO sessions(hash,user_id,expires) VALUES(?,?,?)').run(tokenHash(token), user.id, expires);
  return { access_token: token, token_type: 'bearer', expires_in: 86400, expires_at: expires, refresh_token: '', user };
}
export function login(email, password) {
  const account = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());
  if (!account) { passwordHash(password); return null; }
  const [salt, hash] = account.password.split(':');
  if (!timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(passwordHash(password, salt).split(':')[1], 'hex'))) return null;
  const profile = get('profiles', account.id);
  if (profile?.status !== 'ativo') return null;
  return createSession({ id: account.id, email: account.email });
}
export function revokeSession(token) { db.prepare('DELETE FROM sessions WHERE hash=?').run(tokenHash(token)); }
function storagePath(bucket, name) {
  if (bucket !== 'avatars') throw new Error('Bucket local nao suportado.');
  const base = resolve(dataDirectory, 'uploads', bucket);
  const target = resolve(base, name);
  if (!target.startsWith(base + sep)) throw new Error('Caminho invalido.');
  return target;
}
export const localClient = {
  from: table => new Query(table),
  auth: {
    getUser: async token => {
      const record = db.prepare('SELECT users.id,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE hash=? AND expires>?').get(tokenHash(token), Math.floor(Date.now()/1000));
      return { data: { user: record ?? null }, error: record ? null : { message: 'Sessao invalida.' } };
    },
    admin: {
      listUsers: async ({ page = 1, perPage = 200 } = {}) => ({ data: { users: db.prepare('SELECT id,email FROM users LIMIT ? OFFSET ?').all(perPage, (page-1)*perPage) }, error: null }),
      createUser: async ({ email, password, user_metadata = {} }) => {
        try {
          const id = randomUUID();
          db.exec('BEGIN IMMEDIATE');
          try {
            db.prepare('INSERT INTO users(id,email,password) VALUES(?,?,?)').run(id, email.toLowerCase(), passwordHash(password));
            save('profiles', { ...defaults('profiles'), id, email: email.toLowerCase(), full_name: user_metadata.full_name || email.split('@')[0], phone: user_metadata.phone ?? null });
            db.exec('COMMIT');
          } catch (error) { db.exec('ROLLBACK'); throw error; }
          return { data: { user: { id, email: email.toLowerCase() } }, error: null };
        } catch { return { data: { user: null }, error: { message: 'Nao foi possivel criar a conta. E-mail ja cadastrado ou dados invalidos.' } }; }
      },
      deleteUser: async id => {
        db.exec('BEGIN IMMEDIATE');
        try {
          db.prepare('DELETE FROM users WHERE id=?').run(id);
          db.prepare("DELETE FROM records WHERE collection='profiles' AND id=?").run(id);
          db.exec('COMMIT'); return { error: null };
        } catch (error) { db.exec('ROLLBACK'); return { error }; }
      }
    }
  },
  storage: {
    from: bucket => ({
      upload: async (name, content) => {
        try { const path = storagePath(bucket, name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content, { mode: 0o600 }); return { error: null }; }
        catch { return { error: { message: 'Falha ao salvar arquivo local.' } }; }
      },
      getPublicUrl: name => ({ data: { publicUrl: `${process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`}/uploads/${bucket}/${name}` } }),
      remove: async names => { try { for (const name of names) rmSync(storagePath(bucket, name), { force: true }); return { error: null }; } catch (error) { return { error }; } }
    })
  }
};
if (!rows('health_units').length) {
  for (const [name, city, type] of [['UBS Dr. Joao Mendes', 'Sobral', 'ubs'], ['UBS Santa Luzia', 'Sobral', 'ubs'], ['Clinica Sao Camilo', 'Fortaleza', 'clinica'], ['UBS Esperanca', 'Meruoca', 'ubs']]) {
    save('health_units', { ...defaults('health_units'), name, city, state: 'CE', type, active: true });
  }
}
