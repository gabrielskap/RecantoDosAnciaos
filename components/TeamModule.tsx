import React, { useState, useRef } from 'react';
import { Users, Calendar, Award, Shield, Plus, X, Search, CheckCircle, AlertOctagon, UserCheck, Edit, Trash2, ShieldAlert } from 'lucide-react';
import { Employee, TrainingRecord, SystemAccessLog, UserRole, Resident, ViewState } from '../types';
import ProfileManager from './ProfileManager';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../services/toast';
import CustomSelect from './CustomSelect';
import UsersModule from './UsersModule';

interface TeamModuleProps {
  employees: Employee[];
  trainings: TrainingRecord[];
  accessLogs: SystemAccessLog[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => Promise<Employee>;
  onUpdateEmployee: (emp: Employee) => Promise<Employee>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onAddTraining: (training: TrainingRecord) => void;
  residents: Resident[];
  onAddAccessLog: (log: SystemAccessLog) => void;
}

const TeamModule: React.FC<TeamModuleProps> = ({
  employees,
  trainings,
  accessLogs,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddTraining,
  residents,
  onAddAccessLog
}) => {
  const { currentUser, profiles, addUser, users, hasPermission } = useAuth();
  const isAdmin = currentUser?.profile.type === 'Administrador';
  const showUsersTab = hasPermission(ViewState.USERS, 'view');
  const [activeTab, setActiveTab] = useState<'employees' | 'users' | 'schedule' | 'training' | 'logs' | 'profiles'>('employees');
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(() => {
    return localStorage.getItem('modal_team_emp_open') === 'true';
  });
  const [isTrainModalOpen, setIsTrainModalOpen] = useState(() => {
    return localStorage.getItem('modal_team_train_open') === 'true';
  });
  const modalMouseDown = useRef(false);

  const [editingEmpId, setEditingEmpId] = useState<string | null>(() => {
    return localStorage.getItem('modal_team_editing_emp_id') || null;
  });

  // New Employee Form State
  const [newEmp, setNewEmp] = useState<Partial<Employee>>(() => {
    const saved = localStorage.getItem('modal_team_new_emp');
    return saved ? JSON.parse(saved) : {
      name: '',
      role: 'Cuidador',
      cpf: '',
      email: '',
      phone: '',
      shift: 'Matutino',
      isTechnicalLead: false,
      status: 'Ativo'
    };
  });

  const [linkUserMode, setLinkUserMode] = useState<string>('none');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessProfileId, setAccessProfileId] = useState('');
  const [autoOpenUsersCreate, setAutoOpenUsersCreate] = useState(false);
  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);

  const handleDeleteEmployee = async () => {
    if (!empToDelete) return;
    try {
      await onDeleteEmployee(empToDelete.id);
      setEmpToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir colaborador.');
    }
  };

  const employeeProfiles = profiles.filter(p => p.type !== 'Responsável');
  const currentEmpUserId = editingEmpId ? employees.find(e => e.id === editingEmpId)?.auth_user_id : undefined;
  const linkableUsers = users.filter(u =>
    u.profile.type !== 'Responsável' &&
    (!employees.some(e => e.auth_user_id === u.id) || u.id === currentEmpUserId)
  );

  const mapProfileTypeToRole = (type: string): string => {
    if (type === 'Administrador') return 'Admin';
    const valid = ['Enfermeiro', 'Cuidador', 'Médico', 'Nutricionista'];
    return valid.includes(type) ? type : 'Cuidador';
  };

  const linkedUser = !editingEmpId && linkUserMode !== 'none'
    ? users.find(u => u.id === linkUserMode) ?? null
    : null;

  // New Training Form State
  const [newTrain, setNewTrain] = useState<Partial<TrainingRecord>>(() => {
    const saved = localStorage.getItem('modal_team_new_train');
    return saved ? JSON.parse(saved) : {
      title: '',
      instructor: '',
      date: '',
      description: '',
      validUntil: ''
    };
  });

  React.useEffect(() => {
    if (isEmpModalOpen) {
      localStorage.setItem('modal_team_emp_open', 'true');
      localStorage.setItem('modal_team_new_emp', JSON.stringify(newEmp));
      if (editingEmpId) {
        localStorage.setItem('modal_team_editing_emp_id', editingEmpId);
      }
    } else {
      localStorage.removeItem('modal_team_emp_open');
      localStorage.removeItem('modal_team_new_emp');
      localStorage.removeItem('modal_team_editing_emp_id');
    }
  }, [isEmpModalOpen, newEmp, editingEmpId]);

  React.useEffect(() => {
    if (isTrainModalOpen) {
      localStorage.setItem('modal_team_train_open', 'true');
      localStorage.setItem('modal_team_new_train', JSON.stringify(newTrain));
    } else {
      localStorage.removeItem('modal_team_train_open');
      localStorage.removeItem('modal_team_new_train');
    }
  }, [isTrainModalOpen, newTrain]);

  const handleNewEmployeeClick = () => {
    setEditingEmpId(null);
    setNewEmp({
      name: '',
      role: 'Cuidador',
      cpf: '',
      email: '',
      phone: '',
      shift: 'Matutino',
      isTechnicalLead: false,
      status: 'Ativo'
    });
    setLinkUserMode('none');
    setAccessPassword('');
    setAccessProfileId('');
    setIsEmpModalOpen(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setNewEmp({
      name: emp.name,
      role: emp.role,
      cpf: emp.cpf,
      email: emp.email,
      phone: emp.phone,
      registrationNumber: emp.registrationNumber || '',
      shift: emp.shift,
      isTechnicalLead: emp.isTechnicalLead,
      status: emp.status
    });
    setLinkUserMode(emp.auth_user_id || 'none');
    setAccessPassword('');
    setAccessProfileId('');
    setIsEmpModalOpen(true);
  };

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.cpf) return;

    if (linkUserMode === 'create') {
      if (!newEmp.email || !newEmp.email.trim()) {
        toast.warning('O e-mail é obrigatório para criar um usuário de acesso.');
        return;
      }
      if (!accessPassword || accessPassword.length < 4) {
        toast.warning('A senha deve conter pelo menos 8 caracteres.');
        return;
      }
      if (!accessProfileId) {
        toast.warning('Selecione um perfil de acesso válido.');
        return;
      }
    }
    
    try {
      const employeeData = {
        name: newEmp.name!,
        role: newEmp.role as UserRole,
        cpf: newEmp.cpf!,
        email: newEmp.email || '',
        phone: newEmp.phone || '',
        registrationNumber: newEmp.registrationNumber,
        isTechnicalLead: newEmp.isTechnicalLead || false,
        shift: newEmp.shift as any,
        status: (newEmp.status as any) || 'Ativo',
        admissionDate: editingEmpId ? (employees.find(emp => emp.id === editingEmpId)?.admissionDate || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
        auth_user_id: (linkUserMode !== 'none' && linkUserMode !== 'create') ? linkUserMode : undefined
      };

      let savedEmp: Employee;
      if (editingEmpId) {
        savedEmp = await onUpdateEmployee({
          id: editingEmpId,
          ...employeeData
        });
      } else {
        savedEmp = await onAddEmployee(employeeData);
      }

      if (linkUserMode === 'create' && savedEmp && savedEmp.id) {
        const profile = profiles.find(p => p.id === accessProfileId);
        if (profile) {
          await addUser({
            name: newEmp.name!,
            email: newEmp.email!.trim().toLowerCase(),
            password: accessPassword,
            profile,
            employeeId: savedEmp.id
          } as any);
        }
      }

      setNewEmp({ name: '', role: 'Cuidador', cpf: '', email: '', phone: '', shift: 'Matutino', isTechnicalLead: false, status: 'Ativo' });
      setLinkUserMode('none');
      setAccessPassword('');
      setAccessProfileId('');
      setEditingEmpId(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar colaborador.');
    }
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
    setNewTrain({ title: '', instructor: '', date: '', description: '', validUntil: '' });
  };

  const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Equipe e Acessos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Colaboradores, Escalas e Controle de Acesso</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center"> <Users className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex overflow-x-auto">
        {[
          { id: 'employees', label: 'Colaboradores', icon: Users },
          ...(showUsersTab ? [{ id: 'users', label: 'Contas de Acesso', icon: UserCheck }] : []),
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
                onClick={handleNewEmployeeClick}
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
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${
                        emp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-855 border border-emerald-200' : 'bg-amber-100 text-amber-855 border border-amber-200'
                      }`}>
                        {emp.status}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleEditEmployee(emp)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors bg-white shadow-sm flex items-center justify-center"
                          title="Editar colaborador"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEmpToDelete(emp)}
                          className="p-1.5 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 transition-colors bg-white shadow-sm flex items-center justify-center"
                          title="Excluir colaborador"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
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
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center rounded-tr-lg w-20">Ações</th>
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
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditEmployee(emp)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            title="Editar colaborador"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEmpToDelete(emp)}
                            className="p-1.5 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Excluir colaborador"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && showUsersTab && (
          <div className="p-4 sm:p-6">
            <UsersModule
              residents={residents}
              employees={employees}
              onAddEmployee={onAddEmployee}
              onAddAccessLog={onAddAccessLog}
              autoOpenCreate={autoOpenUsersCreate}
              onAutoOpenDone={() => setAutoOpenUsersCreate(false)}
            />
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

      {/* Add/Edit Employee Modal */}
      {isEmpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) setIsEmpModalOpen(false); }}
        >
          <div
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-lg overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 shrink-0 bg-white">
               <div>
                 <h3 className="font-bold text-slate-900">{editingEmpId ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                 <p className="text-xs text-slate-500 mt-0.5">{editingEmpId ? 'Atualize as informações do colaborador' : 'Cadastre um novo colaborador na equipe'}</p>
               </div>
               <button
                 onClick={() => setIsEmpModalOpen(false)}
                 className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
                 aria-label="Close"
               >
                 <X className="h-5 w-5 text-slate-400" />
               </button>
             </div>
             <form onSubmit={handleEmpSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
                  {editingEmpId ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome Completo</label>
                        <input required type="text" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Função (Perfil)</label>
                          <CustomSelect
                            value={newEmp.role || ''}
                            onChange={v => setNewEmp({ ...newEmp, role: v as any })}
                            options={employeeProfiles.map(p => ({ value: p.name, label: p.name }))}
                            placeholder="Selecione um perfil..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF</label>
                          <input required type="text" value={newEmp.cpf} onChange={e => setNewEmp({...newEmp, cpf: e.target.value})} className={inputClass} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
                          <input type="email" autoComplete="new-password" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} className={inputClass} placeholder="exemplo@recanto.com" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone</label>
                          <input type="text" value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} className={inputClass} placeholder="(00) 00000-0000" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nº Registro (CRM/COREN)</label>
                        <input type="text" value={newEmp.registrationNumber} onChange={e => setNewEmp({...newEmp, registrationNumber: e.target.value})} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Turno</label>
                          <CustomSelect
                            value={newEmp.shift || 'Matutino'}
                            onChange={v => setNewEmp({ ...newEmp, shift: v as any })}
                            options={[
                              { value: 'Matutino', label: 'Matutino', desc: '07h – 13h' },
                              { value: 'Vespertino', label: 'Vespertino', desc: '13h – 19h' },
                              { value: 'Noturno', label: 'Noturno', desc: '19h – 07h' },
                              { value: '12x36', label: '12x36', desc: 'Regime 12 horas' },
                            ]}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                          <CustomSelect
                            value={newEmp.status || 'Ativo'}
                            onChange={v => setNewEmp({ ...newEmp, status: v as any })}
                            options={[
                              { value: 'Ativo', label: 'Ativo' },
                              { value: 'Férias', label: 'Férias' },
                              { value: 'Afastado', label: 'Afastado' },
                            ]}
                          />
                        </div>
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center space-x-2 cursor-pointer w-full min-h-[44px]">
                          <input type="checkbox" checked={newEmp.isTechnicalLead} onChange={e => setNewEmp({...newEmp, isTechnicalLead: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500 h-5 w-5 sm:h-4 sm:w-4" />
                          <span className="text-sm font-medium text-slate-700">Resp. Técnico</span>
                        </label>
                      </div>
                      <div className="pt-4 border-t border-slate-100 space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-650 mb-1.5">Vincular a Usuário do Sistema</label>
                          <CustomSelect
                            value={linkUserMode}
                            onChange={(val) => {
                              setLinkUserMode(val);
                              if (val === 'create' && employeeProfiles.length > 0 && !accessProfileId) {
                                setAccessProfileId(employeeProfiles[0].id);
                              }
                              if (val !== 'none' && val !== 'create') {
                                const u = users.find(user => user.id === val);
                                if (u) {
                                  setNewEmp(prev => ({
                                    ...prev,
                                    name: prev.name || u.name,
                                    email: prev.email || u.email
                                  }));
                                }
                              }
                            }}
                            options={[
                              { value: 'none', label: 'Não vincular a nenhum usuário' },
                              { value: 'create', label: '➕ Criar Novo Usuário de Acesso...', desc: 'Criar novas credenciais de acesso' },
                              ...linkableUsers.map(u => ({
                                value: u.id,
                                label: `${u.name} (${u.profile.name})`,
                                desc: `E-mail: ${u.email}`
                              }))
                            ]}
                            placeholder="Selecione..."
                          />
                        </div>
                        {linkUserMode === 'create' && (
                          <div className="bg-primary-50/20 p-4 border border-primary-100 rounded-xl space-y-3 animate-fadeIn">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 text-slate-600">Perfil de Acesso</label>
                              <CustomSelect
                                value={accessProfileId}
                                onChange={setAccessProfileId}
                                options={employeeProfiles.map(p => ({ value: p.id, label: p.name, desc: p.type }))}
                                placeholder="Selecione um perfil..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 text-slate-600">Senha Inicial</label>
                              <input
                                required={linkUserMode === 'create'}
                                type="password"
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={accessPassword}
                                onChange={e => setAccessPassword(e.target.value)}
                                className={inputClass}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Vincular a Usuário do Sistema</label>
                        <CustomSelect
                          value={linkUserMode}
                          onChange={(val) => {
                            setLinkUserMode(val);
                            if (val !== 'none') {
                              const u = users.find(user => user.id === val);
                              if (u) {
                                setNewEmp(prev => ({
                                  ...prev,
                                  name: u.name,
                                  email: u.email,
                                  cpf: u.cpf || prev.cpf || '',
                                  role: mapProfileTypeToRole(u.profile.type) as any,
                                }));
                              }
                            } else {
                              setNewEmp(prev => ({ ...prev, name: '', email: '', cpf: '', role: 'Cuidador' as any }));
                            }
                          }}
                          options={[
                            { value: 'none', label: 'Selecione um usuário...' },
                            ...linkableUsers.map(u => ({
                              value: u.id,
                              label: `${u.name} (${u.profile.name})`,
                              desc: `E-mail: ${u.email}`
                            }))
                          ]}
                        />
                        {showUsersTab && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEmpModalOpen(false);
                              setActiveTab('users');
                              setAutoOpenUsersCreate(true);
                            }}
                            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium pt-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Criar Novo Usuário de Acesso
                          </button>
                        )}
                      </div>

                      {linkedUser && (
                        <>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Usuário vinculado</p>
                            <p className="font-semibold text-slate-800 mt-1">{linkedUser.name}</p>
                            <p className="text-xs text-slate-500">{linkedUser.email}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Função (Perfil)</label>
                            <CustomSelect
                              value={newEmp.role || ''}
                              onChange={v => setNewEmp({ ...newEmp, role: v as any })}
                              options={employeeProfiles.map(p => ({ value: p.name, label: p.name }))}
                              placeholder="Selecione um perfil..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF</label>
                            <input required type="text" value={newEmp.cpf || ''} onChange={e => setNewEmp({...newEmp, cpf: e.target.value})} className={inputClass} placeholder="000.000.000-00" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nº Registro (CRM/COREN)</label>
                            <input type="text" value={newEmp.registrationNumber || ''} onChange={e => setNewEmp({...newEmp, registrationNumber: e.target.value})} className={inputClass} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Turno</label>
                              <CustomSelect
                                value={newEmp.shift || 'Matutino'}
                                onChange={v => setNewEmp({ ...newEmp, shift: v as any })}
                                options={[
                                  { value: 'Matutino', label: 'Matutino', desc: '07h – 13h' },
                                  { value: 'Vespertino', label: 'Vespertino', desc: '13h – 19h' },
                                  { value: 'Noturno', label: 'Noturno', desc: '19h – 07h' },
                                  { value: '12x36', label: '12x36', desc: 'Regime 12 horas' },
                                ]}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                              <CustomSelect
                                value={newEmp.status || 'Ativo'}
                                onChange={v => setNewEmp({ ...newEmp, status: v as any })}
                                options={[
                                  { value: 'Ativo', label: 'Ativo' },
                                  { value: 'Férias', label: 'Férias' },
                                  { value: 'Afastado', label: 'Afastado' },
                                ]}
                              />
                            </div>
                          </div>
                          <div className="flex items-center">
                            <label className="flex items-center space-x-2 cursor-pointer w-full min-h-[44px]">
                              <input type="checkbox" checked={newEmp.isTechnicalLead} onChange={e => setNewEmp({...newEmp, isTechnicalLead: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500 h-5 w-5 sm:h-4 sm:w-4" />
                              <span className="text-sm font-medium text-slate-700">Resp. Técnico</span>
                            </label>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEmpModalOpen(false)}
                      className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!editingEmpId && linkUserMode === 'none'}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                    >
                      {editingEmpId ? 'Salvar Alterações' : 'Salvar Colaborador'}
                    </button>
                  </div>
              </form>
          </div>
        </div>
      )}

      {/* Delete Employee Confirmation Modal */}
      {empToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) setEmpToDelete(null); }}
        >
          <div
            className="bg-white sm:rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-xl shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir o colaborador{' '}
              <span className="font-semibold text-slate-800">{empToDelete.name}</span>?
            </p>
            <p className="text-xs text-slate-400 italic">
              Esta ação é irreversível. O colaborador será removido permanentemente do sistema.
            </p>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setEmpToDelete(null)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteEmployee}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                Excluir Colaborador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Training Modal */}
      {isTrainModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
          onMouseDown={() => { modalMouseDown.current = false; }}
          onMouseUp={(e) => { if (!modalMouseDown.current && e.target === e.currentTarget) setIsTrainModalOpen(false); }}
        >
          <div
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-lg overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]"
            onMouseDown={(e) => { modalMouseDown.current = true; e.stopPropagation(); }}
          >
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 shrink-0 bg-white">
               <div>
                 <h3 className="font-bold text-slate-900">Registrar Treinamento</h3>
                 <p className="text-xs text-slate-500 mt-0.5">Registre uma nova capacitação para a equipe</p>
               </div>
               <button
                 onClick={() => setIsTrainModalOpen(false)}
                 className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
                 aria-label="Close"
               >
                 <X className="h-5 w-5 text-slate-400" />
               </button>
             </div>
             <form onSubmit={handleTrainSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div>
                   <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título do Curso</label>
                   <input required type="text" value={newTrain.title} onChange={e => setNewTrain({...newTrain, title: e.target.value})} className={inputClass} />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
                   <textarea rows={2} value={newTrain.description} onChange={e => setNewTrain({...newTrain, description: e.target.value})} className={`${inputClass} resize-none`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Instrutor</label>
                    <input required type="text" value={newTrain.instructor} onChange={e => setNewTrain({...newTrain, instructor: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de Realização</label>
                    <input required type="date" value={newTrain.date} onChange={e => setNewTrain({...newTrain, date: e.target.value})} className={inputClass} />
                  </div>
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-600 mb-1.5">Validade (se houver)</label>
                   <input type="date" value={newTrain.validUntil} onChange={e => setNewTrain({...newTrain, validUntil: e.target.value})} className={inputClass} />
                </div>
                <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTrainModalOpen(false)}
                    className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                  >
                    Registrar
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamModule;