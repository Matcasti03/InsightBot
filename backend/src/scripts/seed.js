import { env } from '../config/env.js';
import { supabaseAdmin } from '../lib/supabase.js';

const DEMO_USERS = [
  {
    email: 'medico@insightbot.dev',
    full_name: 'Dra. Helena Martins',
    role: 'medico',
    health_unit: 'UBS Dr. Joao Mendes',
    professional_register: 'CRM-CE 12345',
    phone: '(88) 99911-2233'
  },
  {
    email: 'operador@insightbot.dev',
    full_name: 'Carlos Ferreira',
    role: 'operador_ubs',
    health_unit: 'UBS Dr. Joao Mendes',
    professional_register: 'COREN-CE 98765',
    phone: '(88) 98877-1122'
  },
  {
    email: 'ana@insightbot.dev',
    full_name: 'Ana Beatriz Souza',
    role: 'paciente',
    health_unit: 'UBS Dr. Joao Mendes',
    cpf: '12345678901',
    phone: '(88) 99654-0011',
    birth_date: '1987-04-12'
  },
  {
    email: 'joao@insightbot.dev',
    full_name: 'Joao Pedro Lima',
    role: 'paciente',
    health_unit: 'UBS Dr. Joao Mendes',
    cpf: '23456789012',
    phone: '(88) 99654-0022',
    birth_date: '1962-09-30'
  },
  {
    email: 'maria@insightbot.dev',
    full_name: 'Maria das Gracas Alves',
    role: 'paciente',
    health_unit: 'UBS Santa Luzia',
    cpf: '34567890123',
    phone: '(88) 99654-0033',
    birth_date: '1955-01-08'
  },
  {
    email: 'lucas@insightbot.dev',
    full_name: 'Lucas Emanuel Rocha',
    role: 'paciente',
    health_unit: 'UBS Dr. Joao Mendes',
    cpf: '45678901234',
    phone: '(88) 99654-0044',
    birth_date: '1994-06-21'
  },
  {
    email: 'fernanda@insightbot.dev',
    full_name: 'Fernanda Oliveira Castro',
    role: 'paciente',
    health_unit: 'UBS Esperanca',
    cpf: '56789012345',
    phone: '(88) 99654-0055',
    birth_date: '1979-11-03'
  },
  {
    email: 'rafael@insightbot.dev',
    full_name: 'Rafael Nunes Barreto',
    role: 'paciente',
    health_unit: 'Clinica Sao Camilo',
    cpf: '67890123456',
    phone: '(85) 99654-0066',
    birth_date: '1968-02-14'
  }
];

function daysAgo(days, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysAhead(days, hour = 8) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 30, 0, 0);
  return date;
}

async function listAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Falha ao listar usuarios: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

async function ensureUser(userInput, existingUsers, password) {
  const email = userInput.email.toLowerCase();
  let user = existingUsers.find((item) => item.email?.toLowerCase() === email);

  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: userInput.full_name }
    });
    if (error || !data.user) {
      throw new Error(`Falha ao criar ${email}: ${error?.message}`);
    }
    user = data.user;
    existingUsers.push(user);
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: userInput.full_name,
      email,
      role: userInput.role,
      health_unit: userInput.health_unit ?? null,
      professional_register: userInput.professional_register ?? null,
      cpf: userInput.cpf ?? null,
      phone: userInput.phone ?? null,
      birth_date: userInput.birth_date ?? null,
      status: 'ativo'
    })
    .eq('id', user.id);

  if (profileError) {
    throw new Error(`Falha ao atualizar perfil de ${email}: ${profileError.message}`);
  }

  return user;
}

