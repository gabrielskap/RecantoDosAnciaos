import React, { useState } from 'react';
import { Search, Filter, FileText, X, User, Phone, FileHeart, Plus, AlertCircle, BedDouble, Home, Edit2, Pill, Camera } from 'lucide-react';
import { Resident, Room } from '../types';
import CustomSelect from './CustomSelect';
import { compressImage, uploadResidentPhoto } from '../services/supabaseClient';
import { residentAvatarSrc } from '../lib/avatar';
import { toast } from '../services/toast';

interface ResidentsListProps {
  residents: Resident[];
  rooms: Room[];
  onSelectResident: (resident: Resident) => void;
  onAddResident: (resident: Resident) => void;
  onUpdateResident?: (resident: Resident) => void;
}

const careLevelConfig = {
  I: { label: 'Grau I', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  II: { label: 'Grau II', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  III: { label: 'Grau III', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
};

const calculateAge = (birthDateString: string): number => {
  if (!birthDateString) return 0;
  const parts = birthDateString.split('-');
  if (parts.length !== 3) return 0;

  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed month
  const birthDay = parseInt(parts[2], 10);

  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const m = today.getMonth() - birthMonth;
  if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
    age--;
  }
  return age >= 0 ? age : 0;
};

const ResidentsList: React.FC<ResidentsListProps> = ({ residents, rooms, onSelectResident, onAddResident, onUpdateResident }) => {
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return localStorage.getItem('modal_residents_list_open') === 'true';
  });
  const [editingResidentId, setEditingResidentId] = useState<string | null>(() => {
    return localStorage.getItem('modal_residents_editing_id') || null;
  });
  const [activeTab, setActiveTab] = useState<'personal' | 'contacts' | 'clinical'>(() => {
    return (localStorage.getItem('modal_residents_active_tab') as any) || 'personal';
  });
  const [search, setSearch] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const [formData, setFormData] = useState<Partial<Resident>>(() => {
    const saved = localStorage.getItem('modal_residents_form_data');
    return saved ? JSON.parse(saved) : {
      name: '', age: 0, room: '', careLevel: 'I', cpf: '', rg: '', birthDate: '', photoUrl: '',
      addressCep: '', addressState: '', addressCity: '', addressNeighborhood: '',
      addressStreet: '', addressNumber: '', addressComplement: '',
      emergencyContacts: [],
      legalGuardian: { name: '', cpf: '', phone: '', address: '' },
      clinicalCondition: '', functionalCondition: '', socialHistory: '',
      usoFraldas: 'nao',
      mobilidadeSet: 'independente',
      higieneCorporal: 'independente',
      higieneOralVestir: 'independente',
      reqHygiene: null,
      reqOralCare: null,
      reqFeeding: null,
      reqHydration: null,
      reqMobility: null,
      reqDressings: null,
      reqLeisure: null,
    };
  });
  const [contactTemp, setContactTemp] = useState(() => {
    const saved = localStorage.getItem('modal_residents_contact_temp');
    return saved ? JSON.parse(saved) : { name: '', relation: '', phone: '' };
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const handleCepChange = async (value: string) => {
    const raw = value.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 5) {
      formatted = `${raw.substring(0, 5)}-${raw.substring(5, 8)}`;
    }

    setFormData(prev => ({ ...prev, addressCep: formatted }));
    setCepError('');

    if (raw.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await response.json();
        if (data.erro) {
          setCepError('CEP não encontrado.');
        } else {
          setFormData(prev => ({
            ...prev,
            addressStreet: data.logradouro || '',
            addressNeighborhood: data.bairro || '',
            addressCity: data.localidade || '',
            addressState: data.uf || '',
          }));
          setTimeout(() => {
            const numberInput = document.getElementById('addressNumber');
            if (numberInput) {
              (numberInput as HTMLInputElement).focus();
            }
          }, 100);
        }
      } catch (err) {
        setCepError('Erro ao buscar o CEP.');
        console.error(err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  React.useEffect(() => {
    if (isModalOpen) {
      localStorage.setItem('modal_residents_list_open', 'true');
      localStorage.setItem('modal_residents_active_tab', activeTab);
      localStorage.setItem('modal_residents_form_data', JSON.stringify(formData));
      localStorage.setItem('modal_residents_contact_temp', JSON.stringify(contactTemp));
      if (editingResidentId) {
        localStorage.setItem('modal_residents_editing_id', editingResidentId);
      } else {
        localStorage.removeItem('modal_residents_editing_id');
      }
    } else {
      localStorage.removeItem('modal_residents_list_open');
      localStorage.removeItem('modal_residents_active_tab');
      localStorage.removeItem('modal_residents_form_data');
      localStorage.removeItem('modal_residents_contact_temp');
      localStorage.removeItem('modal_residents_editing_id');
    }
  }, [isModalOpen, activeTab, formData, contactTemp, editingResidentId]);

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

  const handleStartEdit = (resident: Resident) => {
    setEditingResidentId(resident.id);
    setFormData({
      name: resident.name,
      age: resident.age,
      room: resident.room,
      careLevel: resident.careLevel,
      cpf: resident.cpf || '',
      rg: resident.rg || '',
      birthDate: resident.birthDate || '',
      photoUrl: resident.photoUrl || '',
      addressCep: resident.addressCep || '',
      addressState: resident.addressState || '',
      addressCity: resident.addressCity || '',
      addressNeighborhood: resident.addressNeighborhood || '',
      addressStreet: resident.addressStreet || '',
      addressNumber: resident.addressNumber || '',
      addressComplement: resident.addressComplement || '',
      emergencyContacts: resident.emergencyContacts || [],
      legalGuardian: resident.legalGuardian || { name: '', cpf: '', phone: '', address: '' },
      clinicalCondition: resident.clinicalCondition || '',
      functionalCondition: resident.functionalCondition || '',
      socialHistory: resident.socialHistory || '',
      usoFraldas: resident.usoFraldas || 'nao',
      mobilidadeSet: resident.mobilidadeSet || 'independente',
      higieneCorporal: resident.higieneCorporal || 'independente',
      higieneOralVestir: resident.higieneOralVestir || 'independente',
      reqHygiene: resident.reqHygiene ?? null,
      reqOralCare: resident.reqOralCare ?? null,
      reqFeeding: resident.reqFeeding ?? null,
      reqHydration: resident.reqHydration ?? null,
      reqMobility: resident.reqMobility ?? null,
      reqDressings: resident.reqDressings ?? null,
      reqLeisure: resident.reqLeisure ?? null,
    });
    setActiveTab('personal');
    setIsModalOpen(true);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const base64 = await compressImage(file, 250, 250, 0.8);
      const finalUrl = await uploadResidentPhoto(file, base64);
      setFormData(prev => ({ ...prev, photoUrl: finalUrl }));
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      toast.error('Erro ao processar a foto. Tente novamente.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.room) return;

    if (editingResidentId) {
      if (onUpdateResident) {
        const original = residents.find(r => r.id === editingResidentId);
        if (original) {
          const updated: Resident = {
            ...original,
            name: formData.name!,
            age: formData.age || 0,
            room: formData.room!,
            careLevel: (formData.careLevel as 'I' | 'II' | 'III') || 'I',
            photoUrl: formData.photoUrl || '',
            cpf: formData.cpf,
            rg: formData.rg,
            birthDate: formData.birthDate,
            addressCep: formData.addressCep,
            addressState: formData.addressState,
            addressCity: formData.addressCity,
            addressNeighborhood: formData.addressNeighborhood,
            addressStreet: formData.addressStreet,
            addressNumber: formData.addressNumber,
            addressComplement: formData.addressComplement,
            emergencyContacts: formData.emergencyContacts || [],
            legalGuardian: formData.legalGuardian,
            clinicalCondition: formData.clinicalCondition || '',
            functionalCondition: formData.functionalCondition || '',
            socialHistory: formData.socialHistory || '',
            usoFraldas: formData.usoFraldas || 'nao',
            mobilidadeSet: formData.mobilidadeSet || 'independente',
            higieneCorporal: formData.higieneCorporal || 'independente',
            higieneOralVestir: formData.higieneOralVestir || 'independente',
            reqHygiene: formData.reqHygiene ?? null,
            reqOralCare: formData.reqOralCare ?? null,
            reqFeeding: formData.reqFeeding ?? null,
            reqHydration: formData.reqHydration ?? null,
            reqMobility: formData.reqMobility ?? null,
            reqDressings: formData.reqDressings ?? null,
            reqLeisure: formData.reqLeisure ?? null,
          };
          onUpdateResident(updated);
        }
      }
    } else {
      const resident: Resident = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name!, age: formData.age || 0, room: formData.room!,
        careLevel: (formData.careLevel as 'I' | 'II' | 'III') || 'I',
        cpf: formData.cpf, rg: formData.rg, birthDate: formData.birthDate,
        photoUrl: formData.photoUrl || '',
        admissionDate: new Date().toISOString(),
        addressCep: formData.addressCep,
        addressState: formData.addressState,
        addressCity: formData.addressCity,
        addressNeighborhood: formData.addressNeighborhood,
        addressStreet: formData.addressStreet,
        addressNumber: formData.addressNumber,
        addressComplement: formData.addressComplement,
        emergencyContacts: formData.emergencyContacts || [],
        legalGuardian: formData.legalGuardian,
        clinicalCondition: formData.clinicalCondition || '',
        functionalCondition: formData.functionalCondition || '',
        socialHistory: formData.socialHistory || '',
        medications: [], allergies: [], vitals: [], carePlan: [],
        auditLogs: [], dailyChecklists: [], documents: [], visits: [],
        usoFraldas: formData.usoFraldas || 'nao',
        mobilidadeSet: formData.mobilidadeSet || 'independente',
        higieneCorporal: formData.higieneCorporal || 'independente',
        higieneOralVestir: formData.higieneOralVestir || 'independente',
        reqHygiene: formData.reqHygiene ?? null,
        reqOralCare: formData.reqOralCare ?? null,
        reqFeeding: formData.reqFeeding ?? null,
        reqHydration: formData.reqHydration ?? null,
        reqMobility: formData.reqMobility ?? null,
        reqDressings: formData.reqDressings ?? null,
        reqLeisure: formData.reqLeisure ?? null,
      };
      onAddResident(resident);
    }
    setEditingResidentId(null);
    setFormData({
      name: '', age: 0, room: '', careLevel: 'I', photoUrl: '',
      addressCep: '', addressState: '', addressCity: '', addressNeighborhood: '',
      addressStreet: '', addressNumber: '', addressComplement: '',
      emergencyContacts: [],
      legalGuardian: { name: '', cpf: '', phone: '', address: '' },
      clinicalCondition: '', functionalCondition: '', socialHistory: '',
      usoFraldas: 'nao',
      mobilidadeSet: 'independente',
      higieneCorporal: 'independente',
      higieneOralVestir: 'independente',
      reqHygiene: null,
      reqOralCare: null,
      reqFeeding: null,
      reqHydration: null,
      reqMobility: null,
      reqDressings: null,
      reqLeisure: null,
    });
    setActiveTab('personal');
  };

  const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  const modalTabs = [
    { id: 'personal' as const, label: 'Dados Pessoais', icon: User },
    { id: 'contacts' as const, label: 'Contatos', icon: Phone },
    { id: 'clinical' as const, label: 'Clínico', icon: FileHeart },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Residentes</h1>
          <p className="text-slate-500 text-sm mt-0.5">{residents.length} residente{residents.length !== 1 ? 's' : ''} cadastrado{residents.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => {
            setEditingResidentId(null);
            setFormData({
              name: '', age: 0, room: '', careLevel: 'I', cpf: '', rg: '', birthDate: '', photoUrl: '',
              addressCep: '', addressState: '', addressCity: '', addressNeighborhood: '',
              addressStreet: '', addressNumber: '', addressComplement: '',
              emergencyContacts: [],
              legalGuardian: { name: '', cpf: '', phone: '', address: '' },
              clinicalCondition: '', functionalCondition: '', socialHistory: '',
              usoFraldas: 'nao',
              mobilidadeSet: 'independente',
              higieneCorporal: 'independente',
              higieneOralVestir: 'independente',
              reqHygiene: null,
              reqOralCare: null,
              reqFeeding: null,
              reqHydration: null,
              reqMobility: null,
              reqDressings: null,
              reqLeisure: null,
            });
            setActiveTab('personal');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" /> Novo Residente
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou quarto..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 overflow-hidden hover:shadow-md hover:shadow-blue-100/60 transition-all group"
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={residentAvatarSrc(resident.name, resident.photoUrl)}
                    alt={resident.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-100"
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

                </div>

                {resident.medications && resident.medications.length > 0 && (
                  <div className="mb-4 p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
                      <Pill className="h-3.5 w-3.5 text-blue-500" /> Próximas Medicações
                    </span>
                    <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1">
                      {resident.medications.map(med => (
                        <div key={med.id} className="flex justify-between items-center text-xs text-slate-650">
                          <span className="font-medium truncate max-w-[130px] sm:max-w-[160px]" title={`${med.name} (${med.dosage})`}>
                            {med.name}
                          </span>
                          <span className="bg-white px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-800 border border-blue-100/80 shrink-0">
                            {med.nextDose}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Última aferição: Hoje 08:00</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(resident)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
                      title="Editar Residente"
                    >
                      <Edit2 className="h-3 w-3" /> Editar
                    </button>
                    <button
                      onClick={() => onSelectResident(resident)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" /> Prontuário
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <User className="h-7 w-7 text-blue-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Nenhum residente encontrado</p>
            <p className="text-xs text-slate-400">Tente ajustar o filtro de busca.</p>
          </div>
        )}
      </div>

      {/* Modal - Sempre ativo (não fecha ao clicar no fundo/backdrop) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-2xl overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]"
          >

            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
              <div>
                <h3 className="font-bold text-slate-900">{editingResidentId ? 'Editar Residente' : 'Cadastro de Residente'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingResidentId ? 'Altere as informações do residente' : 'Preencha os dados do novo residente'}</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingResidentId(null); }} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="flex gap-1 px-4 pt-4 pb-0 shrink-0">
              {modalTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'personal' && (
                <>
                  {/* Photo Upload Container */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4">
                    <div className="relative group w-20 h-20 shrink-0">
                      {formData.photoUrl ? (
                        <img
                          src={formData.photoUrl}
                          alt="Preview"
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-100"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center text-blue-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                      {photoUploading && (
                        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <span className="block text-sm font-bold text-slate-800">Foto do Residente</span>
                      <span className="block text-xs text-slate-400 mt-0.5">Imagem quadrada de até 5MB. Ajustada automaticamente.</span>
                      
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                        <label className="relative flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-blue-100">
                          <Camera className="w-3.5 h-3.5" />
                          {formData.photoUrl ? 'Alterar Foto' : 'Carregar Foto'}
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={handlePhotoChange}
                            disabled={photoUploading}
                            className="hidden"
                          />
                        </label>
                        {formData.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                            className="flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:border-rose-100 transition-colors"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

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
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={e => {
                          const dateVal = e.target.value;
                          setFormData({
                            ...formData,
                            birthDate: dateVal,
                            age: dateVal ? calculateAge(dateVal) : formData.age
                          });
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Idade</label>
                      <input required type="number" value={formData.age || ''} onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quarto</label>
                      {rooms && rooms.length > 0 ? (
                        <select
                          required
                          value={formData.room || ''}
                          onChange={e => setFormData({ ...formData, room: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Selecione...</option>
                          {rooms.map(r => (
                            <option key={r.id} value={r.number}>
                              Quarto {r.number} ({r.type})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          required
                          type="text"
                          placeholder="Digite o número"
                          value={formData.room || ''}
                          onChange={e => setFormData({ ...formData, room: e.target.value })}
                          className={inputClass}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Grau de Dependência</label>
                    <CustomSelect
                      value={formData.careLevel || 'I'}
                      onChange={v => setFormData({ ...formData, careLevel: v as any })}
                      options={[
                        { value: 'I', label: 'Grau I', desc: 'Independente', badge: { label: 'Grau I', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' } },
                        { value: 'II', label: 'Grau II', desc: 'Dependência Parcial', badge: { label: 'Grau II', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' } },
                        { value: 'III', label: 'Grau III', desc: 'Dependência Total', badge: { label: 'Grau III', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' } },
                      ]}
                    />
                  </div>

                  {/* Endereço do Residente */}
                  <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                      <Home className="h-4 w-4 text-blue-500" />
                      Endereço do Residente
                    </h4>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                          <span>CEP</span>
                          {loadingCep && <span className="text-[10px] text-blue-500 font-semibold animate-pulse">...</span>}
                          {cepError && <span className="text-[10px] text-rose-500 font-semibold">{cepError}</span>}
                        </label>
                        <input
                          type="text"
                          placeholder="00000-000"
                          maxLength={9}
                          value={formData.addressCep || ''}
                          onChange={e => handleCepChange(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logradouro / Rua</label>
                        <input
                          type="text"
                          placeholder="Ex: Av. Brasil"
                          value={formData.addressStreet || ''}
                          onChange={e => setFormData({ ...formData, addressStreet: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Número</label>
                        <input
                          id="addressNumber"
                          type="text"
                          placeholder="Nº"
                          value={formData.addressNumber || ''}
                          onChange={e => setFormData({ ...formData, addressNumber: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Complemento</label>
                        <input
                          type="text"
                          placeholder="Ex: Apto 101, Bloco B"
                          value={formData.addressComplement || ''}
                          onChange={e => setFormData({ ...formData, addressComplement: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bairro</label>
                        <input
                          type="text"
                          placeholder="Bairro"
                          value={formData.addressNeighborhood || ''}
                          onChange={e => setFormData({ ...formData, addressNeighborhood: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cidade</label>
                        <input
                          type="text"
                          placeholder="Cidade"
                          value={formData.addressCity || ''}
                          onChange={e => setFormData({ ...formData, addressCity: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado (UF)</label>
                        <input
                          type="text"
                          placeholder="UF"
                          maxLength={2}
                          value={formData.addressState || ''}
                          onChange={e => setFormData({ ...formData, addressState: e.target.value.toUpperCase() })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'contacts' && (
                <div className="space-y-5">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
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
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingResidentId(null); }} className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={photoUploading}
                  className={`flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors ${
                    photoUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {photoUploading ? 'Processando...' : (editingResidentId ? 'Salvar Alterações' : 'Salvar Cadastro')}
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
