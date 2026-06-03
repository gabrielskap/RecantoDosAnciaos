import React, { useState } from 'react';
import { Users, Calendar, Award, Shield, Plus, X, Search, CheckCircle, AlertOctagon } from 'lucide-react';
import { Employee, TrainingRecord, SystemAccessLog, UserRole } from '../types';
import ProfileManager from './ProfileManager';
import { useAuth } from '../contexts/AuthContext';

interface TeamModuleProps {
  employees: Employee[];
  trainings: TrainingRecord[];
  accessLogs: SystemAccessLog[];
  onAddEmployee: (emp: Employee) => void;
  onAddTraining: (training: TrainingRecord) => void;
}

const TeamModule: React.FC<TeamModuleProps> = ({ employees, trainings, accessLogs, onAddEmployee, onAddTraining }) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.profile.type === 'Administrador';
  const [activeTab, setActiveTab] = useState<'employees' | 'schedule' | 'training' | 'logs' | 'profiles'>('employees');
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isTrainModalOpen, setIsTrainModalOpen] = useState(false);

  // New Employee Form State
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    name: '',
    role: 'Cuidador',
    cpf: '',
    email: '',
    phone: '',
    shift: 'Matutino',
    isTechnicalLead: false,
    status: 'Ativo'
  });

  // New Training Form State
  const [newTrain, setNewTrain] = useState<Partial<TrainingRecord>>({
    title: '',
    instructor: '',
    date: '',
    description: '',
    validUntil: ''
  });

  const handleEmpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.cpf) return;
    
    const employee: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      name: newEmp.name!,
      role: newEmp.role as UserRole,
      cpf: newEmp.cpf!,
      email: newEmp.email || '',
      phone: newEmp.phone || '',
      registrationNumber: newEmp.registrationNumber,
      isTechnicalLead: newEmp.isTechnicalLead || false,
      shift: newEmp.shift as any,
      status: 'Ativo',
      admissionDate: new Date().toISOString()
    };

    onAddEmployee(employee);
    setIsEmpModalOpen(false);
    setNewEmp({ name: '', role: 'Cuidador', cpf: '', email: '', phone: '', shift: 'Matutino', isTechnicalLead: false });
  };

  const handleTrainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrain.title || !newTrain.date) return;

    const training: TrainingRecord = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTrain.title!,
      date: newTrain.date!,
      instructor: newTrain.instructor!,
      participants: [], // In a real app, select multiple participants
      description: newTrain.description || '',
      validUntil: newTrain.validUntil
    };

    onAddTraining(training);
    setIsTrainModalOpen(false);
    setNewTrain({ title: '', instructor: '', date: '', description: '', validUntil: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Equipe</h1>
          <p className="text-slate-500">Colaboradores, Escalas e Controle de Acesso</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex overflow-x-auto">
        {[
          { id: 'employees', label: 'Colaboradores', icon: Users },
          { id: 'schedule', label: 'Escalas de Trabalho', icon: Calendar },
          { id: 'training', label: 'Treinamentos', icon: Award },
          { id: 'logs', label: 'Logs de Acesso (LGPD)', icon: Shield },
          ...(isAdmin ? [{ id: 'profiles', label: 'Perfis & Permissões', icon: Shield }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-100 text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
        
        {/* EMPLOYEES TAB */}
        {activeTab === 'employees' && (
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar colaborador..." 
                  className="w-full pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button 
                onClick={() => setIsEmpModalOpen(true)}
                className="flex items-center justify-center bg-primary-600 text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium hover:bg-primary-700 active:scale-95 transition-all shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Colaborador
              </button>
            </div>

            {/* Responsive Dual Layout */}
            {/* Mobile Card List View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {employees.map((emp) => (
                <div key={emp.id} className="bg-slate-50 p-4 border border-slate-200 rounded-xl relative shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-800 text-[15px]">{emp.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-medium text-slate-600 shadow-sm">{emp.role}</span>
                        {emp.isTechnicalLead && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">Resp. Técnico</span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${
                      emp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-855 border border-emerald-200' : 'bg-amber-100 text-amber-855 border border-amber-200'
                    }`}>
                      {emp.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs border-t border-slate-200 pt-3">
                    <div>
                      <span className="text-slate-400 block font-medium">Turno</span>
                      <span className="font-semibold text-slate-700">{emp.shift}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Registro</span>
                      <span className="text-slate-700 font-semibold">{emp.registrationNumber || '-'}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm text-slate-600">
                    <p className="font-medium truncate"><span className="text-slate-400 mr-1 font-normal animate-none">Email:</span> {emp.email}</p>
                    <p className="font-medium mt-0.5"><span className="text-slate-400 mr-1 font-normal animate-none">Tel:</span> {emp.phone}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Nome / Cargo</th>
                    <th className="px-4 py-3">Registro</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Turno</th>
                    <th className="px-4 py-3 text-center rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-800">{emp.name}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{emp.role}</span>
                             {emp.isTechnicalLead && (
                               <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-medium">Resp. Técnico</span>
                             )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{emp.registrationNumber || '-'}</td>
                      <td className="px-4 py-3 text-xs">
                        <p>{emp.email}</p>
                        <p className="text-slate-400">{emp.phone}</p>
                      </td>
                      <td className="px-4 py-3">{emp.shift}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="p-6">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-slate-800">Escala Semanal Vigente</h3>
                <button className="text-primary-600 text-sm font-medium hover:underline">Imprimir Escala</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Matutino (07h-13h)', 'Vespertino (13h-19h)', 'Noturno (19h-07h)'].map((shift) => (
                  <div key={shift} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-primary-500" /> {shift}
                    </h4>
                    <ul className="space-y-2">
                      {employees.filter(e => shift.includes(e.shift) || (e.shift === '12x36' && shift.includes('Noturno'))).map(e => (
                        <li key={e.id} className="bg-white p-2 rounded shadow-sm border border-slate-100 flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-800">{e.name}</span>
                          <span className="text-xs text-slate-500">{e.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* TRAINING TAB */}
        {activeTab === 'training' && (
           <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-slate-800">Histórico de Capacitações</h3>
                <button 
                  onClick={() => setIsTrainModalOpen(true)}
                  className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
                >
                  Registrar Treinamento
                </button>
              </div>
              
              <div className="grid gap-4">
                 {trainings.map(t => (
                   <div key={t.id} className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-white hover:bg-slate-50 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center">
                          <Award className="h-5 w-5 mr-2 text-amber-500" />
                          {t.title}
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">{t.description}</p>
                        <p className="text-xs text-slate-400 mt-2">Instrutor: {t.instructor} • Data: {new Date(t.date).toLocaleDateString()}</p>
                      </div>
                      <div className="mt-4 md:mt-0 text-right">
                         <p className="text-sm font-medium text-slate-700">{t.participants.length} Participantes</p>
                         {t.validUntil && (
                           <p className="text-xs text-rose-500 mt-1">Válido até: {new Date(t.validUntil).toLocaleDateString()}</p>
                         )}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
           <div className="p-0">
             <div className="p-6 bg-slate-50 border-b border-slate-200">
               <div className="flex items-start gap-4">
                 <div className="p-3 bg-blue-100 rounded-full text-blue-700">
                   <Shield className="h-6 w-6" />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">Auditoria de Acessos (LGPD)</h3>
                   <p className="text-sm text-slate-600 max-w-2xl">
                     Registro imutável de todas as ações sensíveis no sistema. O acesso a estes dados é restrito a Administradores.
                   </p>
                 </div>
               </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs text-slate-600 font-mono">
                 <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                   <tr>
                     <th className="px-6 py-3">Data/Hora</th>
                     <th className="px-6 py-3">Usuário</th>
                     <th className="px-6 py-3">Função</th>
                     <th className="px-6 py-3">Ação</th>
                     <th className="px-6 py-3">IP</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {accessLogs.map((log) => (
                     <tr key={log.id} className="hover:bg-slate-50">
                       <td className="px-6 py-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                       <td className="px-6 py-3 font-medium text-slate-900">{log.userName}</td>
                       <td className="px-6 py-3">{log.role}</td>
                       <td className="px-6 py-3">
                         <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-700">{log.action}</span>
                         {log.resource && <span className="ml-2 text-slate-400">({log.resource})</span>}
                       </td>
                       <td className="px-6 py-3">{log.ipAddress}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
         )}

        {/* PROFILES TAB */}
        {activeTab === 'profiles' && isAdmin && (
          <div className="p-6">
            <ProfileManager />
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black bg-opacity-65">
          <div className="bg-white rounded-none sm:rounded-xl shadow-lg max-w-lg w-full h-full sm:h-auto overflow-y-auto sm:overflow-hidden flex flex-col">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
               <h3 className="font-semibold text-slate-800">Novo Colaborador</h3>
               <button 
                 onClick={() => setIsEmpModalOpen(false)}
                 className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors"
                 aria-label="Close"
               >
                 <X className="h-5 w-5 text-slate-400" />
               </button>
             </div>
             <form onSubmit={handleEmpSubmit} className="p-6 space-y-4 flex-1">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                   <input required type="text" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Função (Perfil)</label>
                    <select value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value as any})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white">
                       <option value="Admin">Admin</option>
                       <option value="Enfermeiro">Enfermeiro</option>
                       <option value="Cuidador">Cuidador</option>
                       <option value="Médico">Médico</option>
                       <option value="Nutricionista">Nutricionista</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                    <input required type="text" value={newEmp.cpf} onChange={e => setNewEmp({...newEmp, cpf: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                  </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Nº Registro (CRM/COREN)</label>
                   <input type="text" value={newEmp.registrationNumber} onChange={e => setNewEmp({...newEmp, registrationNumber: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Turno</label>
                     <select value={newEmp.shift} onChange={e => setNewEmp({...newEmp, shift: e.target.value as any})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white">
                       <option value="Matutino">Matutino</option>
                       <option value="Vespertino">Vespertino</option>
                       <option value="Noturno">Noturno</option>
                       <option value="12x36">12x36</option>
                     </select>
                   </div>
                   <div className="flex items-center pt-6">
                     <label className="flex items-center space-x-2 cursor-pointer w-full min-h-[44px]">
                       <input type="checkbox" checked={newEmp.isTechnicalLead} onChange={e => setNewEmp({...newEmp, isTechnicalLead: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500 h-5 w-5 sm:h-4 sm:w-4" />
                       <span className="text-sm font-medium text-slate-700">Resp. Técnico</span>
                     </label>
                   </div>
                </div>
                <div className="pt-4 pb-8 sm:pb-0">
                  <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-medium py-3 sm:py-2 rounded-lg transition-colors">Salvar Colaborador</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Add Training Modal */}
      {isTrainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black bg-opacity-65">
          <div className="bg-white rounded-none sm:rounded-xl shadow-lg max-w-lg w-full h-full sm:h-auto overflow-y-auto sm:overflow-hidden flex flex-col">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
               <h3 className="font-semibold text-slate-800">Registrar Treinamento</h3>
               <button 
                 onClick={() => setIsTrainModalOpen(false)}
                 className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors"
                 aria-label="Close"
               >
                 <X className="h-5 w-5 text-slate-400" />
               </button>
             </div>
             <form onSubmit={handleTrainSubmit} className="p-6 space-y-4 flex-1">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Título do Curso</label>
                   <input required type="text" value={newTrain.title} onChange={e => setNewTrain({...newTrain, title: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                   <textarea rows={2} value={newTrain.description} onChange={e => setNewTrain({...newTrain, description: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Instrutor</label>
                    <input required type="text" value={newTrain.instructor} onChange={e => setNewTrain({...newTrain, instructor: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Realização</label>
                    <input required type="date" value={newTrain.date} onChange={e => setNewTrain({...newTrain, date: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                  </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Validade (se houver)</label>
                   <input type="date" value={newTrain.validUntil} onChange={e => setNewTrain({...newTrain, validUntil: e.target.value})} className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-sm bg-white" />
                </div>
                <div className="pt-4 pb-8 sm:pb-0">
                  <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-medium py-3 sm:py-2 rounded-lg transition-colors">Registrar</button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamModule;