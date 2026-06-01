import React, { useState } from 'react';
import { Search, Filter, MoreVertical, FileText, X, User, Phone, FileHeart, Calendar } from 'lucide-react';
import { Resident } from '../types';

interface ResidentsListProps {
  residents: Resident[];
  onSelectResident: (resident: Resident) => void;
  onAddResident: (resident: Resident) => void;
}

const ResidentsList: React.FC<ResidentsListProps> = ({ residents, onSelectResident, onAddResident }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'contacts' | 'clinical'>('personal');
  
  // Comprehensive form state
  const [formData, setFormData] = useState<Partial<Resident>>({
    name: '',
    age: 0,
    room: '',
    careLevel: 'I',
    cpf: '',
    rg: '',
    birthDate: '',
    emergencyContacts: [],
    legalGuardian: { name: '', cpf: '', phone: '', address: '' },
    clinicalCondition: '',
    functionalCondition: '',
    socialHistory: '',
  });

  const [contactTemp, setContactTemp] = useState({ name: '', relation: '', phone: '' });

  const addContact = () => {
    if (contactTemp.name && contactTemp.phone) {
      setFormData({
        ...formData,
        emergencyContacts: [...(formData.emergencyContacts || []), contactTemp]
      });
      setContactTemp({ name: '', relation: '', phone: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.room) return;

    const resident: Resident = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name!,
      age: formData.age || 0,
      room: formData.room!,
      careLevel: (formData.careLevel as 'I' | 'II' | 'III') || 'I',
      cpf: formData.cpf,
      rg: formData.rg,
      birthDate: formData.birthDate,
      photoUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
      admissionDate: new Date().toISOString(),
      emergencyContacts: formData.emergencyContacts || [],
      legalGuardian: formData.legalGuardian,
      clinicalCondition: formData.clinicalCondition || '',
      functionalCondition: formData.functionalCondition || '',
      socialHistory: formData.socialHistory || '',
      medications: [],
      allergies: [],
      vitals: [],
      carePlan: [],
      auditLogs: [],
      dailyChecklists: [],
      documents: []
    };

    onAddResident(resident);
    setIsModalOpen(false);
    // Reset form
    setFormData({ name: '', age: 0, room: '', careLevel: 'I', emergencyContacts: [], legalGuardian: { name: '', cpf: '', phone: '', address: '' } });
    setActiveTab('personal');
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Residentes</h1>
          <p className="text-slate-500">Gerenciamento de hóspedes e prontuários</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
           <button 
             onClick={() => setIsModalOpen(true)}
             className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center w-full sm:w-auto"
           >
            <User className="h-4 w-4 mr-2" />
            Novo Residente
          </button>
        </div>
      </div>

      {/* Filters - Stacked on Mobile */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome, quarto..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
        <button className="flex items-center justify-center px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {residents.map((resident) => (
          <div key={resident.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <img 
                    src={resident.photoUrl} 
                    alt={resident.name} 
                    className="h-14 w-14 rounded-full object-cover border-2 border-slate-100"
                  />
                  <div className="ml-4">
                    <h3 className="font-semibold text-slate-800">{resident.name}</h3>
                    <p className="text-sm text-slate-500">{resident.age} anos • Quarto {resident.room}</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                  resident.careLevel === 'III' ? 'bg-rose-100 text-rose-700' :
                  resident.careLevel === 'II' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  Grau {resident.careLevel}
                </span>
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                  {resident.allergies.length > 0 ? 'Alergias Alert' : 'Sem Alergias'}
                </span>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate-500">
                  Última aferição: Hoje 08:00
                </div>
                <button 
                  onClick={() => onSelectResident(resident)}
                  className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium p-2 md:p-0"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Prontuário
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comprehensive Add Resident Modal - Fullscreen on Mobile */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black bg-opacity-50">
          <div className="bg-white w-full h-full sm:h-auto sm:rounded-xl shadow-lg sm:max-w-2xl overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-semibold text-slate-800">Cadastro de Residente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X className="h-6 w-6 sm:h-5 sm:w-5" />
              </button>
            </div>
            
            {/* Tabs - Scrollable on mobile */}
            <div className="flex border-b border-slate-200 px-2 sm:px-6 shrink-0 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('personal')}
                className={`flex items-center py-3 px-4 border-b-2 text-sm font-medium whitespace-nowrap ${activeTab === 'personal' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}
              >
                <User className="h-4 w-4 mr-2" /> Dados Pessoais
              </button>
              <button 
                onClick={() => setActiveTab('contacts')}
                className={`flex items-center py-3 px-4 border-b-2 text-sm font-medium whitespace-nowrap ${activeTab === 'contacts' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}
              >
                <Phone className="h-4 w-4 mr-2" /> Contatos & Resp.
              </button>
              <button 
                onClick={() => setActiveTab('clinical')}
                className={`flex items-center py-3 px-4 border-b-2 text-sm font-medium whitespace-nowrap ${activeTab === 'clinical' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}
              >
                <FileHeart className="h-4 w-4 mr-2" /> Clínico & Social
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1">
              {activeTab === 'personal' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                      <input type="text" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                      <input type="text" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Data Nasc.</label>
                      <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Idade</label>
                      <input required type="number" value={formData.age} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Quarto</label>
                       <input required type="text" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grau de Dependência</label>
                    <select value={formData.careLevel} onChange={e => setFormData({...formData, careLevel: e.target.value as any})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm">
                      <option value="I">Grau I (Independente)</option>
                      <option value="II">Grau II (Dependência Parcial)</option>
                      <option value="III">Grau III (Dependência Total)</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'contacts' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3 text-sm">Responsável Legal</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <input placeholder="Nome" value={formData.legalGuardian?.name} onChange={e => setFormData({...formData, legalGuardian: {...formData.legalGuardian!, name: e.target.value}})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-base sm:text-sm" />
                      <input placeholder="CPF" value={formData.legalGuardian?.cpf} onChange={e => setFormData({...formData, legalGuardian: {...formData.legalGuardian!, cpf: e.target.value}})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-base sm:text-sm" />
                      <input placeholder="Telefone" value={formData.legalGuardian?.phone} onChange={e => setFormData({...formData, legalGuardian: {...formData.legalGuardian!, phone: e.target.value}})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-base sm:text-sm" />
                      <input placeholder="Endereço" value={formData.legalGuardian?.address} onChange={e => setFormData({...formData, legalGuardian: {...formData.legalGuardian!, address: e.target.value}})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-base sm:text-sm" />
                    </div>
                  </div>

                  <div>
                     <h4 className="font-semibold text-slate-800 mb-2 text-sm">Contatos de Emergência</h4>
                     <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <input placeholder="Nome" value={contactTemp.name} onChange={e => setContactTemp({...contactTemp, name: e.target.value})} className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-base sm:text-sm" />
                        <div className="flex gap-2">
                           <input placeholder="Parentesco" value={contactTemp.relation} onChange={e => setContactTemp({...contactTemp, relation: e.target.value})} className="flex-1 sm:w-24 px-3 py-2 border border-slate-300 rounded-md text-base sm:text-sm" />
                           <input placeholder="Tel" value={contactTemp.phone} onChange={e => setContactTemp({...contactTemp, phone: e.target.value})} className="flex-1 sm:w-32 px-3 py-2 border border-slate-300 rounded-md text-base sm:text-sm" />
                        </div>
                        <button type="button" onClick={addContact} className="px-3 py-2 bg-slate-200 rounded-md text-sm font-medium hover:bg-slate-300 w-full sm:w-auto">+</button>
                     </div>
                     <ul className="space-y-2">
                       {formData.emergencyContacts?.map((c, i) => (
                         <li key={i} className="text-sm bg-white border border-slate-100 p-2 rounded flex justify-between">
                           <span>{c.name} ({c.relation})</span>
                           <span className="text-slate-500">{c.phone}</span>
                         </li>
                       ))}
                     </ul>
                  </div>
                </div>
              )}

              {activeTab === 'clinical' && (
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Condições Clínicas (Diagnósticos)</label>
                     <textarea rows={3} value={formData.clinicalCondition} onChange={e => setFormData({...formData, clinicalCondition: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm" placeholder="Ex: Hipertensão, Diabetes..." />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Condição Funcional</label>
                     <textarea rows={2} value={formData.functionalCondition} onChange={e => setFormData({...formData, functionalCondition: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm" placeholder="Mobilidade, cognição..." />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Histórico Social/Familiar</label>
                     <textarea rows={2} value={formData.socialHistory} onChange={e => setFormData({...formData, socialHistory: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-base sm:text-sm" placeholder="Contexto familiar..." />
                   </div>
                 </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none px-4 py-3 sm:py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancelar</button>
                 <button type="submit" className="flex-1 sm:flex-none px-6 py-3 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentsList;