import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import ResidentsList from './ResidentsList';
import ResidentProfile from './ResidentProfile';
import FinanceModule from './FinanceModule';
import StockModule from './StockModule';
import TeamModule from './TeamModule';
import NutritionModule from './NutritionModule';
import ReportsModule from './ReportsModule';
import AgendaModule from './AgendaModule';
import RoomsModule from './RoomsModule';
import {
  ViewState, Resident, FinancialRecord, StockItem, Employee,
  TrainingRecord, SystemAccessLog, Contract, Invoice, CalendarEvent, Room
} from '../types';
import { X, Rocket, Menu, HeartPulse } from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DEMO_RESIDENTS: Resident[] = [
  {
    id: 'demo-r1',
    name: 'Maria Santos',
    cpf: '123.456.789-00',
    birthDate: '1946-03-12',
    age: 78,
    room: '101',
    roomStatus: 'Ocupado',
    careLevel: 'III',
    photoUrl: 'https://picsum.photos/200/200?random=1',
    admissionDate: '2022-01-15',
    clinicalCondition: 'Hipertensão arterial, Diabetes mellitus tipo 2, Osteoartrite',
    functionalCondition: 'Semi-dependente para atividades básicas, deambula com andador',
    socialHistory: 'Viúva, dois filhos, netos frequentam regularmente. Era professora.',
    emergencyContacts: [{ name: 'Carlos Santos', relation: 'Filho', phone: '(11) 99999-1111' }],
    medications: [
      { id: 'demo-m1', name: 'Losartana 50mg', dosage: '1 comprimido', route: 'Oral', frequency: '1x/dia', nextDose: '08:00', logs: [] },
      { id: 'demo-m2', name: 'Metformina 850mg', dosage: '1 comprimido', route: 'Oral', frequency: '2x/dia', nextDose: '12:00', logs: [] },
    ],
    allergies: ['Dipirona'],
    vitals: [
      { timestamp: '2026-06-15T08:00:00', bp: '130/85', hr: 74, temp: 36.6, spo2: 97 },
      { timestamp: '2026-06-14T08:00:00', bp: '128/82', hr: 72, temp: 36.5, spo2: 98 },
    ],
    carePlan: [
      { id: 'demo-cp1', title: 'Controle pressórico', description: 'Aferir PA 2x/dia', frequency: 'Diário', assignedTo: 'Enfermagem', status: 'ativo', createdAt: '2026-01-01' },
    ],
    dailyChecklists: [
      { date: '2026-06-15', shift: 'diurno', hygiene: true, oralCare: true, feeding: true, hydration: true, mobility: true, dressings: false, leisure: true },
    ],
    documents: [],
    auditLogs: [],
    visits: [],
    glucoseReadings: [],
    usoFraldas: 'sim',
    mobilidadeSet: 'auxilio',
    higieneCorporal: 'auxilio',
    higieneOralVestir: 'auxilio',
    reqHygiene: true,
    reqOralCare: true,
    reqFeeding: true,
    reqHydration: true,
    reqMobility: true,
    reqDressings: null,
    reqLeisure: true,
  },
  {
    id: 'demo-r2',
    name: 'José Oliveira',
    cpf: '234.567.890-11',
    birthDate: '1942-07-28',
    age: 82,
    room: '102',
    roomStatus: 'Ocupado',
    careLevel: 'II',
    photoUrl: 'https://picsum.photos/200/200?random=2',
    admissionDate: '2021-06-10',
    clinicalCondition: 'Doença de Parkinson em estágio inicial, hipotensão ortostática',
    functionalCondition: 'Independente com supervisão, leve tremor em repouso',
    socialHistory: 'Casado, esposa visita diariamente. Ex-engenheiro aposentado.',
    emergencyContacts: [{ name: 'Fernanda Oliveira', relation: 'Esposa', phone: '(11) 98888-2222' }],
    medications: [
      { id: 'demo-m3', name: 'Levodopa/Carbidopa 250mg', dosage: '1 comprimido', route: 'Oral', frequency: '3x/dia', nextDose: '07:00', logs: [] },
    ],
    allergies: [],
    vitals: [
      { timestamp: '2026-06-15T09:00:00', bp: '120/75', hr: 68, temp: 36.4, spo2: 99 },
    ],
    carePlan: [],
    dailyChecklists: [
      { date: '2026-06-15', shift: 'diurno', hygiene: true, oralCare: true, feeding: true, hydration: true, mobility: true, dressings: false, leisure: true },
    ],
    documents: [],
    auditLogs: [],
    visits: [],
    glucoseReadings: [],
    usoFraldas: 'nao',
    mobilidadeSet: 'independente',
    higieneCorporal: 'independente',
    higieneOralVestir: 'independente',
  },
  {
    id: 'demo-r3',
    name: 'Ana Lima',
    cpf: '345.678.901-22',
    birthDate: '1951-11-05',
    age: 75,
    room: '103',
    roomStatus: 'Ocupado',
    careLevel: 'I',
    photoUrl: 'https://picsum.photos/200/200?random=3',
    admissionDate: '2023-03-20',
    clinicalCondition: 'Artrose em joelhos, depressão leve controlada',
    functionalCondition: 'Independente para todas as atividades',
    socialHistory: 'Viúva há 2 anos, filhas moram em outro estado. Muito sociável.',
    emergencyContacts: [{ name: 'Beatriz Lima', relation: 'Filha', phone: '(21) 97777-3333' }],
    medications: [
      { id: 'demo-m4', name: 'Sertralina 50mg', dosage: '1 comprimido', route: 'Oral', frequency: '1x/dia', nextDose: '08:00', logs: [] },
    ],
    allergies: ['Penicilina'],
    vitals: [
      { timestamp: '2026-06-15T08:30:00', bp: '118/76', hr: 70, temp: 36.3, spo2: 99 },
    ],
    carePlan: [],
    dailyChecklists: [],
    documents: [],
    auditLogs: [],
    visits: [],
    glucoseReadings: [],
    usoFraldas: 'nao',
    mobilidadeSet: 'independente',
    higieneCorporal: 'independente',
    higieneOralVestir: 'independente',
  },
  {
    id: 'demo-r4',
    name: 'Pedro Costa',
    cpf: '456.789.012-33',
    birthDate: '1936-02-14',
    age: 88,
    room: '104',
    roomStatus: 'Ocupado',
    careLevel: 'III',
    photoUrl: 'https://picsum.photos/200/200?random=4',
    admissionDate: '2020-09-01',
    clinicalCondition: 'Demência senil moderada, HAS, ICC compensada',
    functionalCondition: 'Dependente total para higiene e alimentação, acamado',
    socialHistory: 'Solteiro, sobrinha é responsável legal. Veterinário aposentado.',
    emergencyContacts: [{ name: 'Claudia Costa', relation: 'Sobrinha', phone: '(11) 96666-4444' }],
    medications: [
      { id: 'demo-m5', name: 'Donepezila 10mg', dosage: '1 comprimido', route: 'Oral', frequency: '1x/dia', nextDose: '20:00', logs: [] },
      { id: 'demo-m6', name: 'Furosemida 40mg', dosage: '1 comprimido', route: 'Oral', frequency: '1x/dia', nextDose: '08:00', logs: [] },
    ],
    allergies: [],
    vitals: [
      { timestamp: '2026-06-15T07:00:00', bp: '140/90', hr: 80, temp: 36.8, spo2: 95 },
    ],
    carePlan: [
      { id: 'demo-cp2', title: 'Prevenção de escaras', description: 'Mudança de decúbito a cada 2h', frequency: 'A cada 2 horas', assignedTo: 'Cuidadores', status: 'ativo', createdAt: '2020-09-01' },
    ],
    dailyChecklists: [
      { date: '2026-06-15', shift: 'diurno', hygiene: true, oralCare: true, feeding: true, hydration: true, mobility: true, dressings: true, leisure: false },
    ],
    documents: [],
    auditLogs: [],
    visits: [],
    glucoseReadings: [],
    usoFraldas: 'sim',
    mobilidadeSet: 'acamado',
    higieneCorporal: 'auxilio',
    higieneOralVestir: 'auxilio',
    reqHygiene: true,
    reqOralCare: true,
    reqFeeding: true,
    reqHydration: true,
    reqMobility: true,
    reqDressings: true,
    reqLeisure: null,
  },
  {
    id: 'demo-r5',
    name: 'Rosa Ferreira',
    cpf: '567.890.123-44',
    birthDate: '1955-06-30',
    age: 71,
    room: '105',
    roomStatus: 'Ocupado',
    careLevel: 'I',
    photoUrl: 'https://picsum.photos/200/200?random=5',
    admissionDate: '2024-01-08',
    clinicalCondition: 'Fratura de fêmur em recuperação, hipotireoidismo',
    functionalCondition: 'Boa evolução pós-operatória, fisioterapia 3x/semana',
    socialHistory: 'Casada, marido visita todos os dias. Professora aposentada.',
    emergencyContacts: [{ name: 'Roberto Ferreira', relation: 'Marido', phone: '(11) 95555-5555' }],
    medications: [
      { id: 'demo-m7', name: 'Levotiroxina 50mcg', dosage: '1 comprimido', route: 'Oral', frequency: '1x/dia em jejum', nextDose: '07:00', logs: [] },
    ],
    allergies: [],
    vitals: [
      { timestamp: '2026-06-15T09:30:00', bp: '122/78', hr: 71, temp: 36.5, spo2: 98 },
    ],
    carePlan: [],
    dailyChecklists: [],
    documents: [],
    auditLogs: [],
    visits: [],
    glucoseReadings: [],
    usoFraldas: 'nao',
    mobilidadeSet: 'auxilio',
    higieneCorporal: 'independente',
    higieneOralVestir: 'independente',
  },
  {
    id: 'demo-r6',
    name: 'Antônio Ribeiro',
    cpf: '678.901.234-55',
    birthDate: '1940-09-18',
    age: 84,
    room: '106',
    roomStatus: 'Ocupado',
    careLevel: 'II',
    photoUrl: 'https://picsum.photos/200/200?random=6',
    admissionDate: '2022-07-22',
    clinicalCondition: 'DPOC, cardiopatia isquêmica estável',
    functionalCondition: 'Marcha preservada com dispneia aos esforços moderados',
    socialHistory: 'Filho único mora no exterior, contato semanal por videoconferência.',
    emergencyContacts: [{ name: 'Marcelo Ribeiro', relation: 'Filho', phone: '+1 (555) 987-6543' }],
    medications: [
      { id: 'demo-m8', name: 'Salbutamol inalatório', dosage: '2 jatos', route: 'Inalatória', frequency: 'SOS', nextDose: '', logs: [] },
      { id: 'demo-m9', name: 'AAS 100mg', dosage: '1 comprimido', route: 'Oral', frequency: '1x/dia', nextDose: '12:00', logs: [] },
    ],
    allergies: [],
    vitals: [
      { timestamp: '2026-06-15T08:00:00', bp: '135/88', hr: 76, temp: 36.6, spo2: 94 },
    ],
    carePlan: [
      { id: 'demo-cp3', title: 'Monitoramento respiratório', description: 'Ausculta pulmonar e SpO₂ diários', frequency: 'Diário', assignedTo: 'Enfermagem', status: 'ativo', createdAt: '2022-07-22' },
    ],
    dailyChecklists: [
      { date: '2026-06-15', shift: 'diurno', hygiene: true, oralCare: true, feeding: true, hydration: true, mobility: true, dressings: false, leisure: true },
    ],
    documents: [],
    auditLogs: [],
    visits: [],
    glucoseReadings: [],
    usoFraldas: 'nao',
    mobilidadeSet: 'independente',
    higieneCorporal: 'independente',
    higieneOralVestir: 'independente',
    reqHygiene: null,
    reqOralCare: null,
    reqFeeding: null,
    reqHydration: true,
    reqMobility: true,
    reqDressings: null,
    reqLeisure: true,
  },
];

