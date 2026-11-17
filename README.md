# InSightBot

Plataforma HealthTech de **endoscopia por cápsula robótica** para UBSs, clínicas e hospitais. O InSightBot conecta pacientes, operadores de UBS e médicos em um fluxo único de agendamento, telemetria em tempo real, laudos e biópsias, com painel administrativo e trilha de auditoria.

## Executar agora com banco local

O modo padrao e **local**, sem conta Supabase, Docker ou servico externo.
Use Node.js **22.13+** (validado com Node 24).

```bash
npm install
npm run setup
npm run seed
npm run doctor
npm run dev
```

Abra http://localhost:5173. Na tela de login, os botoes de demonstracao preenchem
as credenciais. Superadmin: `admin@insightbot.dev`, senha `Insight@2026`.
Medico: `medico@insightbot.dev`; operador: `operador@insightbot.dev`;
paciente: `ana@insightbot.dev`, todos com a mesma senha demo.

- Banco persistente: `backend/data/insightbot.sqlite` (SQLite nativo do Node).
- Avatares: `backend/data/uploads/avatars/`.
- Senhas com hash scrypt e salt; sessoes aleatorias expiram em 24 horas e sao
  revogadas no logout. E necessario entrar novamente apos a expiracao.
- As regras de acesso e auditoria continuam no backend; SQLite nao tem RLS.
- Dados locais e arquivos `.env` estao excluidos do versionamento.
- A API local escuta somente em `127.0.0.1` por padrao. Este modo atende
  desenvolvimento e demonstracao; camera, IA e navegacao continuam simuladas.
- Para alterar o diretorio dos dados, configure `LOCAL_DATA_DIR` no backend.
- O seed pode ser repetido: preserva contas existentes e nao duplica os exames.

Para mudar posteriormente para Supabase, defina `DATA_PROVIDER=supabase` no
backend e `VITE_DATA_PROVIDER=supabase` no frontend, preencha as chaves e siga
as instrucoes abaixo. A troca de provedor nao migra automaticamente os dados.

## Visão geral

- **Dashboard inteligente** com métricas, gráficos e atalhos por perfil.
- **Console 3D** com cápsula em tempo real, telemetria simulada, joystick, câmera e acionamento de biópsia com dupla confirmação.
- **Gestão de pacientes** com prontuário resumido, histórico de exames e cadastro por profissionais.
- **Laudos e biópsias** com validação de achados de IA, resultado laboratorial e histórico clínico.
- **Administração** de usuários, perfis, unidades de saúde e auditoria (LGPD).
- **PWA mobile-first** instalável, com tema claro/escuro e navegação adaptada por perfil.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, Three.js, Lucide, vite-plugin-pwa |
| Backend | Node.js ESM, Express, Zod, Multer, Helmet, rate limit |
| Dados/Auth | Supabase (Postgres, Auth, Storage, RLS) |
| Qualidade | TypeScript estrito, validação Zod, auditoria de ações críticas |

## Estrutura

```text
InsightBot/
├─ backend/
│  ├─ src/
│  │  ├─ config/        # variáveis de ambiente
│  │  ├─ lib/           # Supabase admin, HTTP, escopo, auditoria, utils
│  │  ├─ middleware/    # autenticação e tratamento de erros
│  │  ├─ routes/        # API REST
│  │  └─ scripts/       # seed de demonstração
│  └─ .env.example
├─ frontend/
│  ├─ public/           # favicon e ícones PWA gerados
│  ├─ scripts/          # gerador de ícones PNG
│  ├─ src/
│  │  ├─ components/    # layout, console 3D, UI
│  │  ├─ contexts/      # auth, tema, toasts
│  │  ├─ pages/         # login, dashboard, console, pacientes, exames, admin, perfil
│  │  └─ lib/           # API client, Supabase, utilitários
│  └─ .env.example
├─ supabase/schema.sql  # schema completo, RLS, storage e unidades iniciais
└─ package.json         # workspaces + scripts
```

## Requisitos

- Node.js **22.13+** (testado com Node 24)
- npm 10+
- Projeto Supabase (plano gratuito atende)

## Configuração

### 1. Instalar dependências (configuracao Supabase)

```bash
npm install
```

### 2. Criar o banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor** e execute todo o conteúdo de `supabase/schema.sql`.
3. O script é idempotente e cria tabelas, funções, triggers, políticas RLS, buckets `avatars`/`exams` e unidades de saúde iniciais.

> O schema assume um projeto Supabase novo. Se o projeto tiver tabelas conflitantes, revise antes de executar.

### 3. Configurar o backend

```bash
cp backend/.env.example backend/.env
```

Preencha pelo menos:

