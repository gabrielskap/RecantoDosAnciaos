import React, { useState, useEffect, useMemo } from 'react';
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
import LandingPage from './components/LandingPage';
import SuperAdminPanel from './components/SuperAdminPanel';
import DemoApp from './components/demo/DemoApp';
import FeaturesRouter from './components/marketing/FeaturesRouter';
import ResidentPortal from './components/ResidentPortal';
import RoomsModule from './components/RoomsModule';
import NotificationsModule from './components/NotificationsModule';
import SettingsModule from './components/SettingsModule';
import CheckoutPage from './components/CheckoutPage';
import PendingPaymentScreen from './components/PendingPaymentScreen';
import TrialBanner from './components/TrialBanner';
import SubscriptionModal from './components/SubscriptionModal';
import ResetPassword from './components/ResetPassword';
import ToastContainer from './components/ToastContainer';
import { toast } from './services/toast';
import NotificationsPanel from './components/NotificationsPanel';
import type { AlertItem } from './components/NotificationsPanel';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Menu, HeartPulse, Bell, ChevronDown, UserCircle, LogOut, Building2 } from 'lucide-react';
import { ViewState, Resident, FinancialRecord, StockItem, Employee, TrainingRecord, SystemAccessLog, Contract, Invoice, CalendarEvent, StockTransaction, Room } from './types';
import { supabase } from './services/supabaseClient';
import * as dataService from './services/dataService';
import UserProfile from './components/UserProfile';

// Path name to ViewState conversion
const pathToView = (path: string): { view: ViewState; residentId?: string } => {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0 || parts[0] === 'dashboard') {
    return { view: ViewState.DASHBOARD };
  }

  const primary = parts[0];
  switch (primary) {
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
    case 'notificacoes':
      return { view: ViewState.NOTIFICATIONS };
    case 'settings':
      return { view: ViewState.SETTINGS };
    case 'profile':
      return { view: ViewState.PROFILE };
    default:
      return { view: ViewState.DASHBOARD };
  }
};

const viewToPath = (view: ViewState, residentId?: string): string => {
  switch (view) {
    case ViewState.DASHBOARD:
      return '/dashboard';
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
    case ViewState.NOTIFICATIONS:
      return '/notificacoes';
    case ViewState.SETTINGS:
      return '/settings';
    case ViewState.PROFILE:
      return '/profile';
    default:
      return '/';
  }
};