const DEMO_FINANCIALS: FinancialRecord[] = [
  { id: 'demo-f1', type: 'receita', category: 'Mensalidade', description: 'Mensalidade Junho — Maria Santos', amount: 4200, date: '2026-06-05', status: 'pago' },
  { id: 'demo-f2', type: 'receita', category: 'Mensalidade', description: 'Mensalidade Junho — José Oliveira', amount: 3800, date: '2026-06-05', status: 'pago' },
  { id: 'demo-f3', type: 'receita', category: 'Mensalidade', description: 'Mensalidade Junho — Ana Lima', amount: 3200, date: '2026-06-05', status: 'pago' },
  { id: 'demo-f4', type: 'receita', category: 'Mensalidade', description: 'Mensalidade Junho — Pedro Costa', amount: 5500, date: '2026-06-05', status: 'pago' },
  { id: 'demo-f5', type: 'receita', category: 'Mensalidade', description: 'Mensalidade Junho — Rosa Ferreira', amount: 3500, date: '2026-06-05', status: 'pendente' },
  { id: 'demo-f6', type: 'receita', category: 'Mensalidade', description: 'Mensalidade Junho — Antônio Ribeiro', amount: 4000, date: '2026-06-05', status: 'pago' },
  { id: 'demo-f7', type: 'despesa', category: 'Medicamentos', description: 'Compra de medicamentos — Farmácia Central', amount: 1850, date: '2026-06-10', status: 'pago' },
  { id: 'demo-f8', type: 'despesa', category: 'Alimentação', description: 'Compra de alimentos — Fornecedor Nutri', amount: 3200, date: '2026-06-10', status: 'pago' },
  { id: 'demo-f9', type: 'despesa', category: 'Manutenção', description: 'Manutenção ar-condicionado', amount: 650, date: '2026-06-12', status: 'pendente' },
  { id: 'demo-f10', type: 'despesa', category: 'Folha de Pagamento', description: 'Folha — Junho 2026', amount: 18000, date: '2026-06-30', status: 'pendente' },
];

