import React, { useState } from 'react';
import {
  HeartPulse, LogOut, User, CalendarDays, ClipboardList, Activity,
  CheckCircle2, Circle, Thermometer, Heart, Wind, Droplets,
  MapPin, Clock, ChevronRight, Stethoscope, Dumbbell, Music,
  Users, CalendarCheck, AlertCircle, Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Resident, CalendarEvent } from '../types';

interface ResidentPortalProps {
  resident: Resident | undefined;
  events: CalendarEvent[];
}

type TabId = 'today' | 'agenda' | 'evolution' | 'profile';

const ResidentPortal: React.FC<ResidentPortalProps> = ({ resident, events }) => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('today');

  if (!resident) {
    return (
      <div className="min-h-screen bg-[#F7F3FF] flex flex-col items-center justify-center gap-3 p-6">
        <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-violet-400" />
        </div>
        <p className="text-slate-600 font-medium text-center">Nenhum residente vinculado a esta conta.</p>
        <button onClick={logout} className="mt-2 text-sm text-violet-600 underline underline-offset-2">Sair</button>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayChecklist = resident.dailyChecklists?.find(c => c.date === todayStr)
    ?? resident.dailyChecklists?.[resident.dailyChecklists.length - 1];

  const recentVitals = resident.vitals?.slice(-3).reverse() ?? [];
  const latestVital = recentVitals[0];

  const upcomingEvents = events
    .filter(e => e.residentId === resident.id && e.start >= new Date().toISOString())
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6);

  const recentNotes = resident.auditLogs?.slice(-6).reverse() ?? [];

  const checklistItems = todayChecklist ? [
    { label: 'Banho e Higiene', done: todayChecklist.hygiene, icon: Droplets },
    { label: 'Higiene Oral', done: todayChecklist.oralCare, icon: CheckCircle2 },
    { label: 'Alimentação', done: todayChecklist.feeding, icon: CheckCircle2 },
    { label: 'Hidratação', done: todayChecklist.hydration, icon: Droplets },
    { label: 'Mobilização', done: todayChecklist.mobility, icon: Dumbbell },
    { label: 'Lazer e Social', done: todayChecklist.leisure, icon: Music },
  ] : [];

  const doneTasks = checklistItems.filter(i => i.done).length;
  const totalTasks = checklistItems.length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const eventConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Stethoscope }> = {
    medico:   { label: 'Consulta',  color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-100',    icon: Stethoscope },
    visita:   { label: 'Visita',    color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100',    icon: Users },
    terapia:  { label: 'Terapia',   color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-100',icon: Activity },
    atividade:{ label: 'Atividade', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: Music },
    reuniao:  { label: 'Reunião',   color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100',  icon: Users },
    outro:    { label: 'Outro',     color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-100',  icon: CalendarCheck },
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const tabs: { id: TabId; label: string; icon: typeof ClipboardList }[] = [
    { id: 'today',     label: 'Hoje',    icon: ClipboardList },
    { id: 'agenda',    label: 'Agenda',  icon: CalendarDays },
    { id: 'evolution', label: 'Evolução',icon: Activity },
    { id: 'profile',   label: 'Perfil',  icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3FF] flex flex-col">

      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-violet-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm">
            <HeartPulse className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm text-slate-800 tracking-tight">Recanto dos Anciãos</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-500 hidden sm:block">{currentUser?.name}</span>
          <button
            onClick={logout}
            aria-label="Sair do sistema"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-full transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* ── HERO CARD ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 px-4 pt-6 pb-16 mx-0">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-4 right-16 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative max-w-2xl mx-auto flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={resident.photoUrl || `https://picsum.photos/80/80?random=${resident.id}`}
              alt={resident.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-xl"
            />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center shadow-sm" title="Residente ativo">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-violet-200 text-xs font-medium tracking-widest uppercase mb-0.5">Seu familiar</p>
            <h1 className="text-white text-xl font-bold leading-tight truncate">{resident.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              <span className="flex items-center gap-1 text-violet-200 text-xs">
                <MapPin className="h-3 w-3" />
                Quarto {resident.room}
              </span>
              <span className="flex items-center gap-1 text-violet-200 text-xs">
                <HeartPulse className="h-3 w-3" />
                Cuidado Nível {resident.careLevel}
              </span>
              <span className="text-violet-200 text-xs">{resident.age} anos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK METRICS (overlap hero) ── */}
      <div className="relative z-10 -mt-10 px-4 max-w-2xl mx-auto w-full">
        {latestVital ? (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Pressão',  value: latestVital.bp,         unit: '',     icon: Heart,       color: 'text-rose-500',    bg: 'bg-rose-50' },
              { label: 'Freq. Card.', value: String(latestVital.hr), unit: 'bpm', icon: Activity,    color: 'text-violet-500',  bg: 'bg-violet-50' },
              { label: 'Temp.',    value: String(latestVital.temp), unit: '°C',  icon: Thermometer, color: 'text-amber-500',   bg: 'bg-amber-50' },
              { label: 'SpO₂',    value: String(latestVital.spo2), unit: '%',   icon: Wind,        color: 'text-teal-500',    bg: 'bg-teal-50' },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-2xl p-3 shadow-lg shadow-violet-100/60 flex flex-col items-center text-center gap-1.5">
                <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center`}>
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                </div>
                <span className={`text-base font-bold leading-none ${m.color}`}>{m.value}<span className="text-[10px] font-medium text-slate-400 ml-0.5">{m.unit}</span></span>
                <span className="text-[10px] text-slate-400 font-medium leading-none">{m.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-violet-100/60 flex items-center gap-3">
            <Info className="h-5 w-5 text-slate-300 shrink-0" />
            <p className="text-sm text-slate-400">Nenhum sinal vital registrado ainda.</p>
          </div>
        )}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-5 pb-28 space-y-4">

        {/* ── TODAY ── */}
        {activeTab === 'today' && (
          <>
            {/* Checklist Card */}
            <section className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 overflow-hidden">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">Cuidados de Hoje</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  {totalTasks > 0 && (
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${progressPct === 100 ? 'text-emerald-500' : 'text-violet-600'}`}>
                        {progressPct}%
                      </span>
                      <p className="text-xs text-slate-400">concluído</p>
                    </div>
                  )}
                </div>

                {totalTasks > 0 && (
                  <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${progressPct === 100 ? 'bg-emerald-400' : 'bg-violet-500'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>

              {checklistItems.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {checklistItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                      {item.done
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        : <Circle className="h-5 w-5 text-slate-200 shrink-0" />}
                      <span className={`text-sm font-medium ${item.done ? 'text-slate-700' : 'text-slate-400'}`}>
                        {item.label}
                      </span>
                      {item.done && (
                        <span className="ml-auto text-[11px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Feito</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 pb-5 flex items-center gap-2 text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Checklist de hoje ainda não preenchido pela equipe.</span>
                </div>
              )}
            </section>

            {/* Vitals history */}
            {recentVitals.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 overflow-hidden">
                <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">Sinais Vitais</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Últimas medições registradas</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                    <Heart className="h-4 w-4 text-rose-500" />
                  </div>
                </div>

                <div className="px-5 pb-5 space-y-2.5 mt-2">
                  {recentVitals.map((v, i) => (
                    <div key={i} className="bg-slate-50/80 rounded-xl p-3.5">
                      <p className="text-[11px] text-slate-400 font-medium mb-2.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(v.timestamp)}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Pressão',  value: v.bp,         unit: '',    color: 'text-rose-600' },
                          { label: 'FC',       value: `${v.hr}`,    unit: 'bpm', color: 'text-violet-600' },
                          { label: 'Temp.',    value: `${v.temp}`,  unit: '°C',  color: 'text-amber-600' },
                          { label: 'SpO₂',    value: `${v.spo2}`,  unit: '%',   color: 'text-teal-600' },
                        ].map(m => (
                          <div key={m.label} className="text-center">
                            <p className={`text-sm font-bold ${m.color}`}>{m.value}<span className="text-[10px] text-slate-400 ml-0.5">{m.unit}</span></p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── AGENDA ── */}
        {activeTab === 'agenda' && (
          <section className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Próximos Eventos</h2>
                <p className="text-xs text-slate-400 mt-0.5">Agenda de {resident.name.split(' ')[0]}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-blue-500" />
              </div>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {upcomingEvents.map(ev => {
                  const cfg = eventConfig[ev.type] ?? eventConfig.outro;
                  const IconComp = cfg.icon;
                  return (
                    <div key={ev.id} className="px-5 py-4 flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl border ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <IconComp className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 leading-snug">{ev.title}</p>
                          <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatShortDate(ev.start)}
                          {ev.location && <> · <MapPin className="h-3 w-3 shrink-0 ml-0.5" />{ev.location}</>}
                        </p>
                        {ev.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 pb-6 pt-2 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <CalendarCheck className="h-7 w-7 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Nenhum evento agendado</p>
                  <p className="text-xs text-slate-400 mt-0.5">A agenda está livre por enquanto.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── EVOLUTION ── */}
        {activeTab === 'evolution' && (
          <section className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Notas de Evolução</h2>
                <p className="text-xs text-slate-400 mt-0.5">Registros da equipe de cuidados</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                <Activity className="h-4 w-4 text-violet-500" />
              </div>
            </div>

            {recentNotes.length > 0 ? (
              <div className="px-5 pb-5 pt-2">
                <div className="relative">
                  {/* vertical line */}
                  <div className="absolute left-[17px] top-2 bottom-2 w-px bg-violet-100" />

                  <div className="space-y-5">
                    {recentNotes.map((log, i) => (
                      <div key={log.id} className="flex items-start gap-3.5">
                        <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${i === 0 ? 'bg-violet-600 shadow-md shadow-violet-200' : 'bg-violet-50'}`}>
                          <Activity className={`h-4 w-4 ${i === 0 ? 'text-white' : 'text-violet-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0 bg-slate-50/80 rounded-xl p-3.5">
                          <p className="text-sm font-semibold text-slate-800 leading-snug">{log.action}</p>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{log.details}</p>
                          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            <span className="mx-1">·</span>
                            {log.userName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 pb-6 pt-2 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <Activity className="h-7 w-7 text-violet-200" />
                </div>
                <p className="text-sm text-slate-400">Nenhuma nota registrada ainda.</p>
              </div>
            )}
          </section>
        )}

        {/* ── PROFILE ── */}
        {activeTab === 'profile' && (
          <>
            <section className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="font-bold text-slate-800 text-base">Dados do Residente</h2>
                <p className="text-xs text-slate-400 mt-0.5">Informações de cadastro</p>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { label: 'Nome completo',   value: resident.name },
                  { label: 'Idade',           value: `${resident.age} anos` },
                  { label: 'Nascimento',      value: resident.birthDate ? new Date(resident.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—' },
                  { label: 'Quarto',          value: resident.room },
                  { label: 'Nível de cuidado',value: `Grau ${resident.careLevel}` },
                  { label: 'Admissão',        value: new Date(resident.admissionDate + 'T00:00:00').toLocaleDateString('pt-BR') },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3.5 gap-4">
                    <span className="text-sm text-slate-500">{row.label}</span>
                    <span className="text-sm font-semibold text-slate-800 text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            {resident.dietPlan && (
              <section className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-5">
                <h2 className="font-bold text-slate-800 text-base mb-3">Plano Alimentar</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: resident.dietPlan.consistency, color: 'bg-teal-50 text-teal-700' },
                    { label: resident.dietPlan.type, color: 'bg-violet-50 text-violet-700' },
                    ...resident.dietPlan.restrictions.map(r => ({ label: r, color: 'bg-rose-50 text-rose-600' })),
                  ].map((tag, i) => (
                    <span key={i} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${tag.color}`}>{tag.label}</span>
                  ))}
                </div>
                {resident.dietPlan.fluidRestriction && (
                  <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                    <Droplets className="h-3.5 w-3.5 text-blue-400" />
                    Restrição hídrica: {resident.dietPlan.fluidRestriction}
                  </p>
                )}
              </section>
            )}

            {resident.allergies && resident.allergies.length > 0 && (
              <section className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  <h2 className="font-bold text-rose-700 text-sm">Alergias Registradas</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resident.allergies.map(a => (
                    <span key={a} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-100 text-rose-700">{a}</span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ── BOTTOM NAVIGATION ── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-t border-violet-100 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex items-center">
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-all ${active ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all ${active ? 'bg-violet-100' : ''}`}>
                  <tab.icon className="h-5 w-5" />
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-600" />
                  )}
                </div>
                <span className={`text-[11px] font-semibold leading-none ${active ? 'text-violet-600' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default ResidentPortal;
