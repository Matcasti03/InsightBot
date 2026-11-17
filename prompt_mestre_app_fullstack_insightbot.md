# PROMPT DE ENGENHARIA DE SOFTWARE: APLICATIVO FULLSTACK INSIGHTBOT

## 1. PERSONA E OBJETIVO PRINCIPAL
Atue como um **Engenheiro Sênior Projetista Fullstack com ênfase em Aplicativos para Dispositivos Móveis (Mobile-First & PWA)** e especialista em Arquitetura de Sistemas Médicos (HealthTech) e UI/UX Design.

Sua missão é projetar e desenvolver o código completo, funcional e escalável do aplicativo **InSightBot** (desenvolvido pela equipe *EliteDevs*), utilizando **Node.js** no backend e **Supabase** (PostgreSQL, Auth e Storage) como infraestrutura de banco de dados e autenticação. O aplicativo deve resolver o desafio real do projeto: democratizar e tornar menos invasivos os exames do sistema digestivo (endoscopia por cápsula robótica) em Unidades Básicas de Saúde (UBSs) e clínicas do interior, permitindo que operadores locais e médicos especialistas conduzam exames, monitorem telemetria em tempo real e acionem o mecanismo de coleta de biópsia com segurança.

---

## 2. STACK TECNOLÓGICA OBRIGATÓRIA
* **Backend:** Node.js (Express ou Fastify, com arquitetura modular, middlewares de autenticação JWT, validação de dados e integração oficial com `@supabase/supabase-js`).
* **Banco de Dados, Auth e Storage:** Supabase (PostgreSQL com *Row Level Security* - RLS ativado, Supabase Auth para gestão de sessões e Supabase Storage com bucket público/privado para fotos de perfil e registros de exames).
* **Frontend (Mobile-First & Responsivo):** React / Next.js (configurado como PWA responsivo) ou React Native Web, estilizado com **Tailwind CSS**.
* **Ícones e Efeitos Visuais:** `lucide-react` para iconografia consistente e `framer-motion` para micro-interações, transições fluidas de tela, efeitos de *Glassmorphism* sutil e animações de telemetria.
* **Visualização 3D / Gráficos:** `recharts` para indicadores de saúde/telemetria e `three.js` (ou Canvas interativo) para simulação da orientação espacial 3D da cápsula.

---

## 3. ARQUITETURA DE ACESSO, SUPERADMIN E PERFIS (RBAC)
O sistema deve possuir controle rigoroso de acesso baseado em papéis (*Role-Based Access Control*):

1. **Conta Superadmin (Gestor Master / Secretaria de Saúde):**
   * Deve existir uma rotina de *seed* ou flag inicial no banco de dados para criar o primeiro **Superadmin**.
   * Possui acesso irrestrito a todos os módulos, painel administrativo para gerenciar usuários cadastrados, alterar níveis de permissão (`role`), ativar/desativar contas, cadastrar UBSs/Clínicas parceiras e visualizar logs de auditoria (LGPD).
2. **Criação de Contas (Sign Up) e Login:**
   * Tela moderna de Login e Cadastro de Novos Usuários (com validação de e-mail e senha forte). Por padrão, novos cadastros públicos entram com perfil de `Paciente` ou aguardam aprovação do Superadmin para perfis clínicos (`Médico` / `Técnico UBS`).
3. **Perfis de Acesso Contextualizados ao InSightBot:**
   * `superadmin`: Controle total do sistema, usuários e infraestrutura.
   * `medico`: Acesso ao Console de Navegação Magnética, visualização de vídeo/3D, acionamento do mecanismo de biópsia, análise de alertas de IA e emissão de laudos.
   * `operador_ubs`: Enfermeiro ou técnico na ponta (UBS) que prepara o paciente, realiza o pareamento inicial da cápsula ingerível e monitora sinais vitais básicos.
   * `paciente`: Visualiza seus agendamentos, checklist interativo de preparo pré-exame, status da análise da biópsia e laudos simplificados (evitando deslocamentos desnecessários até grandes centros).
4. **Gestão de Perfil e Foto de Avatar:**
   * Todos os usuários devem ter uma tela de **"Meu Perfil"** onde podem editar seus dados pessoais (nome, telefone, CRM/COREN quando aplicável, unidade de saúde), alternar preferências e **fazer upload, visualizar e atualizar sua foto de perfil** diretamente integrada ao bucket `avatars` do **Supabase Storage**, com atualização imediata na interface.

---

## 4. FUNCIONALIDADES INOVADORAS E PLAUSÍVEIS (MÓDULOS DO APP)
Desenvolva soluções práticas que agreguem valor real aos usuários do InSightBot e demonstrem maturidade técnica:

### Módulo A: Dashboard Inteligente (Visão Geral)
* Cards com métricas dinâmicas: Exames realizados na região, deslocamentos intermunicipais evitados (economia para o SUS), status das cápsulas em operação e fila de laudos.
* Gráficos limpos de acompanhamento de atendimentos por UBS.

