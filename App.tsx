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
import RoomsModule from './components/RoomsModule';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Menu, HeartPulse } from 'lucide-react';
import { ViewState, Resident, FinancialRecord, StockItem, Employee, TrainingRecord, SystemAccessLog, Contract, Invoice, CalendarEvent, StockTransaction, Room } from './types';
import { supabase } from './services/supabaseClient';

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
      return { view: ViewState.TEAM };
    case 'rooms':
      return { view: ViewState.ROOMS };
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
      return '/team';
    case ViewState.ROOMS:
      return '/rooms';
    default:
      return '/';
  }
};

function AppInner() {
  const { currentUser, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Application State connected to database
  const [residents, setResidents] = useState<Resident[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [accessLogs, setAccessLogs] = useState<SystemAccessLog[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  // --- Supabase Data Fetchers ---

  const fetchResidents = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Residentes')
        .select(`
          *,
          emergencyContacts:Recanto_ContatosEmergencia(*),
          legalGuardian:Recanto_ResponsaveisLegais(*),
          medications:Recanto_Medicacoes(*, logs:Recanto_LogsMedicacao(*)),
          vitals:Recanto_SinaisVitais(*),
          carePlan:Recanto_PlanosAssistencia(*),
          dailyChecklists:Recanto_ChecklistDiario(*, carePlanAdherence:Recanto_AcompanhamentoPlano(*)),
          documents:Recanto_Documentos(*),
          auditLogs:Recanto_LogsAuditoria(*),
          dietPlan:Recanto_PlanosDieta(*),
          nutritionalLogs:Recanto_LogsNutricao(*),
          visits:Recanto_Visitas(*)
        `);

      if (error) throw error;

      const mapped: Resident[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        cpf: r.cpf || undefined,
        rg: r.rg || undefined,
        birthDate: r.birth_date || undefined,
        age: r.age,
        room: r.room,
        roomStatus: r.room_status,
        careLevel: r.care_level,
        photoUrl: r.photo_url || `https://picsum.photos/200/200?random=${r.id}`,
        admissionDate: r.admission_date,
        addressCep: r.address_cep || undefined,
        addressState: r.address_state || undefined,
        addressCity: r.address_city || undefined,
        addressNeighborhood: r.address_neighborhood || undefined,
        addressStreet: r.address_street || undefined,
        addressNumber: r.address_number || undefined,
        addressComplement: r.address_complement || undefined,
        emergencyContacts: (r.emergencyContacts || []).map((c: any) => ({
          name: c.name,
          relation: c.relation,
          phone: c.phone
        })),
        legalGuardian: r.legalGuardian && r.legalGuardian.length > 0 ? {
          name: r.legalGuardian[0].name,
          cpf: r.legalGuardian[0].cpf,
          phone: r.legalGuardian[0].phone,
          address: r.legalGuardian[0].address
        } : undefined,
        clinicalCondition: r.clinical_condition || '',
        functionalCondition: r.functional_condition || '',
        socialHistory: r.social_history || '',
        usoFraldas: r.uso_fraldas || 'nao',
        mobilidadeSet: r.mobilidade_usual || 'independente',
        higieneCorporal: r.higiene_corporal_usual || 'independente',
        higieneOralVestir: r.higiene_oral_vestir_usual || 'independente',
        reqHygiene: r.req_hygiene ?? false,
        reqOralCare: r.req_oral_care ?? false,
        reqFeeding: r.req_feeding ?? false,
        reqHydration: r.req_hydration ?? false,
        reqMobility: r.req_mobility ?? false,
        reqDressings: r.req_dressings ?? false,
        reqLeisure: r.req_leisure ?? false,
        medications: (r.medications || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          route: m.route,
          frequency: m.frequency,
          nextDose: m.next_dose || '',
          startDate: m.start_date || undefined,
          endDate: m.end_date || undefined,
          logs: (m.logs || []).map((log: any) => ({
            id: log.id,
            timestamp: log.timestamp,
            administeredBy: log.administered_by,
            status: log.status,
            note: log.note || undefined
          }))
        })),
        allergies: (r.allergies || []).map((a: any) => a.description),
        vitals: (r.vitals || []).map((v: any) => ({
          timestamp: v.timestamp,
          bp: v.bp || '',
          hr: v.hr || 0,
          temp: v.temp ? parseFloat(v.temp) : 36.5,
          spo2: v.spo2 || 0,
          painLevel: v.pain_level || undefined
        })),
        carePlan: (r.carePlan || []).map((cp: any) => ({
          id: cp.id,
          title: cp.title,
          description: cp.description || '',
          frequency: cp.frequency || '',
          assignedTo: cp.assigned_to || '',
          status: cp.status,
          createdAt: cp.created_at
        })),
        dailyChecklists: (r.dailyChecklists || []).map((chk: any) => {
          const shift = chk.shift || 'diurno';
          const match = (r.vitals || []).find((v: any) => {
            const vDate = new Date(v.timestamp);
            const year = vDate.getFullYear();
            const month = String(vDate.getMonth() + 1).padStart(2, '0');
            const day = String(vDate.getDate()).padStart(2, '0');
            const localDateStr = `${year}-${month}-${day}`;
            
            if (localDateStr !== chk.date) return false;
            
            const hour = vDate.getHours();
            if (shift === 'noturno') {
              return hour >= 18 || hour < 6;
            } else {
              return hour >= 6 && hour < 18;
            }
          });

          return {
            date: chk.date,
            shift,
            hygiene: chk.hygiene,
            oralCare: chk.oral_care,
            feeding: chk.feeding,
            hydration: chk.hydration,
            mobility: chk.mobility,
            dressings: chk.dressings,
            leisure: chk.leisure,
            queixaDor: chk.queixa_dor || undefined,
            queixaDorDesc: chk.queixa_dor_desc || undefined,
            estadoNeurologico: chk.estado_neurologico || undefined,
            arAmbiente: chk.ar_ambiente !== null ? chk.ar_ambiente : undefined,
            alimentacao: chk.alimentacao || undefined,
            alimentacaoDesc: chk.alimentacao_desc || undefined,
            agitado: chk.agitado !== null ? chk.agitado : undefined,
            prostrado: chk.prostrado !== null ? chk.prostrado : undefined,
            sonolento: chk.sonolento !== null ? chk.sonolento : undefined,
            eliminacaoEvacuacao: chk.eliminacao_evacuacao || undefined,
            eliminacaoEvacuacaoDias: chk.eliminacao_evacuacao_dias || undefined,
            aspectoEvacuacoes: chk.aspecto_evacuacoes || undefined,
            diurese: chk.diurese || undefined,
            diureseAspecto: chk.diurese_aspecto || undefined,
            usoFraldas: chk.uso_fraldas || undefined,
            mobilidadeSet: chk.mobilidade_set || undefined,
            higieneCorporal: chk.higiene_corporal || undefined,
            higieneOralVestir: chk.higiene_oral_vestir || undefined,
            alteracoesPele: chk.alteracoes_pele || undefined,
            alteracoesPeleDesc: chk.alteracoes_pele_desc || undefined,
            sono: chk.sono || undefined,
            sonoDesc: chk.sono_desc || undefined,
            medicacoesAdministradas: chk.medicacoes_administradas || undefined,
            atividadesConsulta: chk.atividades_consulta || undefined,
            intercorrencia: chk.intercorrencia || undefined,
            intercorrenciaDesc: chk.intercorrencia_desc || undefined,
            photoUrl: chk.photo_url || undefined,
            signedBy: chk.signed_by || undefined,
            signedAt: chk.signed_at || undefined,
            frequenciaCardiaca: match && match.hr ? String(match.hr) : undefined,
            pressaoArterial: match && match.bp ? match.bp : undefined,
            saturacao: match && match.spo2 ? String(match.spo2) : undefined,
            temperatura: match && match.temp ? String(match.temp) : undefined,
            carePlanAdherence: (chk.carePlanAdherence || []).map((adh: any) => ({
              id: adh.id,
              checklistId: adh.checklist_id,
              carePlanId: adh.care_plan_id,
              status: adh.status,
              comment: adh.comment || undefined
            }))
          };
        }),
        documents: (r.documents || []).map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          url: doc.url,
          uploadDate: doc.upload_date
        })),
        auditLogs: (r.auditLogs || []).map((al: any) => ({
          id: al.id,
          timestamp: al.timestamp,
          userId: al.user_id,
          userName: al.user_name,
          action: al.action,
          details: al.details || ''
        })),
        dietPlan: r.dietPlan && r.dietPlan.length > 0 ? {
          consistency: r.dietPlan[0].consistency,
          type: r.dietPlan[0].type,
          restrictions: [],
          fluidRestriction: r.dietPlan[0].fluid_restriction || undefined,
          observations: r.dietPlan[0].observations || undefined,
          updatedAt: r.dietPlan[0].updated_at
        } : undefined,
        nutritionalLogs: (r.nutritionalLogs || []).map((n: any) => ({
          id: n.id,
          date: n.date,
          meal: n.meal,
          acceptance: n.acceptance,
          fluidIntake: n.fluid_intake || undefined,
          notes: n.notes || undefined
        })),
        visits: (r.visits || []).map((v: any) => ({
          id: v.id,
          residentId: v.resident_id,
          visitorName: v.visitor_name,
          relation: v.relation,
          cpf: v.cpf || undefined,
          phone: v.phone || undefined,
          date: v.date,
          temperature: v.temperature ? parseFloat(v.temperature) : undefined,
          observations: v.observations || undefined,
          createdBy: v.created_by
        })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));

      setResidents(mapped);

      // Update selected resident context if it is active
      if (selectedResident) {
        const found = mapped.find(res => res.id === selectedResident.id);
        if (found) setSelectedResident(found);
      }
    } catch (err) {
      console.error('Erro ao buscar residentes:', err);
    }
  };

  const fetchFinancials = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_RegistrosFinanceiros')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const mapped: FinancialRecord[] = (data || []).map((f: any) => ({
        id: f.id,
        type: f.type,
        category: f.category,
        description: f.description,
        amount: parseFloat(f.amount),
        date: f.date,
        status: f.status,
        invoiceId: f.invoice_id || undefined
      }));
      setFinancials(mapped);
    } catch (err) {
      console.error('Erro ao buscar financeiro:', err);
    }
  };

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Contratos')
        .select(`
          *,
          resident:Recanto_Residentes(name)
        `);

      if (error) throw error;

      const mapped: Contract[] = (data || []).map((c: any) => ({
        id: c.id,
        residentId: c.resident_id,
        residentName: c.resident?.name || 'Residente',
        startDate: c.start_date,
        endDate: c.end_date || undefined,
        monthlyValue: parseFloat(c.monthly_value),
        dueDay: c.due_day,
        status: c.status,
        fileUrl: c.file_url || undefined
      }));
      setContracts(mapped);
    } catch (err) {
      console.error('Erro ao buscar contratos:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Mensalidades')
        .select(`
          *,
          resident:Recanto_Residentes(name)
        `);

      if (error) throw error;

      const mapped: Invoice[] = (data || []).map((i: any) => ({
        id: i.id,
        contractId: i.contract_id,
        residentName: i.resident?.name || 'Residente',
        amount: parseFloat(i.amount),
        dueDate: i.due_date,
        status: i.status,
        monthYear: i.month_year,
        paidDate: i.paid_date || undefined
      }));
      setInvoices(mapped);
    } catch (err) {
      console.error('Erro ao buscar mensalidades:', err);
    }
  };

  const fetchStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Estoque')
        .select(`
          *,
          history:Recanto_MovimentacoesEstoque(*)
        `);

      if (error) throw error;

      const mapped: StockItem[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        quantity: s.quantity,
        unit: s.unit,
        minThreshold: s.min_threshold,
        residentId: s.resident_id || undefined,
        history: (s.history || []).map((h: any) => ({
          id: h.id,
          type: h.type,
          quantity: h.quantity,
          date: h.date,
          user: h.user_name,
          notes: h.notes || undefined
        })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));
      setStockItems(mapped);
    } catch (err) {
      console.error('Erro ao buscar estoque:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Funcionarios')
        .select('*');

      if (error) throw error;

      const mapped: Employee[] = (data || []).map((e: any) => ({
        id: e.id,
        auth_user_id: e.auth_user_id || undefined,
        name: e.name,
        role: e.role,
        cpf: e.cpf,
        email: e.email,
        phone: e.phone || '',
        registrationNumber: e.registration_number || undefined,
        isTechnicalLead: e.is_technical_lead,
        shift: e.shift,
        status: e.status,
        admissionDate: e.admission_date
      }));
      setEmployees(mapped);
    } catch (err) {
      console.error('Erro ao buscar equipe:', err);
    }
  };

  const fetchAccessLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_LogsAcesso')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const mapped: SystemAccessLog[] = (data || []).map((l: any) => ({
        id: l.id,
        timestamp: l.timestamp,
        userId: l.user_id,
        userName: l.user_name,
        role: l.role || 'Cuidador',
        action: l.action,
        resource: l.resource || undefined,
        ipAddress: l.ip_address || ''
      }));
      setAccessLogs(mapped);
    } catch (err) {
      console.error('Erro ao buscar logs de acesso:', err);
    }
  };

  const fetchTrainingRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Treinamentos')
        .select(`
          *,
          participants:Recanto_TreinamentosParticipantes(*)
        `);

      if (error) throw error;

      const mapped: TrainingRecord[] = (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        instructor: t.instructor,
        participants: (t.participants || []).map((p: any) => p.employee_name),
        validUntil: t.valid_until || undefined,
        description: t.description || ''
      }));
      setTrainingRecords(mapped);
    } catch (err) {
      console.error('Erro ao buscar treinamentos:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Eventos')
        .select('*');

      if (error) throw error;

      const mapped: CalendarEvent[] = (data || []).map((ev: any) => ({
        id: ev.id,
        title: ev.title,
        start: ev.start_time,
        end: ev.end_time || undefined,
        type: ev.type,
        residentId: ev.resident_id || undefined,
        description: ev.description || undefined,
        location: ev.location || undefined,
        createdBy: ev.created_by
      }));
      setEvents(mapped);
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Quartos')
        .select('*')
        .order('number', { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: Room[] = data.map((q: any) => ({
          id: q.id,
          number: q.number,
          type: q.type,
          capacity: q.capacity,
          assets: q.assets || [],
          status: q.status || undefined
        }));
        setRooms(mapped);
        localStorage.setItem('recanto_rooms', JSON.stringify(mapped));
      }
    } catch (err) {
      console.warn('Erro ao buscar quartos do Supabase, usando localStorage:', err);
      const saved = localStorage.getItem('recanto_rooms');
      if (saved) {
        setRooms(JSON.parse(saved));
      } else {
        const defaultRooms: Room[] = [
          { id: 'q101', number: '101', type: 'Individual', capacity: 1, assets: ['Televisão', 'Guarda-roupa', 'Banheiro Adaptado'] },
          { id: 'q102', number: '102', type: 'Individual', capacity: 1, assets: ['Guarda-roupa', 'Ventilador'] },
          { id: 'q103', number: '103', type: 'Compartilhado', capacity: 2, assets: ['Televisão', 'Guarda-roupa', 'Banheiro Adaptado', 'Ar Condicionado'] },
          { id: 'q201', number: '201', type: 'Compartilhado', capacity: 2, assets: ['Guarda-roupa', 'Ventilador'] },
          { id: 'q202', number: '202', type: 'Compartilhado', capacity: 3, assets: ['Televisão', 'Guarda-roupa', 'Banheiro Adaptado', 'Ar Condicionado', 'Frigobar'] }
        ];
        setRooms(defaultRooms);
        localStorage.setItem('recanto_rooms', JSON.stringify(defaultRooms));
      }
    }
  };

  const handleAddRoom = async (newRoom: Room) => {
    try {
      const { error } = await supabase
        .from('Recanto_Quartos')
        .insert({
          number: newRoom.number,
          type: newRoom.type,
          capacity: newRoom.capacity,
          assets: newRoom.assets,
          status: newRoom.status || null
        });

      if (error) throw error;
      await fetchRooms();
    } catch (err) {
      console.warn('Erro ao inserir quarto no Supabase, atualizando localStorage localmente:', err);
      const updatedRooms = [...rooms, newRoom];
      setRooms(updatedRooms);
      localStorage.setItem('recanto_rooms', JSON.stringify(updatedRooms));
    }
  };

  const handleUpdateRoom = async (updatedRoom: Room) => {
    try {
      const { error } = await supabase
        .from('Recanto_Quartos')
        .update({
          number: updatedRoom.number,
          type: updatedRoom.type,
          capacity: updatedRoom.capacity,
          assets: updatedRoom.assets,
          status: updatedRoom.status || null
        })
        .eq('id', updatedRoom.id);

      if (error) throw error;
      await fetchRooms();
    } catch (err) {
      console.warn('Erro ao atualizar quarto no Supabase, atualizando localStorage localmente:', err);
      const updatedRooms = rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r);
      setRooms(updatedRooms);
      localStorage.setItem('recanto_rooms', JSON.stringify(updatedRooms));
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('Recanto_Quartos')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
      await fetchRooms();
    } catch (err) {
      console.warn('Erro ao excluir quarto no Supabase, atualizando localStorage localmente:', err);
      const updatedRooms = rooms.filter(r => r.id !== roomId);
      setRooms(updatedRooms);
      localStorage.setItem('recanto_rooms', JSON.stringify(updatedRooms));
    }
  };

  // Sync state with Database on user login
  useEffect(() => {
    if (currentUser) {
      fetchResidents();
      fetchFinancials();
      fetchContracts();
      fetchInvoices();
      fetchStockItems();
      fetchEmployees();
      fetchAccessLogs();
      fetchTrainingRecords();
      fetchEvents();
      fetchRooms();
    } else {
      setResidents([]);
      setFinancials([]);
      setContracts([]);
      setInvoices([]);
      setStockItems([]);
      setEmployees([]);
      setTrainingRecords([]);
      setAccessLogs([]);
      setEvents([]);
      setRooms([]);
    }
  }, [currentUser]);

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

  const handleAddResident = async (newResident: Resident) => {
    try {
      const { data: resData, error: resError } = await supabase
        .from('Recanto_Residentes')
        .insert({
          name: newResident.name,
          cpf: newResident.cpf || null,
          rg: newResident.rg || null,
          birth_date: newResident.birthDate || null,
          age: newResident.age,
          room: newResident.room,
          room_status: newResident.roomStatus || 'Ocupado',
          care_level: newResident.careLevel,
          photo_url: newResident.photoUrl || null,
          admission_date: new Date().toISOString().split('T')[0],
          clinical_condition: newResident.clinicalCondition || null,
          functional_condition: newResident.functionalCondition || null,
          social_history: newResident.socialHistory || null,
          address_cep: newResident.addressCep || null,
          address_state: newResident.addressState || null,
          address_city: newResident.addressCity || null,
          address_neighborhood: newResident.addressNeighborhood || null,
          address_street: newResident.addressStreet || null,
          address_number: newResident.addressNumber || null,
          address_complement: newResident.addressComplement || null,
          uso_fraldas: newResident.usoFraldas || 'nao',
          mobilidade_usual: newResident.mobilidadeSet || 'independente',
          higiene_corporal_usual: newResident.higieneCorporal || 'independente',
          higiene_oral_vestir_usual: newResident.higieneOralVestir || 'independente',
          req_hygiene: newResident.reqHygiene || false,
          req_oral_care: newResident.reqOralCare || false,
          req_feeding: newResident.reqFeeding || false,
          req_hydration: newResident.reqHydration || false,
          req_mobility: newResident.reqMobility || false,
          req_dressings: newResident.reqDressings || false,
          req_leisure: newResident.reqLeisure || false
        })
        .select()
        .single();

      if (resError || !resData) throw resError || new Error('Falha ao cadastrar residente');

      if (newResident.emergencyContacts && newResident.emergencyContacts.length > 0) {
        const { error: contactsError } = await supabase
          .from('Recanto_ContatosEmergencia')
          .insert(newResident.emergencyContacts.map(c => ({
            resident_id: resData.id,
            name: c.name,
            relation: c.relation,
            phone: c.phone
          })));
        if (contactsError) throw contactsError;
      }

      if (newResident.legalGuardian && newResident.legalGuardian.name) {
        const { error: guardianError } = await supabase
          .from('Recanto_ResponsaveisLegais')
          .insert({
            resident_id: resData.id,
            name: newResident.legalGuardian.name,
            cpf: newResident.legalGuardian.cpf,
            phone: newResident.legalGuardian.phone,
            address: newResident.legalGuardian.address
          });
        if (guardianError) throw guardianError;
      }

      await fetchResidents();
    } catch (err: any) {
      console.error('Error adding resident:', err);
      alert(err.message || 'Erro ao cadastrar residente no servidor.');
    }
  };

  const handleUpdateResident = async (updated: Resident) => {
    try {
      // Sincronizar sinais vitais dos boletins com a tabela de sinais vitais
      if (updated.dailyChecklists) {
        const extractedVitals = updated.dailyChecklists
          .filter(chk => chk.frequenciaCardiaca || chk.pressaoArterial || chk.saturacao || chk.temperatura)
          .map(chk => {
            const shift = chk.shift || 'diurno';
            const [year, month, day] = chk.date.split('-').map(Number);
            const hour = shift === 'noturno' ? 22 : 10;
            const localDate = new Date(year, month - 1, day, hour, 0, 0);
            const timestamp = localDate.toISOString();

            return {
              timestamp,
              bp: chk.pressaoArterial || '',
              hr: chk.frequenciaCardiaca ? parseInt(chk.frequenciaCardiaca, 10) : 0,
              temp: chk.temperatura ? parseFloat(chk.temperatura) : 36.5,
              spo2: chk.saturacao ? parseInt(chk.saturacao, 10) : 0,
              painLevel: chk.queixaDor === 'sim' ? 5 : undefined
            };
          });

        const vitalsMap = new Map();
        (updated.vitals || []).forEach(v => {
          vitalsMap.set(v.timestamp, v);
        });
        extractedVitals.forEach(v => {
          vitalsMap.set(v.timestamp, v);
        });
        updated.vitals = Array.from(vitalsMap.values());
      }

      const { error: resError } = await supabase
        .from('Recanto_Residentes')
        .update({
          name: updated.name,
          age: updated.age,
          room: updated.room,
          room_status: updated.roomStatus || 'Ocupado',
          care_level: updated.careLevel,
          photo_url: updated.photoUrl,
          clinical_condition: updated.clinicalCondition,
          functional_condition: updated.functionalCondition,
          social_history: updated.socialHistory,
          address_cep: updated.addressCep || null,
          address_state: updated.addressState || null,
          address_city: updated.addressCity || null,
          address_neighborhood: updated.addressNeighborhood || null,
          address_street: updated.addressStreet || null,
          address_number: updated.addressNumber || null,
          address_complement: updated.addressComplement || null,
          uso_fraldas: updated.usoFraldas || 'nao',
          mobilidade_usual: updated.mobilidadeSet || 'independente',
          higiene_corporal_usual: updated.higieneCorporal || 'independente',
          higiene_oral_vestir_usual: updated.higieneOralVestir || 'independente',
          req_hygiene: updated.reqHygiene || false,
          req_oral_care: updated.reqOralCare || false,
          req_feeding: updated.reqFeeding || false,
          req_hydration: updated.reqHydration || false,
          req_mobility: updated.reqMobility || false,
          req_dressings: updated.reqDressings || false,
          req_leisure: updated.reqLeisure || false
        })
        .eq('id', updated.id);

      if (resError) throw resError;

      // 1. Alergias
      await supabase.from('Recanto_Alergias').delete().eq('resident_id', updated.id);
      if (updated.allergies && updated.allergies.length > 0) {
        await supabase.from('Recanto_Alergias').insert(
          updated.allergies.map(a => ({ resident_id: updated.id, description: a }))
        );
      }

      // 2. Contatos de emergência
      await supabase.from('Recanto_ContatosEmergencia').delete().eq('resident_id', updated.id);
      if (updated.emergencyContacts && updated.emergencyContacts.length > 0) {
        await supabase.from('Recanto_ContatosEmergencia').insert(
          updated.emergencyContacts.map(c => ({
            resident_id: updated.id,
            name: c.name,
            relation: c.relation,
            phone: c.phone
          }))
        );
      }

      // 3. Responsável Legal
      if (updated.legalGuardian && updated.legalGuardian.name) {
        await supabase.from('Recanto_ResponsaveisLegais').upsert({
          resident_id: updated.id,
          name: updated.legalGuardian.name,
          cpf: updated.legalGuardian.cpf,
          phone: updated.legalGuardian.phone,
          address: updated.legalGuardian.address
        }, { onConflict: 'resident_id' });
      }

      // 4. Medicações
      if (updated.medications) {
        // Excluir medicações removidas no front-end
        const originalResident = residents.find(r => r.id === updated.id);
        if (originalResident && originalResident.medications) {
          const updatedMedIds = updated.medications.map(m => m.id);
          const deletedMeds = originalResident.medications.filter(m => !updatedMedIds.includes(m.id));
          for (const dMed of deletedMeds) {
            if (dMed.id.length >= 15) { // Verifica se é um UUID do banco e não um ID temporário do front
              await supabase
                .from('Recanto_Medicacoes')
                .delete()
                .eq('id', dMed.id);
            }
          }
        }

        for (const med of updated.medications) {
          const isMockId = med.id.length < 15;
          const { data: medData, error: medErr } = await supabase
            .from('Recanto_Medicacoes')
            .upsert({
              id: isMockId ? undefined : med.id,
              resident_id: updated.id,
              name: med.name,
              dosage: med.dosage,
              route: med.route,
              frequency: med.frequency,
              next_dose: med.nextDose,
              start_date: med.startDate || null,
              end_date: med.endDate || null
            })
            .select()
            .single();

          if (!medErr && medData && med.logs && med.logs.length > 0) {
            for (const log of med.logs) {
              const isLogMock = log.id.length < 15;
              await supabase
                .from('Recanto_LogsMedicacao')
                .upsert({
                  id: isLogMock ? undefined : log.id,
                  medication_id: medData.id,
                  timestamp: log.timestamp,
                  administered_by: log.administeredBy,
                  status: log.status,
                  note: log.note || null
                });
            }
          }
        }
      }

      // 5. Sinais Vitais
      if (updated.vitals && updated.vitals.length > 0) {
        for (const vit of updated.vitals) {
          await supabase
            .from('Recanto_SinaisVitais')
            .upsert({
              resident_id: updated.id,
              timestamp: vit.timestamp,
              bp: vit.bp,
              hr: vit.hr,
              temp: vit.temp,
              spo2: vit.spo2,
              pain_level: vit.painLevel || null
            }, { onConflict: 'resident_id,timestamp' });
        }
      }

      // 6. Planos de Assistência
      if (updated.carePlan) {
        for (const cp of updated.carePlan) {
          const isCpMock = cp.id.length < 15;
          await supabase
            .from('Recanto_PlanosAssistencia')
            .upsert({
              id: isCpMock ? undefined : cp.id,
              resident_id: updated.id,
              title: cp.title,
              description: cp.description,
              frequency: cp.frequency,
              assigned_to: cp.assignedTo,
              status: cp.status
            });
        }
      }

      // 7. Checklist Diário
      if (updated.dailyChecklists) {
        for (const chk of updated.dailyChecklists) {
          const { data: chkData, error: chkErr } = await supabase
            .from('Recanto_ChecklistDiario')
            .upsert({
              resident_id: updated.id,
              date: chk.date,
              shift: chk.shift || 'diurno',
              hygiene: chk.hygiene,
              oral_care: chk.oralCare,
              feeding: chk.feeding,
              hydration: chk.hydration,
              mobility: chk.mobility,
              dressings: chk.dressings,
              leisure: chk.leisure,
              queixa_dor: chk.queixaDor || null,
              queixa_dor_desc: chk.queixaDorDesc || null,
              estado_neurologico: chk.estadoNeurologico || null,
              ar_ambiente: chk.arAmbiente !== undefined ? chk.arAmbiente : null,
              alimentacao: chk.alimentacao || null,
              alimentacao_desc: chk.alimentacaoDesc || null,
              agitado: chk.agitado !== undefined ? chk.agitado : null,
              prostrado: chk.prostrado !== undefined ? chk.prostrado : null,
              sonolento: chk.sonolento !== undefined ? chk.sonolento : null,
              eliminacao_evacuacao: chk.eliminacaoEvacuacao || null,
              eliminacao_evacuacao_dias: chk.eliminacaoEvacuacaoDias || null,
              aspecto_evacuacoes: chk.aspectoEvacuacoes || null,
              diurese: chk.diurese || null,
              diurese_aspecto: chk.diureseAspecto || null,
              uso_fraldas: chk.usoFraldas || null,
              mobilidade_set: chk.mobilidadeSet || null,
              higiene_corporal: chk.higieneCorporal || null,
              higiene_oral_vestir: chk.higieneOralVestir || null,
              alteracoes_pele: chk.alteracoesPele || null,
              alteracoes_pele_desc: chk.alteracoesPeleDesc || null,
              sono: chk.sono || null,
              sono_desc: chk.sonoDesc || null,
              medicacoes_administradas: chk.medicacoesAdministradas || null,
              atividades_consulta: chk.atividadesConsulta || null,
              intercorrencia: chk.intercorrencia || null,
              intercorrencia_desc: chk.intercorrenciaDesc || null,
              photo_url: chk.photoUrl || null,
              signed_by: chk.signedBy || null,
              signed_at: chk.signedAt || null
            }, { onConflict: 'resident_id,date,shift' })
            .select()
            .single();

          if (!chkErr && chkData && chk.carePlanAdherence) {
            // Delete old adherence records first to avoid orphans
            await supabase
              .from('Recanto_AcompanhamentoPlano')
              .delete()
              .eq('checklist_id', chkData.id);

            if (chk.carePlanAdherence.length > 0) {
              await supabase
                .from('Recanto_AcompanhamentoPlano')
                .insert(
                  chk.carePlanAdherence.map(adh => ({
                    checklist_id: chkData.id,
                    care_plan_id: adh.carePlanId,
                    status: adh.status,
                    comment: adh.comment || null
                  }))
                );
            }
          }
        }
      }

      // 8. Documentos
      if (updated.documents) {
        for (const doc of updated.documents) {
          const isDocMock = doc.id.length < 15;
          await supabase
            .from('Recanto_Documentos')
            .upsert({
              id: isDocMock ? undefined : doc.id,
              resident_id: updated.id,
              name: doc.name,
              type: doc.type,
              url: doc.url,
              upload_date: doc.uploadDate
            });
        }
      }

      // 9. Diet Plan
      if (updated.dietPlan) {
        const { data: dpData } = await supabase
          .from('Recanto_PlanosDieta')
          .upsert({
            resident_id: updated.id,
            consistency: updated.dietPlan.consistency,
            type: updated.dietPlan.type,
            fluid_restriction: updated.dietPlan.fluidRestriction || null,
            observations: updated.dietPlan.observations || null
          }, { onConflict: 'resident_id' })
          .select()
          .single();

        if (dpData && updated.dietPlan.restrictions) {
          await supabase.from('Recanto_RestricoesDieta').delete().eq('diet_plan_id', dpData.id);
          if (updated.dietPlan.restrictions.length > 0) {
            await supabase.from('Recanto_RestricoesDieta').insert(
              updated.dietPlan.restrictions.map(r => ({
                diet_plan_id: dpData.id,
                description: r
              }))
            );
          }
        }
      }

      // 10. Nutritional Logs
      if (updated.nutritionalLogs) {
        for (const n of updated.nutritionalLogs) {
          const isNutMock = n.id.length < 15;
          await supabase
            .from('Recanto_LogsNutricao')
            .upsert({
              id: isNutMock ? undefined : n.id,
              resident_id: updated.id,
              date: n.date,
              meal: n.meal,
              acceptance: n.acceptance,
              fluid_intake: n.fluidIntake || null,
              notes: n.notes || null
            });
        }
      }

      // 11. Visitas
      if (updated.visits) {
        // Excluir visitas removidas no front-end
        const originalResident = residents.find(r => r.id === updated.id);
        if (originalResident && originalResident.visits) {
          const updatedVisitIds = updated.visits.map(v => v.id);
          const deletedVisits = originalResident.visits.filter(v => !updatedVisitIds.includes(v.id));
          for (const dVisit of deletedVisits) {
            if (dVisit.id.length >= 15) {
              await supabase
                .from('Recanto_Visitas')
                .delete()
                .eq('id', dVisit.id);
            }
          }
        }

        for (const vis of updated.visits) {
          const isVisMock = vis.id.length < 15;
          await supabase
            .from('Recanto_Visitas')
            .upsert({
              id: isVisMock ? undefined : vis.id,
              resident_id: updated.id,
              visitor_name: vis.visitorName,
              relation: vis.relation,
              cpf: vis.cpf || null,
              phone: vis.phone || null,
              date: vis.date,
              temperature: vis.temperature || null,
              observations: vis.observations || null,
              created_by: vis.createdBy
            });
        }
      }

      // 12. Logs de Auditoria / Evoluções
      if (updated.auditLogs) {
        for (const log of updated.auditLogs) {
          const isLogMock = log.id.length < 15;
          if (isLogMock) {
            const { error: logErr } = await supabase
              .from('Recanto_LogsAuditoria')
              .insert({
                resident_id: updated.id,
                user_id: log.userId,
                user_name: log.userName,
                action: log.action,
                details: log.details
              });
            if (logErr) {
              console.error('Erro ao salvar log de auditoria:', logErr);
            }
          }
        }
      }

      await fetchResidents();
    } catch (err) {
      console.error('Error updating resident:', err);
      alert('Erro ao atualizar dados do residente no servidor.');
    }
  };

  const handleAddFinancialRecord = async (newRecord: FinancialRecord) => {
    try {
      const { error } = await supabase
        .from('Recanto_RegistrosFinanceiros')
        .insert({
          type: newRecord.type,
          category: newRecord.category,
          description: newRecord.description,
          amount: newRecord.amount,
          date: newRecord.date,
          status: newRecord.status,
          invoice_id: newRecord.invoiceId || null
        });
      if (error) throw error;
      await fetchFinancials();
    } catch (err) {
      console.error('Error adding financial record:', err);
    }
  };

  const handleAddContract = async (newContract: Contract) => {
    try {
      const { error } = await supabase
        .from('Recanto_Contratos')
        .insert({
          resident_id: newContract.residentId,
          start_date: newContract.startDate,
          end_date: newContract.endDate || null,
          monthly_value: newContract.monthlyValue,
          due_day: newContract.dueDay,
          status: newContract.status,
          file_url: newContract.fileUrl || null
        });
      if (error) throw error;
      await fetchContracts();
      await fetchInvoices(); // Trigger creates the invoice automatically
    } catch (err) {
      console.error('Error adding contract:', err);
    }
  };

  const handleUpdateInvoice = async (updatedInvoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('Recanto_Mensalidades')
        .update({
          status: updatedInvoice.status,
          paid_date: updatedInvoice.paidDate || null
        })
        .eq('id', updatedInvoice.id);
      if (error) throw error;
      await fetchInvoices();
      await fetchFinancials(); // Trigger syncs financial record automatically
    } catch (err) {
      console.error('Error updating invoice:', err);
    }
  };

  const handleUpdateStock = async (id: string, newQuantity: number) => {
    try {
      const item = stockItems.find(i => i.id === id);
      if (!item) return;
      const diff = newQuantity - item.quantity;
      if (diff === 0) return;

      const type = diff > 0 ? 'entrada' : 'saida';
      const { error } = await supabase
        .from('Recanto_MovimentacoesEstoque')
        .insert({
          stock_item_id: id,
          type: type,
          quantity: Math.abs(diff),
          user_name: currentUser?.name || 'Admin',
          notes: 'Ajuste manual de estoque'
        });
      if (error) throw error;
      await fetchStockItems();
    } catch (err) {
      console.error('Error updating stock:', err);
    }
  };

  const handleAddStockItem = async (newItem: StockItem) => {
    try {
      const { data: itemData, error: itemErr } = await supabase
        .from('Recanto_Estoque')
        .insert({
          name: newItem.name,
          category: newItem.category,
          quantity: 0,
          unit: newItem.unit,
          min_threshold: newItem.minThreshold,
          resident_id: newItem.residentId || null
        })
        .select()
        .single();

      if (itemErr || !itemData) throw itemErr;

      const { error: txErr } = await supabase
        .from('Recanto_MovimentacoesEstoque')
        .insert({
          stock_item_id: itemData.id,
          type: 'entrada',
          quantity: newItem.quantity,
          user_name: currentUser?.name || 'Admin',
          notes: 'Cadastro inicial'
        });

      if (txErr) throw txErr;

      await fetchStockItems();
    } catch (err) {
      console.error('Error adding stock item:', err);
    }
  };

  const handleAddEmployee = async (newEmployee: Omit<Employee, 'id'>): Promise<Employee> => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Funcionarios')
        .insert({
          name: newEmployee.name,
          role: newEmployee.role,
          cpf: newEmployee.cpf,
          email: newEmployee.email,
          phone: newEmployee.phone || null,
          registration_number: newEmployee.registrationNumber || null,
          is_technical_lead: newEmployee.isTechnicalLead,
          shift: newEmployee.shift,
          status: newEmployee.status,
          admission_date: newEmployee.admissionDate,
          auth_user_id: newEmployee.auth_user_id || null
        })
        .select()
        .single();
      if (error) throw error;
      await fetchEmployees();
      
      const mapped: Employee = {
        id: data.id,
        auth_user_id: data.auth_user_id || undefined,
        name: data.name,
        role: data.role,
        cpf: data.cpf,
        email: data.email,
        phone: data.phone || '',
        registrationNumber: data.registration_number || undefined,
        isTechnicalLead: data.is_technical_lead,
        shift: data.shift,
        status: data.status,
        admissionDate: data.admission_date
      };
      return mapped;
    } catch (err) {
      console.error('Error adding employee:', err);
      throw err;
    }
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee): Promise<Employee> => {
    try {
      const { data, error } = await supabase
        .from('Recanto_Funcionarios')
        .update({
          name: updatedEmployee.name,
          role: updatedEmployee.role,
          cpf: updatedEmployee.cpf,
          email: updatedEmployee.email,
          phone: updatedEmployee.phone || null,
          registration_number: updatedEmployee.registrationNumber || null,
          is_technical_lead: updatedEmployee.isTechnicalLead,
          shift: updatedEmployee.shift,
          status: updatedEmployee.status,
          admission_date: updatedEmployee.admissionDate,
          auth_user_id: updatedEmployee.auth_user_id || null
        })
        .eq('id', updatedEmployee.id)
        .select()
        .single();
      if (error) throw error;
      await fetchEmployees();
      
      const mapped: Employee = {
        id: data.id,
        auth_user_id: data.auth_user_id || undefined,
        name: data.name,
        role: data.role,
        cpf: data.cpf,
        email: data.email,
        phone: data.phone || '',
        registrationNumber: data.registration_number || undefined,
        isTechnicalLead: data.is_technical_lead,
        shift: data.shift,
        status: data.status,
        admissionDate: data.admission_date
      };
      return mapped;
    } catch (err) {
      console.error('Error updating employee:', err);
      throw err;
    }
  };


  const handleAddTraining = async (newTraining: TrainingRecord) => {
    try {
      const { data: tData, error: tErr } = await supabase
        .from('Recanto_Treinamentos')
        .insert({
          title: newTraining.title,
          description: newTraining.description,
          date: newTraining.date,
          instructor: newTraining.instructor,
          valid_until: newTraining.validUntil || null
        })
        .select()
        .single();

      if (tErr || !tData) throw tErr;

      if (newTraining.participants && newTraining.participants.length > 0) {
        const { error: pErr } = await supabase
          .from('Recanto_TreinamentosParticipantes')
          .insert(newTraining.participants.map(pName => {
            const emp = employees.find(e => e.name === pName);
            return {
              training_id: tData.id,
              employee_id: emp ? emp.id : null,
              employee_name: pName
            };
          }));
        if (pErr) throw pErr;
      }

      await fetchTrainingRecords();
    } catch (err) {
      console.error('Error adding training:', err);
    }
  };

  const handleAddAccessLog = async (newLog: SystemAccessLog) => {
    try {
      const { error } = await supabase
        .from('Recanto_LogsAcesso')
        .insert({
          user_id: newLog.userId,
          user_name: newLog.userName,
          role: newLog.role,
          action: newLog.action,
          resource: newLog.resource || null,
          ip_address: newLog.ipAddress || null
        });
      if (error) throw error;
      await fetchAccessLogs();
    } catch (err) {
      console.error('Error adding access log:', err);
    }
  };

  const handleAddEvent = async (newEvent: CalendarEvent) => {
    try {
      const { error } = await supabase
        .from('Recanto_Eventos')
        .insert({
          title: newEvent.title,
          start_time: newEvent.start,
          end_time: newEvent.end || null,
          type: newEvent.type,
          resident_id: newEvent.residentId || null,
          description: newEvent.description || null,
          location: newEvent.location || null,
          created_by: newEvent.createdBy
        });
      if (error) throw error;
      await fetchEvents();
    } catch (err) {
      console.error('Error adding event:', err);
    }
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
            onUpdateEmployee={handleUpdateEmployee}
            onAddTraining={handleAddTraining}
            residents={residents}
            onAddAccessLog={handleAddAccessLog}
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
      case ViewState.STOCK:
        return (
          <StockModule
            items={stockItems}
            residents={residents}
            onUpdateStock={handleUpdateStock}
            onAddItem={handleAddStockItem}
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