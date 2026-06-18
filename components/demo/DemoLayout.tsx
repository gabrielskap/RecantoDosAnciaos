import React, { useState } from 'react';
import { Rocket, X } from 'lucide-react';
import DemoSidebar from './DemoSidebar';
import DemoTopbar from './DemoTopbar';
import ScreenSkeleton from './components/Skeleton';
import type { DemoScreen } from './types';
import { DEMO_NOTIFICATIONS, type DemoNotification } from '../../data/demoData';
import { go, ROUTES } from '../../utils/navigation';
import DemoDashboard from './screens/DemoDashboard';
import DemoResidents from './screens/DemoResidents';
import DemoUsers from './screens/DemoUsers';
import DemoFinance from './screens/DemoFinance';
import DemoReports from './screens/DemoReports';
import DemoNotifications from './screens/DemoNotifications';
import DemoProfile from './screens/DemoProfile';
import DemoSettings from './screens/DemoSettings';

const DemoLayout: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [screen, setScreen] = useState<DemoScreen>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [notifications, setNotifications] = useState<DemoNotification[]>(DEMO_NOTIFICATIONS);

  const unread = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(ns => ns.map(n => (n.id === id ? { ...n, read: true } : n)));

  // Troca de tela com simulação de carregamento (estado "carregando").
  const changeScreen = (s: DemoScreen) => {
    setScreen(s);
    setLoading(true);
    window.scrollTo(0, 0);
    setTimeout(() => setLoading(false), 500);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <DemoDashboard onNavigate={changeScreen} />;
      case 'residents': return <DemoResidents />;
      case 'users': return <DemoUsers />;
      case 'finance': return <DemoFinance />;
      case 'reports': return <DemoReports />;
      case 'notifications': return <DemoNotifications notifications={notifications} onMarkAllRead={markAllRead} onMarkRead={markRead} />;
      case 'profile': return <DemoProfile />;
      case 'settings': return <DemoSettings />;
      default: return <DemoDashboard onNavigate={changeScreen} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans">
      {/* Banner de demonstração */}
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
            <button onClick={() => setShowBanner(false)} className="text-slate-700 hover:text-slate-900 transition-colors" aria-label="Fechar banner">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <DemoSidebar current={screen} onChange={changeScreen} isOpen={sidebarOpen} setOpen={setSidebarOpen} unread={unread} onLogout={onLogout} />

        <div className="flex-1 flex flex-col min-w-0">
          <DemoTopbar
            notifications={notifications}
            unread={unread}
            onOpenSidebar={() => setSidebarOpen(true)}
            onNavigate={changeScreen}
            onLogout={onLogout}
          />
          <main className="flex-1 bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {loading ? <ScreenSkeleton /> : renderScreen()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DemoLayout;
