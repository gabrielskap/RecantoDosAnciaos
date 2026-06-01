import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, Plus, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { CalendarEvent, EventType, Resident } from '../types';

interface AgendaModuleProps {
  events: CalendarEvent[];
  residents: Resident[];
  onAddEvent: (event: CalendarEvent) => void;
}

const AgendaModule: React.FC<AgendaModuleProps> = ({ events, residents, onAddEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');

  // Form State
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    type: 'atividade',
    start: '',
    end: '',
    residentId: '',
    location: '',
    description: ''
  });

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const eDate = new Date(e.start);
      return eDate.getDate() === day && 
             eDate.getMonth() === currentDate.getMonth() && 
             eDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const getEventTypeColor = (type: EventType) => {
    switch(type) {
      case 'medico': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'visita': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'terapia': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'atividade': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'reuniao': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start || !newEvent.type) return;

    const event: CalendarEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title: newEvent.title!,
      start: newEvent.start!, // Should be full ISO string from input
      end: newEvent.end,
      type: newEvent.type as EventType,
      residentId: newEvent.residentId,
      location: newEvent.location,
      description: newEvent.description,
      createdBy: 'Usuário Atual'
    };

    onAddEvent(event);
    setIsModalOpen(false);
    setNewEvent({ title: '', type: 'atividade', start: '', end: '', residentId: '', location: '', description: '' });
  };

  // Filtered list for the sidebar
  const upcomingEvents = events
    .filter(e => {
      if (filterType !== 'all' && e.type !== filterType) return false;
      // If a date is selected, show events for that date. Else show upcoming.
      const eDate = new Date(e.start);
      return eDate.getDate() === selectedDate.getDate() && 
             eDate.getMonth() === selectedDate.getMonth() &&
             eDate.getFullYear() === selectedDate.getFullYear();
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda e Atividades</h1>
          <p className="text-slate-500">Controle de consultas, visitas e rotinas</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
             onClick={() => setIsModalOpen(true)}
             className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center w-full sm:w-auto"
           >
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CALENDAR GRID */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           {/* Calendar Header */}
           <div className="p-4 flex justify-between items-center border-b border-slate-200 bg-slate-50">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><ChevronLeft size={20} /></button>
              <h2 className="text-lg font-bold text-slate-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><ChevronRight size={20} /></button>
           </div>
           
           {/* Days Header */}
           <div className="grid grid-cols-7 border-b border-slate-200">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase">{day}</div>
              ))}
           </div>

           {/* Days Grid */}
           <div className="grid grid-cols-7 auto-rows-[100px] lg:auto-rows-[120px]">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="border-b border-r border-slate-100 bg-slate-50/50"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                const isSelected = day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth();

                return (
                  <div 
                    key={day} 
                    onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                    className={`border-b border-r border-slate-100 p-2 relative cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <span className={`text-sm font-medium block mb-1 ${isToday ? 'bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
                      {day}
                    </span>
                    <div className="space-y-1 overflow-hidden max-h-[70px]">
                      {dayEvents.map(ev => (
                        <div key={ev.id} className={`text-[10px] truncate px-1 rounded border-l-2 ${getEventTypeColor(ev.type)}`}>
                          {new Date(ev.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* SIDEBAR DETAILS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[600px] lg:max-h-[800px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
             <h3 className="font-semibold text-slate-800 mb-2">{selectedDate.toLocaleDateString()}</h3>
             <div className="flex items-center gap-2">
               <Filter size={14} className="text-slate-400" />
               <select 
                 value={filterType} 
                 onChange={(e) => setFilterType(e.target.value as any)}
                 className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 p-0"
               >
                 <option value="all">Todos os tipos</option>
                 <option value="medico">Médico</option>
                 <option value="visita">Visita</option>
                 <option value="terapia">Terapia</option>
                 <option value="atividade">Atividade</option>
                 <option value="reuniao">Reunião</option>
               </select>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {upcomingEvents.length > 0 ? (
               upcomingEvents.map(event => (
                 <div key={event.id} className="border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${getEventTypeColor(event.type)}`}>
                         {event.type}
                       </span>
                       <span className="text-xs text-slate-400">
                         {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm mb-1">{event.title}</h4>
                    {event.description && <p className="text-xs text-slate-500 mb-2">{event.description}</p>}
                    
                    <div className="space-y-1 pt-2 border-t border-slate-50">
                      {event.residentId && (
                        <div className="flex items-center text-xs text-slate-600">
                          <User size={12} className="mr-1.5" /> 
                          {residents.find(r => r.id === event.residentId)?.name || 'Residente'}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center text-xs text-slate-600">
                          <MapPin size={12} className="mr-1.5" /> 
                          {event.location}
                        </div>
                      )}
                    </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-10 text-slate-400">
                 <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                 <p className="text-sm">Nenhum evento para este dia.</p>
               </div>
             )}
          </div>
        </div>

      </div>

      {/* NEW EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Novo Agendamento</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                <input required type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ex: Consulta Dr. Pedro" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="medico">Médico</option>
                    <option value="visita">Visita Familiar</option>
                    <option value="terapia">Terapia</option>
                    <option value="atividade">Atividade Social</option>
                    <option value="reuniao">Reunião Interna</option>
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Local</label>
                   <input type="text" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ex: Sala 2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data e Hora Início</label>
                <input required type="datetime-local" value={newEvent.start} onChange={e => setNewEvent({...newEvent, start: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Residente (Opcional)</label>
                <select value={newEvent.residentId} onChange={e => setNewEvent({...newEvent, residentId: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Selecione...</option>
                  {residents.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Obs</label>
                <textarea rows={2} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 rounded-lg">Salvar Agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaModule;