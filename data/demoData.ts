// ─────────────────────────────────────────────────────────────────────────────
// Dataset mockado do painel de demonstração (/demo).
// Tipos leves e próprios da demo: as telas demo só exibem um subconjunto dos
// dados reais. Mantido separado dos tipos de produção (types.ts) para que a
// demo seja autossuficiente e fácil de trocar por um service real no futuro.
// ─────────────────────────────────────────────────────────────────────────────

export type CareLevel = 'I' | 'II' | 'III';
export type ResidentStatus = 'Ativo' | 'Internado' | 'Em observação';

export interface DemoResident {
  id: string;
  name: string;
  initials: string;
  color: string; // classe Tailwind literal (ex.: 'bg-blue-500')
  age: number;
  room: string;
  careLevel: CareLevel;
  status: ResidentStatus;
  condition: string;
  admissionDate: string; // ISO
}

export type UserRole = 'Administrador' | 'Médico' | 'Enfermeiro' | 'Cuidador' | 'Nutricionista';

export interface DemoUser {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
  role: UserRole;
  status: 'Ativo' | 'Inativo';
  lastAccess: string;
}

export type InvoiceStatus = 'Pago' | 'Pendente' | 'Atrasado';

export interface DemoInvoice {
  id: string;
  resident: string;
  amount: number;
  dueDate: string; // ISO
  status: InvoiceStatus;
}

export type NotificationType = 'estoque' | 'financeiro' | 'medicacao' | 'aniversario' | 'sistema';

export interface DemoNotification {
  id: string;
  type: NotificationType;
  title: string;
  text: string;
  time: string;
  read: boolean;
}

export interface DemoStockAlert {
  id: string;
  name: string;
  quantity: number;
  min: number;
  unit: string;
}

export type EventType = 'medico' | 'visita' | 'terapia' | 'atividade' | 'reuniao';

export interface DemoEvent {
  id: string;
  time: string;
  title: string;
  type: EventType;
  resident?: string;
}

export interface DemoReportItem {
  id: string;
  name: string;
  description: string;
  lastGenerated: string;
}

// ─── Perfil do administrador logado ────────────────────────────────────────────
export const DEMO_ADMIN = {
  name: 'Fernanda Lima',
  initials: 'FL',
  color: 'bg-blue-600',
  email: 'admin@recantocare.com',
  role: 'Administrador' as const,
  institution: 'Lar São Francisco',
  phone: '(11) 99005-0005',
};

// ─── Credenciais pré-preenchidas da demo ────────────────────────────────────────
export const DEMO_CREDENTIALS = { email: 'admin@recantocare.com', password: 'demo123' };

// ─── Residentes ─────────────────────────────────────────────────────────────────
export const DEMO_RESIDENTS: DemoResident[] = [
  { id: 'r1',  name: 'Maria Santos',     initials: 'MS', color: 'bg-blue-500',    age: 78, room: '101', careLevel: 'III', status: 'Ativo',         condition: 'Hipertensão e Diabetes tipo 2', admissionDate: '2022-01-15' },
  { id: 'r2',  name: 'José Oliveira',    initials: 'JO', color: 'bg-emerald-500', age: 82, room: '102', careLevel: 'II',  status: 'Ativo',         condition: 'Doença de Parkinson inicial',   admissionDate: '2021-06-10' },
  { id: 'r3',  name: 'Ana Lima',         initials: 'AL', color: 'bg-amber-500',   age: 75, room: '103', careLevel: 'I',   status: 'Ativo',         condition: 'Artrose em joelhos',            admissionDate: '2023-03-20' },
  { id: 'r4',  name: 'Pedro Costa',      initials: 'PC', color: 'bg-rose-500',    age: 88, room: '104', careLevel: 'III', status: 'Em observação', condition: 'Demência senil moderada',       admissionDate: '2020-09-01' },
  { id: 'r5',  name: 'Rosa Ferreira',    initials: 'RF', color: 'bg-violet-500',  age: 71, room: '105', careLevel: 'I',   status: 'Ativo',         condition: 'Pós-operatório de fêmur',       admissionDate: '2024-01-08' },
  { id: 'r6',  name: 'Antônio Ribeiro',  initials: 'AR', color: 'bg-cyan-500',    age: 84, room: '106', careLevel: 'II',  status: 'Ativo',         condition: 'DPOC e cardiopatia estável',    admissionDate: '2022-07-22' },
  { id: 'r7',  name: 'Helena Martins',   initials: 'HM', color: 'bg-indigo-500',  age: 79, room: '107', careLevel: 'II',  status: 'Ativo',         condition: 'Insuficiência cardíaca',        admissionDate: '2023-05-30' },
  { id: 'r8',  name: 'Sebastião Dias',   initials: 'SD', color: 'bg-pink-500',    age: 90, room: '108', careLevel: 'III', status: 'Internado',     condition: 'AVC com sequelas',              admissionDate: '2021-02-11' },
  { id: 'r9',  name: 'Conceição Souza',  initials: 'CS', color: 'bg-orange-500',  age: 73, room: '109', careLevel: 'I',   status: 'Ativo',         condition: 'Hipotireoidismo',               admissionDate: '2024-04-18' },
  { id: 'r10', name: 'Manoel Alves',     initials: 'MA', color: 'bg-teal-500',    age: 81, room: '110', careLevel: 'II',  status: 'Ativo',         condition: 'Diabetes tipo 2',               admissionDate: '2022-11-05' },
  { id: 'r11', name: 'Lúcia Pereira',    initials: 'LP', color: 'bg-blue-500',    age: 86, room: '111', careLevel: 'III', status: 'Ativo',         condition: 'Doença de Alzheimer',           admissionDate: '2020-12-01' },
  { id: 'r12', name: 'Geraldo Nunes',    initials: 'GN', color: 'bg-emerald-500', age: 77, room: '112', careLevel: 'I',   status: 'Ativo',         condition: 'Hipertensão controlada',        admissionDate: '2023-08-14' },
];