const DEMO_CONTRACTS: Contract[] = [
  { id: 'demo-c1', residentId: 'demo-r1', residentName: 'Maria Santos', startDate: '2022-01-15', monthlyValue: 4200, dueDay: 5, status: 'Ativo' },
  { id: 'demo-c2', residentId: 'demo-r2', residentName: 'José Oliveira', startDate: '2021-06-10', monthlyValue: 3800, dueDay: 5, status: 'Ativo' },
  { id: 'demo-c3', residentId: 'demo-r3', residentName: 'Ana Lima', startDate: '2023-03-20', monthlyValue: 3200, dueDay: 5, status: 'Ativo' },
  { id: 'demo-c4', residentId: 'demo-r4', residentName: 'Pedro Costa', startDate: '2020-09-01', monthlyValue: 5500, dueDay: 5, status: 'Ativo' },
  { id: 'demo-c5', residentId: 'demo-r5', residentName: 'Rosa Ferreira', startDate: '2024-01-08', monthlyValue: 3500, dueDay: 5, status: 'Ativo' },
  { id: 'demo-c6', residentId: 'demo-r6', residentName: 'Antônio Ribeiro', startDate: '2022-07-22', monthlyValue: 4000, dueDay: 5, status: 'Ativo' },
];

const DEMO_INVOICES: Invoice[] = [
  { id: 'demo-i1', contractId: 'demo-c1', residentName: 'Maria Santos', amount: 4200, dueDate: '2026-06-05', status: 'Pago', monthYear: '06/2026', paidDate: '2026-06-04' },
  { id: 'demo-i2', contractId: 'demo-c2', residentName: 'José Oliveira', amount: 3800, dueDate: '2026-06-05', status: 'Pago', monthYear: '06/2026', paidDate: '2026-06-03' },
  { id: 'demo-i3', contractId: 'demo-c3', residentName: 'Ana Lima', amount: 3200, dueDate: '2026-06-05', status: 'Pago', monthYear: '06/2026', paidDate: '2026-06-05' },
  { id: 'demo-i4', contractId: 'demo-c4', residentName: 'Pedro Costa', amount: 5500, dueDate: '2026-06-05', status: 'Pago', monthYear: '06/2026', paidDate: '2026-06-02' },
  { id: 'demo-i5', contractId: 'demo-c5', residentName: 'Rosa Ferreira', amount: 3500, dueDate: '2026-06-05', status: 'Pendente', monthYear: '06/2026' },
  { id: 'demo-i6', contractId: 'demo-c6', residentName: 'Antônio Ribeiro', amount: 4000, dueDate: '2026-06-05', status: 'Pago', monthYear: '06/2026', paidDate: '2026-06-06' },
];

