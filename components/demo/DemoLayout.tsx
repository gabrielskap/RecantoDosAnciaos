import React, { useState, useEffect, useMemo } from 'react';
import { Rocket, X, Building2, Bell, ChevronDown, UserCircle, LogOut, Menu, HeartPulse } from 'lucide-react';
import { ViewState, Resident, FinancialRecord, Contract, Invoice, StockItem, Employee, TrainingRecord, SystemAccessLog, CalendarEvent, Room } from '../../types';
import { DemoAuthProvider } from '../../contexts/DemoAuthProvider';
import Sidebar from '../Sidebar';
import Dashboard from '../Dashboard';
import ResidentsList from '../ResidentsList';
import ResidentProfile from '../ResidentProfile';
import AgendaModule from '../AgendaModule';
import FinanceModule from '../FinanceModule';
import StockModule from '../StockModule';
import TeamModule from '../TeamModule';
import NutritionModule from '../NutritionModule';
import RoomsModule from '../RoomsModule';
import ReportsModule from '../ReportsModule';
import SettingsModule from '../SettingsModule';
import ToastContainer from '../ToastContainer';
import {
  DEMO_PROD_RESIDENTS,
  DEMO_PROD_EMPLOYEES,
  DEMO_PROD_FINANCIALS,
  DEMO_PROD_CONTRACTS,
  DEMO_PROD_INVOICES,
  DEMO_PROD_STOCK,
  DEMO_PROD_EVENTS,
  DEMO_PROD_TRAININGS,
  DEMO_PROD_ACCESS_LOGS,
  DEMO_ROOMS,
  DEMO_SYSTEM_SETTINGS,
} from '../../data/demoProductionData';
import { go, ROUTES } from '../../utils/navigation';

const SETTINGS_KEY = 'recanto_system_settings_demo-admin-user';

const DemoLayoutInner: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [showBanner, setShowBanner] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  // Local mock state — mutations update in-memory (no persistence)
  const [residents, setResidents] = useState<Resident[]>(DEMO_PROD_RESIDENTS);
  const [financials, setFinancials] = useState<FinancialRecord[]>(DEMO_PROD_FINANCIALS);
  const [contracts, setContracts] = useState<Contract[]>(DEMO_PROD_CONTRACTS);
  const [invoices, setInvoices] = useState<Invoice[]>(DEMO_PROD_INVOICES);
  const [stockItems, setStockItems] = useState<StockItem[]>(DEMO_PROD_STOCK);
  const [employees, setEmployees] = useState<Employee[]>(DEMO_PROD_EMPLOYEES);
  const [trainings, setTrainings] = useState<TrainingRecord[]>(DEMO_PROD_TRAININGS);
  const [accessLogs, setAccessLogs] = useState<SystemAccessLog[]>(DEMO_PROD_ACCESS_LOGS);
  const [events, setEvents] = useState<CalendarEvent[]>(DEMO_PROD_EVENTS);
  const [rooms, setRooms] = useState<Room[]>(DEMO_ROOMS);

  // Pre-populate localStorage so SettingsModule can load data (always overwrite demo key)
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEMO_SYSTEM_SETTINGS));
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const container = document.getElementById('demo-profile-dropdown');
      if (container && !container.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [profileMenuOpen]);

  const lowStockItems = useMemo(() => stockItems.filter(i => i.quantity < i.minThreshold), [stockItems]);

  const navigateTo = (view: ViewState, residentId?: string) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
    if (view === ViewState.RESIDENT_DETAIL && residentId) {
      const found = residents.find(r => r.id === residentId) ?? null;
      setSelectedResident(found);
    } else {
      setSelectedResident(null);
    }
  };

  // ── Mock handlers (update local state) ──────────────────────────────────────

  const handleAddResident = async (r: Resident) => {
    setResidents(prev => [...prev, { ...r, id: `r-demo-${Date.now()}` }]);
  };

  const handleUpdateResident = async (updated: Resident) => {
    setResidents(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (selectedResident?.id === updated.id) setSelectedResident(updated);
  };

  const handleAddFinancialRecord = async (rec: FinancialRecord) => {
    setFinancials(prev => [...prev, { ...rec, id: `f-demo-${Date.now()}` }]);
  };

  const handleAddContract = async (c: Contract) => {
    setContracts(prev => [...prev, { ...c, id: `c-demo-${Date.now()}` }]);
  };

  const handleUpdateInvoice = async (updated: Invoice) => {
    setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
  };

  const handleUpdateStock = async (id: string, qty: number) => {
    setStockItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const handleAddStockItem = async (item: StockItem) => {
    setStockItems(prev => [...prev, { ...item, id: `s-demo-${Date.now()}` }]);
  };

  const handleAddEmployee = async (emp: Omit<Employee, 'id'>): Promise<Employee> => {
    const newEmp = { ...emp, id: `e-demo-${Date.now()}` } as Employee;
    setEmployees(prev => [...prev, newEmp]);
    return newEmp;
  };

  const handleUpdateEmployee = async (emp: Employee): Promise<Employee> => {
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
    return emp;
  };

  const handleAddTraining = async (t: TrainingRecord) => {
    setTrainings(prev => [...prev, { ...t, id: `tr-demo-${Date.now()}` }]);
  };

  const handleAddAccessLog = async (log: SystemAccessLog) => {
    setAccessLogs(prev => [{ ...log, id: `al-demo-${Date.now()}` }, ...prev]);
  };

  const handleAddEvent = async (ev: CalendarEvent) => {
    setEvents(prev => [...prev, { ...ev, id: `ev-demo-${Date.now()}` }]);
  };

  const handleAddRoom = async (room: Room) => {
    setRooms(prev => [...prev, { ...room, id: `q-demo-${Date.now()}` }]);
  };

  const handleUpdateRoom = async (updated: Room) => {
    setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handleDeleteRoom = async (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  // ── Screen renderer ──────────────────────────────────────────────────────────

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
          />
        );

      case ViewState.RESIDENTS:
        return (
          <ResidentsList
            residents={residents}
            rooms={rooms}
            onSelectResident={r => navigateTo(ViewState.RESIDENT_DETAIL, r.id)}
            onAddResident={handleAddResident}
            onUpdateResident={handleUpdateResident}
          />
        );

      case ViewState.RESIDENT_DETAIL:
        if (!selectedResident) {
          return (
            <ResidentsList
              residents={residents}
              rooms={rooms}
              onSelectResident={r => navigateTo(ViewState.RESIDENT_DETAIL, r.id)}
              onAddResident={handleAddResident}
              onUpdateResident={handleUpdateResident}
            />
          );
        }
        return (
          <ResidentProfile
            resident={selectedResident}
            rooms={rooms}
            onBack={() => navigateTo(ViewState.RESIDENTS)}
            onUpdateResident={handleUpdateResident}
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

      case ViewState.AGENDA:
        return (
          <AgendaModule
            events={events}
            residents={residents}
            onAddEvent={handleAddEvent}
          />
        );

      case ViewState.NUTRITION:
        return (
          <NutritionModule
            residents={residents}
            onUpdateResident={handleUpdateResident}
          />
        );

      case ViewState.TEAM:
        return (
          <TeamModule
            employees={employees}
            trainings={trainings}
            accessLogs={accessLogs}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onAddTraining={handleAddTraining}
            residents={residents}
            onAddAccessLog={handleAddAccessLog}
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

      case ViewState.STOCK:
        return (
          <StockModule
            items={stockItems}
            residents={residents}
            onUpdateStock={handleUpdateStock}
            onAddItem={handleAddStockItem}
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

      case ViewState.SETTINGS:
        return <SettingsModule />;

      default:
        return (
          <Dashboard
            residents={residents}
            financials={financials}
            events={events}
            stockAlerts={lowStockItems}
            invoices={invoices}
            employees={employees}
            onNavigate={navigateTo}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans">
      {/* Demo banner */}
      {showBanner && (
        <div className="bg-amber-400 text-slate-900 px-4 py-2.5 flex items-center justify-between z-40 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Rocket className="h-4 w-4 flex-shrink-0" />
            <span className="font-semibold text-sm truncate">
              Modo Demonstração — explore à vontade, os dados são fictícios e não são salvos
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <button
              onClick={() => go(ROUTES.subscribe)}
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

      <div className="flex flex-1 min-h-0 bg-slate-50">
        {/* Real Sidebar — uses DemoAuthProvider context */}
        <Sidebar
          currentView={currentView}
          onChangeView={navigateTo}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          stockAlertCount={lowStockItems.length}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <div className="sticky top-0 z-20 lg:hidden px-4 py-3 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <HeartPulse className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-slate-900 tracking-tight">RecantoCare</span>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
              aria-label="Toggle Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop topbar */}
          <div className="hidden lg:flex sticky top-0 z-20 px-8 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-100 items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-800 truncate leading-tight">Vila Serena</p>
                <p className="text-[11px] text-slate-400 truncate">Painel administrativo</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600">
                <div className="relative">
                  <Bell className="h-5 w-5" />
                  {lowStockItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full px-1 shadow-sm animate-pulse">
                      {lowStockItems.length}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold">Alertas e Notificações</span>
              </div>

              <div className="relative" id="demo-profile-dropdown">
                <button
                  onClick={() => setProfileMenuOpen(v => !v)}
                  className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    RA
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">Ricardo</p>
                    <p className="text-[11px] text-slate-400">Administrador</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-30">
                    <div className="px-4 py-3 border-b border-slate-100 text-left">
                      <p className="text-sm font-semibold text-slate-800">Ricardo</p>
                      <p className="text-xs text-slate-400">admin@recantoanciaos.com.br</p>
                    </div>
                    <button
                      onClick={() => { setProfileMenuOpen(false); navigateTo(ViewState.SETTINGS); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left font-medium"
                    >
                      <UserCircle className="h-4 w-4 text-slate-400" /> Configurações
                    </button>
                    <button
                      onClick={() => { setProfileMenuOpen(false); onLogout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                    >
                      <LogOut className="h-4 w-4" /> Sair da demonstração
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
            {renderContent()}
          </main>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

const DemoLayout: React.FC<{ onLogout: () => void }> = ({ onLogout }) => (
  <DemoAuthProvider onLogout={onLogout}>
    <DemoLayoutInner onLogout={onLogout} />
  </DemoAuthProvider>
);

export default DemoLayout;