// ─── Usuários do sistema ─────────────────────────────────────────────────────────
export const DEMO_USERS: DemoUser[] = [
  { id: 'u1', name: 'Fernanda Lima',    initials: 'FL', color: 'bg-blue-600',    email: 'admin@recantocare.com',   role: 'Administrador', status: 'Ativo',   lastAccess: 'Há 2 minutos' },
  { id: 'u2', name: 'Dra. Carla Mendes', initials: 'CM', color: 'bg-rose-500',   email: 'carla.mendes@recantocare.com', role: 'Médico',       status: 'Ativo',   lastAccess: 'Há 1 hora' },
  { id: 'u3', name: 'Paulo Souza',      initials: 'PS', color: 'bg-emerald-500', email: 'paulo.souza@recantocare.com',  role: 'Enfermeiro',   status: 'Ativo',   lastAccess: 'Há 3 horas' },
  { id: 'u4', name: 'Juliana Alves',    initials: 'JA', color: 'bg-amber-500',   email: 'juliana.alves@recantocare.com', role: 'Cuidador',     status: 'Ativo',   lastAccess: 'Ontem, 18:42' },
  { id: 'u5', name: 'Roberto Nunes',    initials: 'RN', color: 'bg-slate-500',   email: 'roberto.nunes@recantocare.com', role: 'Cuidador',     status: 'Inativo', lastAccess: 'Há 12 dias' },
  { id: 'u6', name: 'Patrícia Gomes',   initials: 'PG', color: 'bg-orange-500',  email: 'patricia.gomes@recantocare.com', role: 'Nutricionista', status: 'Ativo', lastAccess: 'Há 5 horas' },
];

// ─── Mensalidades ────────────────────────────────────────────────────────────────
export const DEMO_INVOICES: DemoInvoice[] = [
  { id: 'i1', resident: 'Maria Santos',    amount: 4200, dueDate: '2026-06-05', status: 'Pago' },
  { id: 'i2', resident: 'José Oliveira',   amount: 3800, dueDate: '2026-06-05', status: 'Pago' },
  { id: 'i3', resident: 'Ana Lima',        amount: 3200, dueDate: '2026-06-05', status: 'Pago' },
  { id: 'i4', resident: 'Pedro Costa',     amount: 5500, dueDate: '2026-06-05', status: 'Pago' },
  { id: 'i5', resident: 'Rosa Ferreira',   amount: 3500, dueDate: '2026-06-05', status: 'Atrasado' },
  { id: 'i6', resident: 'Antônio Ribeiro', amount: 4000, dueDate: '2026-06-05', status: 'Pago' },
  { id: 'i7', resident: 'Helena Martins',  amount: 3900, dueDate: '2026-06-10', status: 'Pendente' },
  { id: 'i8', resident: 'Sebastião Dias',  amount: 6100, dueDate: '2026-06-05', status: 'Atrasado' },
];

// ─── Notificações ────────────────────────────────────────────────────────────────
export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  { id: 'n1', type: 'estoque',    title: 'Estoque crítico',        text: 'Donepezila 10mg abaixo do mínimo (20/30).', time: 'Há 10 min', read: false },
  { id: 'n2', type: 'financeiro', title: 'Mensalidade atrasada',   text: 'Fatura de Rosa Ferreira venceu em 05/06.',  time: 'Há 1 hora', read: false },
  { id: 'n3', type: 'medicacao',  title: 'Medicação pendente',     text: 'Pedro Costa — Donepezila das 20h.',         time: 'Há 2 horas', read: false },
  { id: 'n4', type: 'aniversario',title: 'Aniversário hoje',       text: 'Ana Lima completa 75 anos. 🎉',             time: 'Hoje, 08:00', read: true },
  { id: 'n5', type: 'estoque',    title: 'Reposição recomendada',  text: 'Álcool Gel 70% abaixo do mínimo (8/10).',   time: 'Ontem', read: true },
  { id: 'n6', type: 'sistema',    title: 'Backup concluído',       text: 'Backup automático realizado com sucesso.',   time: 'Ontem, 03:00', read: true },
];

// ─── Alertas de estoque ──────────────────────────────────────────────────────────
export const DEMO_STOCK_ALERTS: DemoStockAlert[] = [
  { id: 's1', name: 'Donepezila 10mg',     quantity: 20, min: 30,  unit: 'comprimidos' },
  { id: 's2', name: 'Fraldas Geriátricas G', quantity: 45, min: 60, unit: 'unidades' },
  { id: 's3', name: 'Álcool Gel 70%',      quantity: 8,  min: 10,  unit: 'litros' },
];

// ─── Agenda do dia ───────────────────────────────────────────────────────────────
export const DEMO_TODAY_EVENTS: DemoEvent[] = [
  { id: 'e1', time: '09:00', title: 'Consulta — Cardiologia', type: 'medico',    resident: 'Helena Martins' },
  { id: 'e2', time: '10:00', title: 'Consulta médica',        type: 'medico',    resident: 'Maria Santos' },
  { id: 'e3', time: '14:00', title: 'Fisioterapia',           type: 'terapia',   resident: 'Rosa Ferreira' },
  { id: 'e4', time: '15:30', title: 'Visita familiar',        type: 'visita',    resident: 'José Oliveira' },
  { id: 'e5', time: '16:00', title: 'Musicoterapia (grupo)',  type: 'atividade' },
];

// ─── Séries para gráficos (recharts) ────────────────────────────────────────────
export const DEMO_OCCUPANCY = [
  { month: 'Jan', ocupacao: 88 },
  { month: 'Fev', ocupacao: 90 },
  { month: 'Mar', ocupacao: 91 },
  { month: 'Abr', ocupacao: 92 },
  { month: 'Mai', ocupacao: 93 },
  { month: 'Jun', ocupacao: 94 },
];

export const DEMO_REVENUE_EXPENSE = [
  { month: 'Jan', receita: 44000, despesa: 31000 },
  { month: 'Fev', receita: 45200, despesa: 30500 },
  { month: 'Mar', receita: 46800, despesa: 32200 },
  { month: 'Abr', receita: 47100, despesa: 31800 },
  { month: 'Mai', receita: 47900, despesa: 33000 },
  { month: 'Jun', receita: 48200, despesa: 32400 },
];

export const DEMO_CARE_DISTRIBUTION = [
  { name: 'Grau I',   value: 4, color: '#10b981' },
  { name: 'Grau II',  value: 4, color: '#f59e0b' },
  { name: 'Grau III', value: 4, color: '#f43f5e' },
];

// ─── Assinatura da instituição (SaaS) ───────────────────────────────────────────
export const DEMO_SUBSCRIPTION = {
  plano: 'Profissional',
  valorMensal: 799,
  status: 'Ativa' as const,
  proximaCobranca: '2026-07-05',
  limiteResidentes: 100,
  residentesUsados: 12,
  limiteUsuarios: 20,
  usuariosUsados: 6,
};

// ─── Catálogo de relatórios ──────────────────────────────────────────────────────
export const DEMO_REPORTS: DemoReportItem[] = [
  { id: 'rep1', name: 'Conformidade RDC 283', description: 'Checklist de conformidade ANVISA para fiscalização.', lastGenerated: '05/06/2026' },
  { id: 'rep2', name: 'Residentes & Ocupação', description: 'Demografia, graus de dependência e ocupação.',       lastGenerated: '10/06/2026' },
  { id: 'rep3', name: 'Financeiro Mensal',     description: 'Receitas, despesas e inadimplência do período.',      lastGenerated: '08/06/2026' },
  { id: 'rep4', name: 'Nutrição',              description: 'Tipos de dieta e aceitação das refeições.',           lastGenerated: '07/06/2026' },
  { id: 'rep5', name: 'Estoque & Validade',    description: 'Itens críticos, validades e movimentações.',          lastGenerated: '09/06/2026' },
  { id: 'rep6', name: 'Equipe & Treinamentos', description: 'Quadro de funcionários e certificações.',             lastGenerated: '01/06/2026' },
];

// ─── KPIs resumidos do dashboard ────────────────────────────────────────────────
export const DEMO_KPIS = {
  residentes: DEMO_RESIDENTS.length,
  capacidade: 16,
  ocupacao: 94,
  receitaMes: 48200,
  inadimplenciaQtd: DEMO_INVOICES.filter(i => i.status === 'Atrasado').length,
  inadimplenciaValor: DEMO_INVOICES.filter(i => i.status === 'Atrasado').reduce((s, i) => s + i.amount, 0),
  alertasEstoque: DEMO_STOCK_ALERTS.length,
};

// Util de formatação monetária (pt-BR) reutilizado nas telas demo.
export const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
