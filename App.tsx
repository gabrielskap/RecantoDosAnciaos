import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ResidentsList from './components/ResidentsList';
import ResidentProfile from './components/ResidentProfile';
import FinanceModule from './components/FinanceModule';
import StockModule from './components/StockModule';
import TeamModule from './components/TeamModule';
import UsersModule from './components/UsersModule';
import NutritionModule from './components/NutritionModule';
import ReportsModule from './components/ReportsModule';
import AgendaModule from './components/AgendaModule';
import LoginScreen from './components/LoginScreen';
import ResidentPortal from './components/ResidentPortal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Menu, HeartPulse } from 'lucide-react';
import { ViewState, Resident, FinancialRecord, StockItem, Employee, TrainingRecord, SystemAccessLog, Contract, Invoice, CalendarEvent, StockTransaction } from './types';

// Initial Mock Data moved inside component or outside as initial state
const INITIAL_RESIDENTS: Resident[] = [
  {
    id: '1',
    name: 'Maria da Silva',
    age: 82,
    room: '101-A',
    roomStatus: 'Ocupado',
    careLevel: 'III',
    photoUrl: 'https://picsum.photos/200/200?random=1',
    admissionDate: '2023-05-12',
    birthDate: '1942-03-15',
    cpf: '123.456.789-00',
    rg: '12.345.678-9',
    emergencyContacts: [
      { name: 'Carlos Silva', relation: 'Filho', phone: '(11) 99999-8888' }
    ],
    legalGuardian: {
      name: 'Carlos Silva',
      cpf: '987.654.321-00',
      phone: '(11) 99999-8888',
      address: 'Rua das Flores, 123, São Paulo - SP'
    },
    clinicalCondition: 'Hipertensa, diabética tipo 2. Histórico de AVC em 2020 com hemiparesia à direita.',
    functionalCondition: 'Dependente para AVDs (Banho, vestimenta). Cadeirante.',
    socialHistory: 'Viúva, possui 3 filhos. Recebe visitas semanais.',
    allergies: ['Dipirona', 'Sulfa'],
    medications: [
      { id: 'm1', name: 'Losartana', dosage: '50mg', route: 'Oral', frequency: '12/12h', nextDose: '20:00', logs: [] },
      { id: 'm2', name: 'AAS', dosage: '100mg', route: 'Oral', frequency: '1x dia', nextDose: '08:00', logs: [] }
    ],
    vitals: [
      { timestamp: '2024-05-20T08:00:00', bp: '130/85', hr: 78, temp: 36.5, spo2: 96 },
      { timestamp: '2024-05-21T08:00:00', bp: '128/82', hr: 75, temp: 36.6, spo2: 97 },
      { timestamp: '2024-05-22T08:00:00', bp: '135/90', hr: 80, temp: 36.8, spo2: 95 },
      { timestamp: '2024-05-23T08:00:00', bp: '125/80', hr: 72, temp: 36.4, spo2: 98 },
      { timestamp: '2024-05-24T08:00:00', bp: '122/78', hr: 74, temp: 36.5, spo2: 98 },
    ],
    carePlan: [
      { id: 'cp1', title: 'Prevenção de Lesão por Pressão', description: 'Mudança de decúbito a cada 2h e hidratação da pele.', frequency: '2 em 2 horas', assignedTo: 'Cuidadores', status: 'ativo', createdAt: '2023-05-12' },
      { id: 'cp2', title: 'Controle Glicêmico', description: 'HGT em jejum e antes do jantar.', frequency: '2x ao dia', assignedTo: 'Enfermagem', status: 'ativo', createdAt: '2023-05-13' }
    ],
    dailyChecklists: [
      { date: '2024-05-25', hygiene: true, oralCare: true, feeding: true, hydration: true, mobility: true, dressings: false, leisure: true }
    ],
    documents: [
      { id: 'd1', name: 'Exame de Sangue - Maio/24', type: 'exame', url: '#', uploadDate: '2024-05-10' },
      { id: 'd2', name: 'RG Digitalizado', type: 'documento_pessoal', url: '#', uploadDate: '2023-05-12' }
    ],
    auditLogs: [
      { id: 'log1', timestamp: '2024-05-24T10:30:00', userId: 'u1', userName: 'Enf. Ana', action: 'Atualização de Prescrição', details: 'Adicionado AAS 100mg' },
      { id: 'log2', timestamp: '2024-05-23T14:15:00', userId: 'u2', userName: 'Dr. Pedro', action: 'Evolução Médica', details: 'Paciente estável, mantido conduta.' },
      { id: 'log3', timestamp: '2023-05-12T09:00:00', userId: 'u1', userName: 'Enf. Ana', action: 'Admissão', details: 'Registro inicial no sistema.' }
    ],
    dietPlan: {
      consistency: 'Pastosa',
      type: 'Diabética',
      restrictions: ['Açúcar', 'Alimentos muito fibrosos'],
      fluidRestriction: '2000ml/dia',
      updatedAt: '2024-05-01'
    },
    nutritionalLogs: [
      { id: 'n1', date: '2024-05-25', meal: 'Café da Manhã', acceptance: 80, fluidIntake: 200 },
      { id: 'n2', date: '2024-05-25', meal: 'Almoço', acceptance: 50, fluidIntake: 150, notes: 'Recusou carne' },
      { id: 'n3', date: '2024-05-25', meal: 'Lanche da Tarde', acceptance: 100, fluidIntake: 200 }
    ]
  },
  {
    id: '2',
    name: 'João dos Santos',
    age: 76,
    room: '102-B',
    roomStatus: 'Em Limpeza',
    careLevel: 'II',
    photoUrl: 'https://picsum.photos/200/200?random=2',
    admissionDate: '2023-11-03',
    clinicalCondition: 'Alzheimer fase inicial.',
    functionalCondition: 'Deambula com dificuldade. Necessita supervisão.',
    socialHistory: '',
    emergencyContacts: [],
    medications: [
      { id: 'm3', name: 'Sinvastatina', dosage: '20mg', route: 'Oral', frequency: 'Noite', nextDose: '22:00', logs: [] }
    ],
    allergies: [],
    vitals: [],
    carePlan: [
      { id: 'cp3', title: 'Estímulo Cognitivo', description: 'Jogos de memória e musicoterapia.', frequency: 'Diário', assignedTo: 'Terapeuta Ocupacional', status: 'ativo', createdAt: '2023-11-04' }
    ],
    dailyChecklists: [],
    documents: [],
    auditLogs: [
       { id: 'log4', timestamp: '2023-11-03T10:00:00', userId: 'u3', userName: 'Admin', action: 'Admissão', details: 'Registro inicial.' }
    ],
    dietPlan: {
      consistency: 'Geral',
      type: 'Hipossódica',
      restrictions: [],
      updatedAt: '2023-11-04'
    },
    nutritionalLogs: [
      { id: 'n4', date: '2024-05-25', meal: 'Almoço', acceptance: 100, fluidIntake: 300 }
    ]
  },
  {
    id: '3',
    name: 'Ana Pereira',
    age: 88,
    room: '104-A',
    roomStatus: 'Ocupado',
    careLevel: 'I',
    photoUrl: 'https://picsum.photos/200/200?random=3',
    admissionDate: '2022-02-15',
    clinicalCondition: 'Saudável para a idade.',
    functionalCondition: 'Independente.',
    socialHistory: 'Convívio social ativo.',
    emergencyContacts: [],
    medications: [],
    allergies: ['Frutos do mar'],
    vitals: [],
    carePlan: [],
    dailyChecklists: [],
    documents: [],
    auditLogs: [],
    dietPlan: {
      consistency: 'Geral',
      type: 'Livre',
      restrictions: ['Frutos do mar'],
      updatedAt: '2022-02-15'
    },
    nutritionalLogs: []
  },
   {
    id: '4',
    name: 'Roberto Carlos',
    age: 91,
    room: '105-C',
    roomStatus: 'Manutenção',
    careLevel: 'III',
    photoUrl: 'https://picsum.photos/200/200?random=4',
    admissionDate: '2024-01-10',
    clinicalCondition: 'Acamado.',
    functionalCondition: 'Totalmente dependente.',
    socialHistory: '',
    emergencyContacts: [],
    medications: [],
    allergies: [],
    vitals: [],
    carePlan: [],
    dailyChecklists: [],
    documents: [],
    auditLogs: [],
    dietPlan: {
      consistency: 'Líquida-Pastosa',
      type: 'Hiperproteica',
      restrictions: [],
      updatedAt: '2024-01-11'
    },
    nutritionalLogs: []
  }
];

