import React, { useState, useRef } from 'react';
import { CalendarDays, Clock, MapPin, User, Plus, X, ChevronLeft, ChevronRight, Stethoscope, Users, Music, Activity, Edit3, Trash2, ShieldAlert } from 'lucide-react';
import { CalendarEvent, EventType, Resident, ViewState } from '../types';
import CustomSelect from './CustomSelect';
import { useAuth } from '../contexts/AuthContext';

interface AgendaModuleProps {
  events: CalendarEvent[];
  residents: Resident[];
  onAddEvent: (event: CalendarEvent) => Promise<void>;
  onUpdateEvent: (event: CalendarEvent) => Promise<void>;
  onCancelEvent: (eventId: string, motivo: string) => Promise<void>;
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

// Converte um ISO datetime salvo de volta para o formato local exigido por
// <input type="datetime-local">. Mesmo truque de locale 'sv-SE' já usado em
// ResidentProfile.tsx (handleOpenGlicemiaModal).
const toDatetimeLocalValue = (iso: string): string =>
  new Date(iso).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);

const AgendaModule: React.FC<AgendaModuleProps> = ({ events, residents, onAddEvent, onUpdateEvent, onCancelEvent }) => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(ViewState.AGENDA, 'create');
  const canEdit   = hasPermission(ViewState.AGENDA, 'edit');
  const canDelete = hasPermission(ViewState.AGENDA, 'delete');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return localStorage.getItem('modal_agenda_open') === 'true';
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(() => {
    return localStorage.getItem('modal_agenda_editing_id') || null;
  });
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const modalMouseDown = useRef(false);

  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>(() => {
    const saved = localStorage.getItem('modal_agenda_new_event');
    return saved ? JSON.parse(saved) : {
      title: '', type: 'atividade', start: '', end: '', residentId: '', location: '', description: '',
    };
  });

  // Estado de confirmação de cancelamento — não persistido no localStorage
  // (mesmo padrão de `empToDelete` no TeamModule: uma confirmação destrutiva
  // não deve reaparecer sozinha depois de um reload).
  const [eventToCancel, setEventToCancel] = useState<CalendarEvent | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');

  React.useEffect(() => {
    if (isModalOpen) {
      localStorage.setItem('modal_agenda_open', 'true');
      localStorage.setItem('modal_agenda_new_event', JSON.stringify(newEvent));
      if (editingEventId) {
        localStorage.setItem('modal_agenda_editing_id', editingEventId);
      } else {
        localStorage.removeItem('modal_agenda_editing_id');
      }
    } else {
      localStorage.removeItem('modal_agenda_open');
      localStorage.removeItem('modal_agenda_new_event');
      localStorage.removeItem('modal_agenda_editing_id');
    }
  }, [isModalOpen, newEvent, editingEventId]);

  const daysInMonth  = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const getEventsForDay = (day: number) =>
    events.filter(e => {
      const d = new Date(e.start);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });

  const handleCreateEventClick = () => {
    setEditingEventId(null);
    setNewEvent({ title: '', type: 'atividade', start: '', end: '', residentId: '', location: '', description: '' });
    setIsModalOpen(true);
  };

  const handleEditEventClick = (ev: CalendarEvent) => {
    setEditingEventId(ev.id);
    setNewEvent({
      title: ev.title,
      type: ev.type,
      start: toDatetimeLocalValue(ev.start),
      end: ev.end ? toDatetimeLocalValue(ev.end) : '',
      residentId: ev.residentId || '',
      location: ev.location || '',
      description: ev.description || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseEventModal = () => {
    setIsModalOpen(false);
    setEditingEventId(null);
    setNewEvent({ title: '', type: 'atividade', start: '', end: '', residentId: '', location: '', description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start) return;
    const payload: CalendarEvent = {
      id: editingEventId || Math.random().toString(36).substr(2, 9),
      title: newEvent.title!,
      start: new Date(newEvent.start).toISOString(),
      end: newEvent.end ? new Date(newEvent.end).toISOString() : undefined,
      type: newEvent.type as EventType,
      residentId: newEvent.residentId, location: newEvent.location,
      description: newEvent.description, createdBy: 'Usuário Atual',
    };
    try {
      if (editingEventId) {
        await onUpdateEvent(payload);
      } else {
        await onAddEvent(payload);
      }
      handleCloseEventModal();
    } catch (err) {
      console.error('Error saving event:', err);
    }
  };

  const handleConfirmCancel = async () => {
    if (!eventToCancel || !cancelMotivo.trim()) return;
    try {
      await onCancelEvent(eventToCancel.id, cancelMotivo.trim());
    } catch (err) {
      console.error('Error cancelling event:', err);
    } finally {
      setEventToCancel(null);
      setCancelMotivo('');
    }
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
        {canCreate && (
          <button
            onClick={handleCreateEventClick}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Novo Evento
          </button>
        )}
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
                  {(canEdit || canDelete) && (
                    <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-end gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => handleEditEventClick(ev)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white/60 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Editar Evento"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setEventToCancel(ev)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white/60 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          title="Cancelar Evento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
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
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) handleCloseEventModal(); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold text-slate-900">{editingEventId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingEventId ? 'Atualize os dados do evento' : 'Preencha os dados do evento'}</p>
              </div>
              <button onClick={handleCloseEventModal} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
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
                <button type="button" onClick={handleCloseEventModal} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors">
                  {editingEventId ? 'Salvar Alterações' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {eventToCancel && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) { setEventToCancel(null); setCancelMotivo(''); } }}
        >
          <div
            className="bg-white sm:rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-xl shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Cancelar Evento</h3>
            </div>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja cancelar o evento{' '}
              <span className="font-semibold text-slate-800">{eventToCancel.title}</span>?
            </p>
            <p className="text-xs text-slate-400 italic">
              O evento deixará de aparecer na agenda. O registro é mantido internamente para histórico.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Motivo do Cancelamento *</label>
              <textarea
                required
                rows={3}
                value={cancelMotivo}
                onChange={e => setCancelMotivo(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                placeholder="Descreva o motivo do cancelamento..."
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => { setEventToCancel(null); setCancelMotivo(''); }}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelMotivo.trim()}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaModule;