const DEMO_STOCK: StockItem[] = [
  { id: 'demo-s1', name: 'Losartana 50mg', category: 'medicamento', quantity: 120, unit: 'comprimidos', minThreshold: 50, history: [] },
  { id: 'demo-s2', name: 'Metformina 850mg', category: 'medicamento', quantity: 80, unit: 'comprimidos', minThreshold: 50, history: [] },
  { id: 'demo-s3', name: 'Donepezila 10mg', category: 'medicamento', quantity: 20, unit: 'comprimidos', minThreshold: 30, history: [] },
  { id: 'demo-s4', name: 'Fraldas Geriátricas G', category: 'insumo', quantity: 45, unit: 'unidades', minThreshold: 60, history: [] },
  { id: 'demo-s5', name: 'Luvas de procedimento M', category: 'insumo', quantity: 200, unit: 'pares', minThreshold: 100, history: [] },
  { id: 'demo-s6', name: 'Álcool Gel 70%', category: 'insumo', quantity: 8, unit: 'litros', minThreshold: 10, history: [] },
  { id: 'demo-s7', name: 'Curativo hidrocoloide', category: 'insumo', quantity: 15, unit: 'unidades', minThreshold: 10, history: [] },
  { id: 'demo-s8', name: 'Suplemento Ensure Plus', category: 'alimento', quantity: 30, unit: 'latas', minThreshold: 20, history: [] },
];

