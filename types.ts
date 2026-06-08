export interface MedicationLog {
  id: string;
  timestamp: string;
  administeredBy: string;
  status: 'administrado' | 'recusado' | 'atrasado';
  note?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  route: string; // Via de administração (Oral, EV, IM, etc.)
  frequency: string;
  nextDose: string;
  startDate?: string;
  endDate?: string;
  logs: MedicationLog[];
}

export interface VitalSign {
  timestamp: string;
  bp: string; // Blood Pressure
  hr: number; // Heart Rate
  temp: number; // Temperature
  spo2: number; // Oxygen Saturation
  painLevel?: number; // 0-10
}

export interface CarePlan {
  id: string;
  title: string;
  description: string;
  frequency: string;
  assignedTo: string;
  status: 'ativo' | 'concluido' | 'suspenso';
  createdAt: string;
}

export interface DailyChecklist {
  date: string;
  hygiene: boolean; // Banho/Higiene
  oralCare: boolean; // Higiene Oral
  feeding: boolean; // Aceitação alimentar (legacy boolean, keeping for compatibility)
  hydration: boolean; // Hidratação
  mobility: boolean; // Mobilização/Mudança de decúbito
  dressings: boolean; // Curativos (se houver)
  leisure: boolean; // Atividade de lazer/social

  // Detailed clinical and routine fields requested by the user
  queixaDor?: 'nao' | 'sim';
  queixaDorDesc?: string;
  estadoNeurologico?: string;
  arAmbiente?: boolean;
  alimentacao?: 'boa' | 'moderada' | 'ruim';
  alimentacaoDesc?: string;
  agitado?: boolean;
  prostrado?: boolean;
  sonolento?: boolean;
  eliminacaoEvacuacao?: 'presente' | 'ausente';
  eliminacaoEvacuacaoDias?: string;
  aspectoEvacuacoes?: 'endurecidas' | 'pastosa' | 'semi-liquidas' | 'liquida-diarreia';
  diurese?: 'ausente' | 'aumentada' | 'diminuida';
  diureseAspecto?: 'clara' | 'concentrada' | 'odor-sangue-ardencia';
  usoFraldas?: 'sim' | 'nao';
  mobilidadeSet?: 'independente' | 'auxilio' | 'acamado';
  higieneCorporal?: 'independente' | 'auxilio';
  higieneOralVestir?: 'independente' | 'auxilio';
  alteracoesPele?: 'nao' | 'sim';
  alteracoesPeleDesc?: string;
  sono?: 'preservado' | 'insatisfatorio';
  sonoDesc?: string;
  medicacoesAdministradas?: string;
  atividadesConsulta?: string;
  intercorrencia?: 'sim' | 'nao';
  intercorrenciaDesc?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface ResidentDocument {
  id: string;
  name: string;
  type: 'exame' | 'laudo' | 'receita' | 'documento_pessoal' | 'outro';
  url: string;
  uploadDate: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface LegalGuardian {
  name: string;
  cpf: string;
  phone: string;
  address: string;
}

// --- NUTRITION MODULE TYPES ---

export type DietConsistency = 'Geral' | 'Branda' | 'Pastosa' | 'Líquida' | 'Líquida-Pastosa';
export type DietType = 'Livre' | 'Hipossódica' | 'Diabética' | 'Hipolipídica' | 'Hiperproteica';
export type MealTime = 'Café da Manhã' | 'Colação' | 'Almoço' | 'Lanche da Tarde' | 'Jantar' | 'Ceia';

export interface DietPlan {
  consistency: DietConsistency;
  type: DietType;
  restrictions: string[]; // Specific restrictions beyond allergies
  fluidRestriction?: string; // e.g. "1500ml/dia"
  observations?: string;
  updatedAt: string;
}

export interface NutritionalLog {
  id: string;
  date: string;
  meal: MealTime;
  acceptance: number; // 0 to 100 percentage
  fluidIntake?: number; // in ml
  notes?: string;
}

export type RoomStatus = 'Ocupado' | 'Vago' | 'Em Limpeza' | 'Manutenção' | 'Reservado';

export interface Room {
  id: string;
  number: string;
  type: 'Individual' | 'Compartilhado';
  capacity: number;
  assets: string[];
  status?: RoomStatus;
}


export interface Resident {
  id: string;
  name: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  age: number;
  room: string;
  roomStatus?: RoomStatus; // New field for room occupancy status
  careLevel: 'I' | 'II' | 'III'; // Grau de dependência atualizado
  photoUrl: string;
  admissionDate: string;
  
  // Address
  addressCep?: string;
  addressState?: string;
  addressCity?: string;
  addressNeighborhood?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  
  // Contacts
  emergencyContacts: EmergencyContact[];
  legalGuardian?: LegalGuardian;

  // Clinical & Social
  clinicalCondition: string; // Diagnósticos
  functionalCondition: string; // Mobilidade, cognição
  socialHistory: string; // Histórico familiar/social
  
  medications: Medication[];
  allergies: string[];
  vitals: VitalSign[];
  carePlan: CarePlan[];
  dailyChecklists: DailyChecklist[];
  documents: ResidentDocument[];
  auditLogs: AuditLog[];

  // Nutrition
  dietPlan?: DietPlan;
  nutritionalLogs?: NutritionalLog[];
}

// --- FINANCIAL & CONTRACTS TYPES ---

export interface Contract {
  id: string;
  residentId: string;
  residentName: string;
  startDate: string;
  endDate?: string;
  monthlyValue: number;
  dueDay: number; // Dia de vencimento (ex: 5, 10)
  status: 'Ativo' | 'Suspenso' | 'Finalizado';
  fileUrl?: string; // PDF do contrato
}

export interface Invoice {
  id: string;
  contractId: string;
  residentName: string;
  amount: number;
  dueDate: string;
  status: 'Pendente' | 'Pago' | 'Atrasado';
  monthYear: string; // "05/2024"
  paidDate?: string;
}

export interface FinancialRecord {
  id: string;
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'pago' | 'pendente';
  invoiceId?: string; // Link se vier de uma mensalidade
}

export interface StockTransaction {
  id: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number; // Quantidade movimentada
  date: string;
  user: string;
  notes?: string;
}

export interface StockItem {
  id: string;
  name: string;
  category: 'medicamento' | 'insumo' | 'alimento';
  quantity: number;
  unit: string;
  minThreshold: number;
  history?: StockTransaction[];
}

// --- TEAM MANAGEMENT TYPES ---

export type UserRole = 'Admin' | 'Enfermeiro' | 'Cuidador' | 'Médico' | 'Nutricionista' | 'Fisioterapeuta';

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  cpf: string;
  email: string;
  phone: string;
  registrationNumber?: string; // COREN, CRM, etc.
  isTechnicalLead: boolean; // Responsável Técnico
  shift: 'Matutino' | 'Vespertino' | 'Noturno' | '12x36';
  status: 'Ativo' | 'Férias' | 'Afastado';
  admissionDate: string;
}

export interface TrainingRecord {
  id: string;
  title: string;
  date: string;
  instructor: string;
  participants: string[]; // Employee names or IDs
  validUntil?: string;
  description: string;
}

export interface SystemAccessLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: 'Login' | 'Logout' | 'Visualização Prontuário' | 'Edição Financeira' | 'Exportação Dados' | 'Cadastro de Usuário' | 'Exclusão de Usuário';
  resource?: string;
  ipAddress: string;
}

// --- AGENDA / CALENDAR TYPES ---

export type EventType = 'medico' | 'visita' | 'terapia' | 'atividade' | 'reuniao' | 'outro';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO String datetime
  end?: string; // ISO String datetime
  type: EventType;
  residentId?: string; // Optional link to a resident
  description?: string;
  location?: string; // e.g., "Sala 3" or "Hospital X"
  createdBy: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  RESIDENTS = 'RESIDENTS',
  RESIDENT_DETAIL = 'RESIDENT_DETAIL',
  FINANCE = 'FINANCE',
  STOCK = 'STOCK',
  AI_ASSISTANT = 'AI_ASSISTANT',
  TEAM = 'TEAM',
  NUTRITION = 'NUTRITION',
  REPORTS = 'REPORTS',
  AGENDA = 'AGENDA',
  USERS = 'USERS',
  ROOMS = 'ROOMS'
}

// --- AUTH & RBAC TYPES ---

export type ProfileType = 'Administrador' | 'Médico' | 'Cuidador' | 'Responsável';

export type PermissionAction = 'view' | 'edit' | 'create' | 'delete';

export interface Permission {
  module: ViewState;
  actions: PermissionAction[];
}

export interface Profile {
  id: string;
  name: string;
  type: ProfileType;
  permissions: Permission[];
  isEditable: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password: string;
  profile: Profile;
  residentId?: string; // somente para Responsável
}