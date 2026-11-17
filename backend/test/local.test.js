import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const directory = mkdtempSync(join(tmpdir(), 'insightbot-local-'));
process.env.DATA_PROVIDER = 'local';
process.env.LOCAL_DATA_DIR = directory;
process.env.SUPERADMIN_PASSWORD = 'Insight@2026';
process.env.DEMO_PASSWORD = 'Insight@2026';
process.env.SEED_DEMO = 'true';
process.env.SUPERADMIN_EMAIL = 'admin@insightbot.dev';
const { createApp } = await import('../src/app.js');
const { db } = await import('../src/local/database.js');

test('SQLite: seed, autenticacao, RBAC, exame, coleta, laudo, avatar e persistencia', async () => {
  execFileSync(process.execPath, ['src/scripts/seed.js'], { env: process.env, stdio: 'pipe' });
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(path, { token, method = 'GET', body } = {}) {
    const response = await fetch(base + '/api' + path, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, ...await response.json() };
  }
  async function login(email) {
    const response = await call('/auth/login', { method: 'POST', body: { email, password: 'Insight@2026' } });
    assert.equal(response.status, 200);
    return response.data.access_token;
  }
  try {
    assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'admin@insightbot.dev', password: 'Invalid@123' } })).status, 401);
    const admin = await login('admin@insightbot.dev');
    const doctor = await login('medico@insightbot.dev');
    const operator = await login('operador@insightbot.dev');
    const patient = await login('ana@insightbot.dev');
    const me = await call('/me', { token: patient });
    assert.equal(me.data.role, 'paciente');
    assert.equal((await call('/admin/users', { token: patient })).status, 403);
    assert.equal((await call('/me', { token: doctor, method: 'PATCH', body: { health_unit: 'Other' } })).status, 403);
    const dashboard = await call('/dashboard', { token: admin });
    assert.equal(dashboard.data.metrics.total_exams, 8);
    const exams = await call('/exams', { token: patient });
    assert.ok(exams.data.length > 0);
    assert.ok(exams.data.every(exam => exam.patient_id === me.data.id));
    assert.ok(exams.data[0].patient.full_name);
    const created = await call('/patients', { token: doctor, method: 'POST', body: { full_name: 'Paciente Teste', email: 'teste@local.dev', password: 'Teste@2026' } });
    assert.equal(created.status, 201);
    const listed = await call('/patients?q=Teste', { token: doctor });
    assert.equal(listed.data.length, 1);
    assert.equal(listed.data[0].cpf, undefined);
    const allPatients = await call('/patients', { token: admin });
    const foreignPatient = allPatients.data.find(item => item.health_unit === 'UBS Santa Luzia');
    assert.equal((await call(`/patients/${foreignPatient.id}`, { token: doctor, method: 'PATCH', body: { full_name: 'Forbidden' } })).status, 403);
    const started = await call('/exams', { token: doctor, method: 'POST', body: { patient_id: created.data.patient.id, capsule_id: 'TEST-CAP', start_now: true } });
    assert.equal(started.status, 201);
    const id = started.data.id;
    const duplicate = await call('/exams', { token: doctor, method: 'POST', body: { patient_id: created.data.patient.id, capsule_id: 'TEST-CAP', start_now: true } });
    assert.equal(duplicate.status, 409);
    const telemetry = await call(`/exams/${id}/telemetry`, { token: operator, method: 'POST', body: { telemetry: { battery: 80, ph: 6.2 }, position: { x: 0.1, y: 0.2, z: 1 } } });
    assert.equal(telemetry.status, 200);
    const collectionBody = { confirmation: 'CONFIRMAR', coordinates: { x: 0.1, y: 0.2, z: 1 } };
    assert.equal((await call(`/exams/${id}/biopsy`, { token: operator, method: 'POST', body: collectionBody })).status, 403);
    const collection = await call(`/exams/${id}/biopsy`, { token: doctor, method: 'POST', body: collectionBody });
    assert.equal(collection.status, 201);
    assert.equal(collection.data.human_validated, true);
    const biopsy = await call(`/biopsies/${collection.data.id}`, { token: doctor, method: 'PATCH', body: { result: 'negativo' } });
    assert.equal(biopsy.status, 200);
    assert.ok(biopsy.data.validator.full_name);
    const done = await call(`/exams/${id}`, { token: doctor, method: 'PATCH', body: { status: 'concluido', report_status: 'concluido', report: 'Laudo local de teste.' } });
    assert.equal(done.status, 200);
    assert.equal((await call(`/exams/${id}/telemetry`, { token: doctor, method: 'POST', body: { telemetry: { battery: 70 } } })).status, 409);
    const report = await call(`/exams/${id}/report-export`, { token: doctor });
    assert.match(report.data.content, /Laudo local de teste/);
    const audit = await call('/admin/audit', { token: admin });
    assert.ok(audit.data.some(row => row.action === 'exam.report_export'));
    const signup = await call('/auth/register', { method: 'POST', body: { email: 'novo@local.dev', password: 'Novo@2026', full_name: 'Novo Usuario', role: 'superadmin' } });
    assert.equal(signup.status, 201);
    assert.equal((await call('/me', { token: signup.data.access_token })).data.role, 'paciente');
    const image = new FormData();
    image.append('avatar', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aI8sAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'avatar.png');
    const avatarResponse = await fetch(base + '/api/me/avatar', { method: 'POST', headers: { Authorization: `Bearer ${patient}` }, body: image });
    assert.equal(avatarResponse.status, 200);
    const avatar = (await avatarResponse.json()).data.avatar_url;
    assert.equal((await fetch(base + new URL(avatar).pathname)).status, 200);
    const snapshot = execFileSync(process.execPath, ['--input-type=module', '-e', `import { DatabaseSync } from 'node:sqlite'; const db = new DatabaseSync(process.env.LOCAL_DATA_DIR + '/insightbot.sqlite'); console.log(db.prepare("SELECT count(*) AS total FROM records WHERE collection='exams'").get().total); db.close();`], { env: process.env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    assert.equal(Number(snapshot.trim()), 9);
    await call('/auth/logout', { method: 'POST', token: patient });
    assert.equal((await call('/me', { token: patient })).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