const DEMO_EMPLOYEES: Employee[] = [
  { id: 'demo-e1', name: 'Dra. Carla Mendes', role: 'Médico', cpf: '111.222.333-44', email: 'carla@demo.com', phone: '(11) 99001-0001', registrationNumber: 'CRM-SP 123456', isTechnicalLead: true, shift: '12x36', status: 'Ativo', admissionDate: '2020-01-01' },
  { id: 'demo-e2', name: 'Enf. Paulo Souza', role: 'Enfermeiro', cpf: '222.333.444-55', email: 'paulo@demo.com', phone: '(11) 99002-0002', registrationNumber: 'COREN-SP 987654', isTechnicalLead: false, shift: 'Matutino', status: 'Ativo', admissionDate: '2021-03-15' },
  { id: 'demo-e3', name: 'Juliana Alves', role: 'Cuidador', cpf: '333.444.555-66', email: 'juliana@demo.com', phone: '(11) 99003-0003', isTechnicalLead: false, shift: 'Matutino', status: 'Ativo', admissionDate: '2022-05-10' },
  { id: 'demo-e4', name: 'Roberto Nunes', role: 'Cuidador', cpf: '444.555.666-77', email: 'roberto@demo.com', phone: '(11) 99004-0004', isTechnicalLead: false, shift: 'Noturno', status: 'Ativo', admissionDate: '2021-11-20' },
  { id: 'demo-e5', name: 'Fernanda Lima', role: 'Admin', cpf: '555.666.777-88', email: 'fernanda@demo.com', phone: '(11) 99005-0005', isTechnicalLead: false, shift: 'Matutino', status: 'Ativo', admissionDate: '2020-06-01' },
];

const DEMO_EVENTS: CalendarEvent[] = [
  { id: 'demo-ev1', title: 'Consulta médica — Maria Santos', start: '2026-06-17T10:00:00', end: '2026-06-17T10:30:00', type: 'medico', residentId: 'demo-r1', createdBy: 'Dra. Carla Mendes' },
  { id: 'demo-ev2', title: 'Fisioterapia — Rosa Ferreira', start: '2026-06-16T14:00:00', end: '2026-06-16T15:00:00', type: 'atividade', residentId: 'demo-r5', createdBy: 'Enf. Paulo Souza' },
  { id: 'demo-ev3', title: 'Visita familiar — José Oliveira', start: '2026-06-18T15:00:00', end: '2026-06-18T17:00:00', type: 'visita', residentId: 'demo-r2', createdBy: 'Fernanda Lima' },
  { id: 'demo-ev4', title: 'Atividade de musicoterapia (grupo)', start: '2026-06-20T10:00:00', end: '2026-06-20T11:00:00', type: 'atividade', createdBy: 'Juliana Alves' },
];