// Contracts & Financials
const INITIAL_CONTRACTS: Contract[] = [
  { id: 'c1', residentId: '1', residentName: 'Maria da Silva', startDate: '2023-05-12', monthlyValue: 4500, dueDay: 5, status: 'Ativo' },
  { id: 'c2', residentId: '2', residentName: 'João dos Santos', startDate: '2023-11-03', monthlyValue: 3800, dueDay: 5, status: 'Ativo' },
  { id: 'c3', residentId: '3', residentName: 'Ana Pereira', startDate: '2022-02-15', monthlyValue: 3500, dueDay: 10, status: 'Ativo' },
  { id: 'c4', residentId: '4', residentName: 'Roberto Carlos', startDate: '2024-01-10', monthlyValue: 5000, dueDay: 5, status: 'Ativo' },
];

const INITIAL_INVOICES: Invoice[] = [
  { id: 'inv1', contractId: 'c1', residentName: 'Maria da Silva', amount: 4500, dueDate: '2024-05-05', status: 'Pago', monthYear: '05/2024', paidDate: '2024-05-05' },
  { id: 'inv2', contractId: 'c2', residentName: 'João dos Santos', amount: 3800, dueDate: '2024-05-05', status: 'Pago', monthYear: '05/2024', paidDate: '2024-05-05' },
  { id: 'inv3', contractId: 'c3', residentName: 'Ana Pereira', amount: 3500, dueDate: '2024-05-10', status: 'Atrasado', monthYear: '05/2024' },
  { id: 'inv4', contractId: 'c4', residentName: 'Roberto Carlos', amount: 5000, dueDate: '2024-05-05', status: 'Pago', monthYear: '05/2024', paidDate: '2024-05-04' },
];