```env
DATA_PROVIDER=supabase
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

A `SERVICE_ROLE_KEY` ignora RLS e **nunca deve ser exposta no frontend ou em repositório**. Para produção, troque as senhas padrão e defina `SEED_DEMO=false`.

### 4. Configurar o frontend

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_API_URL=http://localhost:4000/api
```

> Em produção, configure `CORS_ORIGIN` no backend com o domínio real e `VITE_API_URL` com a URL pública da API.

### 5. Popular dados de demonstração

```bash
npm run seed
```

O seed cria/atualiza o superadmin, contas profissionais, pacientes, exames, biópsias e logs de auditoria.

### 6. Executar

```bash
npm run dev
```

| Serviço | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:4000 |
| Health check | http://localhost:4000/health |

## Credenciais demo

Após `npm run seed` (senha padrão `Insight@2026`, configurável em `DEMO_PASSWORD`):

| Perfil | E-mail |
| --- | --- |
| Superadmin | `admin@insightbot.dev` |
| Médico | `medico@insightbot.dev` |
| Operador UBS | `operador@insightbot.dev` |
| Paciente | `ana@insightbot.dev` |

> Contas demo são apenas para desenvolvimento. Desative `SEED_DEMO` e remova-as em produção.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | API + frontend em paralelo |
| `npm run dev:backend` | Apenas API com `--watch` |
| `npm run dev:frontend` | Apenas Vite |
| `npm run seed` | Popula o Supabase com dados demo |
| `npm run typecheck` | TypeScript do frontend sem emitir |
| `npm run build` | Typecheck + build de produção/PWA |
| `npm run start` | API em modo produção |
| `npm run icons -w frontend` | Regenera ícones PWA |

## Perfis e permissões

| Perfil | Acesso |
| --- | --- |
| `superadmin` | Todo o sistema, gestão de usuários/unidades e auditoria |
| `medico` | Pacientes da rede, console, laudos e biópsias |
| `operador_ubs` | Pacientes da rede, console e acompanhamento de exames |
| `paciente` | Apenas os próprios exames e laudos |

O cadastro público cria somente `paciente` (trigger `handle_new_user`). Contas clínicas são criadas pelo superadmin ou pelo seed.

## API

Base: `/api`. Todas as rotas exigem `Authorization: Bearer <access_token>` do Supabase.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET/PATCH | `/me` | Perfil autenticado |
| POST | `/me/avatar` | Upload de avatar |
| GET | `/dashboard` | Métricas e gráficos por escopo |
| GET/POST | `/patients` | Listar/criar pacientes |
| GET/PATCH | `/patients/:id` | Detalhe/atualizar paciente |
| GET/POST | `/exams` | Listar/agendar exames |
| GET/PATCH | `/exams/:id` | Detalhe/atualizar exame e laudo |
| POST | `/exams/:id/telemetry` | Telemetria e posição da cápsula |
| POST | `/exams/:id/biopsy` | Acionar biópsia (`confirmation: "CONFIRMAR"`) |
| POST | `/exams/:id/findings` | Validar achados de IA |
| PATCH | `/biopsies/:id` | Atualizar amostra/resultado |
| GET | `/health-units` | Unidades ativas |
| GET/POST/PATCH | `/admin/users` | Gestão de usuários |
| GET/POST/PATCH | `/admin/health-units` | Gestão de unidades |
| GET | `/admin/audit` | Trilha de auditoria |

## Segurança e LGPD

- Autenticação delegada ao Supabase Auth; o backend valida o JWT em toda requisição.
- Service role usada apenas no servidor; frontend usa somente a anon key.
- RLS ativa em todas as tabelas e políticas por escopo de exame/paciente.
- Atualizações de `profiles` restritas por coluna para impedir autoelevação de privilégio.
- Ações críticas (biópsias, laudos, alterações administrativas) registradas em `audit_logs`.
- Bucket `exams` privado; mídias acessíveis somente a quem tem vínculo com o exame.
- CPF mascarado nas listagens de pacientes.
- Em produção: HTTPS, rotação de chaves, backups, revisão de retenção e consentimento LGPD.

## Build e PWA

```bash
npm run build
npm run preview -w frontend
```

O build gera `frontend/dist` com service worker e manifesto. Os ícones são versionados em `frontend/public/icons`; para alterar a arte, edite `frontend/scripts/generate-icons.mjs` e execute `npm run icons -w frontend`.

## Checklist de validação

- [ ] `supabase/schema.sql` executado sem erros.
- [ ] `backend/.env` e `frontend/.env` preenchidos.
- [ ] `npm run seed` concluído.
- [ ] Login com os quatro perfis demo.
- [ ] Dashboard, console 3D e laudos carregando.
- [ ] Criação de paciente e agendamento de exame.
- [ ] Biópsia com confirmação e atualização de resultado.
- [ ] Admin alterando perfil/unidade e auditoria registrando eventos.
- [ ] `npm run build` sem erros.
- [ ] PWA instalável no celular.

