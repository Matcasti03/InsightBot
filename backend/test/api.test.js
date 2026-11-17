import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DATA_PROVIDER = 'supabase';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-key';
const { createApp } = await import('../src/app.js');
const { supabaseAdmin } = await import('../src/lib/supabase.js');

test('API valida autenticacao, conta inativa, RBAC e confirmacao de biopsia', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const originalAuth = supabaseAdmin.auth.getUser;
  const originalFrom = supabaseAdmin.from;
  let profile = { id: 'user', role: 'operador_ubs', status: 'ativo', health_unit: 'UBS A' };
  supabaseAdmin.auth.getUser = async () => ({ data: { user: { id: profile.id } } });
  supabaseAdmin.from = () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }) });
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/exams`)).status, 401);
    const post = (path, body) => fetch(`${base}/api${path}`, {
      method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    assert.equal((await post('/exams/id/biopsy', { confirmation: 'CONFIRMAR' })).status, 403);
    assert.equal((await post('/exams/id/findings', {})).status, 403);
    profile = { ...profile, role: 'medico' };
    assert.equal((await post('/exams/id/biopsy', { confirmation: 'INVALIDA' })).status, 400);
    assert.equal((await post('/exams/id/telemetry', { telemetry: { battery: 101 } })).status, 400);
    const records = [];
    supabaseAdmin.from = (table) => {
      const query = {
        select: () => query, eq: () => query,
        update: (value) => { records.push(value); return query; },
        insert: async (value) => { records.push(value); return {}; },
        maybeSingle: async () => ({ data: table === 'profiles' ? profile :
          {
            id: 'exam', health_unit: 'UBS A', updated_at: '2026-01-01T00:00:00Z',
            ai_findings: records.find(record => record.ai_findings)?.ai_findings ?? [{ id: 'finding', label: 'Area suspeita', status: 'pendente' }]
          } })
      };
      return query;
    };
    const reviewed = await post('/exams/exam/findings', {
      finding_id: 'finding', status: 'confirmado', reviewed_by: 'forged-user'
    });
    assert.equal(reviewed.status, 200);
    const findings = (await reviewed.json()).data;
    assert.equal(findings[0].reviewed_by, profile.id);
    assert.ok(findings[0].reviewed_at);
    assert.ok(records.some(record => record.action === 'exam.finding_review'));
    assert.equal((await post('/exams/exam/findings', {
      finding_id: 'missing', status: 'confirmado'
    })).status, 404);
    profile = { ...profile, status: 'inativo' };
    assert.equal((await post('/exams/id/findings', {})).status, 403);
  } finally {
    supabaseAdmin.auth.getUser = originalAuth;
    supabaseAdmin.from = originalFrom;
    await new Promise(resolve => server.close(resolve));
  }
});
