import test from 'node:test';
import assert from 'node:assert/strict';
import { applyExamScope, assertPatientAccess, staffCanAccessExam } from '../src/lib/scope.js';

const doctor = { id: 'doctor', role: 'medico', health_unit: 'UBS A' };
const exam = { patient_id: 'patient', doctor_id: 'other', health_unit: 'UBS A' };

test('paciente acessa somente seus exames', () => {
  assert.equal(staffCanAccessExam(exam, { id: 'patient', role: 'paciente' }), true);
  assert.equal(staffCanAccessExam(exam, { id: 'stranger', role: 'paciente' }), false);
});

test('profissional acessa unidade ou exame atribuido, sem acesso global sem unidade', () => {
  assert.equal(staffCanAccessExam(exam, doctor), true);
  assert.equal(staffCanAccessExam({ ...exam, health_unit: 'UBS B' }, doctor), false);
  assert.equal(staffCanAccessExam(exam, { ...doctor, health_unit: null }), false);
  assert.equal(staffCanAccessExam({ ...exam, doctor_id: doctor.id }, doctor), true);
  assert.equal(staffCanAccessExam(exam, { id: 'x', role: 'unknown', health_unit: 'UBS A' }), false);
});

test('cadastro e edicao de paciente exigem a mesma unidade', () => {
  assert.doesNotThrow(() => assertPatientAccess({ health_unit: 'UBS A' }, doctor));
  for (const health_unit of ['UBS B', null, '']) {
    assert.throws(() => assertPatientAccess({ health_unit }, doctor), { status: 403 });
  }
  assert.throws(() => assertPatientAccess({ health_unit: null }, { ...doctor, health_unit: null }), { status: 403 });
  assert.doesNotThrow(() => assertPatientAccess({ health_unit: 'UBS B' }, { role: 'superadmin' }));
});

test('consulta sem unidade fica restrita a atribuicao do profissional', () => {
  const calls = [];
  const query = { eq: (...args) => { calls.push(args); return query; } };
  applyExamScope(query, { ...doctor, health_unit: null });
  assert.deepEqual(calls, [['doctor_id', 'doctor']]);
});
