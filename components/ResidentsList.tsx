import React, { useState } from 'react';
import { Search, Filter, FileText, X, User, Phone, FileHeart, Plus, AlertCircle, BedDouble, Home, Edit2, Pill, Camera, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, UserX, UserCheck, UploadCloud, LogOut, Calendar, ExternalLink, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Resident, Room, ViewState } from '../types';
import CustomSelect from './CustomSelect';
import { compressImage, uploadResidentPhoto, uploadResidentDocument } from '../services/supabaseClient';
import { residentAvatarSrc } from '../lib/avatar';
import { toast } from '../services/toast';
import { useAuth } from '../contexts/AuthContext';
import { fetchResidentsPaginated } from '../services/dataService';

interface ResidentsListProps {
  residents: Resident[];
  rooms: Room[];
  onSelectResident: (resident: Resident) => void;
  onAddResident: (resident: Resident) => Promise<void>;
  onUpdateResident: (resident: Resident) => Promise<void>;
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

const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
};

const formatCPF = (v: string): string => {
  v = v.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
};

const formatRG = (v: string): string => {
  const clean = v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length > 9) return clean.slice(0, 14);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}-${clean.slice(8)}`;
};

const ResidentsList: React.FC<ResidentsListProps> = ({ residents, rooms, onSelectResident, onAddResident, onUpdateResident }) => {
  const { currentUser, hasPermission } = useAuth();
  const canCreate = hasPermission(ViewState.RESIDENTS, 'create');
  const canEdit = hasPermission(ViewState.RESIDENTS, 'edit');
  const empresaId = currentUser?.empresaId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResidentId, setEditingResidentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'contacts' | 'clinical' | 'offboarding'>(() => {
    return (localStorage.getItem('modal_residents_active_tab') as any) || 'personal';
  });
  const [sectionTab, setSectionTab] = useState<'ativos' | 'desligados'>('ativos');
  const [search, setSearch] = useState('');
  const [filterCareLevel, setFilterCareLevel] = useState<'' | 'I' | 'II' | 'III'>('');
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'room' | 'careLevel'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [uploadingOffboardingDoc, setUploadingOffboardingDoc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const [serverResidents, setServerResidents] = useState<Resident[]>([]);
  const [totalServerCount, setTotalServerCount] = useState<number | null>(null);
  const [isLoadingServer, setIsLoadingServer] = useState<boolean>(false);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  React.useEffect(() => {
    if (!empresaId) return;

    let isSubscribed = true;
    setIsLoadingServer(true);

    fetchResidentsPaginated(empresaId, {
      page: currentPage,
      pageSize: itemsPerPage,
      status: sectionTab === 'ativos' ? 'ativo' : 'inativo',
      search: debouncedSearch,
      careLevel: filterCareLevel,
      sortBy,
      sortOrder
    })
      .then(res => {
        if (isSubscribed) {
          setServerResidents(res.residents);
          setTotalServerCount(res.totalCount);
        }
      })
      .catch(err => {
        console.error('Erro ao buscar residentes paginados do backend:', err);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoadingServer(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [empresaId, currentPage, itemsPerPage, sectionTab, debouncedSearch, filterCareLevel, sortBy, sortOrder, fetchTrigger]);

  React.useEffect(() => {
    if (!showSortMenu) return;
    const close = () => setShowSortMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showSortMenu]);

  const [formData, setFormData] = useState<Partial<Resident>>({
      name: '', age: 0, room: '', careLevel: 'I', cpf: '', rg: '', birthDate: '', admissionDate: '', photoUrl: '',
      addressCep: '', addressState: '', addressCity: '', addressNeighborhood: '',
      addressStreet: '', addressNumber: '', addressComplement: '',
      emergencyContacts: [],
      legalGuardian: { name: '', cpf: '', phone: '', address: '' },
      clinicalCondition: '', functionalCondition: '', socialHistory: '',
      sarcopenia: 'nao',
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
      status: 'ativo',
      dataDesligamento: '',
      motivoDesligamento: '',
      documentoDesligamento: '',
    });
  const [contactTemp, setContactTemp] = useState({ name: '', relation: '', phone: '' });
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [allergiesText, setAllergiesText] = useState('');

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
    [
      'modal_residents_list_open',
      'modal_residents_editing_id',
      'modal_residents_form_data',
      'modal_residents_contact_temp',
      'modal_residents_allergies_text',
    ].forEach(key => localStorage.removeItem(key));
  }, []);

  React.useEffect(() => {
    localStorage.setItem('modal_residents_active_tab', activeTab);
  }, [activeTab]);

  const careLevelOrder = { I: 1, II: 2, III: 3 };

  const isServerPaginated = Boolean(empresaId && totalServerCount !== null);

  const activeResidents = residents.filter(r => r.status !== 'inativo');
  const inactiveResidents = residents.filter(r => r.status === 'inativo');

  const currentList = sectionTab === 'ativos' ? activeResidents : inactiveResidents;

  const filtered = currentList
    .filter(r => {
      const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.room.toLowerCase().includes(search.toLowerCase());
      const matchLevel = filterCareLevel === '' || r.careLevel === filterCareLevel;
      return matchSearch && matchLevel;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'pt-BR');
      else if (sortBy === 'age') cmp = a.age - b.age;
      else if (sortBy === 'room') cmp = a.room.localeCompare(b.room, 'pt-BR', { numeric: true });
      else if (sortBy === 'careLevel') cmp = careLevelOrder[a.careLevel] - careLevelOrder[b.careLevel];
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCareLevel, sortBy, sortOrder, sectionTab]);

  const totalItems = isServerPaginated ? (totalServerCount || 0) : filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedResidents = isServerPaginated ? serverResidents : filtered.slice(startIndex, endIndex);

  const MAX_EMERGENCY_CONTACTS = 3;

  const addContact = () => {
    if (!contactTemp.name || !contactTemp.phone) return;
    if ((formData.emergencyContacts || []).length >= MAX_EMERGENCY_CONTACTS) {
      toast.error(`É possível cadastrar no máximo ${MAX_EMERGENCY_CONTACTS} contatos de emergência.`);
      return;
    }
    setFormData({ ...formData, emergencyContacts: [...(formData.emergencyContacts || []), contactTemp] });
    setContactTemp({ name: '', relation: '', phone: '' });
  };

  const removeContact = (index: number) => {
    setFormData({
      ...formData,
      emergencyContacts: (formData.emergencyContacts || []).filter((_, i) => i !== index)
    });
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
      admissionDate: resident.admissionDate || '',
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
      sarcopenia: resident.sarcopenia || 'nao',
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
      status: resident.status || 'ativo',
      dataDesligamento: resident.dataDesligamento || '',
      motivoDesligamento: resident.motivoDesligamento || '',
      documentoDesligamento: resident.documentoDesligamento || '',
    });
    setAllergiesText(resident.allergies ? resident.allergies.join(', ') : '');
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

  const handleOffboardingDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingOffboardingDoc(true);
    try {
      const targetId = editingResidentId || 'temp_' + Date.now();
      let url = '';
      try {
        url = await uploadResidentDocument(file, targetId);
      } catch (err) {
        console.warn('Storage upload error, converting to data url fallback:', err);
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      setFormData(prev => ({ ...prev, documentoDesligamento: url }));
      toast.success('Documento de desligamento anexado!');
    } catch (err) {
      console.error('Erro ao carregar documento:', err);
      toast.error('Erro ao carregar documento.');
    } finally {
      setUploadingOffboardingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.room) {
      // Nome/Quarto ficam na aba "Dados Pessoais" — se estiverem vazios
      // enquanto o usuário está em outra aba (ex.: Desligamento), o submit
      // falhava aqui sem nenhum feedback visível, parecendo que o botão
      // "Salvar Alterações" simplesmente não fazia nada.
      toast.error(!formData.name ? 'Informe o nome do residente para salvar.' : 'Informe o quarto do residente para salvar.');
      setActiveTab('personal');
      return;
    }

    const originalResident = editingResidentId ? residents.find(r => r.id === editingResidentId) : undefined;

    // Só valida CPF/RG quando o valor foi de fato alterado nesta edição. Sem
    // essa checagem, um residente antigo com CPF/RG de placeholder (dado legado
    // ou de demonstração) fica com o cadastro travado para sempre — nenhuma
    // outra aba (ex.: Desligamento) consegue salvar, e o único aviso é um toast
    // discreto que não indica qual aba/campo tem o problema.
    const cpfChanged = (formData.cpf || '') !== (originalResident?.cpf || '');
    if (formData.cpf && cpfChanged) {
      if (!validateCPF(formData.cpf)) {
        toast.error('O CPF informado é inválido.');
        setActiveTab('personal');
        return;
      }
    }

    const rgChanged = (formData.rg || '') !== (originalResident?.rg || '');
    if (formData.rg && rgChanged) {
      const cleanRG = formData.rg.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanRG.length < 5 || cleanRG.length > 14) {
        toast.error('O RG informado deve conter entre 5 e 14 caracteres.');
        setActiveTab('personal');
        return;
      }
    }

    const guardianCpfChanged = (formData.legalGuardian?.cpf || '') !== (originalResident?.legalGuardian?.cpf || '');
    if (formData.legalGuardian?.cpf && guardianCpfChanged) {
      if (!validateCPF(formData.legalGuardian.cpf)) {
        toast.error('O CPF do Responsável Legal informado é inválido.');
        setActiveTab('contacts');
        return;
      }
    }

    try {
    if (editingResidentId) {
      if (onUpdateResident) {
        const original = originalResident;
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
            admissionDate: formData.admissionDate || original.admissionDate,
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
            sarcopenia: formData.sarcopenia || 'nao',
            allergies: allergiesText ? allergiesText.split(',').map(a => a.trim()).filter(Boolean) : [],
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
            status: formData.status || 'ativo',
            dataDesligamento: formData.dataDesligamento || undefined,
            motivoDesligamento: formData.motivoDesligamento || undefined,
            documentoDesligamento: formData.documentoDesligamento || undefined,
          };
          await onUpdateResident(updated);
          if (formData.status === 'inativo') {
            toast.success(`Residente ${formData.name} foi desligado(a) com sucesso.`);
          }
        } else {
          toast.error('O residente não foi encontrado para atualização.');
          return;
        }
      }
    } else {
      const resident: Resident = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name!, age: formData.age || 0, room: formData.room!,
        careLevel: (formData.careLevel as 'I' | 'II' | 'III') || 'I',
        cpf: formData.cpf, rg: formData.rg, birthDate: formData.birthDate,
        photoUrl: formData.photoUrl || '',
        admissionDate: formData.admissionDate || new Date().toISOString().split('T')[0],
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
        sarcopenia: formData.sarcopenia || 'nao',
        medications: [], allergies: allergiesText ? allergiesText.split(',').map(a => a.trim()).filter(Boolean) : [], vitals: [], glucoseReadings: [], carePlan: [],
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
        status: formData.status || 'ativo',
        dataDesligamento: formData.dataDesligamento || undefined,
        motivoDesligamento: formData.motivoDesligamento || undefined,
        documentoDesligamento: formData.documentoDesligamento || undefined,
      };
      await onAddResident(resident);
    }
    setEditingResidentId(null);
    setFormData({
      name: '', age: 0, room: '', careLevel: 'I', admissionDate: '', photoUrl: '',
      addressCep: '', addressState: '', addressCity: '', addressNeighborhood: '',
      addressStreet: '', addressNumber: '', addressComplement: '',
      emergencyContacts: [],
      legalGuardian: { name: '', cpf: '', phone: '', address: '' },
      clinicalCondition: '', functionalCondition: '', socialHistory: '',
      sarcopenia: 'nao',
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
      status: 'ativo',
      dataDesligamento: '',
      motivoDesligamento: '',
      documentoDesligamento: '',
    });
    setAllergiesText('');
    setIsModalOpen(false);
    } catch (err) {
      // O formulário e seu rascunho local são mantidos para uma nova tentativa.
      console.error('Error saving resident:', err);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  const modalTabs = [
    { id: 'personal' as const, label: 'Dados Pessoais', icon: User },
    { id: 'contacts' as const, label: 'Contatos', icon: Phone },
    { id: 'clinical' as const, label: 'Clínico', icon: FileHeart },
    ...(editingResidentId ? [{ id: 'offboarding' as const, label: 'Desligamento', icon: UserX }] : []),
  ];

  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);

  return (
    <div className="space-y-6">

      {/* Modal para Expandir a Foto */}
      {expandedPhotoUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm cursor-default"
          onClick={() => setExpandedPhotoUrl(null)}
        >
          <div className="relative max-w-none max-h-none p-0 flex flex-col items-center">
            <button 
              onClick={() => setExpandedPhotoUrl(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={expandedPhotoUrl}
              alt="Foto do Residente Ampliada"
              className="max-w-[95vw] max-h-[95vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}


      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {sectionTab === 'ativos' ? 'Residentes Ativos' : 'Residentes Desligados'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {activeResidents.length} ativo{activeResidents.length !== 1 ? 's' : ''} · {inactiveResidents.length} desligado{inactiveResidents.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Navigation Tabs for Ativos vs Desligados */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setSectionTab('ativos')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sectionTab === 'ativos'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Ativos ({activeResidents.length})
            </button>
            <button
              onClick={() => setSectionTab('desligados')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sectionTab === 'desligados'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              Residentes Desligados ({inactiveResidents.length})
            </button>
          </div>

          {canCreate && (
            <button
              onClick={() => {
                setEditingResidentId(null);
                setFormData({
                  name: '', age: 0, room: '', careLevel: 'I', cpf: '', rg: '', birthDate: '', admissionDate: '', photoUrl: '',
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
                  status: 'ativo',
                  dataDesligamento: '',
                  motivoDesligamento: '',
                  documentoDesligamento: '',
                });
                setAllergiesText('');
                setActiveTab('personal');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <Plus className="h-4 w-4" /> Novo Residente
            </button>
          )}
        </div>
      </div>

      {/* Search + Filter + Sort */}
      <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-3 space-y-3">
        {/* Search */}
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

        {/* Filter & Sort row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Care level filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5 hidden sm:inline">Filtrar:</span>
            {([['', 'Todos'], ['I', 'Grau I'], ['II', 'Grau II'], ['III', 'Grau III']] as const).map(([val, label]) => {
              const active = filterCareLevel === val;
              const colorMap: Record<string, string> = {
                '': active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                'I': active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                'II': active ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
                'III': active ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
              };
              return (
                <button
                  key={val}
                  onClick={() => setFilterCareLevel(val)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${colorMap[val]}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sort */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowSortMenu(v => !v); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ordenar: </span>
              {sortBy === 'name' && 'Nome'}
              {sortBy === 'age' && 'Idade'}
              {sortBy === 'room' && 'Quarto'}
              {sortBy === 'careLevel' && 'Grau'}
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-100 rounded-xl shadow-lg py-1 min-w-[160px]">
                {([['name', 'Alfabética (Nome)'], ['age', 'Idade'], ['room', 'Quarto'], ['careLevel', 'Grau de Dependência']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setSortBy(val); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors ${sortBy === val ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort direction toggle */}
          <button
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
          >
            {sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}</span>
          </button>
        </div>

        {/* Active filter summary */}
        {(filterCareLevel !== '' || sortBy !== 'name' || sortOrder !== 'asc') && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
            <span className="text-[11px] text-slate-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => { setFilterCareLevel(''); setSortBy('name'); setSortOrder('asc'); }}
              className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paginatedResidents.map(resident => {
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
                    onClick={() => setExpandedPhotoUrl(residentAvatarSrc(resident.name, resident.photoUrl))}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-100 cursor-pointer hover:opacity-85 transition-opacity"
                    title="Clique para expandir a foto"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 
                      onClick={() => {
                        localStorage.setItem(`recanto_resident_profile_active_tab_${resident.id}`, 'info');
                        onSelectResident(resident);
                      }}
                      className="font-bold text-slate-800 truncate cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                      title="Ver dados do residente"
                    >
                      {resident.name}
                    </h3>
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

                {resident.status === 'inativo' && (
                  <div className="mb-4 p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-rose-800">
                      <span className="flex items-center gap-1">
                        <UserX className="w-3.5 h-3.5 text-rose-600" /> Residente Desligado
                      </span>
                      {resident.dataDesligamento && (
                        <span className="text-[11px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-semibold">
                          Desligamento: {resident.dataDesligamento}
                        </span>
                      )}
                    </div>
                    {resident.motivoDesligamento && (
                      <p className="text-slate-700 text-xs">
                        <strong className="text-slate-800">Motivo:</strong> {resident.motivoDesligamento}
                      </p>
                    )}
                    {resident.documentoDesligamento && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">Certidão / Doc:</span>
                        <a
                          href={resident.documentoDesligamento}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-white px-2 py-1 rounded border border-blue-100 shadow-xs"
                        >
                          <FileText className="w-3 h-3" /> Visualizar Documento <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Última aferição: Hoje 08:00</span>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <button
                        onClick={() => handleStartEdit(resident)}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
                        title="Editar Residente"
                      >
                        <Edit2 className="h-3 w-3" /> Editar
                      </button>
                    )}
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

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              Mostrando <strong className="text-slate-700 font-semibold">{totalItems > 0 ? startIndex + 1 : 0}</strong> a{' '}
              <strong className="text-slate-700 font-semibold">{endIndex}</strong> de{' '}
              <strong className="text-slate-700 font-semibold">{totalItems}</strong> residente{totalItems !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-slate-400">Exibir:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value={6}>6 por pág.</option>
                <option value={9}>9 por pág.</option>
                <option value={12}>12 por pág.</option>
                <option value={18}>18 por pág.</option>
                <option value={24}>24 por pág.</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    return Math.abs(page - safePage) <= 1;
                  })
                  .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                    if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                      acc.push('ellipsis');
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, index) => {
                    if (item === 'ellipsis') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-slate-400">
                          ...
                        </span>
                      );
                    }
                    const isSelected = item === safePage;
                    return (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                title="Próxima Página"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal - só abre se o usuário tiver permissão de criar ou editar */}
      {isModalOpen && (canCreate || canEdit) && (
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

            <div className="flex flex-wrap gap-1 px-4 pt-4 pb-0 shrink-0">
              {modalTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={formData.cpf || ''}
                        onChange={e => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">RG</label>
                      <input
                        type="text"
                        placeholder="Ex: 12.345.678-9"
                        value={formData.rg || ''}
                        onChange={e => setFormData({ ...formData, rg: formatRG(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de Admissão ao Lar</label>
                    <input
                      type="date"
                      value={formData.admissionDate || ''}
                      onChange={e => setFormData({ ...formData, admissionDate: e.target.value })}
                      className={inputClass}
                    />
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          onChange={e => {
                            const val = f.key === 'cpf' ? formatCPF(e.target.value) : e.target.value;
                            setFormData({
                              ...formData,
                              legalGuardian: { ...formData.legalGuardian!, [f.key]: val }
                            });
                          }}
                          className={inputClass}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm mb-3">
                      Contatos de Emergência
                      <span className="font-normal text-slate-400"> ({(formData.emergencyContacts || []).length}/{MAX_EMERGENCY_CONTACTS})</span>
                    </h4>
                    {(formData.emergencyContacts || []).length < MAX_EMERGENCY_CONTACTS && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                          <input placeholder="Nome" value={contactTemp.name} onChange={e => setContactTemp({ ...contactTemp, name: e.target.value })} className={inputClass} />
                          <input placeholder="Parentesco" value={contactTemp.relation} onChange={e => setContactTemp({ ...contactTemp, relation: e.target.value })} className={inputClass} />
                          <input placeholder="Telefone" value={contactTemp.phone} onChange={e => setContactTemp({ ...contactTemp, phone: e.target.value })} className={inputClass} />
                        </div>
                        <button type="button" onClick={addContact} className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition-colors">+ Adicionar Contato</button>
                      </>
                    )}
                    <div className="mt-3 space-y-2">
                      {formData.emergencyContacts?.map((c, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2 text-sm">
                          <span className="font-medium text-slate-700">{c.name} <span className="text-slate-400">({c.relation})</span></span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs">{c.phone}</span>
                            <button type="button" onClick={() => removeContact(i)} className="text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      O Residente apresenta sarcopenia ?
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, sarcopenia: 'sim' }))}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                          formData.sarcopenia === 'sim'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, sarcopenia: 'nao' }))}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                          formData.sarcopenia !== 'sim'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-650 mb-1.5">Alergias (separadas por vírgula)</label>
                    <textarea rows={2} placeholder="Ex: Dipirona, Penicilina, Glúten..." value={allergiesText} onChange={e => setAllergiesText(e.target.value)} className={inputClass + ' resize-none'} />
                  </div>
                </div>
              )}

              {activeTab === 'offboarding' && (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                        <UserX className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Desligamento do Residente</h4>
                        <p className="text-xs text-slate-500">Ao desligar o residente, ele passará para a seção "Residentes Desligados" com o status Inativo no banco de dados.</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-rose-200/60">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Status do Residente</label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, status: 'ativo' }))}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                              formData.status !== 'inativo'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <UserCheck className="w-4 h-4" /> Residente Ativo
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              status: 'inativo',
                              dataDesligamento: prev.dataDesligamento || new Date().toISOString().split('T')[0]
                            }))}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                              formData.status === 'inativo'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <UserX className="w-4 h-4" /> Desligado / Inativo
                          </button>
                        </div>
                      </div>

                      {formData.status === 'inativo' && (
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Data do Desligamento *</label>
                            <input
                              type="date"
                              value={formData.dataDesligamento || ''}
                              onChange={e => setFormData(prev => ({ ...prev, dataDesligamento: e.target.value }))}
                              className={inputClass}
                              required={formData.status === 'inativo'}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Motivo do Desligamento *</label>
                            <textarea
                              rows={3}
                              value={formData.motivoDesligamento || ''}
                              onChange={e => setFormData(prev => ({ ...prev, motivoDesligamento: e.target.value }))}
                              placeholder="Descreva o motivo (ex: óbito/certidão de óbito, transferência para outro local, alta médica...)"
                              className={inputClass + ' resize-none'}
                              required={formData.status === 'inativo'}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Anexar Documento (ex: Certidão de Óbito, Termo de Rescisão)</label>
                            
                            {formData.documentoDesligamento ? (
                              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                  <span className="text-xs font-semibold text-slate-700 truncate">Documento de Desligamento Anexado</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <a
                                    href={formData.documentoDesligamento}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1"
                                  >
                                    Visualizar <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, documentoDesligamento: '' }))}
                                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="relative">
                                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer bg-white hover:bg-blue-50/30 transition-colors">
                                  {uploadingOffboardingDoc ? (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                      Enviando documento...
                                    </div>
                                  ) : (
                                    <>
                                      <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                                      <span className="text-xs font-semibold text-slate-700">Clique para anexar documento (PDF ou Imagem)</span>
                                      <span className="text-[10px] text-slate-400">Certidão de óbito, termo de desligamento...</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleOffboardingDocUpload}
                                    disabled={uploadingOffboardingDoc}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