async function seedDemoData(usersByEmail, superadmin) {
  const { count, error: countError } = await supabaseAdmin
    .from('exams')
    .select('id', { count: 'exact', head: true });
  if (countError) throw new Error(countError.message);

  if (count && count > 0) {
    console.log(`Seed demo ignorado: ja existem ${count} exames cadastrados.`);
    return;
  }

  const medico = usersByEmail['medico@insightbot.dev'];
  const operador = usersByEmail['operador@insightbot.dev'];
  const ana = usersByEmail['ana@insightbot.dev'];
  const joao = usersByEmail['joao@insightbot.dev'];
  const maria = usersByEmail['maria@insightbot.dev'];
  const lucas = usersByEmail['lucas@insightbot.dev'];
  const fernanda = usersByEmail['fernanda@insightbot.dev'];
  const rafael = usersByEmail['rafael@insightbot.dev'];

  const now = new Date();
  const exams = [
    {
      patient_id: ana.id,
      health_unit: 'UBS Dr. Joao Mendes',
      capsule_id: 'IB-CAP-101',
      status: 'concluido',
      created_at: daysAgo(160),
      scheduled_at: daysAgo(160),
      started_at: daysAgo(160, 10),
      finished_at: daysAgo(160, 11),
      report_status: 'concluido',
      report:
        'Exame de capsula endoscopica sem alteracoes significativas. Mucosa gastrica de aspecto regular. Biopsia de controle coletada no antro.',
      notes: 'Paciente tolerou bem a capsula.',
      telemetry: { battery: 34, temperature: 36.9, ph: 6.4, signal: 88, position: 'Intestino delgado' },
      capsule_position: { x: 0.4, y: 0.1, z: 5.2, rotation: 120 },
      ai_findings: [
        {
          id: 'ai-101',
          label: 'Area de hiperemia leve no antro',
          confidence: 72,
          x: 54,
          y: 46,
          status: 'confirmado',
          reviewed_by: medico.id,
          reviewed_at: daysAgo(160, 12).toISOString()
        }
      ],
      biopsy: {
        result: 'negativo',
        status: 'resultado_disponivel',
        lab_code: 'BIO-DEMO-101',
        human_validated: true,
        coordinates: { x: 0.42, y: 0.08, z: 5.1, rotation: 118, position: 'Antro gastrico' }
      }
    },
    {
      patient_id: lucas.id,
      health_unit: 'UBS Dr. Joao Mendes',
      capsule_id: 'IB-CAP-204',
      status: 'em_andamento',
      created_at: daysAgo(0, 8),
      scheduled_at: daysAgo(0, 8),
      started_at: daysAgo(0, 8),
      report_status: 'em_analise',
      telemetry: { battery: 76, temperature: 37.2, ph: 5.9, signal: 94, position: 'Estomago - corpo' },
      capsule_position: { x: 0.12, y: -0.34, z: 2.31, rotation: 45 },
      ai_findings: [
        {
          id: 'ai-204',
          label: 'Possivel ulceracao superficial',
          confidence: 81,
          x: 63,
          y: 38,
          status: 'pendente'
        }
      ],
      biopsy: {
        result: 'pendente',
        status: 'coletada',
        lab_code: 'BIO-DEMO-204',
        human_validated: false,
        coordinates: { x: 0.11, y: -0.31, z: 2.28, rotation: 44, position: 'Corpo gastrico' }
      }
    },
    {
      patient_id: joao.id,
      health_unit: 'UBS Dr. Joao Mendes',
      capsule_id: 'IB-CAP-115',
      status: 'concluido',
      created_at: daysAgo(6),
      scheduled_at: daysAgo(6),
      started_at: daysAgo(6, 9),
      finished_at: daysAgo(6, 10),
      report_status: 'pendente',
      telemetry: { battery: 28, temperature: 37.4, ph: 7.1, signal: 82, position: 'Colon direito' },
      capsule_position: { x: -0.6, y: 0.3, z: 7.8, rotation: 210 },
      ai_findings: [
        {
          id: 'ai-115',
          label: 'Polipo suspeito de 12 mm',
          confidence: 89,
          x: 37,
          y: 57,
          status: 'confirmado',
          reviewed_by: medico.id,
          reviewed_at: daysAgo(6, 11).toISOString()
        },
        {
          id: 'ai-116',
          label: 'Irregularidade vascular',
          confidence: 64,
          x: 72,
          y: 31,
          status: 'pendente'
        }
      ],
      biopsy: {
        result: 'pendente',
        status: 'coletada',
        lab_code: 'BIO-DEMO-115',
        human_validated: true,
        coordinates: { x: -0.58, y: 0.31, z: 7.7, rotation: 208, position: 'Colon ascendente' }
      }
    },
    {
      patient_id: maria.id,
      health_unit: 'UBS Santa Luzia',
      capsule_id: 'IB-CAP-310',
      status: 'concluido',
      created_at: daysAgo(32),
      scheduled_at: daysAgo(32),
      started_at: daysAgo(32, 8),
      finished_at: daysAgo(32, 9),
      report_status: 'concluido',
      report:
        'Sinais de gastrite erosiva leve. Recomendado acompanhamento clinico em 6 meses. Amostra encaminhada ao laboratorio central.',
      telemetry: { battery: 41, temperature: 37.0, ph: 6.1, signal: 77, position: 'Estomago - antro' },
      capsule_position: { x: 0.2, y: -0.15, z: 1.9, rotation: 80 },
      ai_findings: [
        {
          id: 'ai-310',
          label: 'Erosao gastrica',
          confidence: 78,
          x: 44,
          y: 62,
          status: 'confirmado',
          reviewed_by: medico.id,
          reviewed_at: daysAgo(33, 9).toISOString()
        }
      ],
      biopsy: {
        result: 'positivo',
        status: 'resultado_disponivel',
        lab_code: 'BIO-DEMO-310',
        human_validated: true,
        coordinates: { x: 0.18, y: -0.14, z: 1.88, rotation: 79 }
      }
    },
    {
      patient_id: fernanda.id,
      health_unit: 'UBS Esperanca',
      capsule_id: 'IB-CAP-420',
      status: 'agendado',
      created_at: daysAgo(1),
      scheduled_at: daysAhead(2),
      report_status: 'pendente',
      notes: 'Paciente deve seguir o preparo de 12 horas de jejum.',
      telemetry: {},
      capsule_position: {},
      ai_findings: []
    },
    {
      patient_id: rafael.id,
      health_unit: 'Clinica Sao Camilo',
      capsule_id: 'IB-CAP-233',
      status: 'concluido',
      created_at: daysAgo(24),
      scheduled_at: daysAgo(24),
      started_at: daysAgo(24, 13),
      finished_at: daysAgo(24, 14),
      report_status: 'em_analise',
      telemetry: { battery: 22, temperature: 37.6, ph: 7.4, signal: 69, position: 'Intestino delgado distal' },
      capsule_position: { x: 1.1, y: 0.5, z: 9.4, rotation: 302 },
      ai_findings: [
        {
          id: 'ai-233',
          label: 'Suspeita de sangramento ativo',
          confidence: 91,
          x: 58,
          y: 67,
          status: 'confirmado',
          reviewed_by: medico.id,
          reviewed_at: daysAgo(24, 15).toISOString()
        }
      ],
      biopsy: {
        result: 'inconclusivo',
        status: 'resultado_disponivel',
        lab_code: 'BIO-DEMO-233',
        human_validated: true,
        coordinates: { x: 1.08, y: 0.52, z: 9.3, rotation: 300, position: 'Ileo distal' }
      }
    },
    {
      patient_id: ana.id,
      health_unit: 'UBS Dr. Joao Mendes',
      capsule_id: 'IB-CAP-118',
      status: 'concluido',
      created_at: daysAgo(72),
      scheduled_at: daysAgo(72),
      started_at: daysAgo(72, 10),
      finished_at: daysAgo(72, 11),
      report_status: 'concluido',
      report: 'Exame sem lesoes ativas. Capsula eliminada sem intercorrencias.',
      telemetry: { battery: 12, temperature: 36.8, ph: 7.0, signal: 73, position: 'Colon esquerdo' },
      capsule_position: { x: -1.2, y: -0.4, z: 10.2, rotation: 15 },
      ai_findings: [],
      biopsy: null
    },
    {
      patient_id: joao.id,
      health_unit: 'UBS Dr. Joao Mendes',
      capsule_id: 'IB-CAP-503',
      status: 'cancelado',
      created_at: daysAgo(15),
      scheduled_at: daysAgo(14),
      report_status: 'pendente',
      notes: 'Cancelado por dificuldade de degluticao no dia do exame.',
      telemetry: {},
      capsule_position: {},
      ai_findings: []
    }
  ];

  for (const exam of exams) {
    const {
      biopsy,
      created_at,
      scheduled_at,
      started_at,
      finished_at,
      patient_id,
      health_unit,
      capsule_id,
      status,
      report_status,
      report,
      notes,
      telemetry,
      capsule_position,
      ai_findings
    } = exam;

    const { data: inserted, error } = await supabaseAdmin
      .from('exams')
      .insert({
        patient_id,
        doctor_id: medico.id,
        operator_id: operador.id,
        health_unit,
        capsule_id,
        status,
        created_at,
        scheduled_at,
        started_at,
        finished_at,
        report_status,
        report,
        notes,
        telemetry,
        capsule_position,
        ai_findings
      })
      .select()
      .single();

    if (error) throw new Error(`Falha ao criar exame demo: ${error.message}`);

    if (biopsy) {
      const { error: biopsyError } = await supabaseAdmin.from('biopsy_samples').insert({
        exam_id: inserted.id,
        capsule_id,
        triggered_by: medico.id,
        coordinates: biopsy.coordinates,
        human_validated: biopsy.human_validated,
        validated_by: biopsy.human_validated ? medico.id : null,
        validated_at: biopsy.human_validated ? daysAgo(1, 10).toISOString() : null,
        status: biopsy.status,
        result: biopsy.result,
        lab_code: biopsy.lab_code
      });
      if (biopsyError) {
        throw new Error(`Falha ao criar biopsia demo: ${biopsyError.message}`);
      }
    }
  }

  const demoAudit = [
    {
      actor_id: medico.id,
      actor_email: 'medico@insightbot.dev',
      action: 'biopsy.trigger',
      entity: 'biopsy_samples',
      entity_id: 'demo',
      metadata: { exam_id: 'demo', capsule_id: 'IB-CAP-204', lab_code: 'BIO-DEMO-204' }
    },
    {
      actor_id: superadmin.id,
      actor_email: superadmin.email,
      action: 'admin.user_update',
      entity: 'profiles',
      entity_id: medico.id,
      metadata: { role: 'medico', status: 'ativo' }
    },
    {
      actor_id: medico.id,
      actor_email: 'medico@insightbot.dev',
      action: 'exam.report_update',
      entity: 'exams',
      entity_id: 'demo',
      metadata: { report_status: 'concluido' }
    }
  ];

  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert(demoAudit);
  if (auditError) {
    console.log(`Aviso: nao foi possivel inserir logs de auditoria demo: ${auditError.message}`);
  }

  console.log(`Dados demo criados: ${exams.length} exames, ${exams.filter((item) => item.biopsy).length} amostras.`);
}

