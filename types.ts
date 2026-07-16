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
  observations?: string;
  documentUrl?: string;
}

export interface ResidentPrescriptionRecord {
  id: string;
  description: string;
  expiryDate: string; // YYYY-MM-DD
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

export interface VitalSign {
  timestamp: string;
  bp: string; // Blood Pressure
  hr: number; // Heart Rate
  temp: number; // Temperature
  spo2: number; // Oxygen Saturation
  painLevel?: number; // 0-10
}

export type GlicemiaMomento = 'jejum' | 'pre_prandial' | 'pos_prandial' | 'madrugada' | 'outro';

export interface GlucoseReading {
  id: string;
  timestamp: string;
  value: number; // mg/dL
  moment: GlicemiaMomento;
  insulinApplied?: boolean;
  insulinUnits?: number;
  notes?: string;
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

export interface CarePlanAdherence {
  id?: string;
  checklistId?: string;
  carePlanId: string;
  status: 'conseguindo_seguir' | 'nao_conseguindo_seguir' | 'apresentando_dificuldades';
  comment?: string;
}

export interface DailyChecklist {
  date: string;
  shift?: 'diurno' | 'noturno' | 'diario';
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
  estadoNeurologico?: 'lucido' | 'confuso';
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
  carePlanAdherence?: CarePlanAdherence[];
  photoUrls?: string[];
  signedBy?: string;
  signedAt?: string;
  signatureInfo?: string;
  frequenciaCardiaca?: string;
  pressaoArterial?: string;
  saturacao?: string;
  temperatura?: string;
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
  folderId?: string | null;
}

export interface DocumentFolder {
  id: string;
  name: string;
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

export interface Visit {
  id: string;
  residentId: string;
  visitorName: string;
  relation: string;
  cpf?: string;
  phone?: string;
  date: string;
  temperature?: number;
  observations?: string;
  createdBy: string;
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
  prescriptions?: ResidentPrescriptionRecord[];
  allergies: string[];
  vitals: VitalSign[];
  glucoseReadings: GlucoseReading[];
  carePlan: CarePlan[];
  dailyChecklists: DailyChecklist[];
  documents: ResidentDocument[];
  documentFolders?: DocumentFolder[];
  auditLogs: AuditLog[];
  visits: Visit[];

  // Nutrition
  dietPlan?: DietPlan;
  nutritionalLogs?: NutritionalLog[];

  // Plano de Rotina Usual (Atrelados ao paciente)
  usoFraldas?: 'sim' | 'nao';
  mobilidadeSet?: 'independente' | 'auxilio' | 'acamado';
  higieneCorporal?: 'independente' | 'auxilio';
  higieneOralVestir?: 'independente' | 'auxilio';
  reqHygiene?: boolean | null;
  reqOralCare?: boolean | null;
  reqFeeding?: boolean | null;
  reqHydration?: boolean | null;
  reqMobility?: boolean | null;
  reqDressings?: boolean | null;
  reqLeisure?: boolean | null;
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
  residentId?: string;
  expirationDate?: string;
}

// --- TEAM MANAGEMENT TYPES ---

export type UserRole = 'Admin' | 'Enfermeiro' | 'Cuidador' | 'Médico' | 'Nutricionista' | 'Fisioterapeuta';

// --- DIGITAL CERTIFICATE TYPES (ICP-Brasil A1) ---

export interface DigitalCertificate {
  certificate_file_name?: string;
  certificate_holder_name: string;
  certificate_document: string;         // CPF ou CNPJ do titular
  certificate_serial_number: string;    // Número de série em hex
  certificate_issuer: string;           // Autoridade Certificadora (AC)
  certificate_issue_date: string;       // YYYY-MM-DD
  certificate_expiration_date: string;  // YYYY-MM-DD
  certificate_status: 'valid' | 'expiring_soon' | 'expired';
  certificate_last_validation: string;  // ISO datetime
  certificate_type: 'A1';
}

export interface Employee {
  id: string;
  auth_user_id?: string; // Link to auth user
  name: string;
  role: UserRole;
  cpf: string;
  email: string;
  phone: string;
  registrationNumber?: string; // COREN, CRM, etc.
  isTechnicalLead: boolean; // Responsável Técnico
  shift: 'Matutino' | 'Vespertino' | 'Noturno' | '12x36';
  shiftStart?: string; // HH:MM
  shiftEnd?: string;   // HH:MM
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
  TEAM = 'TEAM',
  NUTRITION = 'NUTRITION',
  REPORTS = 'REPORTS',
  AGENDA = 'AGENDA',
  USERS = 'USERS',
  ROOMS = 'ROOMS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  SETTINGS = 'SETTINGS',
  PROFILE = 'PROFILE',
  
  // Sub-pages of RESIDENT_DETAIL (Prontuário)
  RESIDENT_DETAIL_INFO = 'RESIDENT_DETAIL_INFO',
  RESIDENT_DETAIL_VITALS = 'RESIDENT_DETAIL_VITALS',
  RESIDENT_DETAIL_GLICEMIA = 'RESIDENT_DETAIL_GLICEMIA',
  RESIDENT_DETAIL_MEDS = 'RESIDENT_DETAIL_MEDS',
  RESIDENT_DETAIL_ROUTINE = 'RESIDENT_DETAIL_ROUTINE',
  RESIDENT_DETAIL_CARE_PLAN = 'RESIDENT_DETAIL_CARE_PLAN',
  RESIDENT_DETAIL_VISITS = 'RESIDENT_DETAIL_VISITS',
  RESIDENT_DETAIL_DOCS = 'RESIDENT_DETAIL_DOCS',
  RESIDENT_DETAIL_EVOLUTION = 'RESIDENT_DETAIL_EVOLUTION',
  RESIDENT_DETAIL_HISTORY = 'RESIDENT_DETAIL_HISTORY'
}

// --- NOTIFICAÇÕES WHATSAPP (UAZAPI) ---

export type NotificationMessageType = 'text' | 'button' | 'menu';
export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type NotificationRecipientType = 'responsible' | 'resident' | 'group' | 'manual_phone';

export interface NotificationChoice {
  id: string;
  text: string;
}

export interface NotificationTemplate {
  id: string;
  empresaId?: string; // null = template global
  name: string;
  triggerEvent: string; // 'manual' | 'medication_low' | ...
  messageType: NotificationMessageType;
  messageText: string;
  footerText?: string;
  choices?: NotificationChoice[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationQueueItem {
  id: string;
  templateId?: string;
  triggerEvent: string;
  messageType: NotificationMessageType;
  recipientType: NotificationRecipientType;
  recipientName?: string;
  recipientPhone: string;
  messageText: string;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  scheduledFor: string;
  sentAt?: string;
  createdAt: string;
}

export interface NotificationPreference {
  id?: string;
  responsibleId: string;
  residentId?: string;
  whatsappEnabled: boolean;
  healthNotificationsEnabled: boolean;
  administrativeNotificationsEnabled: boolean;
  financialNotificationsEnabled: boolean;
  consentSource?: string;
  consentedAt?: string;
  revokedAt?: string;
}

export interface WhatsappInstance {
  instanceName?: string;
  status: string; // 'not_configured' | 'disconnected' | 'connecting' | 'connected'
  connected: boolean;
  phoneNumber?: string;
  hasToken?: boolean;
  connectedAt?: string;
  qrcode?: string; // base64 (apenas durante a conexão)
}

// --- AUTH & RBAC TYPES ---

export type ProfileType = 'Administrador' | 'Médico' | 'Cuidador' | 'Responsável';

export type PermissionAction = 'view' | 'edit' | 'create' | 'delete' | 'sign';

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
  employeeRole?: UserRole;
  certificate?: DigitalCertificate;
  empresaId?: string;
  cpf?: string;
  sexo?: string;
  celular?: string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  numero?: string;
  complemento?: string;
  avatarUrl?: string;
}

// --- MULTI-TENANT / ASSINATURA ---

export type StatusEmpresa = 'ativa' | 'pendente' | 'bloqueada' | 'cancelada';
export type StatusAssinatura = 'ativa' | 'pendente' | 'cancelada' | 'vencida' | 'pagamento_recusado' | 'em_trial' | 'erro_checkout';
export type PlanoId = 'essencial' | 'profissional' | 'enterprise';
export type FormaPagamento = 'cartao' | 'pix' | 'boleto';
export type Periodicidade = 'mensal' | 'anual';

export interface PlanoView {
  id: PlanoId;
  nome: string;
  precoMensal: number;
  precoMensalAnual: number;
  precoAnualTotal: number;
  selfService: boolean;
  desc: string;
  features: string[];
  popular?: boolean;
  badgeLabel?: string | null;
  ctaLabel?: string;
  maxResidentes: number | null;
  maxUsuarios: number | null;
}

export interface Empresa {
  id: string;
  empresaId: string;
  nomeInstituicao: string;
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  telefone?: string;
  emailComercial?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  qtdResidentes?: number;
  qtdUsuarios?: number;
  status: StatusEmpresa;
  createdAt: string;
}

export interface Assinatura {
  id: string;
  empresaId: string;
  planoId: PlanoId;
  planoNome: string;
  valorMensal: number;
  periodicidade: Periodicidade;
  gatewayPagamento?: string;
  gatewayCustomerId?: string;
  gatewaySubscriptionId?: string;
  status: StatusAssinatura;
  dataInicio?: string;
  dataVencimento?: string;
  dataCancelamento?: string;
  createdAt: string;
  // --- Integração Asaas ---
  formaPagamento?: string;
  gatewayPaymentId?: string;
  asaasInvoiceUrl?: string;
  ativadaEm?: string;
  canceladaEm?: string;
  checkoutExpiraEm?: string;
  motivoCancelamento?: string;
}

export interface CheckoutFormData {
  // Empresa
  nomeInstituicao: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  telefoneEmpresa: string;
  emailComercial: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  qtdResidentes: string;
  qtdUsuarios: string;
  planoId: PlanoId;
  periodicidade: Periodicidade;
  // Admin
  nomeAdmin: string;
  cpfAdmin: string;
  emailAdmin: string;
  telefoneAdmin: string;
  cargo: string;
  senha: string;
  confirmarSenha: string;
  // Pagamento
  formaPagamento: FormaPagamento;
  nomeTitular: string;
  cpfTitular: string;
  numeroCartao: string;
  validadeCartao: string;
  cvv: string;
  enderecoCobranca: string;
}

// --- ASSINATURA DE DOCUMENTOS ---
// Controla o modelo de assinatura utilizado nos documentos que exigem assinatura.
// O fluxo real de assinatura será implementado em etapa posterior; este tipo
// apenas representa a preferência armazenada por instituição.

export type DocumentSignatureType = 'simples' | 'certificado_a1';

export interface DocumentSettings {
  tipoAssinatura: DocumentSignatureType;
}

// --- MODELO DE BOLETIM DIÁRIO ---
// Controla se a instituição preenche dois boletins por dia (diurno/noturno)
// ou um único boletim diário unificado.

export type BoletimModelType = 'diurno_noturno' | 'diario';

export interface BoletimSettings {
  modelo: BoletimModelType;
}