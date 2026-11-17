import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const directory = mkdtempSync(join(tmpdir(), 'insightbot-regressions-'));
Object.assign(process.env, { DATA_PROVIDER: 'local', LOCAL_DATA_DIR: directory, SUPERADMIN_EMAIL: 'admin@insightbot.dev', SUPERADMIN_PASSWORD: 'Insight@2026', DEMO_PASSWORD: 'Insight@2026', SEED_DEMO: 'true' });
const { createApp } = await import('../src/app.js');
const { db, localClient } = await import('../src/local/database.js');

test('regressoes: entradas invalidas e integridade dos registros clinicos', async t => {
  execFileSync(process.execPath, ['src/scripts/seed.js'], { env: process.env, stdio: 'pipe' });
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let token;
  async function call(path, body, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, ...await response.json() };
  }
  try {
    token = (await call('/auth/login', { email: 'admin@insightbot.dev', password: 'Insight@2026' })).data.access_token;
    const patients = (await call('/patients')).data;
    const patient = patients[0];
    const completed = (await call('/exams')).data.find(exam => exam.status === 'concluido' && exam.report_status === 'concluido');
    await t.test('CPF invalido nao deixa conta orfa nem bloqueia nova tentativa', async () => {
      const payload = { full_name: 'Paciente CPF Invalido', email: 'cpf@teste.local', cpf: '123' };
      assert.equal((await call('/patients', payload)).status, 400);
      assert.equal(db.prepare('SELECT count(*) AS count FROM users WHERE email=?').get(payload.email).count, 0);
      assert.equal((await call('/patients', { ...payload, cpf: null })).status, 201);
    });
    await t.test('data inexistente rejeitada no cadastro e no perfil', async () => {
      assert.equal((await call('/patients', { full_name: 'Data Invalida', email: 'data@teste.local', birth_date: '2026-02-31' })).status, 400);
      assert.equal((await call('/me', { birth_date: '2026-02-31' }, 'PATCH')).status, 400);
    });
    await t.test('agendamento exige data e horario validos', async () => {
      assert.equal((await call('/exams', { patient_id: patient.id, capsule_id: 'INVALID-DATE', scheduled_at: 'nao-e-data' })).status, 400);
    });
    await t.test('laudo concluido nao pode ficar vazio por PATCH parcial', async () => {
      assert.equal((await call(`/exams/${completed.id}`, { report: null }, 'PATCH')).status, 400);
    });
    await t.test('repetir conclusao preserva horario original', async () => {
      const updated = await call(`/exams/${completed.id}`, { status: 'concluido' }, 'PATCH');
      assert.equal(updated.status, 200);
      assert.equal(updated.data.finished_at, completed.finished_at);
    });
    await t.test('JSON malformado retorna erro do cliente, sem erro interno', async () => {
      const response = await fetch(base + '/patients', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{invalid' });
      assert.equal(response.status, 400);
    });
    await t.test('arquivo falso com MIME de PNG nao vira avatar', async () => {
      const body = new FormData();
      body.append('avatar', new Blob(['not-an-image'], { type: 'image/png' }), 'fake.png');
      assert.equal((await fetch(base + '/me/avatar', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body })).status, 400);
    });
    await t.test('projecao SQLite nao mistura campos de relacionamentos com registro principal', async () => {
      const { data } = await localClient.from('exams').select('id, patient:profiles!exams_patient_id_fkey(id, full_name, email)').limit(1);
      assert.deepEqual(Object.keys(data[0]).sort(), ['id', 'patient']);
      assert.ok(data[0].patient.full_name);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close(); rmSync(directory, { recursive: true, force: true });
  }
});