function AppInner() {
  const { currentUser, loading, logout, accessBlocked, trialInfo } = useAuth();
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  // Full clinical history (vitals, checklists, documents, audit trail,
  // visits, prescriptions) for the ONE resident whose profile is currently
  // open. `residents` only carries the lightweight summary now, so this is
  // hydrated lazily (see effect below) instead of being loaded for everyone
  // up front — that's what used to blow past Postgres' statement_timeout.
  const [selectedResidentDetail, setSelectedResidentDetail] = useState<Resident | null>(null);
  const [portalResidentDetail, setPortalResidentDetail] = useState<Resident | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

  // Profile dropdown and Company Name states
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState('RecantoCare');

  // Compute user initials
  const userInitials = useMemo(() => {
    if (!currentUser?.name) return 'US';
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'US';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [currentUser]);

  // Handle click outside of dropdown to close it
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const container = document.getElementById('profile-dropdown-container');
      if (container && !container.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      window.addEventListener('click', handleGlobalClick);
    }
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [profileMenuOpen]);

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
    if (!currentUser?.empresaId) return;
    try {
      const mapped = await dataService.fetchResidentsSummary(currentUser.empresaId);
      setResidents(mapped);
      setDataLoaded(true);
      if (selectedResident) {
        const found = mapped.find(res => res.id === selectedResident.id);
        if (found) setSelectedResident(found);
      }
    } catch (err) {
      console.error('Erro ao buscar residentes:', err);
    }
  };

  const refreshSelectedResidentDetail = async (residentId: string) => {
    try {
      const detail = await dataService.fetchResidentDetails(residentId);
      setSelectedResidentDetail(detail);
    } catch (err) {
      console.error('Erro ao buscar detalhes do residente:', err);
    }
  };

  // Hydrate the full clinical history only when a resident's profile is
  // actually opened (id changes) — not on every unrelated refresh of the
  // lightweight `residents` list, which keeps the same id but a new object
  // reference every time it reloads.
  useEffect(() => {
    if (selectedResident) {
      refreshSelectedResidentDetail(selectedResident.id);
    } else {
      setSelectedResidentDetail(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResident?.id]);

  // Family/legal-guardian portal: only ever needs the one resident tied to
  // the logged-in "Responsável" account, so fetch that resident's full
  // detail directly instead of loading every resident's history.
  useEffect(() => {
    if (currentUser?.profile.type === 'Responsável' && currentUser.residentId) {
      dataService.fetchResidentDetails(currentUser.residentId)
        .then(setPortalResidentDetail)
        .catch(err => console.error('Erro ao buscar detalhes do residente (portal):', err));
    }
  }, [currentUser?.profile.type, currentUser?.residentId]);

  const residentForProfile = selectedResidentDetail && selectedResident && selectedResidentDetail.id === selectedResident.id
    ? selectedResidentDetail
    : selectedResident;

  const fetchFinancials = async () => {
    if (!currentUser?.empresaId) return;
    try {
      setFinancials(await dataService.fetchFinancials(currentUser.empresaId));
    } catch (err) {
      console.error('Erro ao buscar financeiro:', err);
    }
  };

  const fetchContracts = async () => {
    if (!currentUser?.empresaId) return;
    try {
      setContracts(await dataService.fetchContracts(currentUser.empresaId));
    } catch (err) {
      console.error('Erro ao buscar contratos:', err);
    }
  };

  const fetchInvoices = async () => {
    if (!currentUser?.empresaId) return;
    try {
      setInvoices(await dataService.fetchInvoices(currentUser.empresaId));
    } catch (err) {
      console.error('Erro ao buscar mensalidades:', err);
    }
  };

  const fetchStockItems = async () => {
    if (!currentUser?.empresaId) return;
    try {
      setStockItems(await dataService.fetchStockItems(currentUser.empresaId));
    } catch (err) {
      console.error('Erro ao buscar estoque:', err);
    }
  };

  const fetchEmployees = async () => {
    if (!currentUser?.empresaId) return;
    try {
      setEmployees(await dataService.fetchEmployees(currentUser.empresaId));
    } catch (err) {
      console.error('Erro ao buscar equipe:', err);
    }
  };

  const fetchAccessLogs = async () => {
    if (!currentUser?.empresaId) return;
    try {
      setAccessLogs(await dataService.fetchAccessLogs(currentUser.empresaId));
    } catch (err) {
      console.error('Erro ao buscar logs de acesso:', err);
    }
  };

  const fetchTrainingRecords = async () => {
    if (!currentUser?.empresaId) return;
    try {
      setTrainingRecords(await dataService.fetchTrainingRecords(currentUser.empresaId));
    } catch (err) {
      console.error('Erro ao buscar treinamentos:', err);
    }
  };

  const fetchEvents = async () => {
    if (!currentUser?.empresaId) return;
    try {
      setEvents(await dataService.fetchEvents(currentUser.empresaId));
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
    }
  };

  const fetchRooms = async () => {
    if (!currentUser?.empresaId) return;
    try {
      const mapped = await dataService.fetchRooms(currentUser.empresaId);
      setRooms(mapped);
      localStorage.setItem('recanto_rooms', JSON.stringify(mapped));
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

      // Buscar nome da instituição
      const fetchCompanyInfo = async () => {
        try {
          const { data } = await supabase
            .from('Recanto_Empresas')
            .select('nome_instituicao')
            .eq('empresa_id', currentUser.empresaId)
            .maybeSingle();
          if (data?.nome_instituicao) {
            setCompanyName(data.nome_instituicao);
          }
        } catch (err) {
          console.warn('Erro ao carregar nome da empresa no topo:', err);
        }
      };
      fetchCompanyInfo();
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
      setDataLoaded(false);
      setCompanyName('RecantoCare');
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
    if (path !== '/' && path !== '/login' && path !== '/portal') {
      localStorage.setItem('recanto_last_active_path', path);
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
        } else if (dataLoaded) {
          // Fallback only if data has finished loading and resident is still not found
          window.history.replaceState(null, '', '/residents');
          setCurrentView(ViewState.RESIDENTS);
          setSelectedResident(null);
        }
      } else {
        setSelectedResident(null);
      }
      if (path !== '/' && path !== '/login' && path !== '/portal') {
        localStorage.setItem('recanto_last_active_path', path);
      }
    };

    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [currentUser, residents, dataLoaded]);

  // Restore path on login
  useEffect(() => {
    if (currentUser && dataLoaded) {
      const savedPath = localStorage.getItem('recanto_last_active_path');
      if (savedPath && savedPath !== '/' && savedPath !== '/login' && savedPath !== '/portal' && (window.location.pathname === '/' || window.location.pathname === '/login')) {
        window.history.replaceState(null, '', savedPath);
        const { view, residentId } = pathToView(savedPath);
        setCurrentView(view);
        if (view === ViewState.RESIDENT_DETAIL && residentId) {
          const found = residents.find(r => r.id === residentId);
          if (found) setSelectedResident(found);
        }
      }
    }
  }, [currentUser, dataLoaded, residents]);

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

  // Page title management
  useEffect(() => {
    if (loading) {
      document.title = 'Carregando... | Recanto dos Anciãos';
      return;
    }
    if (!currentUser) return;
    if (currentUser.profile.type === 'Responsável') return;

    const viewTitles: Partial<Record<ViewState, string>> = {
      [ViewState.DASHBOARD]: 'Painel Geral',
      [ViewState.RESIDENTS]: 'Residentes & Prontuário',
      [ViewState.RESIDENT_DETAIL]: selectedResident
        ? `Prontuário – ${selectedResident.name}`
        : 'Prontuário do Residente',
      [ViewState.AGENDA]: 'Agenda & Atividades',
      [ViewState.NUTRITION]: 'Alimentação & Nutrição',
      [ViewState.TEAM]: 'Equipe e Acessos',
      [ViewState.USERS]: 'Equipe e Acessos',
      [ViewState.FINANCE]: 'Financeiro & Contratos',
      [ViewState.STOCK]: 'Estoque & Insumos',
      [ViewState.REPORTS]: 'Relatórios & Indicadores',
      [ViewState.ROOMS]: 'Gerenciamento de Quartos',
      [ViewState.NOTIFICATIONS]: 'Notificações',
      [ViewState.SETTINGS]: 'Configurações do Sistema',
      [ViewState.PROFILE]: 'Meu Perfil',
    };

    const pageName = viewTitles[currentView] ?? 'Painel Geral';
    document.title = `${pageName} | Recanto dos Anciãos`;
  }, [currentView, selectedResident, loading, currentUser]);

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
          admission_date: newResident.admissionDate || new Date().toISOString().split('T')[0],
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
          req_hygiene: newResident.reqHygiene ?? null,
          req_oral_care: newResident.reqOralCare ?? null,
          req_feeding: newResident.reqFeeding ?? null,
          req_hydration: newResident.reqHydration ?? null,
          req_mobility: newResident.reqMobility ?? null,
          req_dressings: newResident.reqDressings ?? null,
          req_leisure: newResident.reqLeisure ?? null
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
            address: newResident.legalGuardian.address,
            is_primary: true
          });
        if (guardianError) throw guardianError;
      }

      if (newResident.allergies && newResident.allergies.length > 0) {
        const { error: allergiesError } = await supabase
          .from('Recanto_Alergias')
          .insert(
            newResident.allergies.map(a => ({ resident_id: resData.id, description: a }))
          );
        if (allergiesError) throw allergiesError;
      }

      await fetchResidents();
    } catch (err: any) {
      console.error('Error adding resident:', err);
      toast.error(err.message || 'Erro ao cadastrar residente no servidor.');
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
          admission_date: updated.admissionDate,
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
          req_hygiene: updated.reqHygiene ?? null,
          req_oral_care: updated.reqOralCare ?? null,
          req_feeding: updated.reqFeeding ?? null,
          req_hydration: updated.reqHydration ?? null,
          req_mobility: updated.reqMobility ?? null,
          req_dressings: updated.reqDressings ?? null,
          req_leisure: updated.reqLeisure ?? null
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
          address: updated.legalGuardian.address,
          is_primary: true
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
              end_date: med.endDate || null,
              observations: med.observations || null,
              document_url: med.documentUrl || null
            })
            .select()
            .single();

          if (!medErr && medData && med.logs && med.logs.length > 0) {
            // Logs são somente-anexação (nunca editados após criados), então só
            // é preciso inserir os novos (id mock). Re-enviar logs já persistidos
            // forçaria um UPDATE via upsert, que a RLS de Recanto_LogsMedicacao
            // não permite (só há política de INSERT/SELECT) e retornava 403.
            const newLogs = med.logs.filter(log => log.id.length < 15);
            for (const log of newLogs) {
              await supabase
                .from('Recanto_LogsMedicacao')
                .insert({
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

      // 5. Receitas Médicas
      // Only sync when `updated` came from fetchResidentDetails (full
      // clinical history). The lightweight summary always sends
      // prescriptions as [], and diffing that against the database would
      // delete every real prescription the resident has.
      if (updated.isDetailLoaded && updated.prescriptions !== undefined) {
        // Prescriptions are no longer part of the lightweight resident list
        // state (see fetchResidentsSummary), so check what's currently in
        // the database directly instead of diffing against client state —
        // this is also more correct than the old approach, since it can't
        // go stale/incomplete depending on what happened to be loaded.
        const { data: existingPrescriptions, error: existingPrescError } = await supabase
          .from('Recanto_Receitas')
          .select('id')
          .eq('resident_id', updated.id);
        if (existingPrescError) throw existingPrescError;
        const updatedIds = updated.prescriptions.map(p => p.id);
        const deletedPrescriptions = (existingPrescriptions || []).filter(p => !updatedIds.includes(p.id));
        for (const dp of deletedPrescriptions) {
          await supabase.from('Recanto_Receitas').delete().eq('id', dp.id);
        }
        for (const p of updated.prescriptions) {
          const isMock = p.id.length < 15;
          if (isMock) {
            await supabase.from('Recanto_Receitas').insert({
              resident_id: updated.id,
              description: p.description,
              expiry_date: p.expiryDate,
              file_url: p.fileUrl,
              file_name: p.fileName
            });
          }
        }
      }

      // 6. Sinais Vitais
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
              photo_url: chk.photoUrls?.[0] || null,
              photo_urls: chk.photoUrls && chk.photoUrls.length > 0 ? chk.photoUrls : null,
              signed_by: chk.signedBy || null,
              signed_at: chk.signedAt || null,
              signature_info: chk.signatureInfo || null
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

      // 8. Pastas de Documentos (persistir antes dos documentos p/ resolver folder_id)
      const folderIdMap = new Map<string, string>(); // idLocal/idReal -> idReal
      if (updated.documentFolders) {
        // Reconciliar exclusões: remover pastas do banco que saíram do estado.
        // ON DELETE SET NULL zera o folder_id dos documentos afetados.
        const keptRealIds = updated.documentFolders
          .map(f => f.id)
          .filter(id => id.length >= 15);
        let delQuery = supabase
          .from('Recanto_DocumentosPastas')
          .delete()
          .eq('resident_id', updated.id);
        if (keptRealIds.length > 0) {
          delQuery = delQuery.not('id', 'in', `(${keptRealIds.join(',')})`);
        }
        await delQuery;

        for (const folder of updated.documentFolders) {
          const isFolderMock = folder.id.length < 15;
          const { data: folderData } = await supabase
            .from('Recanto_DocumentosPastas')
            .upsert({
              id: isFolderMock ? undefined : folder.id,
              resident_id: updated.id,
              name: folder.name
            })
            .select()
            .single();
          if (folderData) folderIdMap.set(folder.id, folderData.id);
        }
      }

      // 8b. Documentos
      if (updated.documents) {
        for (const doc of updated.documents) {
          const isDocMock = doc.id.length < 15;
          const resolvedFolderId = doc.folderId
            ? (folderIdMap.get(doc.folderId) ?? doc.folderId)
            : null;
          await supabase
            .from('Recanto_Documentos')
            .upsert({
              id: isDocMock ? undefined : doc.id,
              resident_id: updated.id,
              name: doc.name,
              type: doc.type,
              url: doc.url,
              upload_date: doc.uploadDate,
              folder_id: resolvedFolderId
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
      // Guarded by isDetailLoaded for the same reason as prescriptions/glicemia
      // below: the lightweight summary always sends visits as [], and that
      // must never be read as "the user deleted all visits".
      if (updated.isDetailLoaded && updated.visits) {
        // Excluir visitas removidas no front-end. Visits are no longer part
        // of the lightweight resident list state, so check the database
        // directly for what currently exists instead of diffing against
        // client state.
        const { data: existingVisits, error: existingVisitsError } = await supabase
          .from('Recanto_Visitas')
          .select('id')
          .eq('resident_id', updated.id);
        if (existingVisitsError) throw existingVisitsError;
        const updatedVisitIds = updated.visits.map(v => v.id);
        const deletedVisits = (existingVisits || []).filter(v => !updatedVisitIds.includes(v.id));
        for (const dVisit of deletedVisits) {
          if (dVisit.id.length >= 15) {
            await supabase
              .from('Recanto_Visitas')
              .delete()
              .eq('id', dVisit.id);
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

      // 12. Glicemia
      // Guarded by isDetailLoaded: the lightweight resident summary always
      // sends glucoseReadings as [] (see fetchResidentsSummary). Without this
      // guard, any onUpdateResident call that fires before this resident's
      // full detail has been hydrated (e.g. editing Cadastro right after
      // opening the profile) would diff against that empty array and delete
      // every real glucose reading in the database.
      if (updated.isDetailLoaded && updated.glucoseReadings) {
        // Glucose readings are no longer part of the lightweight resident
        // list state, so check the database directly for what currently
        // exists instead of diffing against client state.
        const { data: existingGlicemia, error: existingGlicemiaError } = await supabase
          .from('Recanto_Glicemia')
          .select('id')
          .eq('resident_id', updated.id);
        if (existingGlicemiaError) throw existingGlicemiaError;
        const updatedGlicemiaIds = updated.glucoseReadings.map(g => g.id);
        const deletedGlicemia = (existingGlicemia || []).filter(g => !updatedGlicemiaIds.includes(g.id));
        for (const dG of deletedGlicemia) {
          if (dG.id.length >= 15) {
            await supabase
              .from('Recanto_Glicemia')
              .delete()
              .eq('id', dG.id);
          }
        }

        for (const g of updated.glucoseReadings) {
          const isGlicemiaMock = g.id.length < 15;
          await supabase
            .from('Recanto_Glicemia')
            .upsert({
              id: isGlicemiaMock ? undefined : g.id,
              resident_id: updated.id,
              timestamp: g.timestamp,
              valor_mg_dl: g.value,
              momento: g.moment,
              insulina_aplicada: g.insulinApplied || false,
              insulina_unidades: g.insulinUnits ?? null,
              tipo_insulina: g.insulinApplied ? (g.insulinType || null) : null,
              observacoes: g.notes || null
            });
        }
      }

      // 13. Logs de Auditoria / Evoluções
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
      // The summary refresh above doesn't carry the heavy fields, so
      // re-hydrate this resident's full detail explicitly if their profile
      // is the one currently open — the id-based effect won't refire since
      // the id itself didn't change.
      if (selectedResident?.id === updated.id) {
        await refreshSelectedResidentDetail(updated.id);
      }
    } catch (err) {
      console.error('Error updating resident:', err);
      toast.error('Erro ao atualizar dados do residente no servidor.');
    }
  };

  // Dedicated single-purpose writes for document folder CRUD and moving a
  // document between folders. These deliberately bypass handleUpdateResident's
  // 13-step resave-the-whole-resident pipeline (and don't swallow errors the
  // way it does) so a failure in an unrelated section of the resident's record
  // can never silently block a folder rename/delete.
  const handleCreateDocumentFolder = async (residentId: string, name: string) => {
    const { error } = await supabase
      .from('Recanto_DocumentosPastas')
      .insert({ resident_id: residentId, name });
    if (error) throw error;
    await fetchResidents();
    if (selectedResident?.id === residentId) await refreshSelectedResidentDetail(residentId);
  };

  const handleRenameDocumentFolder = async (folderId: string, name: string, residentId: string) => {
    const { error } = await supabase
      .from('Recanto_DocumentosPastas')
      .update({ name })
      .eq('id', folderId);
    if (error) throw error;
    await fetchResidents();
    if (selectedResident?.id === residentId) await refreshSelectedResidentDetail(residentId);
  };

  const handleDeleteDocumentFolder = async (folderId: string, residentId: string) => {
    const { error } = await supabase
      .from('Recanto_DocumentosPastas')
      .delete()
      .eq('id', folderId);
    if (error) throw error;
    await fetchResidents();
    if (selectedResident?.id === residentId) await refreshSelectedResidentDetail(residentId);
  };

  const handleMoveResidentDocument = async (documentId: string, folderId: string | null, residentId: string) => {
    const { error } = await supabase
      .from('Recanto_Documentos')
      .update({ folder_id: folderId })
      .eq('id', documentId);
    if (error) throw error;
    await fetchResidents();
    if (selectedResident?.id === residentId) await refreshSelectedResidentDetail(residentId);
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

  const handleDeleteFinancialRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Recanto_RegistrosFinanceiros')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchFinancials();
    } catch (err) {
      console.error('Error deleting financial record:', err);
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
      toast.error('Erro ao criar contrato.');
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
          expiration_date: newItem.expirationDate || null,
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
          shift_start: newEmployee.shiftStart || null,
          shift_end: newEmployee.shiftEnd || null,
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
        shiftStart: data.shift_start ? data.shift_start.slice(0, 5) : undefined,
        shiftEnd: data.shift_end ? data.shift_end.slice(0, 5) : undefined,
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
          shift_start: updatedEmployee.shiftStart || null,
          shift_end: updatedEmployee.shiftEnd || null,
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
        shiftStart: data.shift_start ? data.shift_start.slice(0, 5) : undefined,
        shiftEnd: data.shift_end ? data.shift_end.slice(0, 5) : undefined,
        status: data.status,
        admissionDate: data.admission_date
      };
      return mapped;
    } catch (err) {
      console.error('Error updating employee:', err);
      throw err;
    }
  };


  const handleDeleteEmployee = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('Recanto_Funcionarios')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
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

  const allAlerts = useMemo<AlertItem[]>(() => {
    const stockAlertItems: AlertItem[] = lowStockItems.map(item => ({
      id: `stock-${item.id}`,
      text: `Estoque crítico: ${item.name} (${item.quantity} ${item.unit})`,
      time: 'Agora',
      type: 'warning' as const,
    }));
    const medicationAlerts: AlertItem[] = residents.flatMap(resident =>
      (resident.medications || []).map(med => ({
        id: `med-${resident.id}-${med.id}`,
        text: `Prescrição: ${resident.name} - ${med.name} (${med.dosage})`,
        time: med.nextDose || '08:00',
        type: 'medication' as const,
      }))
    );
    return [...stockAlertItems, ...medicationAlerts].sort((a, b) => {
      if (a.time === 'Agora' && b.time !== 'Agora') return -1;
      if (b.time === 'Agora' && a.time !== 'Agora') return 1;
      return a.time.localeCompare(b.time);
    });
  }, [lowStockItems, residents]);

  const visibleAlerts = allAlerts.filter(a => !dismissedAlertIds.has(a.id));

  const handleClearAllAlerts = () => {
    setDismissedAlertIds(new Set(allAlerts.map(a => a.id)));
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
          <Dashboard
            residents={residents}
            financials={financials}
            events={events}
            stockAlerts={lowStockItems}
            invoices={invoices}
            employees={employees}
            onNavigate={navigateTo}
            isAdmin={currentUser?.profile.type === 'Administrador'}
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
            resident={residentForProfile}
            rooms={rooms}
            onBack={() => navigateTo(ViewState.RESIDENTS)}
            onUpdateResident={handleUpdateResident}
            onCreateFolder={handleCreateDocumentFolder}
            onRenameFolder={handleRenameDocumentFolder}
            onDeleteFolder={handleDeleteDocumentFolder}
            onMoveDocument={handleMoveResidentDocument}
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
            onDeleteRecord={handleDeleteFinancialRecord}
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
            onDeleteEmployee={handleDeleteEmployee}
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
            financials={financials}
            contracts={contracts}
            stockItems={stockItems}
            events={events}
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
      case ViewState.NOTIFICATIONS:
        return <NotificationsModule residents={residents} />;
      case ViewState.SETTINGS:
        return <SettingsModule />;
      case ViewState.PROFILE:
        return <UserProfile />;
      default:
        return <Dashboard residents={residents} financials={financials} invoices={invoices} employees={employees} onNavigate={navigateTo} isAdmin={currentUser?.profile.type === 'Administrador'} />;
    }
  };

  // Not logged in
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg mb-4 border border-white/20">
            <HeartPulse className="h-9 w-9 text-white" />
          </div>
          <p className="text-white text-xl font-bold tracking-tight mb-1">RecantoCare</p>
          <p className="text-blue-200 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <LandingPage />;

  // Gate de ativação: assinatura Asaas pendente ou trial expirado → bloqueia acesso interno.
  if (accessBlocked) {
    return (
      <>
        <PendingPaymentScreen
          mode={trialInfo?.isExpired ? 'trial_expired' : 'payment_pending'}
          onAssinar={() => setSubscriptionModalOpen(true)}
        />
        <SubscriptionModal
          isOpen={subscriptionModalOpen}
          onClose={() => setSubscriptionModalOpen(false)}
        />
      </>
    );
  }

  // Responsável: portal simplificado
  if (currentUser.profile.type === 'Responsável') {
    const summaryResident = residents.find(r => r.id === currentUser.residentId);
    const resident = portalResidentDetail && portalResidentDetail.id === currentUser.residentId
      ? portalResidentDetail
      : summaryResident;
    return <ResidentPortal resident={resident} events={events} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar
        currentView={currentView}
        onChangeView={navigateTo}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        stockAlertCount={lowStockItems.length}
      />

      <main className="flex-1 min-w-0 max-w-full lg:max-w-[calc(100vw-256px)] flex flex-col h-full overflow-hidden transition-all">
        {trialInfo?.isInTrial && !trialInfo.isExpired && (
          <TrialBanner
            daysRemaining={trialInfo.daysRemaining}
            onAssinar={() => setSubscriptionModalOpen(true)}
          />
        )}
        {/* Mobile Header - Sticky */}
        <div className="sticky top-0 z-20 lg:hidden px-4 py-3 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm select-none">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">RecantoCare</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
              {visibleAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full px-1 shadow-sm animate-pulse">
                  {visibleAlerts.length > 99 ? '99+' : visibleAlerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
              aria-label="Toggle Menu"
              id="mobile-menu-trigger-button"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Desktop Top Bar */}
        <div className="hidden lg:flex sticky top-0 z-20 px-8 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-100 items-center justify-between shadow-sm">
          {/* Left: Institution Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{companyName}</p>
              <p className="text-[11px] text-slate-400 truncate">Painel administrativo</p>
            </div>
          </div>

          {/* Right: Actions (Notifications & Profile) */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
              aria-label="Notificações"
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                {visibleAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full px-1 shadow-sm animate-pulse">
                    {visibleAlerts.length > 99 ? '99+' : visibleAlerts.length}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold">Alertas e Notificações</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative" id="profile-dropdown-container">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors select-none"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {userInitials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-400">{currentUser.profile.name}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-30">
                  <div className="px-4 py-3 border-b border-slate-100 text-left">
                    <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => { setProfileMenuOpen(false); navigateTo(ViewState.PROFILE); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left font-medium"
                  >
                    <UserCircle className="h-4 w-4 text-slate-400" /> Meu perfil
                  </button>
                  <button
                    onClick={() => { setProfileMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                  >
                    <LogOut className="h-4 w-4" /> Sair do sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>

      {showNotifications && (
        <NotificationsPanel
          alerts={visibleAlerts}
          onClose={() => setShowNotifications(false)}
          onClearAll={handleClearAllAlerts}
        />
      )}

      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
      />

      <ToastContainer />
    </div>
  );
}

function App() {
  if (window.location.pathname.startsWith('/superadmin')) {
    return <SuperAdminPanel />;
  }
  if (window.location.pathname.startsWith('/recursos')) {
    return <FeaturesRouter />;
  }
  if (window.location.pathname.startsWith('/demo')) {
    return <DemoApp />;
  }
  if (window.location.pathname.startsWith('/assinar') || window.location.pathname.startsWith('/checkout')) {
    return <CheckoutPage />;
  }
  if (window.location.pathname.startsWith('/reset-password')) {
    return <ResetPassword />;
  }
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;