### Módulo B: Console de Navegação & Telemetria da Cápsula (Core MVP)
* **Interface de Controle Remoto:** Controles direcionais responsivos (Joystick virtual touch para mobile e teclado/mouse para desktop) para simular o ajuste do **campo magnético externo** (eixos X, Y, Z e rotação).
* **Monitoramento de Telemetria em Tempo Real:** Indicadores visuais animados de Bateria da Cápsula (%), Temperatura Interna (°C), pH Gástrico/Intestinal, Qualidade do Sinal e Posição Estimada no Trato Digestivo.
* **Simulador de Visão HD + Reconstrução 3D:** Área visual destacando o feed da microcâmera com alternância para visão de mapeamento 3D da mucosa.
* **Acionamento Seguro de Biópsia (Microcoleta):** Botão dedicado para abrir/fechar o micromecanismo de coleta de amostra biológica. **Regra crítica de segurança:** Exigir dupla confirmação humana (*slide-to-confirm* ou modal de validação médica) antes de disparar o comando, registrando o carimbo de tempo e coordenadas exatas da coleta.
* **Assistente Visual de Apoio (IA Responsável):** Sobreposição opcional que destaca áreas suspeitas na mucosa com nível de confiança (%), exigindo sempre o clique de **Validação Humana** do médico ("Confirmar Achado" ou "Descartar"), garantindo ética e rastreabilidade.

### Módulo C: Gestão de Pacientes, Prontuários e Amostras (LGPD)
* Cadastro de pacientes com mascaramento de dados sensíveis (CPF parcialmente oculto na listagem geral para conformidade com a LGPD).
* Rastreamento da amostra coletada pela cápsula (Código QR/ID da cápsula vinculado ao frasco de análise laboratorial).

### Módulo D: Painel Superadmin
* Tabela responsiva e cards mobile para gerenciar todos os usuários, alterar papéis (`role`), redefinir status e auditar ações críticas (quem acionou biópsias, quem exportou laudos).

---

## 5. DIRETRIZES DE UI/UX, RESPONSIVIDADE E EFEITOS VISUAIS
* **Estética "Clean Medical-Tech":** Design minimalista, alta legibilidade, muito respiro visual, bordas arredondadas (`rounded-2xl`), sombras suaves e hierarquia tipográfica clara (ex: `Inter` ou `Plus Jakarta Sans`).
* **Tema Dark & Light Mode:** Seletor acessível no cabeçalho e no perfil que alterna instantaneamente entre:
  * *Light Mode:* Fundo branco gelo (`#F8FAFC`), superfícies brancas (`#FFFFFF`), azul médico (`#0284C7`) e verde esmeralda para status seguro (`#10B981`).
  * *Dark Mode:* Fundo azul-ardósia profundo (`#0B1120`), cartões translúcidos (`#1E293B`), ciano luminoso (`#38BDF8`) e alto contraste para ambientes de sala de exame.
* **Navegação Híbrida Responsiva (Obrigatório):**
  * **Desktop / Tablet (`md:` e acima):** **Sidebar lateral esquerda** retrátil, detalhada com ícones nítidos, indicadores de página ativa com efeito de deslize, badge de perfil do usuário e atalho rápido para troca de tema.
  * **Dispositivos Móveis (`< md`):** Ocultar a sidebar fixa e exibir uma **Bottom Navigation Bar (Menu Inferior)** flutuante/fixa com efeito *backdrop-blur* (Glassmorphism), contendo até 5 ícones essenciais (ex: *Início*, *Console 3D*, *Pacientes*, *Admin/Alertas*, *Perfil*) com animação de escala ao toque.
* **Efeitos Visuais e Micro-interações:**
  * Efeito *pulse* suave nos indicadores de conexão ativa da cápsula.
  * *Skeleton loaders* durante o carregamento de dados do Supabase.
  * *Toasts* (notificações flutuantes elegantes) para feedback de ações (ex: *"Foto de perfil atualizada"*, *"Amostra de biópsia registrada com sucesso"*).

---

## 6. ESTRUTURA DO BANCO DE DADOS (SUPABASE SQL SCHEMA)
Gere o script SQL completo para ser executado no SQL Editor do Supabase, incluindo:
1. Tabela `profiles` vinculada a `auth.users(id)` contendo: `id`, `full_name`, `email`, `avatar_url`, `role` (`superadmin`, `medico`, `operador_ubs`, `paciente`), `health_unit` (UBS/Clínica), `professional_register` (CRM/COREN), `updated_at`.
2. Trigger automático em PostgreSQL (`handle_new_user`) para criar o registro na tabela `profiles` assim que uma conta for criada via Supabase Auth.
3. Tabela `exams` (exames realizados, paciente, médico responsável, status, telemetria resumida, coordenadas 3D).
4. Tabela `biopsy_samples` (registros de acionamento do micromecanismo, timestamp, validação humana, resultado).
5. Políticas de **RLS (Row Level Security)** garantindo que pacientes vejam apenas seus próprios dados, profissionais de saúde vejam exames de sua unidade e o `superadmin` tenha acesso global.
6. Configuração do Bucket `avatars` no Supabase Storage com políticas de upload e leitura.

---

## 7. FORMATO DE ENTREGA DO CÓDIGO
Entregue a solução organizada de forma clara e executável:
1. **Arquitetura de Pastas** do projeto (Backend Node.js + Frontend Responsivo).
2. **Script SQL Completo** para configurar o Supabase (Tabelas, Triggers, RLS e Storage).
3. **Código do Servidor Backend (Node.js)** com rotas protegidas, upload de avatar e endpoints de telemetria/exames.
4. **Código do Frontend Completo (Mobile-First)** com gerenciamento de estado de autenticação, troca de tema Dark/Light, Sidebar com ícones, Menu Inferior (Bottom Nav), tela de Perfil com upload de foto, Painel Superadmin e o Console Interativo da Cápsula InSightBot.
5. **Instruções passo a passo** de configuração do arquivo `.env` e execução local.