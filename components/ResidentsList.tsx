import React, { useState } from 'react';
import { Search, Filter, FileText, X, User, Phone, FileHeart, Plus, AlertCircle, BedDouble } from 'lucide-react';
import { Resident } from '../types';

interface ResidentsListProps {
  residents: Resident[];
  onSelectResident: (resident: Resident) => void;
  onAddResident: (resident: Resident) => void;
}

const careLevelConfig = {
  I:   { label: 'Grau I',   bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  II:  { label: 'Grau II',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  III: { label: 'Grau III', bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-400' },
};

const ResidentsList: React.FC<ResidentsListProps> = ({ residents, onSelectResident, onAddResident }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'contacts' | 'clinical'>('personal');
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState<Partial<Resident>>({
    name: '', age: 0, room: '', careLevel: 'I', cpf: '', rg: '', birthDate: '',
    emergencyContacts: [],
    legalGuardian: { name: '', cpf: '', phone: '', address: '' },
    clinicalCondition: '', functionalCondition: '', socialHistory: '',
  });
  const [contactTemp, setContactTemp] = useState({ name: '', relation: '', phone: '' });

  const filtered = residents.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.room.toLowerCase().includes(search.toLowerCase())
  );

  const addContact = () => {
    if (contactTemp.name && contactTemp.phone) {
      setFormData({ ...formData, emergencyContacts: [...(formData.emergencyContacts || []), contactTemp] });
      setContactTemp({ name: '', relation: '', phone: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.room) return;
    const resident: Resident = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name!, age: formData.age || 0, room: formData.room!,
      careLevel: (formData.careLevel as 'I' | 'II' | 'III') || 'I',
      cpf: formData.cpf, rg: formData.rg, birthDate: formData.birthDate,
      photoUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
      admissionDate: new Date().toISOString(),
      emergencyContacts: formData.emergencyContacts || [],
      legalGuardian: formData.legalGuardian,
      clinicalCondition: formData.clinicalCondition || '',
      functionalCondition: formData.functionalCondition || '',
      socialHistory: formData.socialHistory || '',
      medications: [], allergies: [], vitals: [], carePlan: [],
      auditLogs: [], dailyChecklists: [], documents: [],
    };
    onAddResident(resident);
    setIsModalOpen(false);
    setFormData({ name: '', age: 0, room: '', careLevel: 'I', emergencyContacts: [], legalGuardian: { name: '', cpf: '', phone: '', address: '' } });
    setActiveTab('personal');
  };

  const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white';

  const modalTabs = [
    { id: 'personal' as const, label: 'Dados Pessoais', icon: User },
    { id: 'contacts' as const, label: 'Contatos', icon: Phone },
    { id: 'clinical' as const, label: 'Clínico', icon: FileHeart },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Residentes</h1>
          <p className="text-slate-500 text-sm mt-0.5">{residents.length} residente{residents.length !== 1 ? 's' : ''} cadastrado{residents.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-200 w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" /> Novo Residente
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou quarto..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(resident => {
          const lvl = careLevelConfig[resident.careLevel] ?? careLevelConfig['I'];
          return (
            <div
              key={resident.id}
              className="bg-white rounded-2xl shadow-sm shadow-violet-100/40 overflow-hidden hover:shadow-md hover:shadow-violet-100/60 transition-all group"
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={resident.photoUrl}
                    alt={resident.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-violet-100"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{resident.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{resident.age} anos · Quarto {resident.room}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${lvl.bg} ${lvl.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${lvl.dot}`} />
                    {lvl.label}
                  </span>
                  {resident.allergies.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600">
                      <AlertCircle className="h-3 w-3" /> Alergias
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500">
                    <BedDouble className="h-3 w-3" /> {resident.roomStatus ?? 'Ocupado'}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Última aferição: Hoje 08:00</span>
                  <button
                    onClick={() => onSelectResident(resident)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" /> Prontuário
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl shadow-sm shadow-violet-100/40 p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
              <User className="h-7 w-7 text-violet-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Nenhum residente encontrado</p>
            <p className="text-xs text-slate-400">Tente ajustar o filtro de busca.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-2xl overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]">

            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#F8F7FF] shrink-0">
              <div>
                <h3 className="font-bold text-slate-800">Cadastro de Residente</h3>
                <p className="text-xs text-slate-400 mt-0.5">Preencha os dados do novo residente</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex gap-1 px-4 pt-4 pb-0 shrink-0">
              {modalTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === tab.id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'personal' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome Completo</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF</label>
                      <input type="text" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">RG</label>
                      <input type="text" value={formData.rg} onChange={e => setFormData({ ...formData, rg: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nascimento</label>
                      <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Idade</label>
                      <input required type="number" value={formData.age || ''} onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quarto</label>
                      <input required type="text" value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Grau de Dependência</label>
                    <select value={formData.careLevel} onChange={e => setFormData({ ...formData, careLevel: e.target.value as any })} className={inputClass}>
                      <option value="I">Grau I — Independente</option>
                      <option value="II">Grau II — Dependência Parcial</option>
                      <option value="III">Grau III — Dependência Total</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'contacts' && (
                <div className="space-y-5">
                  <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                    <h4 className="font-bold text-slate-700 text-sm mb-3">Responsável Legal</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { placeholder: 'Nome', key: 'name' },
                        { placeholder: 'CPF', key: 'cpf' },
                        { placeholder: 'Telefone', key: 'phone' },
                        { placeholder: 'Endereço', key: 'address' },
                      ].map(f => (
                        <input
                          key={f.key}
                          placeholder={f.placeholder}
                          value={(formData.legalGuardian as any)?.[f.key] || ''}
                          onChange={e => setFormData({ ...formData, legalGuardian: { ...formData.legalGuardian!, [f.key]: e.target.value } })}
                          className={inputClass}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm mb-3">Contatos de Emergência</h4>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input placeholder="Nome" value={contactTemp.name} onChange={e => setContactTemp({ ...contactTemp, name: e.target.value })} className={inputClass} />
                      <input placeholder="Parentesco" value={contactTemp.relation} onChange={e => setContactTemp({ ...contactTemp, relation: e.target.value })} className={inputClass} />
                      <input placeholder="Telefone" value={contactTemp.phone} onChange={e => setContactTemp({ ...contactTemp, phone: e.target.value })} className={inputClass} />
                    </div>
                    <button type="button" onClick={addContact} className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition-colors">+ Adicionar Contato</button>
                    <div className="mt-3 space-y-2">
                      {formData.emergencyContacts?.map((c, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2 text-sm">
                          <span className="font-medium text-slate-700">{c.name} <span className="text-slate-400">({c.relation})</span></span>
                          <span className="text-slate-500 text-xs">{c.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'clinical' && (
                <div className="space-y-4">
                  {[
                    { label: 'Condições Clínicas (Diagnósticos)', key: 'clinicalCondition', placeholder: 'Ex: Hipertensão, Diabetes tipo 2...' },
                    { label: 'Condição Funcional', key: 'functionalCondition', placeholder: 'Mobilidade, cognição...' },
                    { label: 'Histórico Social e Familiar', key: 'socialHistory', placeholder: 'Contexto familiar, visitas...' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                      <textarea rows={3} placeholder={f.placeholder} value={(formData as any)[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} className={inputClass + ' resize-none'} />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 sm:flex-none px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors">
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentsList;