const INITIAL_FINANCIALS: FinancialRecord[] = [
  { id: 'f1', type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Maria Silva', amount: 4500, date: '2024-05-05', status: 'pago' },
  { id: 'f2', type: 'receita', category: 'Mensalidade', description: 'Mensalidade - João Santos', amount: 3800, date: '2024-05-05', status: 'pago' },
  { id: 'f3', type: 'despesa', category: 'Alimentação', description: 'Fornecedor Hortifruti', amount: 1250, date: '2024-05-10', status: 'pago' },
  { id: 'f4', type: 'despesa', category: 'Farmácia', description: 'Medicamentos Uso Contínuo', amount: 890, date: '2024-05-12', status: 'pendente' },
  { id: 'f5', type: 'despesa', category: 'Manutenção', description: 'Reparo Ar Condicionado', amount: 450, date: '2024-05-15', status: 'pago' },
  { id: 'f6', type: 'receita', category: 'Doação', description: 'Doação Rotary Club', amount: 2000, date: '2024-05-18', status: 'pago' },
];

const INITIAL_STOCK: StockItem[] = [
  { 
    id: 's1', 
    name: 'Dipirona 500mg', 
    category: 'medicamento', 
    quantity: 150, 
    unit: 'comps', 
    minThreshold: 50,
    history: [
      { id: 'h1', type: 'entrada', quantity: 200, date: '2024-05-01T10:00:00', user: 'Enf. Carlos' },
      { id: 'h2', type: 'saida', quantity: 50, date: '2024-05-15T14:30:00', user: 'Enf. Ana', notes: 'Consumo quinzenal' }
    ]
  },
  { 
    id: 's2', 
    name: 'Fralda Geriátrica G', 
    category: 'insumo', 
    quantity: 25, 
    unit: 'unid', 
    minThreshold: 40,
    history: [
      { id: 'h3', type: 'entrada', quantity: 100, date: '2024-05-01T09:00:00', user: 'Admin' },
      { id: 'h4', type: 'saida', quantity: 75, date: '2024-05-20T18:00:00', user: 'Cuidador Pedro', notes: 'Reposição quartos' }
    ]
  },
  { id: 's3', name: 'Luvas de Látex M', category: 'insumo', quantity: 80, unit: 'pares', minThreshold: 100 },
  { id: 's4', name: 'Arroz 5kg', category: 'alimento', quantity: 10, unit: 'pct', minThreshold: 5 },
  { id: 's5', name: 'Detergente Neutro', category: 'insumo', quantity: 12, unit: 'frascos', minThreshold: 10 },
  { id: 's6', name: 'Losartana 50mg', category: 'medicamento', quantity: 200, unit: 'comps', minThreshold: 60 },
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Dra. Ana Costa', role: 'Médico', cpf: '111.222.333-44', email: 'ana.costa@recantoanciaos.com.br', phone: '(11) 98888-7777', registrationNumber: 'CRM/SP 123456', isTechnicalLead: true, shift: 'Matutino', status: 'Ativo', admissionDate: '2022-01-10' },
  { id: 'e2', name: 'Carlos Oliveira', role: 'Enfermeiro', cpf: '222.333.444-55', email: 'carlos.oliveira@recantoanciaos.com.br', phone: '(11) 97777-6666', registrationNumber: 'COREN/SP 654321', isTechnicalLead: true, shift: '12x36', status: 'Ativo', admissionDate: '2022-03-15' },
  { id: 'e3', name: 'Mariana Souza', role: 'Cuidador', cpf: '333.444.555-66', email: 'mariana.souza@recantoanciaos.com.br', phone: '(11) 96666-5555', isTechnicalLead: false, shift: 'Noturno', status: 'Ativo', admissionDate: '2023-05-20' },
  { id: 'e4', name: 'Pedro Santos', role: 'Cuidador', cpf: '444.555.666-77', email: 'pedro.santos@recantoanciaos.com.br', phone: '(11) 95555-4444', isTechnicalLead: false, shift: 'Vespertino', status: 'Férias', admissionDate: '2023-08-01' },
];

const INITIAL_ACCESS_LOGS: SystemAccessLog[] = [
  { id: 'l1', timestamp: '2024-05-25T14:30:00', userId: 'e1', userName: 'Dra. Ana Costa', role: 'Médico', action: 'Visualização Prontuário', resource: 'Maria da Silva', ipAddress: '192.168.1.10' },
  { id: 'l2', timestamp: '2024-05-25T13:15:00', userId: 'e2', userName: 'Carlos Oliveira', role: 'Enfermeiro', action: 'Edição Financeira', resource: 'Despesa #f4', ipAddress: '192.168.1.12' },
  { id: 'l3', timestamp: '2024-05-25T08:00:00', userId: 'e3', userName: 'Mariana Souza', role: 'Cuidador', action: 'Login', ipAddress: '192.168.1.15' },
];

const INITIAL_TRAINING: TrainingRecord[] = [
  { id: 't1', title: 'Primeiros Socorros e RCP', date: '2024-02-15', instructor: 'Corpo de Bombeiros', participants: ['Carlos Oliveira', 'Mariana Souza', 'Pedro Santos'], validUntil: '2025-02-15', description: 'Atualização obrigatória de suporte básico à vida.' },
  { id: 't2', title: 'Cuidados com Lesão por Pressão', date: '2024-04-10', instructor: 'Enf. Especialista Julia', participants: ['Mariana Souza', 'Pedro Santos'], description: 'Técnicas de prevenção e curativos.' },
];

const INITIAL_EVENTS: CalendarEvent[] = [
  { id: 'ev1', title: 'Consulta Cardiologista - Maria Silva', start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(), type: 'medico', residentId: '1', createdBy: 'Enf. Carlos', location: 'Clínica Cardios' },
  { id: 'ev2', title: 'Visita Familiar - João Santos', start: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(), type: 'visita', residentId: '2', createdBy: 'Recepção' },
  { id: 'ev3', title: 'Musicoterapia em Grupo', start: new Date(new Date().setHours(15, 30, 0, 0)).toISOString(), type: 'atividade', createdBy: 'Terapeuta Ana', location: 'Salão Principal', description: 'Atividade recreativa para todos os residentes.' },
  { id: 'ev4', title: 'Reunião de Equipe', start: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), type: 'reuniao', createdBy: 'Admin', location: 'Sala de Reuniões' },
];