const DEMO_ROOMS: Room[] = [
  { id: 'demo-q1', number: '101', type: 'Individual', capacity: 1, assets: ['Cama hospitalar', 'Televisão', 'Banheiro Adaptado', 'Ar Condicionado'] },
  { id: 'demo-q2', number: '102', type: 'Individual', capacity: 1, assets: ['Cama hospitalar', 'Guarda-roupa', 'Banheiro Adaptado'] },
  { id: 'demo-q3', number: '103', type: 'Individual', capacity: 1, assets: ['Cama hospitalar', 'Televisão', 'Ventilador'] },
  { id: 'demo-q4', number: '104', type: 'Individual', capacity: 1, assets: ['Cama hospitalar', 'Banheiro Adaptado', 'Ar Condicionado', 'Frigobar'] },
  { id: 'demo-q5', number: '105', type: 'Compartilhado', capacity: 2, assets: ['2 camas hospitalares', 'Televisão', 'Banheiro Adaptado'] },
  { id: 'demo-q6', number: '106', type: 'Individual', capacity: 1, assets: ['Cama hospitalar', 'Guarda-roupa', 'Ventilador'] },
  { id: 'demo-q7', number: '107', type: 'Individual', capacity: 1, assets: ['Cama hospitalar', 'Televisão', 'Banheiro Adaptado'], status: 'Vago' },
  { id: 'demo-q8', number: '108', type: 'Compartilhado', capacity: 2, assets: ['2 camas hospitalares', 'Ar Condicionado'], status: 'Em Limpeza' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const TrialEnvironment: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  const [residents, setResidents] = useState<Resident[]>(DEMO_RESIDENTS);
  const [financials, setFinancials] = useState<FinancialRecord[]>(DEMO_FINANCIALS);
  const [contracts] = useState<Contract[]>(DEMO_CONTRACTS);
  const [invoices, setInvoices] = useState<Invoice[]>(DEMO_INVOICES);
  const [stockItems, setStockItems] = useState<StockItem[]>(DEMO_STOCK);
  const [employees, setEmployees] = useState<Employee[]>(DEMO_EMPLOYEES);
  const [trainingRecords] = useState<TrainingRecord[]>([]);
  const [accessLogs] = useState<SystemAccessLog[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>(DEMO_EVENTS);
  const [rooms, setRooms] = useState<Room[]>(DEMO_ROOMS);

  useEffect(() => {
    const viewTitles: Partial<Record<ViewState, string>> = {
      [ViewState.DASHBOARD]: 'Painel Geral',
      [ViewState.RESIDENTS]: 'Residentes & Prontuário',
      [ViewState.RESIDENT_DETAIL]: selectedResident
        ? `Prontuário – ${selectedResident.name}`
        : 'Prontuário do Residente',
      [ViewState.AGENDA]: 'Agenda & Atividades',
      [ViewState.NUTRITION]: 'Alimentação & Nutrição',
      [ViewState.TEAM]: 'Equipe e Acessos',
      [ViewState.FINANCE]: 'Financeiro & Contratos',
      [ViewState.STOCK]: 'Estoque & Insumos',
      [ViewState.REPORTS]: 'Relatórios & Indicadores',
      [ViewState.ROOMS]: 'Gerenciamento de Quartos',
    };
    const pageName = viewTitles[currentView] ?? 'Painel Geral';
    document.title = `${pageName} (Demo) | Recanto dos Anciãos`;
  }, [currentView, selectedResident]);

  const navigateTo = (view: ViewState, residentId?: string) => {
    setCurrentView(view);
    if (view === ViewState.RESIDENT_DETAIL && residentId) {
      const found = residents.find(r => r.id === residentId) || null;
      setSelectedResident(found);
    } else {
      setSelectedResident(null);
    }
  };

  const handleSelectResident = (resident: Resident) => navigateTo(ViewState.RESIDENT_DETAIL, resident.id);

  const handleAddResident = async (newResident: Resident) => {
    setResidents(prev => [...prev, { ...newResident, id: `demo-r${Date.now()}` }]);
  };

  const handleUpdateResident = async (updated: Resident) => {
    setResidents(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (selectedResident?.id === updated.id) setSelectedResident(updated);
  };

  const handleAddFinancialRecord = async (newRecord: FinancialRecord) => {
    setFinancials(prev => [{ ...newRecord, id: `demo-f${Date.now()}` }, ...prev]);
  };

  const handleUpdateInvoice = async (updated: Invoice) => {
    setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleUpdateStock = async (id: string, newQuantity: number) => {
    setStockItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleAddStockItem = async (newItem: StockItem) => {
    setStockItems(prev => [...prev, { ...newItem, id: `demo-s${Date.now()}` }]);
  };

  const handleEditStockItem = async (updatedItem: StockItem) => {
    setStockItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleDeleteStockItem = async (id: string) => {
    setStockItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddEmployee = async (newEmployee: Omit<Employee, 'id'>): Promise<Employee> => {
    const emp: Employee = { ...newEmployee, id: `demo-e${Date.now()}` };
    setEmployees(prev => [...prev, emp]);
    return emp;
  };

  const handleUpdateEmployee = async (updated: Employee): Promise<Employee> => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    return updated;
  };

  const handleDeleteEmployee = async (id: string): Promise<void> => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const handleAddEvent = async (newEvent: CalendarEvent) => {
    setEvents(prev => [...prev, { ...newEvent, id: `demo-ev${Date.now()}` }]);
  };

  const handleAddRoom = async (newRoom: Room) => {
    setRooms(prev => [...prev, { ...newRoom, id: `demo-q${Date.now()}` }]);
  };

  const handleUpdateRoom = async (updated: Room) => {
    setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handleDeleteRoom = async (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  const lowStockItems = stockItems.filter(item => item.quantity < item.minThreshold);

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard residents={residents} financials={financials} stockAlerts={lowStockItems} />;
      case ViewState.RESIDENTS:
        return (
          <ResidentsList
            residents={residents}
            rooms={rooms}
            onSelectResident={handleSelectResident}
            onAddResident={handleAddResident}
            onUpdateResident={handleUpdateResident}
          />
        );
      case ViewState.RESIDENT_DETAIL:
        if (!selectedResident) return (
          <ResidentsList
            residents={residents}
            rooms={rooms}
            onSelectResident={handleSelectResident}
            onAddResident={handleAddResident}
            onUpdateResident={handleUpdateResident}
          />
        );
        return (
          <ResidentProfile
            resident={selectedResident}
            rooms={rooms}
            onBack={() => navigateTo(ViewState.RESIDENTS)}
            onUpdateResident={handleUpdateResident}
          />
        );
      case ViewState.AGENDA:
        return <AgendaModule events={events} residents={residents} onAddEvent={handleAddEvent} />;
      case ViewState.FINANCE:
        return (
          <FinanceModule
            records={financials}
            contracts={contracts}
            invoices={invoices}
            residents={residents}
            onAddRecord={handleAddFinancialRecord}
            onAddContract={async () => {}}
            onUpdateInvoice={handleUpdateInvoice}
          />
        );
      case ViewState.TEAM:
        return (
          <TeamModule
            employees={employees}
            trainings={trainingRecords}
            accessLogs={accessLogs}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onAddTraining={async () => {}}
            residents={residents}
            onAddAccessLog={async () => {}}
          />
        );
      case ViewState.NUTRITION:
        return <NutritionModule residents={residents} onUpdateResident={handleUpdateResident} />;
      case ViewState.REPORTS:
        return <ReportsModule residents={residents} employees={employees} invoices={invoices} />;
      case ViewState.STOCK:
        return (
          <StockModule
            items={stockItems}
            residents={residents}
            onUpdateStock={handleUpdateStock}
            onAddItem={handleAddStockItem}
            onEditItem={handleEditStockItem}
            onDeleteItem={handleDeleteStockItem}
          />
        );
      case ViewState.ROOMS:
        return (
          <RoomsModule
            rooms={rooms}
            residents={residents}
            onAddRoom={handleAddRoom}
            onUpdateRoom={handleUpdateRoom}
            onDeleteRoom={handleDeleteRoom}
            onUpdateResident={handleUpdateResident}
          />
        );
      default:
        return <Dashboard residents={residents} financials={financials} />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Demo Banner */}
      {showBanner && (
        <div className="bg-amber-400 text-slate-900 px-4 py-2.5 flex items-center justify-between z-50 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Rocket className="h-4 w-4 flex-shrink-0" />
            <span className="font-semibold text-sm truncate">
              Modo Demonstração — explore à vontade, os dados não são salvos
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <button
              onClick={() => { window.history.pushState(null, '', '/'); window.location.reload(); }}
              className="bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              Quero Assinar
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-slate-700 hover:text-slate-900 transition-colors"
              aria-label="Fechar banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 bg-[#F8F7FF] text-slate-900">
        <Sidebar
          currentView={currentView}
          onChangeView={navigateTo}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          stockAlertCount={lowStockItems.length}
        />

        <main className="flex-1 max-w-full lg:max-w-[calc(100vw-256px)] flex flex-col h-full overflow-hidden transition-all">
          {/* Mobile header */}
          <div className="sticky top-0 z-20 lg:hidden px-4 py-3 bg-slate-900 text-white flex justify-between items-center shadow-md select-none border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <HeartPulse className="h-6 w-6 text-rose-500" />
              <span className="text-lg font-bold tracking-tight">RecantoCare</span>
              <span className="text-xs bg-amber-400 text-slate-900 font-semibold px-2 py-0.5 rounded-full">Demo</span>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-[44px] h-[44px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 hover:text-white"
              aria-label="Toggle Menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="w-full">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TrialEnvironment;