async function main() {
  console.log('Iniciando seed do InSightBot...');

  const existingUsers = await listAllUsers();
  const superadmin = await ensureUser(
    {
      email: env.superadmin.email,
      full_name: env.superadmin.fullName,
      role: 'superadmin',
      health_unit: null
    },
    existingUsers,
    env.superadmin.password
  );

  const usersByEmail = {};
  if (env.seedDemo) {
    for (const demoUser of DEMO_USERS) {
      const user = await ensureUser(demoUser, existingUsers, env.demoPassword);
      usersByEmail[demoUser.email] = user;
    }
  }

  console.log(`Superadmin pronto: ${superadmin.email}`);
  if (env.seedDemo) {
    await seedDemoData(usersByEmail, superadmin);
    console.log('Contas demo:');
    console.log(`  Superadmin: ${env.superadmin.email} / ${env.superadmin.password}`);
    console.log(`  Medico:     medico@insightbot.dev / ${env.demoPassword}`);
    console.log(`  Operador:   operador@insightbot.dev / ${env.demoPassword}`);
    console.log(`  Paciente:   ana@insightbot.dev / ${env.demoPassword}`);
  }

  console.log('Seed concluido.');
}

main().catch((error) => {
  console.error('Seed falhou:', error.message);
  process.exit(1);
});