// Path name to ViewState conversion
const pathToView = (path: string): { view: ViewState; residentId?: string } => {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) {
    return { view: ViewState.DASHBOARD };
  }
  
  const primary = parts[0];
  switch (primary) {
    case 'dashboard':
      return { view: ViewState.DASHBOARD };
    case 'residents':
      if (parts[1]) {
        return { view: ViewState.RESIDENT_DETAIL, residentId: parts[1] };
      }
      return { view: ViewState.RESIDENTS };
    case 'agenda':
      return { view: ViewState.AGENDA };
    case 'nutrition':
      return { view: ViewState.NUTRITION };
    case 'team':
      return { view: ViewState.TEAM };
    case 'finance':
      return { view: ViewState.FINANCE };
    case 'stock':
      return { view: ViewState.STOCK };
    case 'reports':
      return { view: ViewState.REPORTS };
    case 'users':
      return { view: ViewState.USERS };
    default:
      return { view: ViewState.DASHBOARD };
  }
};

const viewToPath = (view: ViewState, residentId?: string): string => {
  switch (view) {
    case ViewState.DASHBOARD:
      return '/';
    case ViewState.RESIDENTS:
      return '/residents';
    case ViewState.RESIDENT_DETAIL:
      return residentId ? `/residents/${residentId}` : '/residents';
    case ViewState.AGENDA:
      return '/agenda';
    case ViewState.NUTRITION:
      return '/nutrition';
    case ViewState.TEAM:
      return '/team';
    case ViewState.FINANCE:
      return '/finance';
    case ViewState.STOCK:
      return '/stock';
    case ViewState.REPORTS:
      return '/reports';
    case ViewState.USERS:
      return '/users';
    default:
      return '/';
  }
};