## Troubleshooting

- **`Supabase nao configurado` no login:** confira `frontend/.env` e reinicie o Vite.
- **Erro de CORS:** adicione a origem em `CORS_ORIGIN` (lista separada por vírgulas).
- **Cadastro não retorna sessão:** desative a confirmação de e-mail em Auth > Providers > Email ou confirme o e-mail no painel.
- **Seed falha em `profiles`:** execute o schema antes; o seed depende do trigger de criação de perfil.
- **Imagens/ícones quebrados:** rode `npm run icons -w frontend`.
- **Laudos vazios:** verifique se o exame está `concluido` e se o usuário tem escopo sobre ele.

## Revisao de implementacao

As rotas clinicas exigem autenticacao e escopo por unidade. Profissionais sem unidade
nao podem listar ou editar pacientes de toda a rede. A unidade do proprio perfil so
pode ser alterada pelo administrador, pois determina o acesso a dados clinicos.

A revisao de IA usa `POST /exams/:id/findings` com `finding_id` e `status`
(`confirmado` ou `descartado`). O servidor registra o usuario, horario e auditoria;
conflitos de edicao retornam 409. Campos de revisao nao sao aceitos por PATCH generico.
Laudos concluidos podem ser exportados em texto pela interface; cada solicitacao
passa por `GET /exams/:id/report-export` e registra `exam.report_export`.

O schema restringe escritas clinicas diretas pelo cliente: operacoes passam pela API.
Execute novamente o SQL atualizado para aplicar as politicas e os indices unicos.
Se houver capsulas duplicadas em exames ativos, resolva os registros antes de criar
o indice `exams_one_active_capsule`.

### Verificacao automatizada

```bash
npm test       # escopo, API/SQLite e componentes React (Vitest + jsdom)
npm run build  # TypeScript e build PWA
npm run check  # ambas as verificacoes
```

Os testes HTTP usam uma porta local temporaria e nao acessam um Supabase real.
A validacao integrada de Auth, Storage, RLS e seed exige um projeto Supabase
configurado. O console simula telemetria, camera, IA e navegacao; nao controla
hardware nem executa analise clinica real. O checklist de preparo deve ser
adaptado e aprovado pela equipe responsavel antes de uso assistencial.

### Preparacao e diagnostico

Execute `npm run setup` para criar os arquivos `.env` locais sem sobrescrever
configuracoes existentes. Preencha as chaves do seu projeto e execute
`npm run doctor`: ele verifica configuracao, tabelas, buckets, Auth e superadmin
sem exibir credenciais. As verificacoes de conexao sao somente de leitura.
Enquanto os valores dos exemplos nao forem substituidos, o diagnostico sinaliza
pendencias e nao tenta acessar o Supabase.

## Testes de regressao

`npm run check` executa os testes de backend, os testes de componentes React e o
build/PWA. Os testes HTTP criam bancos temporarios; nao alteram o banco usado pela
aplicacao aberta. Cobrem autenticacao e permissoes, cadastro com entradas invalidas,
agendamento, coleta, laudo, avatar, auditoria e persistencia entre processos.

Os testes de interface cobrem o gesto de confirmacao de biopsia, respostas atrasadas
ao trocar de exame e respostas de perfil recebidas depois do logout. Sao testes de
DOM com jsdom, sem verificacao visual do navegador ou integracao com hardware.

O override de `glob` dentro de `workbox-build` fixa uma versao corrigida para a
geracao do PWA. Ao atualizar dependencias, preserve o lockfile e execute
`npm run check` e `npm audit`.

## Simulacao visual do console

A camera usa um tunel 3D procedural com pregas, textura de mucosa, iluminacao da
lente e movimento progressivo. A visao Mapa 3D mostra uma secao aberta do mesmo
ambiente, com a capsula. Os controles X/Y, profundidade e rotacao afetam a cena;
a pausa preserva o progresso, inclusive ao trocar de visao. WebGL e necessario
para renderizar as cenas. Trata-se de uma simulacao visual, sem reconstrucao
anatomica de imagens reais.

Medicos e superadmins podem usar **Ativar garra** no console para exibir o
instrumento na camera e no 3D. Os controles permitem posicionar, avancar, girar,
abrir, fechar e recolher a garra. Sua configuracao permanece ao alternar as
visoes e e reiniciada ao trocar de exame. Esses movimentos nao registram uma
amostra: a coleta continua usando a confirmacao em duas etapas.
