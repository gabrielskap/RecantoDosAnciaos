import React, { useState, useRef } from 'react';
import { CalendarDays, Clock, MapPin, User, Plus, X, ChevronLeft, ChevronRight, Stethoscope, Users, Music, Activity } from 'lucide-react';
import { CalendarEvent, EventType, Resident } from '../types';
import CustomSelect from './CustomSelect';

interface AgendaModuleProps {
  events: CalendarEvent[];
  residents: Resident[];
  onAddEvent: (event: CalendarEvent) => void;
}

const eventConfig: Record<EventType | 'outro', { label: string; bg: string; text: string; dot: string }> = {
  medico:    { label: 'Médico',     bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400' },
  visita:    { label: 'Visita',     bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  terapia:   { label: 'Terapia',    bg: 'bg-blue-50',  text: 'text-blue-700',  dot: 'bg-blue-400' },
  atividade: { label: 'Atividade',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  reuniao:   { label: 'Reunião',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  outro:     { label: 'Outro',      bg: 'bg-slate-50',   text: 'text-slate-600',   dot: 'bg-slate-400' },
};

const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const weekDays  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const AgendaModule: React.FC<AgendaModuleProps> = ({ events, residents, onAddEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return localStorage.getItem('modal_agenda_open') === 'true';
  });
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const modalMouseDown = useRef(false);

  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>(() => {
    const saved = localStorage.getItem('modal_agenda_new_event');
    return saved ? JSON.parse(saved) : {
      title: '', type: 'atividade', start: '', end: '', residentId: '', location: '', description: '',
    };
  });

  React.useEffect(() => {
    if (isModalOpen) {
      localStorage.setItem('modal_agenda_open', 'true');
      localStorage.setItem('modal_agenda_new_event', JSON.stringify(newEvent));
    } else {
      localStorage.removeItem('modal_agenda_open');
      localStorage.removeItem('modal_agenda_new_event');
    }
  }, [isModalOpen, newEvent]);

  const daysInMonth  = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const getEventsForDay = (day: number) =>
    events.filter(e => {
      const d = new Date(e.start);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start) return;
    onAddEvent({
      id: Math.random().toString(36).substr(2, 9),
      title: newEvent.title!,
      start: new Date(newEvent.start).toISOString(),
      end: newEvent.end ? new Date(newEvent.end).toISOString() : undefined,
      type: newEvent.type as EventType,
      residentId: newEvent.residentId, location: newEvent.location,
      description: newEvent.description, createdBy: 'Usuário Atual',
    });
    setNewEvent({ title: '', type: 'atividade', start: '', end: '', residentId: '', location: '', description: '' });
  };

  const selectedEvents = events
    .filter(e => {
      if (filterType !== 'all' && e.type !== filterType) return false;
      const d = new Date(e.start);
      return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda e Atividades</h1>
          <p className="text-slate-500 text-sm mt-0.5">Consultas, visitas e rotinas</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo Evento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm shadow-blue-100/40 overflow-hidden">
          <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
              <ChevronLeft className="h-5 w-5 text-slate-500" />
            </button>
            <h2 className="font-bold text-slate-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100">
            {weekDays.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wide">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[88px] lg:auto-rows-[100px]">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`e-${i}`} className="border-b border-r border-slate-50 bg-slate-50/40" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
              const isSelected = day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth() && currentDate.getFullYear() === selectedDate.getFullYear();

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  className={`border-b border-r border-slate-50 p-2 cursor-pointer hover:bg-blue-50/40 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <span className={`text-sm font-semibold flex items-center justify-center w-6 h-6 rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : isSelected ? 'text-blue-600' : 'text-slate-600'}`}>
                    {day}
                  </span>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map(ev => {
                      const cfg = eventConfig[ev.type] ?? eventConfig.outro;
                      return (
                        <div key={ev.id} className={`text-[10px] truncate px-1.5 py-0.5 rounded-md font-medium ${cfg.bg} ${cfg.text}`}>
                          {new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && <div className="text-[10px] text-slate-400 font-medium px-1">+{dayEvents.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 flex flex-col overflow-hidden max-h-[600px] lg:max-h-none">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="font-bold text-slate-800">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="mt-2">
              <CustomSelect
                value={filterType}
                onChange={v => setFilterType(v as any)}
                options={[
                  { value: 'all', label: 'Todos os tipos' },
                  { value: 'medico', label: 'Médico', badge: { label: 'Médico', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' } },
                  { value: 'visita', label: 'Visita', badge: { label: 'Visita', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' } },
                  { value: 'terapia', label: 'Terapia', badge: { label: 'Terapia', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' } },
                  { value: 'atividade', label: 'Atividade', badge: { label: 'Atividade', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' } },
                  { value: 'reuniao', label: 'Reunião', badge: { label: 'Reunião', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' } },
                ]}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedEvents.length > 0 ? selectedEvents.map(ev => {
              const cfg = eventConfig[ev.type] ?? eventConfig.outro;
              return (
                <div key={ev.id} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.text.replace('text-', 'border-').replace('700', '100')}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                    <span className="text-xs font-medium text-slate-500">
                      {new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2">{ev.title}</h4>
                  {ev.description && <p className="text-xs text-slate-500 mb-2">{ev.description}</p>}
                  <div className="space-y-1">
                    {ev.residentId && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <User className="h-3 w-3" />
                        {residents.find(r => r.id === ev.residentId)?.name ?? 'Residente'}
                      </div>
                    )}
                    {ev.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="h-3 w-3" />
                        {ev.location}
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-blue-200" />
                </div>
                <p className="text-sm text-slate-400">Nenhum evento neste dia.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold text-slate-900">Novo Agendamento</h3>
                <p className="text-xs text-slate-500 mt-0.5">Preencha os dados do evento</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título</label>
                <input required type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} className={inputClass} placeholder="Ex: Consulta Dr. Pedro" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
                  <CustomSelect
                    value={newEvent.type || 'atividade'}
                    onChange={v => setNewEvent({ ...newEvent, type: v as any })}
                    options={[
                      { value: 'medico', label: 'Médico', badge: { label: 'Médico', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' } },
                      { value: 'visita', label: 'Visita Familiar', badge: { label: 'Visita', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' } },
                      { value: 'terapia', label: 'Terapia', badge: { label: 'Terapia', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' } },
                      { value: 'atividade', label: 'Atividade Social', badge: { label: 'Atividade', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' } },
                      { value: 'reuniao', label: 'Reunião', badge: { label: 'Reunião', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' } },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Local</label>
                  <input type="text" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} className={inputClass} placeholder="Sala 2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data e Hora de Início</label>
                <input required type="datetime-local" value={newEvent.start} onChange={e => setNewEvent({ ...newEvent, start: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Residente (opcional)</label>
                <CustomSelect
                  value={newEvent.residentId || ''}
                  onChange={v => setNewEvent({ ...newEvent, residentId: v })}
                  options={[
                    { value: '', label: 'Nenhum (evento geral)' },
                    ...residents.map(r => ({ value: r.id, label: r.name, desc: `Quarto ${r.room}` }))
                  ]}
                  placeholder="Selecione um residente..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição / Observações</label>
                <textarea rows={2} value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} className={inputClass + ' resize-none'} />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaModule;