function AppInner() {
  const { currentUser, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Application State
  const [residents, setResidents] = useState<Resident[]>(INITIAL_RESIDENTS);
  const [financials, setFinancials] = useState<FinancialRecord[]>(INITIAL_FINANCIALS);
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_CONTRACTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [stockItems, setStockItems] = useState<StockItem[]>(INITIAL_STOCK);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>(INITIAL_TRAINING);
  const [accessLogs, setAccessLogs] = useState<SystemAccessLog[]>(INITIAL_ACCESS_LOGS);
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);

  // Navigate function that pushes state
  const navigateTo = (view: ViewState, residentId?: string) => {
    const path = viewToPath(view, residentId);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentView(view);
    if (view === ViewState.RESIDENT_DETAIL && residentId) {
      const found = residents.find(r => r.id === residentId) || null;
      setSelectedResident(found);
    } else {
      setSelectedResident(null);
    }
  };

  // Sync state with URL path on mount and popstate
  useEffect(() => {
    const handleLocationChange = () => {
      // Don't route if not logged in
      if (!currentUser) return;

      const path = window.location.pathname;
      
      // Portal handles its own view internally or we use /portal
      if (currentUser.profile.type === 'Responsável') {
        if (path !== '/portal') {
          window.history.replaceState(null, '', '/portal');
        }
        return;
      }

      // If we are at /portal but we are not a Responsável, redirect to /
      if (path === '/portal') {
        window.history.replaceState(null, '', '/');
        setCurrentView(ViewState.DASHBOARD);
        setSelectedResident(null);
        return;
      }

      const { view, residentId } = pathToView(path);
      const expectedPath = viewToPath(view, residentId);
      if (path !== expectedPath && view !== ViewState.RESIDENT_DETAIL) {
        window.history.replaceState(null, '', expectedPath);
      }
      setCurrentView(view);
      if (view === ViewState.RESIDENT_DETAIL && residentId) {
        const found = residents.find(r => r.id === residentId);
        if (found) {
          setSelectedResident(found);
        } else {
          // Fallback if resident ID not found
          window.history.replaceState(null, '', '/residents');
          setCurrentView(ViewState.RESIDENTS);
          setSelectedResident(null);
        }
      } else {
        setSelectedResident(null);
      }
    };

    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [currentUser, residents]);

  // Sync login/logout path changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.profile.type === 'Responsável') {
        if (window.location.pathname !== '/portal') {
          window.history.replaceState(null, '', '/portal');
        }
      } else {
        // Just sync view state to URL once logged in
        const path = viewToPath(currentView, selectedResident?.id);
        if (window.location.pathname !== path && window.location.pathname === '/') {
          window.history.replaceState(null, '', path);
        }
      }
    } else {
      // Clear path when logged out
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [currentUser]);

  // Logic Handlers
  const handleSelectResident = (resident: Resident) => {
    navigateTo(ViewState.RESIDENT_DETAIL, resident.id);
  };

  const handleAddResident = (newResident: Resident) => {
    setResidents([...residents, newResident]);
  };

  const handleUpdateResident = (updatedResident: Resident) => {
    setResidents(prev => prev.map(r => r.id === updatedResident.id ? updatedResident : r));
    setSelectedResident(updatedResident);
  };

  const handleAddFinancialRecord = (newRecord: FinancialRecord) => {
    setFinancials([newRecord, ...financials]);
  };

  const handleAddContract = (newContract: Contract) => {
    setContracts([...contracts, newContract]);
  };

  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? updatedInvoice : i));
    
    // If paid, add to financial records automatically
    if (updatedInvoice.status === 'Pago' && !financials.find(f => f.invoiceId === updatedInvoice.id)) {
       const newRecord: FinancialRecord = {
         id: Math.random().toString(36).substr(2, 9),
         type: 'receita',
         category: 'Mensalidade',
         description: `Mensalidade ${updatedInvoice.monthYear} - ${updatedInvoice.residentName}`,
         amount: updatedInvoice.amount,
         date: updatedInvoice.paidDate || new Date().toISOString().split('T')[0],
         status: 'pago',
         invoiceId: updatedInvoice.id
       };
       handleAddFinancialRecord(newRecord);
    }
  };

  const handleUpdateStock = (id: string, newQuantity: number) => {
    setStockItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          // Calculate difference and create log
          const diff = newQuantity - item.quantity;
          if (diff === 0) return item;

          const type = diff > 0 ? 'entrada' : 'saida';
          const newTransaction: StockTransaction = {
             id: Math.random().toString(36).substr(2, 9),
             type: type,
             quantity: Math.abs(diff),
             date: new Date().toISOString(),
             user: 'Admin', // In real app, this would be current user
             notes: 'Ajuste manual de estoque'
          };
          
          return { 
            ...item, 
            quantity: Math.max(0, newQuantity),
            history: [newTransaction, ...(item.history || [])]
          };
        }
        return item;
      })
    );
  };

  const handleAddStockItem = (newItem: StockItem) => {
    // Add initial entry log
    const initialLog: StockTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'entrada',
      quantity: newItem.quantity,
      date: new Date().toISOString(),
      user: 'Admin',
      notes: 'Cadastro inicial'
    };
    
    setStockItems([...stockItems, { ...newItem, history: [initialLog] }]);
  };

  const handleAddEmployee = (newEmployee: Employee) => {
    setEmployees([...employees, newEmployee]);
  };

  const handleAddTraining = (newTraining: TrainingRecord) => {
    setTrainingRecords([newTraining, ...trainingRecords]);
  };

  const handleAddAccessLog = (newLog: SystemAccessLog) => {
    setAccessLogs(prev => [newLog, ...prev]);
  };

  const handleAddEvent = (newEvent: CalendarEvent) => {
    setEvents([...events, newEvent]);
  };

  // Derived State
  const lowStockItems = stockItems.filter(item => item.quantity < item.minThreshold);

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
          <Dashboard 
            residents={residents} 
            financials={financials} 
            stockAlerts={lowStockItems}
          />
        );
      case ViewState.RESIDENTS:
        return (
          <ResidentsList 
            residents={residents} 
            onSelectResident={handleSelectResident} 
            onAddResident={handleAddResident}
          />
        );
      case ViewState.RESIDENT_DETAIL:
        if (!selectedResident) return <ResidentsList residents={residents} onSelectResident={handleSelectResident} onAddResident={handleAddResident}/>;
        return (
          <ResidentProfile 
            resident={selectedResident} 
            onBack={() => navigateTo(ViewState.RESIDENTS)} 
            onUpdateResident={handleUpdateResident}
          />
        );
      case ViewState.AGENDA:
        return (
          <AgendaModule 
            events={events}
            residents={residents}
            onAddEvent={handleAddEvent}
          />
        );
      case ViewState.FINANCE:
        return (
          <FinanceModule 
            records={financials} 
            contracts={contracts}
            invoices={invoices}
            residents={residents}
            onAddRecord={handleAddFinancialRecord}
            onAddContract={handleAddContract}
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
            onAddTraining={handleAddTraining}
          />
        );
      case ViewState.NUTRITION:
        return (
          <NutritionModule
            residents={residents}
            onUpdateResident={handleUpdateResident}
          />
        );
      case ViewState.REPORTS:
        return (
           <ReportsModule 
             residents={residents}
             employees={employees}
             invoices={invoices}
           />
        );
      case ViewState.USERS:
        return (
          <UsersModule
            residents={residents}
            onAddAccessLog={handleAddAccessLog}
          />
        );
      case ViewState.STOCK:
        return (
          <StockModule 
            items={stockItems} 
            onUpdateStock={handleUpdateStock}
            onAddItem={handleAddStockItem}
          />
        );
      default:
        return <Dashboard residents={residents} financials={financials} />;
    }
  };

  // Not logged in
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-white text-lg font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen />;

  // Responsável: portal simplificado
  if (currentUser.profile.type === 'Responsável') {
    const resident = residents.find(r => r.id === currentUser.residentId);
    return <ResidentPortal resident={resident} events={events} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8F7FF] text-slate-900">
      <Sidebar
        currentView={currentView}
        onChangeView={navigateTo}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        stockAlertCount={lowStockItems.length}
      />

      <main className="flex-1 max-w-full lg:max-w-[calc(100vw-256px)] transition-all">
        {/* Mobile Header trigger - Sticky for accessibility */}
        <div className="sticky top-0 z-20 lg:hidden px-4 py-3 bg-slate-900 text-white flex justify-between items-center shadow-md select-none border-b border-slate-800">
           <div className="flex items-center space-x-2">
             <HeartPulse className="h-6 w-6 text-rose-500" />
             <span className="text-lg font-bold tracking-tight">Recanto dos Anciãos</span>
           </div>
           <button
             onClick={() => setSidebarOpen(true)}
             className="w-[44px] h-[44px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 hover:text-white"
             aria-label="Toggle Menu"
             id="mobile-menu-trigger-button"
           >
             <Menu className="h-6 w-6" />
           </button>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;