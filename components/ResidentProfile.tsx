import React, { useState } from 'react';
import {
  ArrowLeft, Activity, Pill, FileText,
  Thermometer, Heart, CheckCircle, PenTool, ShieldCheck,
  ClipboardList, History, Plus, User, Clock, File, Paperclip, CalendarCheck, AlertOctagon,
  BedDouble, Home, Wrench, PaintRoller, Edit2, X, Phone, FileHeart, Trash2, Users, Camera, Sun, Moon,
  Key, Printer, Upload, Wind, UserCheck
} from 'lucide-react';
import { Resident, CarePlan, AuditLog, DailyChecklist, Medication, RoomStatus, Room, ViewState } from '../types';
import { residentAvatarSrc } from '../lib/avatar';
import { toast } from '../services/toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CustomSelect from './CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { compressImage, uploadResidentPhoto, uploadPrescriptionDocument, uploadResidentDocument, supabase } from '../services/supabaseClient';

interface ChecklistMedication {
  id: string;
  name: string;
  dosage: string;
  route?: string;
  status: 'tomou' | 'nao_tomou' | 'pendente';
  time?: string;
}

const parseMedications = (val?: string): ChecklistMedication[] | null => {
  if (!val) return null;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return null;
};

const getDayOfWeek = (dateString: string): 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' => {
  if (!dateString) return 'segunda';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days: ('domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado')[] = [
    'domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'
  ];
  return days[date.getDay()];
};

const isCarePlanActiveOnDate = (plan: CarePlan, dateString: string): boolean => {
  if (!plan.frequency) return true;
  try {
    const parsed = JSON.parse(plan.frequency);
    if (typeof parsed === 'object' && parsed !== null) {
      const dayOfWeek = getDayOfWeek(dateString);
      return Number(parsed[dayOfWeek]) > 0;
    }
  } catch (e) {
    // Treat legacy frequencies as active
    return true;
  }
  return true;
};

const formatFrequency = (frequency: string): string => {
  if (!frequency) return 'Não definida';
  try {
    const parsed = JSON.parse(frequency);
    if (typeof parsed === 'object' && parsed !== null) {
      const daysMap: Record<string, string> = {
        segunda: 'Seg',
        terca: 'Ter',
        quarta: 'Qua',
        quinta: 'Qui',
        sexta: 'Sex',
        sabado: 'Sáb',
        domingo: 'Dom'
      };
      const activeDays = Object.entries(parsed)
        .filter(([_, value]) => Number(value) > 0)
        .map(([day, value]) => `${daysMap[day] || day} (${value}x)`);
      if (activeDays.length > 0) {
        return activeDays.join(', ');
      }
      return 'Nenhum dia selecionado';
    }
  } catch (e) {
    // Legacy support
  }
  return frequency;
};


interface ResidentProfileProps {
  resident: Resident;
  rooms: Room[];
  onBack: () => void;
  onUpdateResident?: (resident: Resident) => void;
}

const ResidentProfile: React.FC<ResidentProfileProps> = ({ resident, rooms, onBack, onUpdateResident }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'meds' | 'vitals' | 'routine' | 'care_plan' | 'visits' | 'docs' | 'evolution' | 'history'>(() => {
    const saved = localStorage.getItem(`recanto_resident_profile_active_tab_${resident.id}`);
    return (saved as any) || 'vitals';
  });

  React.useEffect(() => {
    localStorage.setItem(`recanto_resident_profile_active_tab_${resident.id}`, activeTab);
  }, [activeTab, resident.id]);

  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docUploadName, setDocUploadName] = useState('');
  const [docUploadType, setDocUploadType] = useState<'exame' | 'laudo' | 'receita' | 'documento_pessoal' | 'outro'>('outro');
  const [isUploadingResidentDoc, setIsUploadingResidentDoc] = useState(false);

  const { currentUser, hasPermission } = useAuth();
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitData, setVisitData] = useState({
    visitorName: '',
    relation: '',
    cpf: '',
    phone: '',
    date: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
    temperature: '',
    observations: ''
  });

  const canRegisterVisits = currentUser?.profile.type === 'Administrador' || 
                            currentUser?.profile.type === 'Médico' || 
                            currentUser?.profile.type === 'Cuidador';

  const canManageCarePlan = currentUser?.profile.type === 'Médico' ||
                            currentUser?.employeeRole === 'Médico' ||
                            currentUser?.employeeRole === 'Nutricionista' ||
                            currentUser?.employeeRole === 'Fisioterapeuta' ||
                            currentUser?.profile.type === 'Administrador';

  const canManageDocuments = hasPermission(ViewState.RESIDENT_DETAIL, 'delete');

  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const handleDeleteDocument = async () => {
    if (!docToDelete || !onUpdateResident) return;
    const updatedResident = {
      ...resident,
      documents: (resident.documents || []).filter(d => d.id !== docToDelete)
    };
    try {
      await onUpdateResident(updatedResident);
      toast.success('Documento excluído com sucesso!');
    } catch {
      toast.error('Erro ao excluir documento. Tente novamente.');
    } finally {
      setDocToDelete(null);
    }
  };

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateResident || !visitData.visitorName || !visitData.relation) return;

    const newVisit = {
      id: Math.random().toString(36).substr(2, 9),
      residentId: resident.id,
      visitorName: visitData.visitorName,
      relation: visitData.relation,
      cpf: visitData.cpf || undefined,
      phone: visitData.phone || undefined,
      date: new Date(visitData.date).toISOString(),
      temperature: visitData.temperature ? parseFloat(visitData.temperature) : undefined,
      observations: visitData.observations || undefined,
      createdBy: currentUser?.name || 'Usuário Atual'
    };

    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'current-user',
      userName: currentUser?.name || 'Usuário Atual',
      action: 'Registro de Visita',
      details: `Registrou visita de ${newVisit.visitorName} (${newVisit.relation})`
    };

    onUpdateResident({
      ...resident,
      visits: [newVisit, ...(resident.visits || [])],
      auditLogs: [newLog, ...(resident.auditLogs || [])]
    });

    setVisitData({
      visitorName: '',
      relation: '',
      cpf: '',
      phone: '',
      date: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
      temperature: '',
      observations: ''
    });
    setIsVisitModalOpen(false);
  };

  const handleDeleteVisit = (visitId: string) => {
    if (!onUpdateResident) return;
    
    const visit = resident.visits?.find(v => v.id === visitId);
    if (!visit) return;

    if (confirm(`Tem certeza que deseja excluir o registro da visita de ${visit.visitorName}?`)) {
      const updatedVisits = (resident.visits || []).filter(v => v.id !== visitId);
      
      const newLog: AuditLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'current-user',
        userName: currentUser?.name || 'Usuário Atual',
        action: 'Exclusão de Visita',
        details: `Removeu visita de ${visit.visitorName} (${visit.relation})`
      };

      onUpdateResident({
        ...resident,
        visits: updatedVisits,
        auditLogs: [newLog, ...(resident.auditLogs || [])]
      });
    }
  };

  // Edit Resident Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<'personal' | 'contacts' | 'clinical' | 'routine'>('personal');
  const [formData, setFormData] = useState<Partial<Resident>>({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [checklistPhotoUploading, setChecklistPhotoUploading] = useState(false);
  const [contactTemp, setContactTemp] = useState({ name: '', relation: '', phone: '' });
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const calculateAge = (birthDateString: string): number => {
    if (!birthDateString) return 0;
    const parts = birthDateString.split('-');
    if (parts.length !== 3) return 0;
    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10) - 1;
    const birthDay = parseInt(parts[2], 10);
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    const m = today.getMonth() - birthMonth;
    if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  const handleStartEditResident = () => {
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
    setModalActiveTab('personal');
    setIsEditModalOpen(true);
  };

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
        }
      } catch (err) {
        setCepError('Erro ao buscar o CEP.');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleChecklistPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChecklistPhotoUploading(true);
    try {
      const base64 = await compressImage(file, 800, 800, 0.85);
      const finalUrl = await uploadResidentPhoto(file, base64);
      handleChecklistFieldChange('photoUrl', finalUrl);
    } catch (err) {
      console.error('Erro ao processar imagem do boletim:', err);
      toast.error('Erro ao processar a foto. Tente novamente.');
    } finally {
      setChecklistPhotoUploading(false);
    }
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

  const handleSaveResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateResident || !formData.name || !formData.room) return;

    const updated: Resident = {
      ...resident,
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
    setIsEditModalOpen(false);
  };

  // Care Plan Form
  const [newPlan, setNewPlan] = useState({ title: '', description: '', frequency: '', assignedTo: '' });
  const [frequencyDays, setFrequencyDays] = useState({
    segunda: { checked: false, times: 1 },
    terca: { checked: false, times: 1 },
    quarta: { checked: false, times: 1 },
    quinta: { checked: false, times: 1 },
    sexta: { checked: false, times: 1 },
    sabado: { checked: false, times: 1 },
    domingo: { checked: false, times: 1 }
  });
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [vitalsPeriodType, setVitalsPeriodType] = useState<'day' | 'week' | 'month'>('day');
  const [vitalsSelectedDay, setVitalsSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vitalsSelectedWeekDate, setVitalsSelectedWeekDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vitalsSelectedMonth, setVitalsSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Daily Checklist State
  const today = new Date().toISOString().split('T')[0];
  const [selectedChecklistDate, setSelectedChecklistDate] = useState(today);
  const [selectedShift, setSelectedShift] = useState<'diurno' | 'noturno'>('diurno');
  const [isAllChecklistsModalOpen, setIsAllChecklistsModalOpen] = useState(false);
  const [isSignConfirmModalOpen, setIsSignConfirmModalOpen] = useState(false);
  const [isNoSignatureModalOpen, setIsNoSignatureModalOpen] = useState(false);
  const [isNoCpfModalOpen, setIsNoCpfModalOpen] = useState(false);
  const [signConfirmContext, setSignConfirmContext] = useState<'read' | 'edit'>('read');
  const [signatureMode, setSignatureMode] = useState<'simples' | 'certificado_a1'>('simples');

  const selectedChecklist = resident.dailyChecklists?.find(
    c => c.date === selectedChecklistDate && (c.shift || 'diurno') === selectedShift
  ) || {
    date: selectedChecklistDate,
    shift: selectedShift,
    hygiene: false,
    oralCare: false,
    feeding: false,
    hydration: false,
    mobility: false,
    dressings: false,
    leisure: false
  };

  const [checklistDraft, setChecklistDraft] = useState<DailyChecklist | null>(null);

  // Keep track of the current key we have loaded/saved to prevent race conditions on mount/change
  const lastLoadedChecklistKeyRef = React.useRef<string | null>(null);

  // Sync checklist draft with localStorage
  React.useEffect(() => {
    const key = `recanto_checklist_draft_${resident.id}_${selectedChecklistDate}_${selectedShift}`;
    
    // If the key has changed (e.g. date, shift, or resident changed), load the corresponding draft
    if (lastLoadedChecklistKeyRef.current !== key) {
      lastLoadedChecklistKeyRef.current = key;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setChecklistDraft(JSON.parse(saved));
        } catch (e) {
          setChecklistDraft(null);
        }
      } else {
        setChecklistDraft(null);
      }
      return;
    }

    // Otherwise, this is a change to the current checklistDraft state (e.g. user typed something)
    if (checklistDraft) {
      localStorage.setItem(key, JSON.stringify(checklistDraft));
    } else {
      localStorage.removeItem(key);
    }
  }, [checklistDraft, resident.id, selectedChecklistDate, selectedShift]);

  // Keep track of the loaded edit resident key to prevent race conditions
  const lastLoadedEditResidentKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const keyPrefix = `recanto_edit_resident_${resident.id}`;
    const openKey = `${keyPrefix}_open`;
    const tabKey = `${keyPrefix}_tab`;
    const formKey = `${keyPrefix}_form`;
    const contactKey = `${keyPrefix}_contact`;

    if (lastLoadedEditResidentKeyRef.current !== resident.id) {
      lastLoadedEditResidentKeyRef.current = resident.id;
      
      const savedOpen = localStorage.getItem(openKey) === 'true';
      setIsEditModalOpen(savedOpen);

      const savedTab = localStorage.getItem(tabKey) as any || 'personal';
      setModalActiveTab(savedTab);

      const savedForm = localStorage.getItem(formKey);
      setFormData(savedForm ? JSON.parse(savedForm) : {});

      const savedContact = localStorage.getItem(contactKey);
      setContactTemp(savedContact ? JSON.parse(savedContact) : { name: '', relation: '', phone: '' });
      return;
    }

    if (isEditModalOpen) {
      localStorage.setItem(openKey, 'true');
      localStorage.setItem(tabKey, modalActiveTab);
      localStorage.setItem(formKey, JSON.stringify(formData));
      localStorage.setItem(contactKey, JSON.stringify(contactTemp));
    } else {
      localStorage.removeItem(openKey);
      localStorage.removeItem(tabKey);
      localStorage.removeItem(formKey);
      localStorage.removeItem(contactKey);
    }
  }, [isEditModalOpen, modalActiveTab, formData, contactTemp, resident.id]);

  // Keep track of the loaded visit key to prevent race conditions
  const lastLoadedVisitKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const openKey = `recanto_visit_open_${resident.id}`;
    const dataKey = `recanto_visit_data_${resident.id}`;

    if (lastLoadedVisitKeyRef.current !== resident.id) {
      lastLoadedVisitKeyRef.current = resident.id;

      const savedOpen = localStorage.getItem(openKey) === 'true';
      setIsVisitModalOpen(savedOpen);

      const savedData = localStorage.getItem(dataKey);
      setVisitData(savedData ? JSON.parse(savedData) : {
        visitorName: '',
        relation: '',
        cpf: '',
        phone: '',
        date: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
        temperature: '',
        observations: ''
      });
      return;
    }

    if (isVisitModalOpen) {
      localStorage.setItem(openKey, 'true');
      localStorage.setItem(dataKey, JSON.stringify(visitData));
    } else {
      localStorage.removeItem(openKey);
      localStorage.removeItem(dataKey);
    }
  }, [isVisitModalOpen, visitData, resident.id]);

  // Prescription Form Modal States
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState({
    name: '',
    dosage: '',
    route: 'Oral',
    frequency: '12h em 12h',
    nextDose: '08:00',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    observations: '',
    documentUrl: '',
    documentName: ''
  });

  // Keep track of the loaded prescription key to prevent race conditions
  const lastLoadedPrescriptionKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const openKey = `recanto_prescription_open_${resident.id}`;
    const dataKey = `recanto_prescription_data_${resident.id}`;

    if (lastLoadedPrescriptionKeyRef.current !== resident.id) {
      lastLoadedPrescriptionKeyRef.current = resident.id;

      const savedOpen = localStorage.getItem(openKey) === 'true';
      setIsPrescriptionModalOpen(savedOpen);

      const savedData = localStorage.getItem(dataKey);
      setPrescriptionData(savedData ? JSON.parse(savedData) : {
        name: '',
        dosage: '',
        route: 'Oral',
        frequency: '12h em 12h',
        nextDose: '08:00',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        observations: '',
        documentUrl: '',
        documentName: ''
      });
      return;
    }

    if (isPrescriptionModalOpen) {
      localStorage.setItem(openKey, 'true');
      localStorage.setItem(dataKey, JSON.stringify(prescriptionData));
    } else {
      localStorage.removeItem(openKey);
      localStorage.removeItem(dataKey);
    }
  }, [isPrescriptionModalOpen, prescriptionData, resident.id]);

  // Keep track of the loaded care plan key to prevent race conditions
  const lastLoadedCarePlanKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const openKey = `recanto_careplan_open_${resident.id}`;
    const dataKey = `recanto_careplan_data_${resident.id}`;
    const freqKey = `recanto_careplan_freq_${resident.id}`;

    if (lastLoadedCarePlanKeyRef.current !== resident.id) {
      lastLoadedCarePlanKeyRef.current = resident.id;

      const savedOpen = localStorage.getItem(openKey) === 'true';
      setShowPlanForm(savedOpen);

      const savedData = localStorage.getItem(dataKey);
      setNewPlan(savedData ? JSON.parse(savedData) : { title: '', description: '', frequency: '', assignedTo: '' });

      const savedFreq = localStorage.getItem(freqKey);
      setFrequencyDays(savedFreq ? JSON.parse(savedFreq) : {
        segunda: { checked: false, times: 1 },
        terca: { checked: false, times: 1 },
        quarta: { checked: false, times: 1 },
        quinta: { checked: false, times: 1 },
        sexta: { checked: false, times: 1 },
        sabado: { checked: false, times: 1 },
        domingo: { checked: false, times: 1 }
      });
      return;
    }

    if (showPlanForm) {
      localStorage.setItem(openKey, 'true');
      localStorage.setItem(dataKey, JSON.stringify(newPlan));
      localStorage.setItem(freqKey, JSON.stringify(frequencyDays));
    } else {
      localStorage.removeItem(openKey);
      localStorage.removeItem(dataKey);
      localStorage.removeItem(freqKey);
    }
  }, [showPlanForm, newPlan, frequencyDays, resident.id]);

  // Keep track of the loaded clinical note key to prevent race conditions
  const lastLoadedClinicalNoteKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const key = `recanto_clinical_note_${resident.id}`;

    if (lastLoadedClinicalNoteKeyRef.current !== resident.id) {
      lastLoadedClinicalNoteKeyRef.current = resident.id;

      const saved = localStorage.getItem(key);
      setNewNoteText(saved || '');
      return;
    }

    if (newNoteText) {
      localStorage.setItem(key, newNoteText);
    } else {
      localStorage.removeItem(key);
    }
  }, [newNoteText, resident.id]);

  const handleRequestSign = async (context: 'read' | 'edit') => {
    let mode: 'simples' | 'certificado_a1' = 'simples';

    if (currentUser?.empresaId) {
      try {
        const { data, error } = await supabase
          .from('Recanto_Empresas')
          .select('tipo_assinatura_documentos')
          .eq('empresa_id', currentUser.empresaId)
          .single();

        if (!error && data?.tipo_assinatura_documentos === 'certificado_a1') {
          mode = 'certificado_a1';
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('[Assinatura] empresa:', currentUser.empresaId, '| tipo carregado:', mode);
        }
      } catch (err) {
        console.error('[Assinatura] Erro ao buscar configuração de assinatura:', err);
      }
    }

    setSignatureMode(mode);

    if (mode === 'certificado_a1') {
      if (!currentUser?.certificate) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Assinatura] Bloqueado: certificado A1 não cadastrado para o usuário');
        }
        setIsNoSignatureModalOpen(true);
        return;
      }
      setSignConfirmContext(context);
      setIsSignConfirmModalOpen(true);
      return;
    }

    // mode === 'simples'
    if (!currentUser?.cpf) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Assinatura] Bloqueado: CPF não cadastrado para o usuário');
      }
      setIsNoCpfModalOpen(true);
      return;
    }

    setSignConfirmContext(context);
    setIsSignConfirmModalOpen(true);
  };

  const handleConfirmSign = async () => {
    const rolePrefix: Record<string, string> = {
      Enfermeiro: 'Enf.',
      Médico: 'Dr(a).',
      Cuidador: 'Cuid.',
      Nutricionista: 'Nutri.',
      Fisioterapeuta: 'Fisio.',
    };
    const prefix = currentUser?.employeeRole ? rolePrefix[currentUser.employeeRole] ?? '' : '';
    const userName = currentUser?.name || 'Usuário';
    const signedBy = prefix ? `${prefix} ${userName}` : userName;

    let signedAt = new Date().toISOString();
    let signatureInfo: string | undefined;

    if (signatureMode === 'simples') {
      try {
        const { data: sigData, error: sigError } = await supabase
          .from('documento_assinaturas')
          .insert({
            empresa_id: currentUser?.empresaId ?? '',
            documento_id: resident.id,
            usuario_id: currentUser?.id ?? '',
            nome_assinante: userName,
            cpf_assinante: currentUser?.cpf ?? '',
            tipo_assinatura: 'simples',
          })
          .select('assinado_em')
          .single();

        if (sigError) {
          console.error('[Assinatura Simples] Erro ao registrar:', sigError);
          toast.error('Erro ao registrar assinatura. Tente novamente.');
          return;
        }

        if (sigData?.assinado_em) {
          signedAt = sigData.assinado_em;
        }

        signatureInfo = JSON.stringify({
          tipo_assinatura: 'simples',
          nome_assinante: userName,
          cpf_assinante: currentUser?.cpf,
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('[Assinatura Simples] Registrada com sucesso:', {
            usuario: userName,
            cpf: currentUser?.cpf,
            assinado_em: signedAt,
          });
        }
      } catch (err) {
        console.error('[Assinatura Simples] Erro inesperado:', err);
        toast.error('Erro ao registrar assinatura. Tente novamente.');
        return;
      }
    } else {
      // certificado_a1 — fluxo original
      signatureInfo = currentUser?.certificate ? JSON.stringify({
        certificate_holder_name: currentUser.certificate.certificate_holder_name,
        certificate_document: currentUser.certificate.certificate_document,
        certificate_serial_number: currentUser.certificate.certificate_serial_number,
        certificate_issuer: currentUser.certificate.certificate_issuer,
        certificate_issue_date: currentUser.certificate.certificate_issue_date,
        certificate_expiration_date: currentUser.certificate.certificate_expiration_date,
      }) : undefined;
    }

    if (signConfirmContext === 'edit' && checklistDraft && onUpdateResident) {
      const signedDraft = { ...checklistDraft, signedBy, signedAt, signatureInfo, shift: selectedShift };
      const otherChecklists = resident.dailyChecklists?.filter(
        c => !(c.date === signedDraft.date && (c.shift || 'diurno') === selectedShift)
      ) || [];
      onUpdateResident({ ...resident, dailyChecklists: [signedDraft, ...otherChecklists] });
      setSelectedChecklistDate(signedDraft.date);
      setChecklistDraft(null);
    } else if (signConfirmContext === 'read' && onUpdateResident) {
      const updatedChecklist = { ...selectedChecklist, signedBy, signedAt, signatureInfo, shift: selectedShift };
      const otherChecklists = resident.dailyChecklists?.filter(
        c => !(c.date === updatedChecklist.date && (c.shift || 'diurno') === selectedShift)
      ) || [];
      onUpdateResident({ ...resident, dailyChecklists: [updatedChecklist, ...otherChecklists] });
    }

    setIsSignConfirmModalOpen(false);
    if (signatureMode === 'simples') {
      toast.success('Documento assinado com sucesso!');
    }
  };

  const handlePrintChecklist = () => {
    if (!selectedChecklist) return;

    let watermarkSrc = '';
    let hasLetterhead = false;
    let inst = {
      name: 'Recanto dos Anciãos',
      cnpj: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: 'SP',
      cep: '',
      directorName: '',
      technicalDirector: '',
      anvisa: '',
    };

    try {
      const settingsKey = `recanto_system_settings_${currentUser?.empresaId ?? currentUser?.id ?? 'anon'}`;
      const raw = localStorage.getItem(settingsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.institution) {
          inst = { ...inst, ...parsed.institution };
          const src = parsed.institution.watermarkImage;
          if (src) {
            hasLetterhead = true;
            watermarkSrc = src;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados da instituição ou papel timbrado:', e);
    }

    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) {
      toast.warning('Permita popups para gerar a impressão.');
      return;
    }

    const parsedMeds = parseMedications(selectedChecklist.medicacoesAdministradas);
    const shiftLabel = selectedShift === 'diurno' ? 'Diurno' : 'Noturno';
    const dateFormatted = new Date(selectedChecklistDate + 'T00:00:00').toLocaleDateString('pt-BR');

    const docHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boletim ${shiftLabel} - ${resident.name} - ${dateFormatted}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 11px; padding: 20px 0; line-height: 1.4; background: #f1f5f9; display: flex; flex-direction: column; align-items: center; }
    @media print {
      body { background: transparent; padding: 0; margin: 0; display: block; }
    }
    
    /* Paginação Real A4 */
    #pdf-pages {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    @media print {
      #pdf-pages {
        display: block;
      }
    }
    .pdf-page {
      width: 210mm;
      height: 297mm;
      position: relative;
      background: white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      margin-bottom: 20px;
      overflow: hidden;
      box-sizing: border-box;
    }
    @media print {
      .pdf-page {
        box-shadow: none;
        margin-bottom: 0;
        page-break-after: always;
        break-after: page;
      }
    }
    .letterhead-background {
      position: absolute;
      top: 0; left: 0;
      width: 210mm; height: 297mm;
      z-index: 1;
      pointer-events: none;
      background-repeat: no-repeat;
      background-position: center top;
      background-size: 100% 100%;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .watermark-background {
      position: absolute;
      top: 0; left: 0;
      width: 210mm; height: 297mm;
      z-index: 2;
      pointer-events: none;
      opacity: 0.04;
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page-content-safe-area {
      position: absolute;
      top: 45mm;
      left: 20mm;
      width: 170mm;
      height: 207mm;
      z-index: 10;
      box-sizing: border-box;
      overflow: hidden;
      background: transparent;
    }

    /* Header styles */
    .inst-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; }
    .inst-info { flex: 1; }
    .inst-title { font-size: 15px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
    .inst-details { font-size: 10px; color: #64748b; }
    .inst-rt { text-align: right; font-size: 10px; color: #64748b; }
    
    /* Document title */
    .doc-title { font-size: 13px; font-weight: bold; text-align: center; text-transform: uppercase; color: #1e293b; margin-bottom: 12px; letter-spacing: 0.5px; }
    
    /* Sections */
    .section { margin-bottom: 6mm; background: rgba(255, 255, 255, 0.85); border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .section-title { background: rgba(248, 250, 252, 0.9); font-size: 11px; font-weight: bold; color: #334155; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-content { padding: 8px 12px; }
    
    /* Grid styles */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
    .field { margin-bottom: 4px; }
    .field-label { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
    .field-value { font-size: 11px; color: #1e293b; font-weight: 500; }
    
    /* Badge styles */
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
    .bg-gray { background: #f1f5f9; color: #475569; }
    .bg-green { background: #d1fae5; color: #065f46; }
    .bg-yellow { background: #fef3c7; color: #92400e; }
    .bg-red { background: #fee2e2; color: #991b1b; }
    .bg-blue { background: #dbeafe; color: #1d4ed8; }
    
    /* Vitals grid */
    .vital-card { text-align: center; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .vital-card.hr { background: rgba(255, 245, 245, 0.9); border-color: #fee2e2; }
    .vital-card.bp { background: rgba(239, 246, 255, 0.9); border-color: #dbeafe; }
    .vital-card.spo2 { background: rgba(240, 249, 255, 0.9); border-color: #e0f2fe; }
    .vital-card.temp { background: rgba(255, 251, 235, 0.9); border-color: #fef3c7; }
    
    /* Table styles */
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; background: rgba(255, 255, 255, 0.85); border-left: none !important; border-right: none !important; }
    th { background: rgba(248, 250, 252, 0.9); padding: 6px 8px; text-align: left; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0; border-left: none !important; border-right: none !important; }
    td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; border-left: none !important; border-right: none !important; }
    
    /* Signature panel */
    .sig-panel { border: 1px dashed #10b981; background: rgba(240, 253, 244, 0.9); border-radius: 6px; padding: 10px; margin-top: 10px; page-break-inside: avoid; break-inside: avoid; }
    .sig-title { display: flex; align-items: center; font-weight: bold; color: #065f46; margin-bottom: 8px; font-size: 12px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9px; }
    .sig-field { background: #fff; padding: 6px; border: 1px solid #d1fae5; border-radius: 4px; }
    .sig-field-label { color: #2e7d32; font-weight: bold; text-transform: uppercase; font-size: 8px; }
    .sig-field-value { color: #065f46; font-weight: bold; margin-top: 2px; }
    
    .footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; page-break-inside: avoid; break-inside: avoid; }
    
    .section, .sig-panel, table, tr, .footer { page-break-inside: avoid; break-inside: avoid; }
    
    @media screen and (max-width: 640px) {
      body { padding: 16px; }
      .grid-2, .grid-4 { grid-template-columns: 1fr; }
      .inst-header { flex-direction: column; gap: 8px; }
      .inst-rt { text-align: left; }
    }
    @media print {
      body { padding: 0; background: transparent; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div id="pdf-source" style="position: absolute; left: -9999px; top: 0; width: 170mm; box-sizing: border-box;">
    ${hasLetterhead ? '' : `
    <!-- Institutional Header -->
    <div class="inst-header">
      <div class="inst-info">
        <div class="inst-title">${inst.name}</div>
        <div class="inst-details">
          CNPJ: ${inst.cnpj || '—'} | Tel: ${inst.phone || '—'} | E-mail: ${inst.email || '—'}<br/>
          Endereço: ${inst.address || ''} ${inst.city || ''} ${inst.state ? `- ${inst.state}` : ''} CEP: ${inst.cep || ''}
        </div>
      </div>
      <div class="inst-rt">
        ${inst.directorName ? `Diretoria: ${inst.directorName}<br/>` : ''}
        ${inst.technicalDirector ? `Resp. Técnico: ${inst.technicalDirector}<br/>` : ''}
        ${inst.anvisa ? `Alvará ANVISA: ${inst.anvisa}` : ''}
      </div>
    </div>
    `}
    
    <!-- Document Title -->
    <div class="doc-title">
      Boletim de Evolução e Rotina Diária (${shiftLabel})
    </div>
    
    <!-- Resident Info -->
    <div class="section">
      <div class="section-title">Identificação do Residente</div>
      <div class="section-content">
        <div class="grid-2">
          <div>
            <div class="field">
              <div class="field-label">Residente</div>
              <div class="field-value">${resident.name}</div>
            </div>
            <div class="field">
              <div class="field-label">CPF</div>
              <div class="field-value">${resident.cpf || '—'}</div>
            </div>
            <div class="field">
              <div class="field-label">Data de Nascimento</div>
              <div class="field-value">${resident.birthDate || '—'} (${resident.age} anos)</div>
            </div>
          </div>
          <div>
            <div class="field">
              <div class="field-label">Data de Referência</div>
              <div class="field-value">${dateFormatted}</div>
            </div>
            <div class="field">
              <div class="field-label">Quarto / Acomodação</div>
              <div class="field-value">${resident.room}</div>
            </div>
            <div class="field">
              <div class="field-label">Grau de Dependência</div>
              <div class="field-value"><span class="badge ${resident.careLevel === 'I' ? 'bg-green' : resident.careLevel === 'II' ? 'bg-yellow' : 'bg-red'}">Grau ${resident.careLevel}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Sinais Vitais -->
    <div class="section">
      <div class="section-title">1. Sinais Vitais</div>
      <div class="section-content">
        <div class="grid-4">
          <div class="vital-card hr">
            <div class="field-label" style="color: #991b1b;">Frequência Cardíaca</div>
            <div class="field-value" style="font-size: 14px; font-weight: bold; color: #991b1b; margin: 4px 0;">${selectedChecklist.frequenciaCardiaca || '—'}</div>
            <div class="field-label" style="color: #f87171;">bpm</div>
          </div>
          <div class="vital-card bp">
            <div class="field-label" style="color: #1e3a8a;">Pressão Arterial</div>
            <div class="field-value" style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin: 4px 0;">${selectedChecklist.pressaoArterial || '—'}</div>
            <div class="field-label" style="color: #60a5fa;">mmHg</div>
          </div>
          <div class="vital-card spo2">
            <div class="field-label" style="color: #0369a1;">Saturação (SpO2)</div>
            <div class="field-value" style="font-size: 14px; font-weight: bold; color: #0369a1; margin: 4px 0;">${selectedChecklist.saturacao || '—'}</div>
            <div class="field-label" style="color: #38bdf8;">%</div>
          </div>
          <div class="vital-card temp">
            <div class="field-label" style="color: #854d0e;">Temperatura</div>
            <div class="field-value" style="font-size: 14px; font-weight: bold; color: #854d0e; margin: 4px 0;">${selectedChecklist.temperatura || '—'}</div>
            <div class="field-label" style="color: #fbbf24;">°C</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Sintomas & Estado Geral -->
    <div class="section">
      <div class="section-title">2. Sintomas e Estado Geral</div>
      <div class="section-content">
        <div class="grid-2">
          <div>
            <div class="field">
              <div class="field-label">Queixa de Dor</div>
              <div class="field-value">
                ${selectedChecklist.queixaDor === 'sim' 
                  ? `<span class="badge bg-red">Sim - ${selectedChecklist.queixaDorDesc || 'Sem descrição'}</span>` 
                  : 'Não relatada'}
              </div>
            </div>
            <div class="field">
              <div class="field-label">Oxigenação</div>
              <div class="field-value">
                ${selectedChecklist.arAmbiente 
                  ? 'Ar Ambiente (Respiração normal)' 
                  : 'Necessitando de O2 Suplementar'}
              </div>
            </div>
          </div>
          <div>
            <div class="field">
              <div class="field-label">Estado Neurológico</div>
              <div class="field-value">${selectedChecklist.estadoNeurologico || 'Não informado'}</div>
            </div>
            <div class="field">
              <div class="field-label">Comportamento Observado</div>
              <div class="field-value">
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                  ${selectedChecklist.agitado ? '<span class="badge bg-yellow">Agitado</span>' : ''}
                  ${selectedChecklist.prostrado ? '<span class="badge bg-blue">Prostrado</span>' : ''}
                  ${selectedChecklist.sonolento ? '<span class="badge bg-gray">Sonolento</span>' : ''}
                  ${!selectedChecklist.agitado && !selectedChecklist.prostrado && !selectedChecklist.sonolento 
                    ? '<span class="badge bg-green">Calmo / Estável</span>' 
                    : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Alimentação & Eliminações -->
    <div class="section">
      <div class="section-title">3. Alimentação & Eliminações</div>
      <div class="section-content">
        <div class="grid-2">
          <div>
            <div class="field">
              <div class="field-label">Aceitação Alimentar</div>
              <div class="field-value">
                ${selectedChecklist.alimentacao === 'boa' ? '<span class="badge bg-green">Boa Aceitação</span>' :
                  selectedChecklist.alimentacao === 'moderada' ? '<span class="badge bg-yellow">Aceitação Moderada</span>' :
                  selectedChecklist.alimentacao === 'ruim' ? `<span class="badge bg-red">Aceitação Ruim: ${selectedChecklist.alimentacaoDesc || ''}</span>` :
                  'Não informado'}
              </div>
            </div>
            <div class="field">
              <div class="field-label">Evacuação (Bolo Fecal)</div>
              <div class="field-value">
                ${selectedChecklist.eliminacaoEvacuacao === 'presente' 
                  ? '<span class="badge bg-green">Presente</span>' 
                  : `<span class="badge bg-red">Ausente</span>`}
                ${selectedChecklist.eliminacaoEvacuacaoDias ? ` (Dias sem evacuar: ${selectedChecklist.eliminacaoEvacuacaoDias})` : ''}
              </div>
            </div>
            <div class="field">
              <div class="field-label">Aspecto das Evacuações</div>
              <div class="field-value">
                ${selectedChecklist.aspectoEvacuacoes === 'endurecidas' ? 'Fezes Endurecidas' :
                  selectedChecklist.aspectoEvacuacoes === 'pastosa' ? 'Pastosa' :
                  selectedChecklist.aspectoEvacuacoes === 'semi-liquidas' ? 'Semi-líquidas' :
                  selectedChecklist.aspectoEvacuacoes === 'liquida-diarreia' ? '<span class="badge bg-red">Líquida / Diarreia</span>' : 
                  'Não informado'}
              </div>
            </div>
          </div>
          <div>
            <div class="field">
              <div class="field-label">Diurese</div>
              <div class="field-value">
                ${selectedChecklist.diurese === 'ausente' ? '<span class="badge bg-red">Ausente</span>' :
                  selectedChecklist.diurese === 'aumentada' ? '<span class="badge bg-yellow">Aumentada</span>' :
                  selectedChecklist.diurese === 'diminuida' ? '<span class="badge bg-yellow">Diminuída</span>' :
                  'Adequada / Normal'}
              </div>
            </div>
            <div class="field">
              <div class="field-label">Aspecto Urinário</div>
              <div class="field-value">
                ${selectedChecklist.diureseAspecto === 'clara' ? 'Clara / Limpida' :
                  selectedChecklist.diureseAspecto === 'concentrada' ? 'Concentrada' :
                  selectedChecklist.diureseAspecto === 'odor-sangue-ardencia' ? '<span class="badge bg-red">Com Odor / Sangue / Ardência</span>' :
                  'Não informado'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Cuidados & Mobilidade -->
    <div class="section">
      <div class="section-title">4. Cuidados Diários & Mobilidade</div>
      <div class="section-content">
        <div class="grid-2">
          <div>
            <div class="field">
              <div class="field-label">Uso de Fraldas</div>
              <div class="field-value">
                ${selectedChecklist.usoFraldas === 'sim' ? 'Sim, faz uso de fralda' : 'Não faz uso'}
              </div>
            </div>
            <div class="field">
              <div class="field-label">Mobilidade no Turno</div>
              <div class="field-value">
                ${selectedChecklist.mobilidadeSet === 'independente' ? 'Independente' :
                  selectedChecklist.mobilidadeSet === 'auxilio' ? 'Com Auxílio' :
                  selectedChecklist.mobilidadeSet === 'acamado' ? 'Acamado' : 'Não informado'}
              </div>
            </div>
          </div>
          <div>
            <div class="field">
              <div class="field-label">Higiene Corporal / Banho</div>
              <div class="field-value">
                ${selectedChecklist.higieneCorporal === 'independente' ? 'Independente' :
                  selectedChecklist.higieneCorporal === 'auxilio' ? 'Com Auxílio' : 'Não informado'}
              </div>
            </div>
            <div class="field">
              <div class="field-label">Higiene Oral & Vestir</div>
              <div class="field-value">
                ${selectedChecklist.higieneOralVestir === 'independente' ? 'Independente' :
                  selectedChecklist.higieneOralVestir === 'auxilio' ? 'Com Auxílio' : 'Não informado'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Diagnósticos, Sono & Rotina -->
    <div class="section">
      <div class="section-title">5. Diagnósticos de Pele, Sono e Ocorrências</div>
      <div class="section-content">
        <div class="field" style="margin-bottom: 12px;">
          <div class="field-label">Alterações de Pele / Edemas / Lesões</div>
          <div class="field-value">
            ${selectedChecklist.alteracoesPele === 'sim' 
              ? `<span class="badge bg-red">Sim: ${selectedChecklist.alteracoesPeleDesc || 'Sem descrição'}</span>` 
              : 'Pele íntegra / Sem alterações observadas'}
          </div>
        </div>
        ${selectedShift === 'noturno' ? `
        <div class="field" style="margin-bottom: 12px;">
          <div class="field-label">Qualidade do Sono</div>
          <div class="field-value">
            ${selectedChecklist.sono === 'insatisfatorio'
              ? `<span class="badge bg-yellow">Insatisfatório: ${selectedChecklist.sonoDesc || ''}</span>`
              : 'Sono preservado / Dormiu bem'}
          </div>
        </div>` : ''}
        <div class="field" style="margin-bottom: 12px;">
          <div class="field-label">Outras Atividades / Consultas</div>
          <div class="field-value">${selectedChecklist.atividadesConsulta || 'Nenhuma atividade registrada.'}</div>
        </div>
        <div class="field">
          <div class="field-label">Ocorrência / Intercorrência médica no turno</div>
          <div class="field-value">
            ${selectedChecklist.intercorrencia === 'sim'
              ? `<span class="badge bg-red">SIM: ${selectedChecklist.intercorrenciaDesc || 'Sem detalhes'}</span>`
              : 'Não houve intercorrência registrada.'}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Medicações Administradas -->
    <div class="section">
      <div class="section-title">6. Registro de Medicações no Turno</div>
      <div class="section-content">
        ${parsedMeds && parsedMeds.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Dosagem / Via</th>
                <th>Status</th>
                <th>Horário</th>
              </tr>
            </thead>
            <tbody>
              ${parsedMeds.map(med => `
                <tr>
                  <td style="font-weight: bold;">${med.name}</td>
                  <td>${med.dosage} (${med.route || '—'})</td>
                  <td>
                    <span class="badge ${
                      med.status === 'tomou' ? 'bg-green' :
                      med.status === 'nao_tomou' ? 'bg-red' : 'bg-gray'
                    }">
                      ${med.status === 'tomou' ? 'Administrado' :
                        med.status === 'nao_tomou' ? 'Não Administrado' : 'Pendente'}
                    </span>
                  </td>
                  <td>${med.time || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div style="font-size: 11px; color: #64748b; font-style: italic; padding: 4px 0;">Nenhuma medicação programada ou administrada para este turno.</div>'}
      </div>
    </div>
    
    <!-- Assinatura Digital -->
    ${selectedChecklist.signedBy ? (() => {
      let certDetails = '';
      let isSimples = false;
      if (selectedChecklist.signatureInfo) {
        try {
          const cert = JSON.parse(selectedChecklist.signatureInfo);
          isSimples = cert.tipo_assinatura === 'simples';
          if (isSimples) {
            certDetails = `
              <div class="sig-grid">
                <div class="sig-field">
                  <div class="sig-field-label">Assinante / Titular</div>
                  <div class="sig-field-value">${cert.nome_assinante || selectedChecklist.signedBy}</div>
                </div>
                <div class="sig-field">
                  <div class="sig-field-label">CPF do Assinante</div>
                  <div class="sig-field-value">${cert.cpf_assinante || '—'}</div>
                </div>
                <div class="sig-field" style="background: #e8f5e9; border-color: #a5d6a7;">
                  <div class="sig-field-label" style="color: #2e7d32;">Carimbo de Data/Hora (Assinatura)</div>
                  <div class="sig-field-value" style="color: #1b5e20;">${new Date(selectedChecklist.signedAt || '').toLocaleString('pt-BR')}</div>
                </div>
              </div>
            `;
          } else {
            certDetails = `
            <div class="sig-grid">
              <div class="sig-field">
                <div class="sig-field-label">Assinante / Titular</div>
                <div class="sig-field-value">${cert.certificate_holder_name}</div>
              </div>
              <div class="sig-field">
                <div class="sig-field-label">Documento de Identidade</div>
                <div class="sig-field-value">${cert.certificate_document}</div>
              </div>
              <div class="sig-field" style="background: #e8f5e9; border-color: #a5d6a7;">
                <div class="sig-field-label" style="color: #2e7d32;">Carimbo de Data/Hora (Assinatura)</div>
                <div class="sig-field-value" style="color: #1b5e20;">${new Date(selectedChecklist.signedAt || '').toLocaleString('pt-BR')}</div>
              </div>
            </div>
          `;
          }
        } catch (e) {
          certDetails = `
            <div class="sig-grid">
              <div class="sig-field">
                <div class="sig-field-label">Assinado por</div>
                <div class="sig-field-value">${selectedChecklist.signedBy}</div>
              </div>
              <div class="sig-field" style="background: #e8f5e9; border-color: #a5d6a7;">
                <div class="sig-field-label" style="color: #2e7d32;">Carimbo de Data/Hora (Assinatura)</div>
                <div class="sig-field-value" style="color: #1b5e20;">${new Date(selectedChecklist.signedAt || '').toLocaleString('pt-BR')}</div>
              </div>
            </div>
          `;
        }
      } else {
        certDetails = `
          <div class="sig-grid">
            <div class="sig-field">
              <div class="sig-field-label">Assinado por</div>
              <div class="sig-field-value">${selectedChecklist.signedBy}</div>
            </div>
            <div class="sig-field" style="background: #e8f5e9; border-color: #a5d6a7;">
              <div class="sig-field-label" style="color: #2e7d32;">Carimbo de Data/Hora (Assinatura)</div>
              <div class="sig-field-value" style="color: #1b5e20;">${new Date(selectedChecklist.signedAt || '').toLocaleString('pt-BR')}</div>
            </div>
          </div>
        `;
      }
      return `
        <div class="sig-panel">
          <div class="sig-title">
            <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 6px;"></span>
            ${isSimples ? 'Assinatura Eletrônica Interna · Registro Autenticado' : 'Assinatura Digital ICP-Brasil Válida · MP 2.200-2/2001'}
          </div>
          <p style="font-size: 9px; color: #065f46; margin-bottom: 10px; line-height: 1.3;">
            ${isSimples
              ? 'Este documento clínico/boletim foi assinado eletronicamente pela Assinatura Eletrônica Interna, registrando o nome completo, CPF e data/hora do usuário autenticado.'
              : 'Este documento clínico/boletim foi assinado eletronicamente pelo profissional responsável utilizando certificado digital ICP-Brasil A1. A autoria, integridade e validade jurídica deste registro são garantidas nos termos da legislação federal brasileira.'}
          </p>
          ${certDetails}
        </div>
      `;
    })() : ''}
    
    <div class="footer">
      Gerado em ${new Date().toLocaleString('pt-BR')} · Recanto dos Anciãos · Sistema de Gestão ILPI
    </div>
  </div>
  <div id="pdf-pages"></div>
  <script>
    const hasLetterhead = ${hasLetterhead};
    const letterheadSrc = '${watermarkSrc}';

    window.onload = () => {
      const pxPerMm = 96 / 25.4;
      const maxHeight = 207 * pxPerMm; // 207mm is safe content height (297 - 45 - 45)
      const pagesContainer = document.getElementById('pdf-pages');
      const sourceContainer = document.getElementById('pdf-source');

      let currentPage = null;
      let currentSafeContent = null;

      function createPage() {
        currentPage = document.createElement('div');
        currentPage.className = 'pdf-page';
        
        if (hasLetterhead && letterheadSrc) {
          const bg = document.createElement('div');
          bg.className = 'letterhead-background';
          bg.style.backgroundImage = 'url("' + letterheadSrc + '")';
          currentPage.appendChild(bg);
          
          const wm = document.createElement('div');
          wm.className = 'watermark-background';
          wm.style.backgroundImage = 'url("' + letterheadSrc + '")';
          currentPage.appendChild(wm);
        }
        
        currentSafeContent = document.createElement('div');
        currentSafeContent.className = 'page-content-safe-area';
        currentPage.appendChild(currentSafeContent);
        
        pagesContainer.appendChild(currentPage);
      }

      createPage();

      const elements = Array.from(sourceContainer.children);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        currentSafeContent.appendChild(el);
        if (currentSafeContent.scrollHeight > maxHeight) {
          if (el.classList.contains('footer')) {
            // Keep it on the last page. Rule 15: Don't create an exclusive page just for the footer.
            continue;
          }
          if (currentSafeContent.children.length > 1) {
            currentSafeContent.removeChild(el);
            createPage();
            currentSafeContent.appendChild(el);
          }
        }
      }

      sourceContainer.style.display = 'none';

      setTimeout(() => {
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`;

    win.document.write(docHtml);
    win.document.close();
  };

  const handlePrintVitalsAverages = (periodType: 'day' | 'week' | 'month') => {
    let watermarkSrc = '';
    let hasLetterhead = false;
    let inst = {
      name: 'Recanto dos Anciãos',
      cnpj: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: 'SP',
      cep: '',
      directorName: '',
      technicalDirector: '',
      anvisa: '',
    };

    try {
      const settingsKey = `recanto_system_settings_${currentUser?.empresaId ?? currentUser?.id ?? 'anon'}`;
      const raw = localStorage.getItem(settingsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.institution) {
          inst = { ...inst, ...parsed.institution };
          const src = parsed.institution.watermarkImage;
          if (src) {
            hasLetterhead = true;
            watermarkSrc = src;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados da instituição ou papel timbrado:', e);
    }

    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) {
      toast.warning('Permita popups para gerar a impressão.');
      return;
    }

    // Helper classification
    const classify = (sys: number, dia: number) => {
      if (sys >= 180 || dia >= 110) return { label: 'Hipertensão Estágio 3', colorClass: 'bg-red' };
      if ((sys >= 160 && sys <= 179) || (dia >= 100 && dia <= 109)) return { label: 'Hipertensão Estágio 2', colorClass: 'bg-red' };
      if ((sys >= 140 && sys <= 159) || (dia >= 90 && dia <= 99)) return { label: 'Hipertensão Estágio 1', colorClass: 'bg-yellow' };
      if ((sys >= 130 && sys <= 139) || (dia >= 85 && dia <= 89)) return { label: 'Pré-Hipertensão', colorClass: 'bg-yellow' };
      if ((sys >= 120 && sys <= 129) || (dia >= 80 && dia <= 84)) return { label: 'Normal', colorClass: 'bg-green' };
      return { label: 'Ótima', colorClass: 'bg-green' };
    };

    // Filter & Parse vitals
    const vitalsData = (resident.vitals || [])
      .map(v => {
        const parts = v.bp ? v.bp.split('/') : [];
        const sys = parts[0] ? parseInt(parts[0], 10) : NaN;
        const dia = parts[1] ? parseInt(parts[1], 10) : NaN;
        const hasBP = !isNaN(sys) && !isNaN(dia);
        const hasHR = typeof v.hr === 'number' && v.hr > 0;
        const hasSpO2 = typeof v.spo2 === 'number' && v.spo2 > 0;
        const hasTemp = typeof v.temp === 'number' && v.temp > 0;
        if (!hasBP && !hasHR && !hasSpO2 && !hasTemp) return null;

        const date = new Date(v.timestamp);
        const hour = date.getHours();
        const shift: 'diurno' | 'noturno' = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
        return {
          timestamp: v.timestamp,
          sys: hasBP ? sys : null,
          dia: hasBP ? dia : null,
          hr: hasHR ? v.hr : null,
          spo2: hasSpO2 ? v.spo2 : null,
          temp: hasTemp ? v.temp : null,
          date,
          shift
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .filter(v => {
        const y = v.date.getFullYear();
        const m = String(v.date.getMonth() + 1).padStart(2, '0');
        const d = String(v.date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        if (periodType === 'day') {
          return dateStr === vitalsSelectedDay;
        } else if (periodType === 'week') {
          const selDate = new Date(vitalsSelectedWeekDate + 'T00:00:00');
          const getWeekMonday = (dt: Date) => {
            const temp = new Date(dt);
            const day = temp.getDay();
            const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(temp.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return monday;
          };
          const targetMonday = getWeekMonday(selDate);
          const targetSunday = new Date(targetMonday);
          targetSunday.setDate(targetMonday.getDate() + 6);
          targetSunday.setHours(23, 59, 59, 999);
          return v.date >= targetMonday && v.date <= targetSunday;
        } else {
          const monthStr = `${y}-${m}`;
          return monthStr === vitalsSelectedMonth;
        }
      });

    // Grouping
    let listToPrint: { label: string; key: string; diurno: any; noturno: any }[] = [];

    const initShiftObj = () => ({
      sysSum: 0, sysCount: 0,
      diaSum: 0, diaCount: 0,
      hrSum: 0, hrCount: 0,
      spo2Sum: 0, spo2Count: 0,
      tempSum: 0, tempCount: 0
    });

    const aggregateRecords = (groups: Record<string, any>) => {
      return Object.entries(groups).map(([key, data]: [string, any]) => {
        const processShift = (shiftData: any) => {
          if (shiftData.sysCount === 0 && shiftData.hrCount === 0 && shiftData.spo2Count === 0 && shiftData.tempCount === 0) {
            return null;
          }
          const bpAvg = shiftData.sysCount > 0 && shiftData.diaCount > 0 ? {
            sys: Math.round(shiftData.sysSum / shiftData.sysCount),
            dia: Math.round(shiftData.diaSum / shiftData.diaCount),
            count: shiftData.sysCount
          } : null;
          const hrAvg = shiftData.hrCount > 0 ? {
            val: Math.round(shiftData.hrSum / shiftData.hrCount),
            count: shiftData.hrCount
          } : null;
          const spo2Avg = shiftData.spo2Count > 0 ? {
            val: Math.round(shiftData.spo2Sum / shiftData.spo2Count),
            count: shiftData.spo2Count
          } : null;
          const tempAvg = shiftData.tempCount > 0 ? {
            val: parseFloat((shiftData.tempSum / shiftData.tempCount).toFixed(1)),
            count: shiftData.tempCount
          } : null;
          const classification = bpAvg ? classify(bpAvg.sys, bpAvg.dia) : null;
          return { bp: bpAvg, hr: hrAvg, spo2: spo2Avg, temp: tempAvg, classification };
        };

        const diurno = processShift(data.diurno);
        const noturno = processShift(data.noturno);
        return { key, label: '', diurno, noturno };
      });
    };

    if (periodType === 'day') {
      const dayGroups: Record<string, any> = {};
      vitalsData.forEach(v => {
        const y = v.date.getFullYear();
        const m = String(v.date.getMonth() + 1).padStart(2, '0');
        const d = String(v.date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        if (!dayGroups[dateStr]) {
          dayGroups[dateStr] = { diurno: initShiftObj(), noturno: initShiftObj() };
        }
        const s = dayGroups[dateStr][v.shift];
        if (v.sys !== null && v.dia !== null) { s.sysSum += v.sys; s.diaSum += v.dia; s.sysCount += 1; s.diaCount += 1; }
        if (v.hr !== null) { s.hrSum += v.hr; s.hrCount += 1; }
        if (v.spo2 !== null) { s.spo2Sum += v.spo2; s.spo2Count += 1; }
        if (v.temp !== null) { s.tempSum += v.temp; s.tempCount += 1; }
      });
      listToPrint = aggregateRecords(dayGroups);
      listToPrint.forEach(item => {
        const [year, month, day] = item.key.split('-');
        item.label = `${day}/${month}/${year}`;
      });
    } else if (periodType === 'week') {
      const weekGroups: Record<string, any> = {};
      const getWeekMonday = (d: Date) => {
        const temp = new Date(d);
        const day = temp.getDay();
        const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(temp.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
      };
      vitalsData.forEach(v => {
        const monday = getWeekMonday(v.date);
        const y = monday.getFullYear();
        const m = String(monday.getMonth() + 1).padStart(2, '0');
        const d = String(monday.getDate()).padStart(2, '0');
        const weekKey = `${y}-${m}-${d}`;
        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = { diurno: initShiftObj(), noturno: initShiftObj() };
        }
        const s = weekGroups[weekKey][v.shift];
        if (v.sys !== null && v.dia !== null) { s.sysSum += v.sys; s.diaSum += v.dia; s.sysCount += 1; s.diaCount += 1; }
        if (v.hr !== null) { s.hrSum += v.hr; s.hrCount += 1; }
        if (v.spo2 !== null) { s.spo2Sum += v.spo2; s.spo2Count += 1; }
        if (v.temp !== null) { s.tempSum += v.temp; s.tempCount += 1; }
      });
      listToPrint = aggregateRecords(weekGroups);
      listToPrint.forEach(item => {
        const monday = new Date(item.key + 'T00:00:00');
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        item.label = `${fmt(monday)} a ${fmt(sunday)}`;
      });
    } else {
      const monthGroups: Record<string, any> = {};
      vitalsData.forEach(v => {
        const y = v.date.getFullYear();
        const m = String(v.date.getMonth() + 1).padStart(2, '0');
        const monthKey = `${y}-${m}`;
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = { diurno: initShiftObj(), noturno: initShiftObj() };
        }
        const s = monthGroups[monthKey][v.shift];
        if (v.sys !== null && v.dia !== null) { s.sysSum += v.sys; s.diaSum += v.dia; s.sysCount += 1; s.diaCount += 1; }
        if (v.hr !== null) { s.hrSum += v.hr; s.hrCount += 1; }
        if (v.spo2 !== null) { s.spo2Sum += v.spo2; s.spo2Count += 1; }
        if (v.temp !== null) { s.tempSum += v.temp; s.tempCount += 1; }
      });
      listToPrint = aggregateRecords(monthGroups);
      listToPrint.forEach(item => {
        const [year, month] = item.key.split('-');
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        item.label = `${months[parseInt(month, 10) - 1]} / ${year}`;
      });
    }

    listToPrint.sort((a, b) => b.key.localeCompare(a.key));

    let reportTypeLabel = '';
    if (periodType === 'day') {
      const [year, month, day] = vitalsSelectedDay.split('-');
      reportTypeLabel = `Diário (${day}/${month}/${year})`;
    } else if (periodType === 'week') {
      const selDate = new Date(vitalsSelectedWeekDate + 'T00:00:00');
      const getWeekMonday = (dt: Date) => {
        const temp = new Date(dt);
        const day = temp.getDay();
        const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(temp.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
      };
      const monday = getWeekMonday(selDate);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
      reportTypeLabel = `Semanal (${fmt(monday)} a ${fmt(sunday)})`;
    } else {
      const [year, month] = vitalsSelectedMonth.split('-');
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const formattedMonth = `${months[parseInt(month, 10) - 1]} de ${year}`;
      reportTypeLabel = `Mensal (${formattedMonth})`;
    }
    const dateFormatted = new Date().toLocaleDateString('pt-BR');

    let tableRowsHtml = '';
    listToPrint.forEach(item => {
      const renderRow = (shiftLabel: string, shiftData: any) => {
        if (!shiftData) {
          return `
            <td style="font-size: 9px; color: #64748b;">${shiftLabel}</td>
            <td style="font-size: 9px; color: #94a3b8;">—</td>
            <td style="font-size: 9px; color: #94a3b8;">—</td>
            <td style="font-size: 9px; color: #94a3b8;">—</td>
            <td style="font-size: 9px; color: #94a3b8;">—</td>
            <td style="font-size: 9px; color: #94a3b8;">—</td>
          `;
        }
        const bpText = shiftData.bp ? `${shiftData.bp.sys}/${shiftData.bp.dia} mmHg<br><small style="color: #64748b; font-size: 7px;">(${shiftData.bp.count} med.)</small>` : '—';
        const hrText = shiftData.hr ? `${shiftData.hr.val} bpm<br><small style="color: #64748b; font-size: 7px;">(${shiftData.hr.count} med.)</small>` : '—';
        const spo2Text = shiftData.spo2 ? `${shiftData.spo2.val}%<br><small style="color: #64748b; font-size: 7px;">(${shiftData.spo2.count} med.)</small>` : '—';
        const tempText = shiftData.temp ? `${shiftData.temp.val} °C<br><small style="color: #64748b; font-size: 7px;">(${shiftData.temp.count} med.)</small>` : '—';
        const classificationHtml = shiftData.classification ? `<span class="badge ${shiftData.classification.colorClass}">${shiftData.classification.label}</span>` : '—';
        return `
          <td style="font-size: 9px; font-weight: bold; color: #1e293b;">${shiftLabel}</td>
          <td style="font-size: 9px; color: #1e293b;">${bpText}</td>
          <td style="font-size: 9px; color: #1e293b;">${hrText}</td>
          <td style="font-size: 9px; color: #1e293b;">${spo2Text}</td>
          <td style="font-size: 9px; color: #1e293b;">${tempText}</td>
          <td>${classificationHtml}</td>
        `;
      };

      tableRowsHtml += `
        <tr style="border-top: 1px solid #cbd5e1;">
          <td rowspan="2" style="font-weight: bold; font-size: 10px; vertical-align: middle; background: #f8fafc; border-right: 1px solid #e2e8f0; width: 20%;">
            ${item.label}
          </td>
          ${renderRow('Diurno (☀️)', item.diurno)}
        </tr>
        <tr>
          ${renderRow('Noturno (🌙)', item.noturno)}
        </tr>
      `;
    });

    if (listToPrint.length === 0) {
      tableRowsHtml = `
        <tr>
          <td colspan="7" style="text-align: center; font-style: italic; color: #64748b; padding: 20px;">
            Nenhum registro de sinais vitais encontrado para o período.
          </td>
        </tr>
      `;
    }

    const docHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Média Sinais - ${resident.name} - ${reportTypeLabel}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 11px; padding: 20px 0; line-height: 1.4; background: #f1f5f9; display: flex; flex-direction: column; align-items: center; }
    @media print {
      body { background: transparent; padding: 0; margin: 0; display: block; }
    }
    
    #pdf-pages { display: flex; flex-direction: column; align-items: center; width: 100%; }
    @media print { #pdf-pages { display: block; } }
    
    .pdf-page {
      width: 210mm;
      height: 297mm;
      position: relative;
      background: white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      margin-bottom: 20px;
      overflow: hidden;
      box-sizing: border-box;
    }
    @media print {
      .pdf-page { box-shadow: none; margin-bottom: 0; page-break-after: always; break-after: page; }
    }
    
    .letterhead-background {
      position: absolute;
      top: 0; left: 0;
      width: 210mm; height: 297mm;
      z-index: 1;
      pointer-events: none;
      background-repeat: no-repeat;
      background-position: center top;
      background-size: 100% 100%;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .watermark-background {
      position: absolute;
      top: 0; left: 0;
      width: 210mm; height: 297mm;
      z-index: 2;
      pointer-events: none;
      opacity: 0.04;
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page-content-safe-area {
      position: absolute;
      top: 45mm;
      left: 20mm;
      width: 170mm;
      height: 207mm;
      z-index: 10;
      box-sizing: border-box;
      overflow: hidden;
      background: transparent;
    }

    .inst-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; }
    .inst-info { flex: 1; }
    .inst-title { font-size: 15px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
    .inst-details { font-size: 10px; color: #64748b; }
    .inst-rt { text-align: right; font-size: 10px; color: #64748b; }
    
    .doc-title { font-size: 13px; font-weight: bold; text-align: center; text-transform: uppercase; color: #1e293b; margin-bottom: 12px; letter-spacing: 0.5px; }
    
    .section { margin-bottom: 5mm; background: rgba(255, 255, 255, 0.85); border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
    .section-title { background: rgba(248, 250, 252, 0.9); font-size: 10px; font-weight: bold; color: #334155; padding: 5px 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-content { padding: 8px 10px; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .field { margin-bottom: 4px; }
    .field-label { font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
    .field-value { font-size: 10px; color: #1e293b; font-weight: 550; }
    
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: bold; }
    .bg-green { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .bg-yellow { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .bg-red { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9px; background: rgba(255, 255, 255, 0.85); }
    th { background: rgba(248, 250, 252, 0.9); padding: 6px 8px; text-align: left; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0; }
    td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    
    .footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; text-align: center; page-break-inside: avoid; break-inside: avoid; }
    .section, table, tr, .footer { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>
  <div id="pdf-source" style="position: absolute; left: -9999px; top: 0; width: 170mm; box-sizing: border-box;">
    ${hasLetterhead ? '' : `
    <div class="inst-header">
      <div class="inst-info">
        <div class="inst-title">${inst.name}</div>
        <div class="inst-details">
          CNPJ: ${inst.cnpj || '—'} | Tel: ${inst.phone || '—'} | E-mail: ${inst.email || '—'}<br/>
          Endereço: ${inst.address || ''} ${inst.city || ''} ${inst.state ? `- ${inst.state}` : ''} CEP: ${inst.cep || ''}
        </div>
      </div>
      <div class="inst-rt">
        ${inst.directorName ? `Diretoria: ${inst.directorName}<br/>` : ''}
        ${inst.technicalDirector ? `Resp. Técnico: ${inst.technicalDirector}<br/>` : ''}
        ${inst.anvisa ? `Alvará ANVISA: ${inst.anvisa}` : ''}
      </div>
    </div>
    `}
    
    <div class="doc-title">
      Relatório Clínico - Médias de Sinais Vitais (${reportTypeLabel})
    </div>
    
    <div class="section">
      <div class="section-title">Identificação do Residente</div>
      <div class="section-content">
        <div class="grid-2">
          <div>
            <div class="field">
              <div class="field-label">Residente</div>
              <div class="field-value">${resident.name}</div>
            </div>
            <div class="field">
              <div class="field-label">CPF</div>
              <div class="field-value">${resident.cpf || '—'}</div>
            </div>
            <div class="field">
              <div class="field-label">Data de Nascimento</div>
              <div class="field-value">${resident.birthDate || '—'} (${resident.age} anos)</div>
            </div>
          </div>
          <div>
            <div class="field">
              <div class="field-label">Data de Emissão</div>
              <div class="field-value">${dateFormatted}</div>
            </div>
            <div class="field">
              <div class="field-label">Quarto / Acomodação</div>
              <div class="field-value">${resident.room}</div>
            </div>
            <div class="field">
              <div class="field-label">Grau de Dependência</div>
              <div class="field-value"><span class="badge ${resident.careLevel === 'I' ? 'bg-green' : resident.careLevel === 'II' ? 'bg-yellow' : 'bg-red'}">Grau ${resident.careLevel}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Consolidado de Médias de Sinais Vitais</div>
      <div class="section-content" style="padding: 0;">
        <table>
          <thead>
            <tr>
              <th>Período</th>
              <th>Turno</th>
              <th>Pressão Arterial</th>
              <th>Freq. Cardíaca</th>
              <th>Saturação (SpO₂)</th>
              <th>Temperatura</th>
              <th>Classificação (PA)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section" style="margin-top: 15px;">
      <div class="section-title">Legenda de Diretrizes de Pressão (Sociedade Brasileira de Cardiologia)</div>
      <div class="section-content" style="font-size: 8px; color: #475569; line-height: 1.5;">
        <span style="font-weight: bold; color: #065f46;">Ótima:</span> Sistólica &lt; 120 e Diastólica &lt; 80 mmHg | 
        <span style="font-weight: bold; color: #047857;">Normal:</span> Sistólica 120-129 e/ou Diastólica 80-84 mmHg | 
        <span style="font-weight: bold; color: #b45309;">Pré-Hipertensão:</span> Sistólica 130-139 e/ou Diastólica 85-89 mmHg<br/>
        <span style="font-weight: bold; color: #b45309;">Estágio 1:</span> Sistólica 140-159 e/ou Diastólica 90-99 mmHg | 
        <span style="font-weight: bold; color: #b91c1c;">Estágio 2:</span> Sistólica 160-179 e/ou Diastólica 100-109 mmHg | 
        <span style="font-weight: bold; color: #991b1b;">Estágio 3:</span> Sistólica &ge; 180 e/ou Diastólica &ge; 110 mmHg<br/>
        <small style="color: #64748b; font-size: 8px;">* A classificação corresponde ao maior estágio alcançado pela média diurna ou noturna de pressão do período.</small>
      </div>
    </div>
    

  </div>
  <div id="pdf-pages"></div>
  <script>
    const hasLetterhead = ${hasLetterhead};
    const letterheadSrc = '${watermarkSrc}';

    window.onload = () => {
      const pxPerMm = 96 / 25.4;
      const maxHeight = 207 * pxPerMm;
      const pagesContainer = document.getElementById('pdf-pages');
      const sourceContainer = document.getElementById('pdf-source');

      let currentPage = null;
      let currentSafeContent = null;

      function createPage() {
        currentPage = document.createElement('div');
        currentPage.className = 'pdf-page';
        
        if (hasLetterhead && letterheadSrc) {
          const bg = document.createElement('div');
          bg.className = 'letterhead-background';
          bg.style.backgroundImage = 'url("' + letterheadSrc + '")';
          currentPage.appendChild(bg);
          
          const wm = document.createElement('div');
          wm.className = 'watermark-background';
          wm.style.backgroundImage = 'url("' + letterheadSrc + '")';
          currentPage.appendChild(wm);
        }
        
        currentSafeContent = document.createElement('div');
        currentSafeContent.className = 'page-content-safe-area';
        currentPage.appendChild(currentSafeContent);
        
        pagesContainer.appendChild(currentPage);
      }

      createPage();

      const elements = Array.from(sourceContainer.children);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        currentSafeContent.appendChild(el);
        if (currentSafeContent.scrollHeight > maxHeight) {
          if (el.classList.contains('footer')) {
            continue;
          }
          if (currentSafeContent.children.length > 1) {
            currentSafeContent.removeChild(el);
            createPage();
            currentSafeContent.appendChild(el);
          }
        }
      }

      sourceContainer.style.display = 'none';

      setTimeout(() => {
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`;

    win.document.write(docHtml);
    win.document.close();
  };

  const handleStartEditChecklist = () => {
    if (selectedChecklist.signedBy) return;
    const draft = { ...selectedChecklist, shift: selectedShift };
    const parsed = parseMedications(draft.medicacoesAdministradas);
    if (!parsed && resident.medications && resident.medications.length > 0) {
      const initialMeds: ChecklistMedication[] = resident.medications.map(med => ({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        route: med.route,
        status: 'pendente' as const,
        time: med.nextDose || '08:00'
      }));
      draft.medicacoesAdministradas = JSON.stringify(initialMeds);
    }

    // Initialize carePlanAdherence for active care plans on this date
    if (!draft.carePlanAdherence) {
      draft.carePlanAdherence = [];
    }
    const activePlans = (resident.carePlan || []).filter(
      p => p.status === 'ativo' && isCarePlanActiveOnDate(p, draft.date)
    );
    const updatedAdherence = activePlans.map(plan => {
      const existing = draft.carePlanAdherence?.find(a => a.carePlanId === plan.id);
      return existing || {
        carePlanId: plan.id,
        status: 'conseguindo_seguir' as const,
        comment: ''
      };
    });
    draft.carePlanAdherence = updatedAdherence;

    setChecklistDraft(draft);
  };

  const handleCancelEditChecklist = () => {
    setChecklistDraft(null);
  };

  const handlePrescriptionDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const finalUrl = await uploadPrescriptionDocument(file);
      setPrescriptionData(prev => ({
        ...prev,
        documentUrl: finalUrl,
        documentName: file.name
      }));
      toast.success('Documento da prescrição física carregado com sucesso!');
    } catch (err) {
      console.error('Erro ao fazer upload do documento da prescrição:', err);
      toast.error('Erro ao fazer upload do documento da prescrição. Tente novamente.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateResident || !prescriptionData.name || !prescriptionData.dosage || !prescriptionData.frequency) return;

    const newMed: Medication = {
      id: Math.random().toString(36).substr(2, 9),
      name: prescriptionData.name,
      dosage: prescriptionData.dosage,
      route: prescriptionData.route,
      frequency: prescriptionData.frequency,
      nextDose: prescriptionData.nextDose || '08:00',
      startDate: prescriptionData.startDate || new Date().toISOString().split('T')[0],
      endDate: prescriptionData.endDate || undefined,
      observations: prescriptionData.observations || undefined,
      documentUrl: prescriptionData.documentUrl || undefined,
      logs: []
    };

    onUpdateResident({
      ...resident,
      medications: [...(resident.medications || []), newMed]
    });

    setPrescriptionData({
      name: '',
      dosage: '',
      route: 'Oral',
      frequency: '12h em 12h',
      nextDose: '08:00',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      observations: '',
      documentUrl: '',
      documentName: ''
    });
    setIsPrescriptionModalOpen(false);
  };

  const handleDeleteMedication = (medId: string) => {
    if (!onUpdateResident) return;
    if (confirm("Tem certeza que deseja excluir esta prescrição de medicamento?")) {
      const updatedMeds = (resident.medications || []).filter(med => med.id !== medId);
      onUpdateResident({ ...resident, medications: updatedMeds });
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onUpdateResident) {
      onUpdateResident({
        ...resident,
        roomStatus: e.target.value as RoomStatus
      });
      setIsEditingStatus(false);
    }
  };

  const handleAddCarePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateResident || !canManageCarePlan) return;

    // Serialize frequencyDays selection to JSON string
    const freqObj = Object.keys(frequencyDays).reduce((acc, day) => {
      const d = frequencyDays[day as keyof typeof frequencyDays];
      acc[day] = d.checked ? d.times : 0;
      return acc;
    }, {} as Record<string, number>);

    // Validate that at least one day is selected
    const hasSelectedDay = Object.values(freqObj).some(times => times > 0);
    if (!hasSelectedDay) {
      toast.warning('Selecione pelo menos um dia da semana para a frequência do plano.');
      return;
    }

    const frequencyString = JSON.stringify(freqObj);

    const creatorRole = currentUser?.employeeRole || currentUser?.profile.type || 'Profissional';
    const creatorName = currentUser?.name || 'Usuário Atual';
    const responsibleValue = `${creatorRole}: ${creatorName}`;

    const plan: CarePlan = {
      id: Math.random().toString(36).substr(2, 9),
      title: newPlan.title,
      description: newPlan.description,
      frequency: frequencyString,
      assignedTo: responsibleValue,
      status: 'ativo',
      createdAt: new Date().toISOString()
    };

    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'current-user',
      userName: currentUser?.name || 'Usuário Atual',
      action: 'Plano de Cuidado',
      details: `Criou plano: ${plan.title}`
    };

    onUpdateResident({
      ...resident,
      carePlan: [plan, ...(resident.carePlan || [])],
      auditLogs: [newLog, ...(resident.auditLogs || [])]
    });

    setNewPlan({ title: '', description: '', frequency: '', assignedTo: '' });
    setFrequencyDays({
      segunda: { checked: false, times: 1 },
      terca: { checked: false, times: 1 },
      quarta: { checked: false, times: 1 },
      quinta: { checked: false, times: 1 },
      sexta: { checked: false, times: 1 },
      sabado: { checked: false, times: 1 },
      domingo: { checked: false, times: 1 }
    });
    setShowPlanForm(false);
  };

  const handleResidentDocUpload = async () => {
    if (!docUploadFile || !docUploadName.trim() || !onUpdateResident) return;
    setIsUploadingResidentDoc(true);
    try {
      const url = await uploadResidentDocument(docUploadFile, resident.id);
      const newDoc = {
        id: Math.random().toString(36).substr(2, 9),
        name: docUploadName.trim(),
        type: docUploadType,
        url,
        uploadDate: new Date().toISOString().split('T')[0]
      };
      const updatedResident = {
        ...resident,
        documents: [...(resident.documents || []), newDoc]
      };
      await onUpdateResident(updatedResident);
      toast.success('Documento enviado com sucesso!');
      setShowDocUploadModal(false);
      setDocUploadFile(null);
      setDocUploadName('');
      setDocUploadType('outro');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar documento. Tente novamente.');
    } finally {
      setIsUploadingResidentDoc(false);
    }
  };

  const handleSaveEvolutionNote = () => {
    if (!newNoteText.trim() || !onUpdateResident) return;

    const creatorRole = currentUser?.employeeRole || currentUser?.profile.type || 'Profissional';
    const creatorName = currentUser?.name || 'Usuário Atual';
    
    // Formatar a assinatura de acordo com a função
    let formattedSignature = creatorName;
    if (creatorRole === 'Enfermeiro') {
      formattedSignature = `Enf. ${creatorName}`;
    } else if (creatorRole === 'Médico') {
      formattedSignature = `Dr(a). ${creatorName}`;
    } else if (creatorRole === 'Cuidador') {
      formattedSignature = `Cuid. ${creatorName}`;
    } else if (creatorRole === 'Nutricionista') {
      formattedSignature = `Nutri. ${creatorName}`;
    } else if (creatorRole === 'Fisioterapeuta') {
      formattedSignature = `Fisio. ${creatorName}`;
    }

    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'current-user',
      userName: formattedSignature,
      action: 'Evolução',
      details: newNoteText.trim()
    };

    onUpdateResident({
      ...resident,
      auditLogs: [newLog, ...(resident.auditLogs || [])]
    });

    setNewNoteText('');
  };

  const handleChecklistToggle = (field: keyof DailyChecklist) => {
    if (!onUpdateResident) return;
    
    // Create new list or update existing
    const updatedChecklist = { 
      ...selectedChecklist, 
      [field]: !selectedChecklist[field as keyof DailyChecklist],
      shift: selectedShift
    };
    const otherChecklists = resident.dailyChecklists?.filter(
      c => !(c.date === selectedChecklistDate && (c.shift || 'diurno') === selectedShift)
    ) || [];
    
    onUpdateResident({
      ...resident,
      dailyChecklists: [updatedChecklist, ...otherChecklists]
    });
  };

  const handleChecklistFieldChange = (field: keyof DailyChecklist, value: any) => {
    if (checklistDraft) {
      setChecklistDraft({ ...checklistDraft, [field]: value });
    } else {
      if (!onUpdateResident) return;
      
      const updatedChecklist = { 
        ...selectedChecklist, 
        [field]: value,
        shift: selectedShift
      };
      const otherChecklists = resident.dailyChecklists?.filter(
        c => !(c.date === selectedChecklistDate && (c.shift || 'diurno') === selectedShift)
      ) || [];
      
      onUpdateResident({
        ...resident,
        dailyChecklists: [updatedChecklist, ...otherChecklists]
      });
    }
  };

  const handleAdministerMedication = (medId: string) => {
    if (!onUpdateResident) return;

    const updatedMeds = resident.medications.map(med => {
      if (med.id === medId) {
        return {
          ...med,
          logs: [
            ...(med.logs || []),
            {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toISOString(),
              administeredBy: 'Enfermagem',
              status: 'administrado' as const
            }
          ]
        };
      }
      return med;
    });

    onUpdateResident({ ...resident, medications: updatedMeds });
  };

  const getRoomStatusColor = (status?: RoomStatus) => {
    switch (status) {
      case 'Ocupado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Em Limpeza': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Manutenção': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Vago': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Reservado': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  const getRoomStatusIcon = (status?: RoomStatus) => {
    switch (status) {
      case 'Ocupado': return <BedDouble className="w-3 h-3 mr-1" />;
      case 'Em Limpeza': return <PaintRoller className="w-3 h-3 mr-1" />;
      case 'Manutenção': return <Wrench className="w-3 h-3 mr-1" />;
      case 'Vago': return <Home className="w-3 h-3 mr-1" />;
      case 'Reservado': return <CalendarCheck className="w-3 h-3 mr-1" />;
      default: return <BedDouble className="w-3 h-3 mr-1" />;
    }
  };

  const tabs = [
    { id: 'info', label: 'Cadastro', icon: User },
    { id: 'vitals', label: 'Sinais Vitais', icon: Activity },
    { id: 'meds', label: 'Medicamentos', icon: Pill },
    { id: 'routine', label: 'Rotina Diária', icon: ClipboardList },
    { id: 'care_plan', label: 'Plano Evolutivo', icon: FileHeart },
    { id: 'visits', label: 'Visitas', icon: Users },
    { id: 'docs', label: 'Documentos', icon: Paperclip },
    { id: 'evolution', label: 'Evolução', icon: FileText },
    { id: 'history', label: 'Auditoria', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Header Back Button */}
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-[#1e40af] transition-colors p-2 md:p-0 font-medium">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar aos Residentes
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Profile Header */}
        <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start gap-4 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center w-full md:w-auto">
            <img
              src={residentAvatarSrc(resident.name, resident.photoUrl)}
              alt={resident.name}
              className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-cover border-4 border-white/30 shadow-md"
            />
            <div className="ml-4 md:ml-5">
              <h1 className="text-xl md:text-2xl font-bold text-white flex flex-wrap items-center gap-2">
                {resident.name}
                <span className={`text-xs font-normal px-2 py-0.5 rounded-full border ${
                  resident.careLevel === 'III' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                  resident.careLevel === 'II' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}>
                  Grau {resident.careLevel}
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1">
                 <p className="text-blue-200 text-xs md:text-sm">
                   {resident.age} anos
                 </p>
                 <span className="text-blue-300">•</span>
                 <div className="flex items-center group">
                   <span className="text-blue-200 text-xs md:text-sm mr-2">Quarto: {resident.room}</span>
                   
                   {isEditingStatus ? (
                     <select 
                       autoFocus
                       onBlur={() => setIsEditingStatus(false)}
                       onChange={handleStatusChange}
                       value={resident.roomStatus || 'Ocupado'}
                       className="text-[10px] md:text-xs py-0.5 pl-1 pr-6 rounded-full border border-slate-300 focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                     >
                       <option value="Ocupado">Ocupado</option>
                       <option value="Vago">Vago</option>
                       <option value="Em Limpeza">Em Limpeza</option>
                       <option value="Manutenção">Manutenção</option>
                       <option value="Reservado">Reservado</option>
                     </select>
                   ) : (
                     <button 
                       onClick={() => setIsEditingStatus(true)}
                       title="Clique para alterar o status"
                       className={`flex items-center text-[10px] md:text-xs px-2 py-0.5 rounded-full border hover:shadow-sm transition-all cursor-pointer ${getRoomStatusColor(resident.roomStatus)}`}
                     >
                       {getRoomStatusIcon(resident.roomStatus)}
                       {resident.roomStatus || 'Ocupado'}
                       <Edit2 className="w-2.5 h-2.5 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </button>
                   )}
                 </div>
              </div>
              
              {resident.legalGuardian && (
                 <p className="text-xs text-blue-300 mt-1 truncate max-w-[200px] md:max-w-none">Resp: {resident.legalGuardian.name}</p>
              )}
            </div>
          </div>
          
          <div className="flex w-full md:w-auto gap-2 mt-2 md:mt-0">
             <button
               onClick={handleStartEditResident}
               className="flex-1 md:flex-none flex justify-center items-center px-4 py-2 bg-white/20 border border-white/30 text-white rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors"
             >
                <Edit2 className="h-4 w-4 mr-2" />
                <span>Editar Perfil</span>
             </button>
          </div>
        </div>

        {/* Tabs Navigation - Improved Scroll */}
        <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex overflow-x-auto px-2 md:px-6 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-none flex items-center py-4 px-4 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-6 min-h-[400px]">
          
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={handleStartEditResident}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200 transition-colors shadow-sm"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Editar Cadastro & Plano de Rotina
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Dados Pessoais</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-500">CPF:</span> {resident.cpf || '-'}</p>
                    <p><span className="text-slate-500">RG:</span> {resident.rg || '-'}</p>
                    <p><span className="text-slate-500">Data Nascimento:</span> {resident.birthDate || '-'}</p>
                    <p><span className="text-slate-500">Admissão:</span> {new Date(resident.admissionDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Responsável & Emergência</h3>
                  <div className="space-y-2 text-sm">
                     <p className="font-medium text-slate-700">Responsável Legal:</p>
                     <p>{resident.legalGuardian?.name || 'Não informado'}</p>
                     <p className="text-xs text-slate-500">{resident.legalGuardian?.phone}</p>
                     
                     <p className="font-medium text-slate-700 mt-4">Contatos Emergência:</p>
                     {resident.emergencyContacts?.map((c, i) => (
                       <p key={i}>{c.name} ({c.relation}) - {c.phone}</p>
                     ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 md:col-span-2">
                  <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Plano de Rotina Usual</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <p><span className="text-slate-500 font-semibold">Uso de Fraldas:</span> {resident.usoFraldas === 'sim' ? 'Sim' : 'Não'}</p>
                    <p><span className="text-slate-500 font-semibold">Mobilidade Usual:</span> {resident.mobilidadeSet === 'independente' ? 'Independente' : resident.mobilidadeSet === 'auxilio' ? 'Com auxílio' : 'Acamado'}</p>
                    <p><span className="text-slate-500 font-semibold">Higiene Corporal:</span> {resident.higieneCorporal === 'independente' ? 'Independente' : 'Com auxílio'}</p>
                    <p><span className="text-slate-500 font-semibold">Higiene Oral/Vestir:</span> {resident.higieneOralVestir === 'independente' ? 'Independente' : 'Com auxílio'}</p>
                  </div>
                  <div className="border-t border-slate-200/60 pt-3">
                    <span className="block text-xs font-bold text-slate-750 mb-2">Cuidados Diários Programados:</span>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const activeCares = [
                          { val: resident.reqHygiene, label: 'Banho / Higiene' },
                          { val: resident.reqOralCare, label: 'Higiene Oral' },
                          { val: resident.reqFeeding, label: 'Alimentação' },
                          { val: resident.reqHydration, label: 'Hidratação' },
                          { val: resident.reqMobility, label: 'Mobilização / Mudança de decúbito' },
                          { val: resident.reqDressings, label: 'Realização de Curativos' },
                          { val: resident.reqLeisure, label: 'Atividades de Lazer / Social' },
                        ].filter(c => c.val !== null && c.val !== undefined);

                        if (activeCares.length === 0) {
                          return <span className="text-slate-400 text-xs italic font-medium">Nenhum cuidado diário programado.</span>;
                        }

                        return activeCares.map((c, i) => (
                          <span key={i} className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-100">
                            {c.label} ({c.val ? 'Assistido' : 'Não assistido'})
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 md:col-span-2">
                  <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Endereço</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <p><span className="text-slate-500">CEP:</span> {resident.addressCep || '-'}</p>
                    <p className="md:col-span-2"><span className="text-slate-500">Logradouro / Rua:</span> {resident.addressStreet || '-'}</p>
                    <p><span className="text-slate-500">Número:</span> {resident.addressNumber || '-'}</p>
                    <p><span className="text-slate-500">Complemento:</span> {resident.addressComplement || '-'}</p>
                    <p><span className="text-slate-500">Bairro:</span> {resident.addressNeighborhood || '-'}</p>
                    <p className="md:col-span-2"><span className="text-slate-500">Cidade/UF:</span> {resident.addressCity ? `${resident.addressCity} - ${resident.addressState || ''}` : '-'}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 md:col-span-2">
                   <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Condições Clínicas e Sociais</h3>
                   <div className="grid md:grid-cols-2 gap-4 text-sm">
                     <div>
                        <p className="font-medium text-slate-700">Condição Clínica:</p>
                        <p className="text-slate-600 mb-2">{resident.clinicalCondition || '-'}</p>
                        <p className="font-medium text-slate-700">Alergias:</p>
                        <p className="text-slate-600">{resident.allergies.join(', ') || 'Nenhuma'}</p>
                     </div>
                     <div>
                        <p className="font-medium text-slate-700">Histórico Social:</p>
                        <p className="text-slate-600 mb-2">{resident.socialHistory || '-'}</p>
                        <p className="font-medium text-slate-700">Funcionalidade:</p>
                        <p className="text-slate-600">{resident.functionalCondition || '-'}</p>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vitals' && (() => {
            const sortedVitals = [...(resident.vitals || [])].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            const latestVital = sortedVitals[0] || null;

            const chartData = [...(resident.vitals || [])]
              .map(v => {
                const systolicPart = v.bp ? v.bp.split('/')[0] : '';
                const diastolicPart = v.bp ? v.bp.split('/')[1] : '';
                const systolic = parseInt(systolicPart, 10);
                const diastolic = parseInt(diastolicPart, 10);
                
                const vDate = new Date(v.timestamp);
                const formattedDate = vDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + (vDate.getHours() === 22 ? 'N' : 'D');
                
                return {
                  ...v,
                  systolic: isNaN(systolic) ? null : systolic,
                  diastolic: isNaN(diastolic) ? null : diastolic,
                  formattedDate
                };
              })
              .filter(v => v.systolic !== null)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .slice(-14);

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex items-center text-slate-500 mb-2">
                      <Heart className="h-4 w-4 mr-2 text-rose-500" /> Frequência Cardíaca
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                      {latestVital?.hr ? `${latestVital.hr}` : '—'}{' '}
                      <span className="text-sm font-normal text-slate-500">bpm</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-sm">
                     <div className="flex items-center text-slate-500 mb-2">
                      <Activity className="h-4 w-4 mr-2 text-blue-500" /> Pressão Arterial
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                      {latestVital?.bp || '—'}{' '}
                      <span className="text-sm font-normal text-slate-500">mmHg</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-sm">
                     <div className="flex items-center text-slate-500 mb-2">
                      <Wind className="h-4 w-4 mr-2 text-sky-500" /> Saturação (SpO2)
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                      {latestVital?.spo2 ? `${latestVital.spo2}` : '—'}{' '}
                      <span className="text-sm font-normal text-slate-500">%</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-sm">
                     <div className="flex items-center text-slate-500 mb-2">
                      <Thermometer className="h-4 w-4 mr-2 text-amber-500" /> Temperatura
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                      {latestVital?.temp ? `${latestVital.temp}` : '—'}{' '}
                      <span className="text-sm font-normal text-slate-500">°C</span>
                    </p>
                  </div>
                </div>
                
                <div className="h-64 w-full mt-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center justify-between">
                    <span>Histórico de Pressão Arterial (últimas medições)</span>
                    <span className="text-xs text-slate-400 font-normal">D = Diurno / N = Noturno</span>
                  </h4>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} domain={[40, 200]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Line type="monotone" dataKey="systolic" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Sistólica (mmHg)" />
                        <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Diastólica (mmHg)" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-4/5 flex items-center justify-center border border-dashed border-slate-200 rounded-lg p-6 text-slate-400 text-xs italic">
                      Nenhum registro de pressão arterial encontrado para este residente.
                    </div>
                  )}
                </div>

                {/* Seção de Médias Diurnas/Noturnas */}
                {(() => {
                  const classify = (sys: number, dia: number) => {
                    if (sys >= 180 || dia >= 110) return { label: 'Hipertensão Estágio 3', color: 'bg-rose-100 text-rose-800 border-rose-200', textClass: 'text-rose-800' };
                    if ((sys >= 160 && sys <= 179) || (dia >= 100 && dia <= 109)) return { label: 'Hipertensão Estágio 2', color: 'bg-rose-100 text-rose-700 border-rose-200', textClass: 'text-rose-700' };
                    if ((sys >= 140 && sys <= 159) || (dia >= 90 && dia <= 99)) return { label: 'Hipertensão Estágio 1', color: 'bg-amber-100 text-amber-700 border-amber-200', textClass: 'text-amber-700' };
                    if ((sys >= 130 && sys <= 139) || (dia >= 85 && dia <= 89)) return { label: 'Pré-Hipertensão', color: 'bg-orange-50 text-orange-700 border-orange-250', textClass: 'text-orange-700' };
                    if ((sys >= 120 && sys <= 129) || (dia >= 80 && dia <= 84)) return { label: 'Normal', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', textClass: 'text-emerald-700' };
                    return { label: 'Ótima', color: 'bg-emerald-100 text-emerald-800 border-emerald-250', textClass: 'text-emerald-800' };
                  };

                  const vitalsData = (resident.vitals || [])
                    .map(v => {
                      const parts = v.bp ? v.bp.split('/') : [];
                      const sys = parts[0] ? parseInt(parts[0], 10) : NaN;
                      const dia = parts[1] ? parseInt(parts[1], 10) : NaN;
                      const hasBP = !isNaN(sys) && !isNaN(dia);
                      const hasHR = typeof v.hr === 'number' && v.hr > 0;
                      const hasSpO2 = typeof v.spo2 === 'number' && v.spo2 > 0;
                      const hasTemp = typeof v.temp === 'number' && v.temp > 0;
                      if (!hasBP && !hasHR && !hasSpO2 && !hasTemp) return null;
                      const date = new Date(v.timestamp);
                      const hour = date.getHours();
                      const shift: 'diurno' | 'noturno' = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                      return {
                        sys: hasBP ? sys : null,
                        dia: hasBP ? dia : null,
                        hr: hasHR ? v.hr : null,
                        spo2: hasSpO2 ? v.spo2 : null,
                        temp: hasTemp ? v.temp : null,
                        date,
                        shift
                      };
                    })
                    .filter((v): v is NonNullable<typeof v> => v !== null);

                  const filteredVitalsData = vitalsData.filter(v => {
                    const y = v.date.getFullYear();
                    const m = String(v.date.getMonth() + 1).padStart(2, '0');
                    const d = String(v.date.getDate()).padStart(2, '0');
                    const dateStr = `${y}-${m}-${d}`;
                    if (vitalsPeriodType === 'day') {
                      return dateStr === vitalsSelectedDay;
                    } else if (vitalsPeriodType === 'week') {
                      const selDate = new Date(vitalsSelectedWeekDate + 'T00:00:00');
                      const getWeekMonday = (d: Date) => {
                        const temp = new Date(d);
                        const day = temp.getDay();
                        const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
                        const monday = new Date(temp.setDate(diff));
                        monday.setHours(0, 0, 0, 0);
                        return monday;
                      };
                      const targetMonday = getWeekMonday(selDate);
                      const targetSunday = new Date(targetMonday);
                      targetSunday.setDate(targetMonday.getDate() + 6);
                      targetSunday.setHours(23, 59, 59, 999);
                      return v.date >= targetMonday && v.date <= targetSunday;
                    } else {
                      const monthStr = `${y}-${m}`;
                      return monthStr === vitalsSelectedMonth;
                    }
                  });

                  let averagesList: { label: string; key: string; diurno: any; noturno: any }[] = [];

                  const initShiftObj = () => ({
                    sysSum: 0, sysCount: 0,
                    diaSum: 0, diaCount: 0,
                    hrSum: 0, hrCount: 0,
                    spo2Sum: 0, spo2Count: 0,
                    tempSum: 0, tempCount: 0
                  });

                  const aggregateRecords = (groups: Record<string, any>) => {
                    return Object.entries(groups).map(([key, data]: [string, any]) => {
                      const processShift = (shiftData: any) => {
                        if (shiftData.sysCount === 0 && shiftData.hrCount === 0 && shiftData.spo2Count === 0 && shiftData.tempCount === 0) {
                          return null;
                        }
                        const bpAvg = shiftData.sysCount > 0 && shiftData.diaCount > 0 ? {
                          sys: Math.round(shiftData.sysSum / shiftData.sysCount),
                          dia: Math.round(shiftData.diaSum / shiftData.diaCount),
                          count: shiftData.sysCount
                        } : null;
                        const hrAvg = shiftData.hrCount > 0 ? {
                          val: Math.round(shiftData.hrSum / shiftData.hrCount),
                          count: shiftData.hrCount
                        } : null;
                        const spo2Avg = shiftData.spo2Count > 0 ? {
                          val: Math.round(shiftData.spo2Sum / shiftData.spo2Count),
                          count: shiftData.spo2Count
                        } : null;
                        const tempAvg = shiftData.tempCount > 0 ? {
                          val: parseFloat((shiftData.tempSum / shiftData.tempCount).toFixed(1)),
                          count: shiftData.tempCount
                        } : null;
                        const classification = bpAvg ? classify(bpAvg.sys, bpAvg.dia) : null;
                        return { bp: bpAvg, hr: hrAvg, spo2: spo2Avg, temp: tempAvg, classification };
                      };

                      const diurno = processShift(data.diurno);
                      const noturno = processShift(data.noturno);
                      return { key, label: '', diurno, noturno };
                    });
                  };

                  if (vitalsPeriodType === 'day') {
                    const dayGroups: Record<string, any> = {};
                    filteredVitalsData.forEach(v => {
                      const y = v.date.getFullYear();
                      const m = String(v.date.getMonth() + 1).padStart(2, '0');
                      const d = String(v.date.getDate()).padStart(2, '0');
                      const dateStr = `${y}-${m}-${d}`;
                      if (!dayGroups[dateStr]) {
                        dayGroups[dateStr] = { diurno: initShiftObj(), noturno: initShiftObj() };
                      }
                      const s = dayGroups[dateStr][v.shift];
                      if (v.sys !== null && v.dia !== null) { s.sysSum += v.sys; s.diaSum += v.dia; s.sysCount += 1; s.diaCount += 1; }
                      if (v.hr !== null) { s.hrSum += v.hr; s.hrCount += 1; }
                      if (v.spo2 !== null) { s.spo2Sum += v.spo2; s.spo2Count += 1; }
                      if (v.temp !== null) { s.tempSum += v.temp; s.tempCount += 1; }
                    });
                    averagesList = aggregateRecords(dayGroups);
                    averagesList.forEach(item => {
                      const [year, month, day] = item.key.split('-');
                      item.label = `${day}/${month}/${year}`;
                    });
                  } else if (vitalsPeriodType === 'week') {
                    const weekGroups: Record<string, any> = {};
                    const getWeekMonday = (d: Date) => {
                      const temp = new Date(d);
                      const day = temp.getDay();
                      const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
                      const monday = new Date(temp.setDate(diff));
                      monday.setHours(0, 0, 0, 0);
                      return monday;
                    };
                    filteredVitalsData.forEach(v => {
                      const monday = getWeekMonday(v.date);
                      const y = monday.getFullYear();
                      const m = String(monday.getMonth() + 1).padStart(2, '0');
                      const d = String(monday.getDate()).padStart(2, '0');
                      const weekKey = `${y}-${m}-${d}`;
                      if (!weekGroups[weekKey]) {
                        weekGroups[weekKey] = { diurno: initShiftObj(), noturno: initShiftObj() };
                      }
                      const s = weekGroups[weekKey][v.shift];
                      if (v.sys !== null && v.dia !== null) { s.sysSum += v.sys; s.diaSum += v.dia; s.sysCount += 1; s.diaCount += 1; }
                      if (v.hr !== null) { s.hrSum += v.hr; s.hrCount += 1; }
                      if (v.spo2 !== null) { s.spo2Sum += v.spo2; s.spo2Count += 1; }
                      if (v.temp !== null) { s.tempSum += v.temp; s.tempCount += 1; }
                    });
                    averagesList = aggregateRecords(weekGroups);
                    averagesList.forEach(item => {
                      const monday = new Date(item.key + 'T00:00:00');
                      const sunday = new Date(monday);
                      sunday.setDate(monday.getDate() + 6);
                      const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                      item.label = `${fmt(monday)} a ${fmt(sunday)}`;
                    });
                  } else {
                    const monthGroups: Record<string, any> = {};
                    filteredVitalsData.forEach(v => {
                      const y = v.date.getFullYear();
                      const m = String(v.date.getMonth() + 1).padStart(2, '0');
                      const monthKey = `${y}-${m}`;
                      if (!monthGroups[monthKey]) {
                        monthGroups[monthKey] = { diurno: initShiftObj(), noturno: initShiftObj() };
                      }
                      const s = monthGroups[monthKey][v.shift];
                      if (v.sys !== null && v.dia !== null) { s.sysSum += v.sys; s.diaSum += v.dia; s.sysCount += 1; s.diaCount += 1; }
                      if (v.hr !== null) { s.hrSum += v.hr; s.hrCount += 1; }
                      if (v.spo2 !== null) { s.spo2Sum += v.spo2; s.spo2Count += 1; }
                      if (v.temp !== null) { s.tempSum += v.temp; s.tempCount += 1; }
                    });
                    averagesList = aggregateRecords(monthGroups);
                    averagesList.forEach(item => {
                      const [year, month] = item.key.split('-');
                      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                      item.label = `${months[parseInt(month, 10) - 1]} / ${year}`;
                    });
                  }

                  averagesList.sort((a, b) => b.key.localeCompare(a.key));

                  return (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5 mt-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
                            Acompanhamento de Médias de Sinais Vitais
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Cálculo consolidado das médias diurnas (06h às 18h) e noturnas (18h às 06h) de todos os sinais
                          </p>
                        </div>
                        <button
                          onClick={() => handlePrintVitalsAverages(vitalsPeriodType)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-xl border border-primary-200 transition-colors shadow-sm w-full sm:w-auto justify-center"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Imprimir Relatório</span>
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex gap-2">
                          {(['day', 'week', 'month'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => setVitalsPeriodType(type)}
                              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                vitalsPeriodType === type
                                  ? 'bg-primary-600 text-white shadow-sm'
                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              {type === 'day' ? 'Diário' : type === 'week' ? 'Semanal' : 'Mensal'}
                            </button>
                          ))}
                        </div>

                        {/* Controles de filtro dinâmicos */}
                        <div className="flex items-center gap-2">
                          {vitalsPeriodType === 'day' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500">Selecione o Dia:</span>
                              <input
                                type="date"
                                value={vitalsSelectedDay}
                                onChange={(e) => setVitalsSelectedDay(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                              />
                            </div>
                          )}
                          {vitalsPeriodType === 'week' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500">Semana do Dia:</span>
                              <input
                                type="date"
                                value={vitalsSelectedWeekDate}
                                onChange={(e) => setVitalsSelectedWeekDate(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                              />
                            </div>
                          )}
                          {vitalsPeriodType === 'month' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500">Selecione o Mês:</span>
                              <input
                                type="month"
                                value={vitalsSelectedMonth}
                                onChange={(e) => setVitalsSelectedMonth(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-slate-800 font-semibold uppercase text-xs">
                            <tr>
                              <th className="px-4 py-3 rounded-l-xl w-[15%]">Período</th>
                              <th className="px-4 py-3 w-[15%]">Turno</th>
                              <th className="px-4 py-3">Pressão Arterial</th>
                              <th className="px-4 py-3">Freq. Cardíaca</th>
                              <th className="px-4 py-3">Saturação (SpO₂)</th>
                              <th className="px-4 py-3">Temperatura</th>
                              <th className="px-4 py-3 rounded-r-xl">Classificação (PA)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {averagesList.length > 0 ? (
                              averagesList.map((item) => {
                                const renderRow = (shiftLabel: string, shiftData: any, icon: any) => {
                                  if (!shiftData) {
                                    return (
                                      <>
                                        <td className="px-4 py-2 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                          {icon}
                                          <span>{shiftLabel}</span>
                                        </td>
                                        <td className="px-4 py-2 text-slate-350">—</td>
                                        <td className="px-4 py-2 text-slate-350">—</td>
                                        <td className="px-4 py-2 text-slate-350">—</td>
                                        <td className="px-4 py-2 text-slate-350">—</td>
                                        <td className="px-4 py-2 text-slate-350">—</td>
                                      </>
                                    );
                                  }

                                  return (
                                    <>
                                      <td className="px-4 py-2 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                        {icon}
                                        <span>{shiftLabel}</span>
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap">
                                        {shiftData.bp ? (
                                          <div className="flex items-center gap-1">
                                            <span className="font-semibold text-slate-800">{shiftData.bp.sys}/{shiftData.bp.dia}</span>
                                            <span className="text-[10px] text-slate-450">mmHg</span>
                                            <span className="text-[9px] text-slate-400 font-normal">({shiftData.bp.count} med.)</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-350">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap">
                                        {shiftData.hr ? (
                                          <div className="flex items-center gap-1">
                                            <span className="font-semibold text-slate-800">{shiftData.hr.val}</span>
                                            <span className="text-[10px] text-slate-450">bpm</span>
                                            <span className="text-[9px] text-slate-400 font-normal">({shiftData.hr.count} med.)</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-350">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap">
                                        {shiftData.spo2 ? (
                                          <div className="flex items-center gap-1">
                                            <span className="font-semibold text-slate-800">{shiftData.spo2.val}</span>
                                            <span className="text-[10px] text-slate-450">%</span>
                                            <span className="text-[9px] text-slate-400 font-normal">({shiftData.spo2.count} med.)</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-350">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap">
                                        {shiftData.temp ? (
                                          <div className="flex items-center gap-1">
                                            <span className="font-semibold text-slate-800">{shiftData.temp.val}</span>
                                            <span className="text-[10px] text-slate-450">°C</span>
                                            <span className="text-[9px] text-slate-400 font-normal">({shiftData.temp.count} med.)</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-350">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        {shiftData.classification ? (
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${shiftData.classification.color}`}>
                                            {shiftData.classification.label}
                                          </span>
                                        ) : (
                                          <span className="text-slate-350">—</span>
                                        )}
                                      </td>
                                    </>
                                  );
                                };

                                return (
                                  <React.Fragment key={item.key}>
                                    <tr className="border-t border-slate-100 hover:bg-slate-50/30 transition-colors">
                                      <td rowSpan={2} className="px-4 py-3 font-bold text-slate-855 whitespace-nowrap bg-slate-50/10 align-middle border-r border-slate-100 text-xs">
                                        {item.label}
                                      </td>
                                      {renderRow('Diurno', item.diurno, <Sun className="h-3.5 w-3.5 text-amber-500" />)}
                                    </tr>
                                    <tr className="hover:bg-slate-50/30 transition-colors border-b border-slate-100">
                                      {renderRow('Noturno', item.noturno, <Moon className="h-3.5 w-3.5 text-indigo-500" />)}
                                    </tr>
                                  </React.Fragment>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                                  Nenhum registro de Sinais Vitais encontrado para este residente.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {activeTab === 'meds' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-slate-800">Gestão de Medicamentos</h3>
                 <button 
                   onClick={() => setIsPrescriptionModalOpen(true)}
                   className="flex items-center text-sm text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100"
                 >
                   <Plus className="h-4 w-4 mr-1" /> Nova Prescrição
                 </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-800 font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Medicamento</th>
                      <th className="px-4 py-3">Dosagem/Via</th>
                      <th className="px-4 py-3">Frequência</th>
                      <th className="px-4 py-3">Próxima Dose</th>
                      <th className="px-4 py-3 rounded-tr-lg text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resident.medications.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{med.name}</span>
                            {med.documentUrl && (
                              <a 
                                href={med.documentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-0.5 text-xs font-normal"
                                title="Visualizar receita digitalizada"
                              >
                                <FileText size={14} className="text-blue-500" />
                                <span className="underline">Receita</span>
                              </a>
                            )}
                          </div>
                          {med.observations && (
                            <div className="text-xs text-slate-450 font-normal mt-0.5 max-w-xs break-words">{med.observations}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">{med.dosage} ({med.route})</td>
                        <td className="px-4 py-3">{med.frequency}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {med.nextDose}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                           <button 
                            onClick={() => handleAdministerMedication(med.id)}
                            className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded hover:bg-emerald-700 transition-colors mr-2"
                           >
                             Checar
                           </button>
                           <button className="text-rose-500 hover:text-rose-700 p-1" title="Registrar Reação Adversa">
                             <AlertOctagon size={16} />
                           </button>
                           <button 
                              onClick={() => handleDeleteMedication(med.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 ml-2 inline-flex items-center"
                              title="Excluir Prescrição"
                            >
                              <Trash2 size={16} />
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'routine' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Date Selector Header (only visible when not editing) */}
              {checklistDraft === null && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-indigo-600" />
                      Histórico de Boletins Diários
                    </h3>
                    <p className="text-xs text-slate-500">
                      Consulte ou preencha boletins de datas anteriores.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsAllChecklistsModalOpen(true)}
                      className="flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors shadow-sm mr-2 cursor-pointer"
                    >
                      <ClipboardList className="h-3.5 w-3.5 mr-1" />
                      Ver Todos Preenchidos
                    </button>
                    <span className="text-xs font-semibold text-slate-600">Selecionar Data:</span>
                    <input 
                      type="date"
                      value={selectedChecklistDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedChecklistDate(e.target.value);
                        }
                      }}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-800 shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* Daily Checklist */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                {/* Shift Selector Toggle */}
                <div className="flex justify-center mb-6">
                  <div className="bg-slate-200/80 p-1 rounded-xl flex gap-1 border border-slate-300/50 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        if (checklistDraft === null) setSelectedShift('diurno');
                      }}
                      disabled={checklistDraft !== null}
                      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                        selectedShift === 'diurno'
                          ? 'bg-white text-amber-600 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      } ${checklistDraft !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      Boletim Diurno
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (checklistDraft === null) setSelectedShift('noturno');
                      }}
                      disabled={checklistDraft !== null}
                      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                        selectedShift === 'noturno'
                          ? 'bg-white text-indigo-650 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      } ${checklistDraft !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      Boletim Noturno
                    </button>
                  </div>
                </div>

                {checklistDraft === null ? (
                  /* READ-ONLY & COMPLETED VIEW OR UNFILLED PLACEHOLDER */
                  !(
                    selectedChecklist.queixaDor ||
                    selectedChecklist.estadoNeurologico ||
                    selectedChecklist.alimentacao ||
                    selectedChecklist.eliminacaoEvacuacao ||
                    selectedChecklist.diurese ||
                    selectedChecklist.usoFraldas ||
                    selectedChecklist.mobilidadeSet ||
                    selectedChecklist.alteracoesPele ||
                    selectedChecklist.sono ||
                    selectedChecklist.medicacoesAdministradas ||
                    selectedChecklist.atividadesConsulta ||
                    selectedChecklist.intercorrencia
                  ) ? (
                    /* Unfilled Placeholder */
                    <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-slate-350 shadow-sm flex flex-col items-center">
                      <div className="p-4 bg-primary-50 rounded-full text-primary-600 mb-4 animate-bounce">
                        <CalendarCheck className="h-10 w-10" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">
                        Rotina {selectedShift === 'diurno' ? 'Diurna' : 'Noturna'} Pendente ({new Date(selectedChecklistDate + 'T00:00:00').toLocaleDateString('pt-BR')})
                      </h3>
                      <p className="text-sm text-slate-500 max-w-sm mb-6">
                        O prontuário {selectedShift === 'diurno' ? 'diurno' : 'noturno'} para este dia ainda não foi iniciado para este residente. Crie o boletim para registrar a evolução de rotina.
                      </p>
                      <button
                        onClick={handleStartEditChecklist}
                        className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Preencher Boletim {selectedShift === 'diurno' ? 'Diurno' : 'Noturno'}
                      </button>
                    </div>
                  ) : (
                    /* Completed Summary Card View */
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 flex items-center">
                            <CalendarCheck className="h-6 w-6 mr-2 text-primary-600" />
                            Boletim {selectedShift === 'diurno' ? 'Diurno' : 'Noturno'} de Acompanhamento ({new Date(selectedChecklistDate + 'T00:00:00').toLocaleDateString('pt-BR')})
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Acompanhamento clínico e de rotina {selectedShift === 'diurno' ? 'diurno' : 'noturno'} do residente para este dia de plantão.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                          {selectedChecklist.signedBy ? (
                            <>
                              <span className="text-xs bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-full font-medium flex items-center shadow-sm gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                                Assinado por {selectedChecklist.signedBy}
                              </span>
                              <button
                                onClick={handlePrintChecklist}
                                className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5 mr-1.5 text-primary-600" />
                                Imprimir Boletim
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full font-medium flex items-center shadow-sm">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                                Salvo no prontuário
                              </span>
                              <button
                                onClick={() => handleRequestSign('read')}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white border border-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                              >
                                <PenTool className="h-3.5 w-3.5 mr-1.5" />
                                Assinar Digitalmente
                              </button>
                              <button
                                onClick={handleStartEditChecklist}
                                className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-1.5 text-primary-600" />
                                Editar Boletim
                              </button>
                              <button
                                onClick={handlePrintChecklist}
                                className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5 mr-1.5 text-primary-600" />
                                Imprimir Boletim
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* SECTION 1: ESTADO GERAL & SINTOMAS */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700 flex justify-between items-center">
                            <span>1. Sintomas & Estado Geral</span>
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">Estabilidade</span>
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Queixa de Dor:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${selectedChecklist.queixaDor === 'sim' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                                {selectedChecklist.queixaDor === 'sim' ? `Sim: ${selectedChecklist.queixaDorDesc || 'Sem descrição'}` : 'Não relatada'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Oxigenação:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${selectedChecklist.arAmbiente ? 'bg-sky-105 text-sky-800' : 'bg-slate-100 text-slate-700'}`}>
                                {selectedChecklist.arAmbiente ? 'Ar Ambiente (Respiração normal)' : 'Necessitando de O2 Suplementar'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-550 font-medium text-xs sm:text-sm">Estado Neurológico:</span>
                              <span className="font-semibold text-slate-700 text-xs shadow-none">
                                {selectedChecklist.estadoNeurologico || 'Não informado'}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5 pt-1">
                              <span className="text-slate-505 font-medium text-xs">Comportamento de Observação:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedChecklist.agitado && <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-amber-200">Agitado</span>}
                                {selectedChecklist.prostrado && <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-blue-200">Prostrado</span>}
                                {selectedChecklist.sonolento && <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-slate-205">Sonolento</span>}
                                {!selectedChecklist.agitado && !selectedChecklist.prostrado && !selectedChecklist.sonolento && (
                                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-200">Calmo / Estável</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 1.5: SINAIS VITAIS — VIEW MODE */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700 flex items-center gap-2">
                            Sinais Vitais
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="flex flex-col items-center justify-center bg-rose-50 border border-rose-200 rounded-xl p-3">
                              <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide mb-1">Freq. Cardíaca</span>
                              <span className="text-lg font-bold text-rose-800">{selectedChecklist.frequenciaCardiaca || '—'}</span>
                              <span className="text-[10px] text-rose-400 font-medium">bpm</span>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-blue-50 border border-blue-200 rounded-xl p-3">
                              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Pressão Arterial</span>
                              <span className="text-lg font-bold text-blue-800">{selectedChecklist.pressaoArterial || '—'}</span>
                              <span className="text-[10px] text-blue-400 font-medium">mmHg</span>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-sky-50 border border-sky-200 rounded-xl p-3">
                              <span className="text-[10px] font-semibold text-sky-600 uppercase tracking-wide mb-1">Saturação (SpO2)</span>
                              <span className="text-lg font-bold text-sky-800">{selectedChecklist.saturacao || '—'}</span>
                              <span className="text-[10px] text-sky-400 font-medium">%</span>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-amber-50 border border-amber-200 rounded-xl p-3">
                              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Temperatura</span>
                              <span className="text-lg font-bold text-amber-800">{selectedChecklist.temperatura || '—'}</span>
                              <span className="text-[10px] text-amber-400 font-medium">°C</span>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 2: NUTRIÇÃO & ELIMINAÇÕES */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                            2. Alimentação & Eliminações
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Alimentação:</span>
                              <span className={`font-semibold px-2.5 py-0.5 rounded text-xs ${
                                selectedChecklist.alimentacao === 'boa' ? 'bg-emerald-105 text-emerald-800' :
                                selectedChecklist.alimentacao === 'moderada' ? 'bg-amber-100 text-amber-800' :
                                selectedChecklist.alimentacao === 'ruim' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {selectedChecklist.alimentacao === 'boa' ? 'Boa Aceitação' :
                                selectedChecklist.alimentacao === 'moderada' ? 'Aceitação Moderada' :
                                selectedChecklist.alimentacao === 'ruim' ? `Ruim: ${selectedChecklist.alimentacaoDesc || ''}` : 'Não informado'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Bolo Fecal (Evacuação):</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${selectedChecklist.eliminacaoEvacuacao === 'presente' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-850'}`}>
                                {selectedChecklist.eliminacaoEvacuacao === 'presente' ? 'Presente' : 'Ausente'} 
                                {selectedChecklist.eliminacaoEvacuacaoDias ? ` (Dias: ${selectedChecklist.eliminacaoEvacuacaoDias})` : ''}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Aspecto Fecal:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${selectedChecklist.aspectoEvacuacoes === 'liquida-diarreia' ? 'bg-rose-500 text-white font-bold' : 'bg-slate-105 text-slate-700'}`}>
                                {selectedChecklist.aspectoEvacuacoes === 'endurecidas' ? 'Fezes Endurecidas' :
                                selectedChecklist.aspectoEvacuacoes === 'pastosa' ? 'Pastosa' :
                                selectedChecklist.aspectoEvacuacoes === 'semi-liquidas' ? 'Semi-líquidas' :
                                selectedChecklist.aspectoEvacuacoes === 'liquida-diarreia' ? 'Líquida / Diarreia' : 'Não informado'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Diurese:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {selectedChecklist.diurese === 'ausente' ? 'Ausente' : selectedChecklist.diurese === 'aumentada' ? 'Aumentada' : selectedChecklist.diurese === 'diminuida' ? 'Diminuída' : 'Adequada / Normal'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Aspecto Urinário:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${selectedChecklist.diureseAspecto === 'odor-sangue-ardencia' ? 'bg-rose-100 text-rose-800 font-bold border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
                                {selectedChecklist.diureseAspecto === 'clara' ? 'Urina Clara' :
                                selectedChecklist.diureseAspecto === 'concentrada' ? 'Concentrada' :
                                selectedChecklist.diureseAspecto === 'odor-sangue-ardencia' ? 'Com Odor, Sangue ou Ardência' : 'Não informado'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 3: CUIDADOS & MOBILIDADE */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                            3. Cuidados & Mobilidade
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Uso de Fraldas:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {selectedChecklist.usoFraldas === 'sim' ? 'Sim, usa fraldas' : 'Não faz uso'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Mobilidade Geral:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {selectedChecklist.mobilidadeSet === 'independente' ? 'Independente' :
                                selectedChecklist.mobilidadeSet === 'auxilio' ? 'Necessita de Auxílio' :
                                selectedChecklist.mobilidadeSet === 'acamado' ? 'Acamado' : 'Não informado'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Higiene / Banho:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {selectedChecklist.higieneCorporal === 'independente' ? 'Independente' :
                                selectedChecklist.higieneCorporal === 'auxilio' ? 'Com Auxílio' : 'Não informado'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Higiene Oral & Vestir:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {selectedChecklist.higieneOralVestir === 'independente' ? 'Independente' :
                                selectedChecklist.higieneOralVestir === 'auxilio' ? 'Com Auxílio' : 'Não informado'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 4: DERMATO, SONO & MEDICINA */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                            4. Diagnósticos, Sono & Rotina
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex flex-col gap-1 py-1 border-b border-slate-50 border-dotted">
                              <div className="flex justify-between">
                                <span className="text-slate-505 font-medium text-xs">Pele e Lesões:</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${selectedChecklist.alteracoesPele === 'sim' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-55 text-emerald-800'}`}>
                                  {selectedChecklist.alteracoesPele === 'sim' ? 'Com Alteração / Edema' : 'Pele íntegra / Sem Lesões'}
                                </span>
                              </div>
                              {selectedChecklist.alteracoesPele === 'sim' && selectedChecklist.alteracoesPeleDesc && (
                                <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded mt-1 font-medium bg-rose-100/50">{selectedChecklist.alteracoesPeleDesc}</p>
                              )}
                            </div>

                            {selectedShift === 'noturno' && (
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Qualidade do Sono:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${selectedChecklist.sono === 'insatisfatorio' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-55 text-emerald-800'}`}>
                                {selectedChecklist.sono === 'preservado' ? 'Sono Preservado' : selectedChecklist.sono === 'insatisfatorio' ? `Insatisfatório: ${selectedChecklist.sonoDesc || ''}` : 'Não informado'}
                              </span>
                            </div>
                            )}

                            {selectedChecklist.medicacoesAdministradas && (
                              <div className="flex flex-col gap-1.5 py-1.5 border-b border-slate-50 border-dotted">
                                <span className="text-slate-500 font-medium text-xs">Medicações Administradas:</span>
                                {(() => {
                                  const parsedMeds = parseMedications(selectedChecklist.medicacoesAdministradas);
                                  if (parsedMeds) {
                                    return (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                        {parsedMeds.map((med, idx) => (
                                          <div key={med.id || idx} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                            <div>
                                              <span className="font-semibold text-slate-800">{med.name}</span>
                                              <span className="text-[10px] text-slate-400 block">{med.dosage}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                med.status === 'tomou'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : med.status === 'nao_tomou'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : 'bg-slate-100 text-slate-600'
                                              }`}>
                                                {med.status === 'tomou' ? 'Tomou' : med.status === 'nao_tomou' ? 'Não Tomou' : 'Pendente'}
                                              </span>
                                              {med.status === 'tomou' && med.time && (
                                                <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                                  {med.time}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <p className="text-xs bg-slate-50 p-2 rounded text-slate-700 whitespace-pre-wrap">
                                        {selectedChecklist.medicacoesAdministradas}
                                      </p>
                                    );
                                  }
                                })()}
                              </div>
                            )}

                            {selectedChecklist.atividadesConsulta && (
                              <div className="flex flex-col gap-1 py-1 border-b border-slate-50 border-dotted">
                                <span className="text-slate-505 font-medium text-xs">Atividades & Consultas:</span>
                                <p className="text-xs bg-slate-50 p-2 rounded text-slate-800 whitespace-pre-wrap">{selectedChecklist.atividadesConsulta}</p>
                              </div>
                            )}

                            <div className="flex flex-col gap-1 pt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-750 font-bold text-xs">Intercorrências no Plantão:</span>
                                <span className={`font-bold px-2.5 py-0.5 rounded text-xs border ${selectedChecklist.intercorrencia === 'sim' ? 'bg-rose-500 text-white animate-pulse border-rose-600' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                                  {selectedChecklist.intercorrencia === 'sim' ? 'Houve Intercorrência' : 'Nenhuma registrada'}
                                </span>
                              </div>
                              {selectedChecklist.intercorrencia === 'sim' && selectedChecklist.intercorrenciaDesc && (
                                <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded border border-rose-205 mt-1.5 font-medium whitespace-pre-wrap leading-relaxed animate-pulse">
                                  {selectedChecklist.intercorrenciaDesc}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SECTION 5: PLANO INDIVIDUAL DE CUIDADOS */}
                        {resident.carePlan && resident.carePlan.length > 0 && (
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 mt-6">
                            <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700 flex justify-between items-center">
                              <span>5. Acompanhamento do Plano de Cuidados</span>
                            </h4>
                            <div className="space-y-4">
                              {(selectedChecklist.carePlanAdherence && selectedChecklist.carePlanAdherence.length > 0) ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {selectedChecklist.carePlanAdherence.map((adh) => {
                                    const plan = resident.carePlan?.find(p => p.id === adh.carePlanId);
                                    if (!plan) return null;
                                    return (
                                      <div key={adh.carePlanId} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                          <div>
                                            <h5 className="font-bold text-sm text-slate-800">{plan.title}</h5>
                                            <p className="text-xs text-slate-500 line-clamp-2">{plan.description}</p>
                                          </div>
                                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                                            adh.status === 'conseguindo_seguir'
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                              : adh.status === 'apresentando_dificuldades'
                                                ? 'bg-amber-105 text-amber-800 border border-amber-200'
                                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                                          }`}>
                                            {adh.status === 'conseguindo_seguir'
                                              ? 'Conseguindo seguir'
                                              : adh.status === 'apresentando_dificuldades'
                                                ? 'Com dificuldades'
                                                : 'Não está conseguindo'}
                                          </span>
                                        </div>
                                        {adh.comment && (
                                          <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 mt-2">
                                            <span className="font-semibold text-slate-400 block mb-0.5 text-[9px] uppercase tracking-wider">Comentário</span>
                                            {adh.comment}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Nenhum registro de acompanhamento do plano de cuidados para esta data.</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* SECTION 6: REGISTRO FOTOGRÁFICO — VIEW MODE */}
                        {selectedChecklist.photoUrl && (
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 mt-6">
                            <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700 flex items-center gap-2">
                              <Camera className="h-4 w-4" />
                              6. Registro Fotográfico do Residente
                            </h4>
                            <div className="flex flex-col items-start gap-2">
                              <img
                                src={selectedChecklist.photoUrl}
                                alt="Foto do boletim diário"
                                className="w-full max-w-sm rounded-xl border border-slate-200 shadow-sm object-cover"
                              />
                              <p className="text-xs text-slate-500 italic">
                                Acompanhamento visual registrado neste boletim diário.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Painel de Validação de Assinatura */}
                        {selectedChecklist.signedBy && (() => {
                          const parsedSig = (() => {
                            if (!selectedChecklist.signatureInfo) return null;
                            try { return JSON.parse(selectedChecklist.signatureInfo); } catch { return null; }
                          })();
                          const isSimples = parsedSig?.tipo_assinatura === 'simples';
                          return (
                          <div className="bg-emerald-50/40 border-l-4 border-emerald-500 border border-slate-200 rounded-xl p-5 mt-6 shadow-sm">
                            <div className="flex items-start gap-4">
                              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 shrink-0 shadow-sm border border-emerald-200/50">
                                <ShieldCheck className="h-6 w-6" />
                              </div>
                              <div className="space-y-1.5 w-full">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                                      Validação de Assinatura Digital
                                    </h4>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      {isSimples ? 'ASSINATURA ELETRÔNICA' : 'ICP-BRASIL VÁLIDA'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium font-mono">
                                    Documento Integrado e Auditado
                                  </div>
                                </div>

                                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                  {isSimples
                                    ? 'Este prontuário/boletim de acompanhamento foi assinado e selado eletronicamente pela Assinatura Eletrônica Interna, registrando o nome completo, CPF e data/hora do usuário autenticado no momento da assinatura.'
                                    : 'Este prontuário/boletim de acompanhamento foi assinado e selado eletronicamente utilizando um certificado digital ICP-Brasil A1. A assinatura atesta a autoria e a integridade deste registro clínico na data especificada, em conformidade com a MP 2.200-2/2001.'}
                                </p>

                                {isSimples ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mt-4 pt-3 text-xs text-slate-650">
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Assinante / Titular</p>
                                      <p className="font-bold text-slate-700 mt-1">{parsedSig?.nome_assinante || selectedChecklist.signedBy}</p>
                                    </div>
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">CPF do Assinante</p>
                                      <p className="font-mono font-bold text-slate-700 mt-1">{parsedSig?.cpf_assinante || '—'}</p>
                                    </div>
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 shadow-sm border-emerald-100/50 bg-emerald-50/20">
                                      <p className="text-emerald-700 font-bold uppercase tracking-wider text-[9px]">Carimbo de Data/Hora (Assinatura)</p>
                                      <p className="font-bold text-emerald-900 mt-1 flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                        {new Date(selectedChecklist.signedAt || '').toLocaleString('pt-BR')}
                                      </p>
                                    </div>
                                  </div>
                                ) : parsedSig ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mt-4 pt-3 text-xs text-slate-650">
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Assinante / Titular</p>
                                      <p className="font-bold text-slate-700 mt-1">{parsedSig.certificate_holder_name}</p>
                                    </div>
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Documento de Identidade</p>
                                      <p className="font-mono font-bold text-slate-700 mt-1">{parsedSig.certificate_document}</p>
                                    </div>
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 shadow-sm border-emerald-100/50 bg-emerald-50/20">
                                      <p className="text-emerald-700 font-bold uppercase tracking-wider text-[9px]">Carimbo de Data/Hora (Assinatura)</p>
                                      <p className="font-bold text-emerald-900 mt-1 flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                        {new Date(selectedChecklist.signedAt || '').toLocaleString('pt-BR')}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4 pt-3 text-xs text-slate-650">
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Assinado por</p>
                                      <p className="font-bold text-slate-700 mt-1">{selectedChecklist.signedBy}</p>
                                    </div>
                                    <div className="bg-white/60 p-2.5 rounded-lg border border-slate-100 shadow-sm border-emerald-100/50 bg-emerald-50/20">
                                      <p className="text-emerald-700 font-bold uppercase tracking-wider text-[9px]">Carimbo de Data/Hora (Assinatura)</p>
                                      <p className="font-bold text-emerald-900 mt-1 flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                        {new Date(selectedChecklist.signedAt || '').toLocaleString('pt-BR')}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          );
                        })()}
                      </div>
                    </div>
                  )
                ) : (
                  /* EXPLICIT EDIT MODE USING activeChecklist */
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center">
                          <CalendarCheck className="h-6 w-6 mr-2 text-primary-600" />
                          Preenchimento de Boletim {selectedShift === 'diurno' ? 'Diurno' : 'Noturno'}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-semibold text-slate-600">Data do Boletim:</span>
                          <input 
                            type="date"
                            value={checklistDraft.date}
                            onChange={(e) => handleChecklistFieldChange('date', e.target.value)}
                            className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 text-slate-800 shadow-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={handleCancelEditChecklist}
                          className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestSign('edit')}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white border border-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <PenTool className="h-3.5 w-3.5 mr-1.5" />
                          Assinar e Salvar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* SECTION 1: QUEIXAS & ESTADO NEUROLÓGICO */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                          1. Sintomas & Estado Geral
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Queixa Dor */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Queixa Dor</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('queixaDor', 'nao')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.queixaDor === 'nao'
                                    ? 'bg-slate-100 border-slate-400 text-slate-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Não
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('queixaDor', 'sim')}
                                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.queixaDor === 'sim'
                                    ? 'bg-rose-50 border-rose-300 text-rose-750 font-bold shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Sim
                              </button>
                            </div>
                            {checklistDraft.queixaDor === 'sim' && (
                              <input
                                type="text"
                                value={checklistDraft.queixaDorDesc || ''}
                                onChange={(e) => handleChecklistFieldChange('queixaDorDesc', e.target.value)}
                                placeholder="Descreva a dor..."
                                className="w-full mt-2 px-3 py-1.5 border border-rose-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 bg-rose-50/10 text-slate-800 placeholder-slate-400"
                              />
                            )}
                          </div>

                          {/* Oxigênio / Ar ambiente */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Respiração</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('arAmbiente', true)}
                                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                                  checklistDraft.arAmbiente === true
                                    ? 'bg-sky-50 border-sky-305 text-sky-800 font-bold ring-1 ring-sky-300'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Ar ambiente
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('arAmbiente', false)}
                                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                                  checklistDraft.arAmbiente === false
                                    ? 'bg-amber-50 border-amber-305 text-amber-850 font-bold ring-1 ring-amber-300'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Oxigênio Suplementar
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Estado Neurológico */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">Estado neurológico:</label>
                          <input
                            type="text"
                            value={checklistDraft.estadoNeurologico || ''}
                            onChange={(e) => handleChecklistFieldChange('estadoNeurologico', e.target.value)}
                            placeholder="Informe o nível de consciência (Ex: Lúcido e orientado, sonolento, confuso)"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>

                        {/* Outras Observações (Comportamento) */}
                        <div className="space-y-2 pt-2">
                          <span className="block text-xs font-bold text-slate-700">Comportamento observado no plantão:</span>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { key: 'agitado', label: 'Agitado' },
                              { key: 'prostrado', label: 'Prostrado' },
                              { key: 'sonolento', label: 'Sonolento' }
                            ].map((obs) => (
                              <button
                                key={obs.key}
                                type="button"
                                onClick={() => handleChecklistFieldChange(obs.key as keyof DailyChecklist, !checklistDraft[obs.key as keyof DailyChecklist])}
                                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                                  checklistDraft[obs.key as keyof DailyChecklist]
                                    ? 'bg-amber-100 border-amber-300 text-amber-850 font-bold shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {obs.label} {checklistDraft[obs.key as keyof DailyChecklist] ? '✓' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: NUTRIÇÃO & ELIMINAÇÕES */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                          2. Alimentação & Eliminações
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Alimentação */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Aceitação Alimentar</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { value: 'boa', label: 'Boa Aceitação' },
                                { value: 'moderada', label: 'Moderada' },
                                { value: 'ruim', label: 'Aceitação Ruim' }
                              ].map((level) => (
                                <button
                                  key={level.value}
                                  type="button"
                                  onClick={() => handleChecklistFieldChange('alimentacao', level.value as any)}
                                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all ${
                                    checklistDraft.alimentacao === level.value
                                      ? level.value === 'boa'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                        : level.value === 'moderada'
                                        ? 'bg-amber-50 border-amber-300 text-amber-805 font-bold'
                                        : 'bg-rose-50 border-rose-305 text-rose-800 font-bold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {level.label}
                                </button>
                              ))}
                            </div>
                            {checklistDraft.alimentacao === 'ruim' && (
                              <input
                                type="text"
                                value={checklistDraft.alimentacaoDesc || ''}
                                onChange={(e) => handleChecklistFieldChange('alimentacaoDesc', e.target.value)}
                                placeholder="Descreva os motivos..."
                                className="w-full mt-2 px-3 py-1.5 border border-rose-350 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 bg-rose-50/10 text-slate-800 placeholder-slate-400"
                              />
                            )}
                          </div>

                          {/* Eliminação / Evacuação */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Fezes (Defecação / Eliminação)</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('eliminacaoEvacuacao', 'presente')}
                                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.eliminacaoEvacuacao === 'presente'
                                    ? 'bg-emerald-50 border-emerald-305 text-emerald-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Presente
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('eliminacaoEvacuacao', 'ausente')}
                                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.eliminacaoEvacuacao === 'ausente'
                                    ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Ausente
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[11px] text-slate-600 whitespace-nowrap font-medium">Dias ou frequência:</span>
                              <input
                                type="text"
                                value={checklistDraft.eliminacaoEvacuacaoDias || ''}
                                onChange={(e) => handleChecklistFieldChange('eliminacaoEvacuacaoDias', e.target.value)}
                                placeholder="Informe a frequência ou dias sem evacuar..."
                                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Aspecto Evacuações */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Aspecto evacuações</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { value: 'endurecidas', label: 'Endurecidas' },
                              { value: 'pastosa', label: 'Pastosa' },
                              { value: 'semi-liquidas', label: 'Semi Liquidas' },
                              { value: 'liquida-diarreia', label: 'Líquida / Diarreia', alert: true }
                            ].map((asp) => (
                              <button
                                key={asp.value}
                                type="button"
                                onClick={() => handleChecklistFieldChange('aspectoEvacuacoes', asp.value as any)}
                                className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-all ${
                                  checklistDraft.aspectoEvacuacoes === asp.value
                                    ? asp.alert
                                      ? 'bg-rose-600 text-white font-bold border-rose-700 shadow-sm'
                                      : 'bg-amber-100 border-amber-300 text-amber-805 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {asp.label} {asp.alert && '⚠️'}
                              </button>
                            ))}
                          </div>
                          {checklistDraft.aspectoEvacuacoes === 'liquida-diarreia' && (
                            <div className="p-2.5 bg-rose-50 border border-rose-250 text-rose-800 rounded-lg text-xs flex items-center font-bold">
                              ⚠️ [ALERTA DE DIARREIA]: Acompanhar de perto a hidratação e relatar à supervisão.
                            </div>
                          )}
                        </div>

                        {/* Diurese & Aspecto */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Diurese</label>
                            <div className="flex gap-2">
                              {[
                                { value: 'normal', label: 'Normal / Adequada' },
                                { value: 'ausente', label: 'Ausente' },
                                { value: 'aumentada', label: 'Aumentada' },
                                { value: 'diminuida', label: 'Diminuída' }
                              ].map((diur) => (
                                <button
                                  key={diur.value}
                                  type="button"
                                  onClick={() => handleChecklistFieldChange('diurese', diur.value as any)}
                                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs text-center transition-all ${
                                    (checklistDraft.diurese === diur.value || (diur.value === 'normal' && !checklistDraft.diurese))
                                      ? 'bg-amber-50 border-amber-300 text-amber-805 font-bold shadow-xs'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {diur.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Aspecto Urinário</label>
                            <div className="grid grid-cols-3 gap-1.5 font-bold">
                              {[
                                { value: 'clara', label: 'Clara' },
                                { value: 'concentrada', label: 'Concentrada' },
                                { value: 'odor-sangue-ardencia', label: 'Com odor, sangue/ard.' }
                              ].map((asp) => (
                                <button
                                  key={asp.value}
                                  type="button"
                                  onClick={() => handleChecklistFieldChange('diureseAspecto', asp.value as any)}
                                  className={`py-1.5 px-1 rounded-lg border text-[10px] text-center transition-all ${
                                    checklistDraft.diureseAspecto === asp.value
                                      ? asp.value === 'odor-sangue-ardencia'
                                        ? 'bg-rose-500 text-white font-bold border-rose-600 shadow-sm animate-pulse'
                                        : 'bg-amber-100 border-amber-300 text-amber-805 font-bold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                  title={asp.label}
                                >
                                  {asp.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: PELE, SONO, MEDICAÇÃO & INTERCORRÊNCIAS */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                          3. Dermatologia, Sono & Rotina de Cuidados
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Alterações na pele ou edema/lesão */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Alterações na pele / edema (lesão)</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('alteracoesPele', 'nao')}
                                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.alteracoesPele === 'nao'
                                    ? 'bg-slate-100 border-slate-300 text-slate-700 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Não apresenta alterações
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('alteracoesPele', 'sim')}
                                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.alteracoesPele === 'sim'
                                    ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Sim, apresenta alterações
                              </button>
                            </div>
                            {checklistDraft.alteracoesPele === 'sim' && (
                              <input
                                type="text"
                                value={checklistDraft.alteracoesPeleDesc || ''}
                                onChange={(e) => handleChecklistFieldChange('alteracoesPeleDesc', e.target.value)}
                                placeholder="Informe o local e detalhes da lesão..."
                                className="w-full mt-2 px-3 py-1.5 border border-rose-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 bg-rose-50/10 text-slate-800 placeholder-slate-400"
                              />
                            )}
                          </div>

                          {/* Sono - apenas no boletim noturno */}
                          {selectedShift === 'noturno' && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Qualidade de Sono</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('sono', 'preservado')}
                                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.sono === 'preservado'
                                    ? 'bg-emerald-50 border-emerald-305 text-emerald-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Preservado
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('sono', 'insatisfatorio')}
                                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.sono === 'insatisfatorio'
                                    ? 'bg-rose-50 border-rose-305 text-rose-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Insatisfatório
                              </button>
                            </div>
                            {checklistDraft.sono === 'insatisfatorio' && (
                              <input
                                type="text"
                                value={checklistDraft.sonoDesc || ''}
                                onChange={(e) => handleChecklistFieldChange('sonoDesc', e.target.value)}
                                placeholder="Descreva o distúrbio de sono observado..."
                                className="w-full mt-2 px-3 py-1.5 border border-rose-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 bg-rose-50/10 text-slate-800 placeholder-slate-400"
                              />
                            )}
                          </div>
                          )}
                        </div>

                        {/* Medicações administradas e horários */}
                        <div className="space-y-2 pt-2">
                          <label className="block text-xs font-bold text-slate-700">Medicações Administradas e Horários:</label>
                          {(() => {
                            const parsedMeds = parseMedications(checklistDraft.medicacoesAdministradas);
                            if (parsedMeds) {
                              return (
                                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                  <div className="grid grid-cols-1 gap-3">
                                    {parsedMeds.map((med, idx) => (
                                      <div key={med.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                                        <div>
                                          <span className="font-semibold text-xs text-slate-800 block">{med.name}</span>
                                          <span className="text-[10px] text-slate-500">{med.dosage}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...parsedMeds];
                                              updated[idx] = { ...med, status: 'tomou' };
                                              handleChecklistFieldChange('medicacoesAdministradas', JSON.stringify(updated));
                                            }}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                              med.status === 'tomou'
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                          >
                                            Tomou
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...parsedMeds];
                                              updated[idx] = { ...med, status: 'nao_tomou' };
                                              handleChecklistFieldChange('medicacoesAdministradas', JSON.stringify(updated));
                                            }}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                              med.status === 'nao_tomou'
                                                ? 'bg-rose-100 text-rose-800 border-rose-200 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                          >
                                            Não Tomou
                                          </button>
                                          <input
                                            type="time"
                                            value={med.time || ''}
                                            onChange={(e) => {
                                              const updated = [...parsedMeds];
                                              updated[idx] = { ...med, time: e.target.value };
                                              handleChecklistFieldChange('medicacoesAdministradas', JSON.stringify(updated));
                                            }}
                                            disabled={med.status === 'nao_tomou'}
                                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white w-20 text-center"
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="pt-2 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm("Deseja alternar para edição em texto livre? Isso perderá a formatação em botões.")) {
                                          handleChecklistFieldChange('medicacoesAdministradas', '');
                                        }
                                      }}
                                      className="text-[10px] text-slate-400 hover:text-slate-600 underline font-medium"
                                    >
                                      Alternar para texto livre
                                    </button>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="space-y-2">
                                  <textarea
                                    rows={2}
                                    value={checklistDraft.medicacoesAdministradas || ''}
                                    onChange={(e) => handleChecklistFieldChange('medicacoesAdministradas', e.target.value)}
                                    placeholder="Descreva as medicações que foram de fato ofertadas neste plantão..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                  {resident.medications && resident.medications.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const initialMeds = resident.medications.map(med => ({
                                          id: med.id,
                                          name: med.name,
                                          dosage: med.dosage,
                                          status: 'pendente' as const,
                                          time: med.nextDose || '08:00'
                                        }));
                                        handleChecklistFieldChange('medicacoesAdministradas', JSON.stringify(initialMeds));
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-900 font-bold flex items-center gap-1"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Gerar lista a partir das prescrições do residente
                                    </button>
                                  )}
                                </div>
                              );
                            }
                          })()}
                        </div>

                        {/* Atividades/Consulta/Visitas/Saidas */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">Atividades, Consultas, Visitas ou Saídas observadas:</label>
                          <textarea
                            rows={2}
                            value={checklistDraft.atividadesConsulta || ''}
                            onChange={(e) => handleChecklistFieldChange('atividadesConsulta', e.target.value)}
                            placeholder="Descreva se o enfermeiro ou médico atendeu, se recebeu visitas de familiares ou se passeou..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>

                        {/* Houve alguma intercorrencia */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <label className="block text-xs font-bold text-rose-700 uppercase tracking-widest text-[10px] flex items-center">
                            <AlertOctagon size={14} className="mr-1 animate-pulse" />
                            Houve alguma intercorrência durante o plantão?
                          </label>
                          <div className="flex gap-2 font-bold">
                            <button
                              type="button"
                              onClick={() => handleChecklistFieldChange('intercorrencia', 'nao')}
                              className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                checklistDraft.intercorrencia === 'nao'
                                  ? 'bg-slate-100 border-slate-300 text-slate-705 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Não houve intercorrência
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChecklistFieldChange('intercorrencia', 'sim')}
                              className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                checklistDraft.intercorrencia === 'sim'
                                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold ring-2 ring-rose-350 ring-offset-1 bg-rose-100/30'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Sim, houve intercorrência
                            </button>
                          </div>
                          {checklistDraft.intercorrencia === 'sim' && (
                            <textarea
                              rows={3}
                              value={checklistDraft.intercorrenciaDesc || ''}
                              onChange={(e) => handleChecklistFieldChange('intercorrenciaDesc', e.target.value)}
                              placeholder="Forneça o relato minucioso do ocorrido e providências clínicas tomadas..."
                              className="w-full mt-2 px-3 py-2 border-2 border-rose-300 rounded-lg text-xs bg-rose-50/10 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-rose-500 focus:outline-none focus:border-rose-400"
                            />
                          )}
                        </div>
                      </div>

                      {/* SECTION 4: SINAIS VITAIS — EDIT MODE */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                          4. Sinais Vitais
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700">Freq. Cardíaca</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={checklistDraft.frequenciaCardiaca || ''}
                                onChange={(e) => handleChecklistFieldChange('frequenciaCardiaca', e.target.value)}
                                placeholder="Ex: 72"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400 pr-12"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">bpm</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700">Pressão Arterial</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={checklistDraft.pressaoArterial || ''}
                                onChange={(e) => handleChecklistFieldChange('pressaoArterial', e.target.value)}
                                placeholder="Ex: 120/80"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 pr-16"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">mmHg</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700">Saturação (SpO2)</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={checklistDraft.saturacao || ''}
                                onChange={(e) => handleChecklistFieldChange('saturacao', e.target.value)}
                                placeholder="Ex: 98"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">%</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700">Temperatura</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min="30"
                                max="45"
                                value={checklistDraft.temperatura || ''}
                                onChange={(e) => handleChecklistFieldChange('temperatura', e.target.value)}
                                placeholder="Ex: 36.5"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">°C</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 5: PLANO INDIVIDUAL DE CUIDADOS */}
                      {checklistDraft.carePlanAdherence && checklistDraft.carePlanAdherence.length > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                          <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                            5. Acompanhamento do Plano de Cuidados
                          </h4>
                          <div className="space-y-4">
                            {checklistDraft.carePlanAdherence.map((adh, idx) => {
                              const plan = resident.carePlan?.find(p => p.id === adh.carePlanId);
                              if (!plan) return null;
                              return (
                                <div key={adh.carePlanId} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                    <div>
                                      <h5 className="font-bold text-sm text-slate-800">{plan.title}</h5>
                                      <p className="text-xs text-slate-500">{plan.description}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {[
                                        { value: 'conseguindo_seguir' as const, label: 'Conseguindo Seguir', checkedBg: 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold' },
                                        { value: 'apresentando_dificuldades' as const, label: 'Com Dificuldade', checkedBg: 'bg-amber-500 border-amber-500 text-white shadow-sm font-bold' },
                                        { value: 'nao_conseguindo_seguir' as const, label: 'Não Seguindo', checkedBg: 'bg-rose-600 border-rose-600 text-white shadow-sm font-bold' }
                                      ].map(opt => (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => {
                                            const updatedAdh = [...(checklistDraft.carePlanAdherence || [])];
                                            updatedAdh[idx] = { ...adh, status: opt.value };
                                            handleChecklistFieldChange('carePlanAdherence', updatedAdh);
                                          }}
                                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                            adh.status === opt.value
                                              ? opt.checkedBg
                                              : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                                          }`}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-550 mb-1">Comentário / Observação (Opcional):</label>
                                    <input
                                      type="text"
                                      value={adh.comment || ''}
                                      onChange={(e) => {
                                        const updatedAdh = [...(checklistDraft.carePlanAdherence || [])];
                                        updatedAdh[idx] = { ...adh, comment: e.target.value };
                                        handleChecklistFieldChange('carePlanAdherence', updatedAdh);
                                      }}
                                      placeholder="Ex: Seguiu o plano com leve fadiga no início, melhorando depois..."
                                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* SECTION 6: REGISTRO FOTOGRÁFICO — EDIT MODE */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700 flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          6. Registro Fotográfico do Residente (Opcional)
                        </h4>
                        {checklistDraft.photoUrl ? (
                          <div className="relative inline-block">
                            <img
                              src={checklistDraft.photoUrl}
                              alt="Foto do boletim"
                              className="w-full max-w-sm rounded-xl border border-slate-200 shadow-sm object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleChecklistFieldChange('photoUrl', '')}
                              className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md transition-colors"
                              title="Remover foto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all ${checklistPhotoUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                            <Camera className="h-8 w-8 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-600">
                              {checklistPhotoUploading ? 'Enviando foto...' : 'Carregar Foto do Residente'}
                            </span>
                            <span className="text-xs text-slate-400">Clique para selecionar ou tire uma foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleChecklistPhotoChange}
                              className="hidden"
                              disabled={checklistPhotoUploading}
                            />
                          </label>
                        )}
                      </div>

                      {/* Bottom Sticky Action Bar in Edit Mode */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                        <button
                          type="button"
                          onClick={handleCancelEditChecklist}
                          className="px-5 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all shadow-sm"
                        >
                          Descartar Alterações
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestSign('edit')}
                          className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Assinar e Salvar Boletim {selectedShift === 'diurno' ? 'Diurno' : 'Noturno'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'care_plan' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">Plano Individual de Cuidados</h3>
                {canManageCarePlan && (
                  <button 
                    onClick={() => setShowPlanForm(!showPlanForm)}
                    className="flex items-center px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Novo Plano
                  </button>
                )}
              </div>

              {showPlanForm && (
                <form onSubmit={handleAddCarePlan} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                   {/* ... (Existing Plan Form) ... */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-700 mb-1">Título / Meta</label>
                       <input required type="text" value={newPlan.title} onChange={e => setNewPlan({...newPlan, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-primary-500" placeholder="Ex: Prevenção de Quedas" />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-700 mb-1">Responsável</label>
                       <input
                         type="text"
                         readOnly
                         value={`${currentUser?.employeeRole || currentUser?.profile.type || 'Profissional'}: ${currentUser?.name || 'Usuário Atual'}`}
                         className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-500 outline-none cursor-not-allowed"
                       />
                     </div>
                   </div>
                   <div className="mb-4">
                     <label className="block text-xs font-medium text-slate-700 mb-1">Descrição / Intervenção</label>
                     <textarea required rows={2} value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" placeholder="Descreva as ações necessárias..." />
                   </div>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Frequência Semanal</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                          { id: 'segunda', label: 'Segunda' },
                          { id: 'terca', label: 'Terça' },
                          { id: 'quarta', label: 'Quarta' },
                          { id: 'quinta', label: 'Quinta' },
                          { id: 'sexta', label: 'Sexta' },
                          { id: 'sabado', label: 'Sábado' },
                          { id: 'domingo', label: 'Domingo' }
                        ].map(day => {
                          const state = frequencyDays[day.id as keyof typeof frequencyDays];
                          return (
                            <div 
                              key={day.id} 
                              onClick={() => {
                                setFrequencyDays(prev => ({
                                  ...prev,
                                  [day.id]: { checked: !state.checked, times: state.checked ? state.times : 1 }
                                }));
                              }}
                              className={`flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer select-none ${
                                state.checked 
                                  ? 'border-blue-600 bg-blue-50/30 shadow-sm' 
                                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-350 hover:scale-[1.02]'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2 w-full justify-between">
                                <span className="text-xs font-bold text-slate-700">{day.label}</span>
                                <input 
                                  type="checkbox" 
                                  checked={state.checked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setFrequencyDays(prev => ({
                                      ...prev,
                                      [day.id]: { ...state, checked: e.target.checked }
                                    }));
                                  }}
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                              </div>
                              {state.checked ? (
                                <div className="flex items-center gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      if (state.times > 1) {
                                        setFrequencyDays(prev => ({
                                          ...prev,
                                          [day.id]: { ...state, times: state.times - 1 }
                                        }));
                                      } else {
                                        setFrequencyDays(prev => ({
                                          ...prev,
                                          [day.id]: { ...state, checked: false }
                                        }));
                                      }
                                    }}
                                    className="w-6 h-6 flex items-center justify-center bg-white border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-750 font-bold rounded-lg text-xs transition-colors shadow-sm"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-bold text-slate-800 w-4 text-center">{state.times}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setFrequencyDays(prev => ({
                                        ...prev,
                                        [day.id]: { ...state, times: state.times + 1 }
                                      }));
                                    }}
                                    className="w-6 h-6 flex items-center justify-center bg-white border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-750 font-bold rounded-lg text-xs transition-colors shadow-sm"
                                  >
                                    +
                                  </button>
                                  <span className="text-[10px] text-slate-500 font-semibold ml-0.5">vez(es)</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic font-medium">Inativo</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary-700 hover:scale-[1.02] active:scale-95 transition-all shadow-sm">Salvar Plano</button>
                    </div>
                </form>
              )}

              <div className="grid grid-cols-1 gap-4">
                {(resident.carePlan || []).map((plan) => (
                  <div key={plan.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                     <div className="absolute top-4 right-4">
                       <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{plan.status.toUpperCase()}</span>
                     </div>
                     <h4 className="font-semibold text-slate-800 mb-1">{plan.title}</h4>
                     <p className="text-sm text-slate-600 mb-3">{plan.description}</p>
                     <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <div className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {formatFrequency(plan.frequency)}</div>
                        <div className="flex items-center"><User className="h-3 w-3 mr-1" /> {plan.assignedTo}</div>
                        <div className="ml-auto">Criado em: {new Date(plan.createdAt).toLocaleDateString()}</div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'docs' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                 <h3 className="text-lg font-semibold text-slate-800">Documentos Digitalizados</h3>
                 <button
                   onClick={() => setShowDocUploadModal(true)}
                   className="flex items-center text-sm text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 hover:bg-primary-100 transition-colors"
                 >
                   <Plus className="h-4 w-4 mr-1" /> Novo Upload
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {resident.documents?.map((doc) => (
                   <div
                     key={doc.id}
                     className="border border-slate-200 rounded-lg p-4 flex items-start bg-white hover:bg-slate-50 transition-colors group relative"
                   >
                     <a
                       href={doc.url}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-start flex-1 min-w-0 no-underline"
                     >
                       <div className="p-2 bg-slate-100 rounded text-slate-600 mr-3 shrink-0">
                         <FileText size={20} />
                       </div>
                       <div className="flex-1 overflow-hidden">
                         <h4 className="font-medium text-slate-800 text-sm truncate">{doc.name}</h4>
                         <p className="text-xs text-slate-500 capitalize">{doc.type.replace(/_/g, ' ')}</p>
                         <p className="text-[10px] text-slate-400 mt-1">{new Date(doc.uploadDate).toLocaleDateString('pt-BR')}</p>
                       </div>
                     </a>
                     {canManageDocuments && (
                       <button
                         onClick={(e) => { e.stopPropagation(); setDocToDelete(doc.id); }}
                         className="ml-2 p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                         title="Excluir documento"
                       >
                         <Trash2 size={15} />
                       </button>
                     )}
                   </div>
                 ))}
                 {(!resident.documents || resident.documents.length === 0) && (
                   <div className="col-span-full text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                     <File size={32} className="mx-auto mb-2 opacity-30" />
                     <p>Nenhum documento anexado.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'evolution' && (() => {
            const evolutionLogs = (resident.auditLogs || [])
              .filter(log => log.action === 'Evolução')
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return (
              <div className="space-y-4">
                 <div className="flex gap-2 mb-4">
                   <textarea 
                     value={newNoteText}
                     onChange={(e) => setNewNoteText(e.target.value)}
                     className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none" 
                     rows={3} 
                     placeholder="Nova anotação de enfermagem..."
                   />
                   <button 
                     onClick={handleSaveEvolutionNote}
                     disabled={!newNoteText.trim()}
                     className="bg-primary-600 text-white px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                   >
                     Salvar
                   </button>
                 </div>
                 {evolutionLogs.length > 0 ? (
                   <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                      {evolutionLogs.map((log, i) => (
                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded bg-white border border-slate-200 shadow-sm hover:shadow transition-shadow">
                                <div className="flex items-center justify-between space-x-2 mb-1">
                                    <div className="font-bold text-slate-900">{log.userName}</div>
                                    <time className="font-medium text-slate-550 text-xs">
                                      {new Date(log.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      {', '}
                                      {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </time>
                                </div>
                                <div className="text-slate-600 text-sm whitespace-pre-wrap">{log.details}</div>
                            </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 text-center gap-3">
                     <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                       <FileText className="h-6 w-6 text-blue-400" />
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-slate-700">Nenhuma evolução registrada</p>
                       <p className="text-xs text-slate-400 mt-1">Escreva uma anotação acima para iniciar o prontuário evolutivo deste residente.</p>
                     </div>
                   </div>
                 )}
              </div>
            );
          })()}

          {activeTab === 'history' && (
             <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Histórico de Auditoria</h3>
                <div className="flow-root">
                  <ul role="list" className="-mb-8">
                    {(resident.auditLogs || []).map((log, logIdx) => (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {logIdx !== (resident.auditLogs?.length || 0) - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white">
                                <User className="h-4 w-4 text-slate-500" aria-hidden="true" />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div>
                                <p className="text-sm text-slate-500">
                                  <span className="font-medium text-slate-900">{log.action}</span> por <span className="font-medium text-slate-900">{log.userName}</span>
                                </p>
                                <p className="text-sm text-slate-600 mt-1">{log.details}</p>
                              </div>
                              <div className="whitespace-nowrap text-right text-xs text-slate-400">
                                <time dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleString()}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
             </div>
          )}

          {activeTab === 'visits' && (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-650" />
                      Histórico de Visitas
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Registro e controle das visitas recebidas pelo residente.
                    </p>
                  </div>
                  {canRegisterVisits && (
                    <button 
                      onClick={() => {
                        setVisitData({
                          visitorName: '',
                          relation: '',
                          cpf: '',
                          phone: '',
                          date: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
                          temperature: '',
                          observations: ''
                        });
                        setIsVisitModalOpen(true);
                      }}
                      className="flex items-center text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200 transition-colors shadow-sm cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Registrar Visita
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {resident.visits && resident.visits.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resident.visits.map((visit) => (
                        <div key={visit.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-all relative group">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{visit.visitorName}</span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-100">
                                  {visit.relation}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                                {visit.cpf && <p><span className="font-medium text-slate-400">CPF:</span> {visit.cpf}</p>}
                                {visit.phone && <p><span className="font-medium text-slate-400">Tel:</span> {visit.phone}</p>}
                                <p className="col-span-full flex items-center gap-1 mt-1 text-slate-400">
                                  <Clock className="w-3 h-3" /> 
                                  {new Date(visit.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                                {visit.temperature && (
                                  <p className="col-span-full flex items-center gap-1 text-xs mt-1">
                                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="font-medium text-slate-450">Temperatura Aferida:</span> 
                                    <span className="font-semibold text-slate-700">{visit.temperature}°C</span>
                                  </p>
                                )}
                              </div>
                              {visit.observations && (
                                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-100 text-slate-600 text-xs italic leading-relaxed">
                                  "{visit.observations}"
                                </div>
                              )}
                              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                                <span>Registrado por: {visit.createdBy}</span>
                              </div>
                            </div>
                            {canRegisterVisits && (
                              <button 
                                onClick={() => handleDeleteVisit(visit.id)}
                                className="text-rose-500 hover:text-rose-700 p-1.5 bg-white border border-slate-200 hover:border-rose-100 hover:bg-rose-50 rounded-lg transition-all shadow-sm opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Excluir visita"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <Users size={40} className="mx-auto mb-3 opacity-30 text-blue-500" />
                      <p className="font-medium text-slate-600">Nenhuma visita registrada.</p>
                      <p className="text-xs text-slate-400 mt-1">Clique em "Registrar Visita" para adicionar uma nova visita para este residente.</p>
                    </div>
                  )}
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Modal de Edição de Residente */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-2xl overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#F8F7FF] shrink-0">
              <div>
                <h3 className="font-bold text-slate-800">Editar Residente</h3>
                <p className="text-xs text-slate-400 mt-0.5">Altere as informações do residente</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1 px-4 pt-4 pb-0 shrink-0">
              {[
                { id: 'personal' as const, label: 'Dados Pessoais', icon: User },
                { id: 'contacts' as const, label: 'Contatos', icon: Phone },
                { id: 'clinical' as const, label: 'Clínico', icon: FileHeart },
                { id: 'routine' as const, label: 'Plano de Rotina', icon: ClipboardList },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModalActiveTab(tab.id)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${modalActiveTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveResident} className="p-5 overflow-y-auto flex-1 space-y-4">
              {modalActiveTab === 'personal' && (
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
                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF</label>
                      <input type="text" value={formData.cpf || ''} onChange={e => setFormData({ ...formData, cpf: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">RG</label>
                      <input type="text" value={formData.rg || ''} onChange={e => setFormData({ ...formData, rg: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nascimento</label>
                      <input
                        type="date"
                        value={formData.birthDate || ''}
                        onChange={e => {
                          const dateVal = e.target.value;
                          setFormData({
                            ...formData,
                            birthDate: dateVal,
                            age: dateVal ? calculateAge(dateVal) : (formData.age || 0)
                          });
                        }}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Idade</label>
                      <input required type="number" value={formData.age || ''} onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quarto</label>
                      {rooms && rooms.length > 0 ? (
                        <select
                          required
                          value={formData.room || ''}
                          onChange={e => setFormData({ ...formData, room: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                          value={formData.room || ''}
                          onChange={e => setFormData({ ...formData, room: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logradouro / Rua</label>
                        <input
                          type="text"
                          placeholder="Ex: Av. Brasil"
                          value={formData.addressStreet || ''}
                          onChange={e => setFormData({ ...formData, addressStreet: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Número</label>
                        <input
                          type="text"
                          placeholder="Nº"
                          value={formData.addressNumber || ''}
                          onChange={e => setFormData({ ...formData, addressNumber: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Complemento</label>
                        <input
                          type="text"
                          placeholder="Ex: Apto 101, Bloco B"
                          value={formData.addressComplement || ''}
                          onChange={e => setFormData({ ...formData, addressComplement: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cidade</label>
                        <input
                          type="text"
                          placeholder="Cidade"
                          value={formData.addressCity || ''}
                          onChange={e => setFormData({ ...formData, addressCity: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalActiveTab === 'contacts' && (
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
                          onChange={e => setFormData({ ...formData, legalGuardian: { ...formData.legalGuardian!, [f.key]: e.target.value } })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm mb-3">Contatos de Emergência</h4>
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

              {modalActiveTab === 'clinical' && (
                <div className="space-y-4">
                  {[
                    { label: 'Condições Clínicas (Diagnósticos)', key: 'clinicalCondition', placeholder: 'Ex: Hipertensão, Diabetes tipo 2...' },
                    { label: 'Condição Funcional', key: 'functionalCondition', placeholder: 'Mobilidade, cognição...' },
                    { label: 'Histórico Social e Familiar', key: 'socialHistory', placeholder: 'Contexto familiar, visitas...' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                      <textarea rows={3} placeholder={f.placeholder} value={(formData as any)[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none" />
                    </div>
                  ))}
                </div>
              )}

              {modalActiveTab === 'routine' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-blue-500" />
                    Plano de Rotina Usual & Cuidados
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Uso de Fraldas</label>
                      <select
                        value={formData.usoFraldas || 'nao'}
                        onChange={e => setFormData({ ...formData, usoFraldas: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="nao">Não usa fraldas</option>
                        <option value="sim">Sim, usa fraldas</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mobilidade Usual</label>
                      <select
                        value={formData.mobilidadeSet || 'independente'}
                        onChange={e => setFormData({ ...formData, mobilidadeSet: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="independente">Independente</option>
                        <option value="auxilio">Necessita de Auxílio</option>
                        <option value="acamado">Acamado</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Higiene Corporal Usual</label>
                      <select
                        value={formData.higieneCorporal || 'independente'}
                        onChange={e => setFormData({ ...formData, higieneCorporal: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="independente">Independente</option>
                        <option value="auxilio">Necessita de Auxílio</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Higiene Oral & Vestir Usual</label>
                      <select
                        value={formData.higieneOralVestir || 'independente'}
                        onChange={e => setFormData({ ...formData, higieneOralVestir: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="independente">Independente</option>
                        <option value="auxilio">Necessita de Auxílio</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-[#F8F7FF] border border-blue-100 rounded-2xl p-4 mt-2">
                    <span className="block text-xs font-bold text-slate-700 mb-3">
                      Necessidades de Cuidado Diário Programado (Plano):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'reqHygiene', label: 'Banho / Higiene' },
                        { key: 'reqOralCare', label: 'Higiene Oral' },
                        { key: 'reqFeeding', label: 'Alimentação' },
                        { key: 'reqHydration', label: 'Hidratação' },
                        { key: 'reqMobility', label: 'Mobilização / Mudança de decúbito' },
                        { key: 'reqDressings', label: 'Realização de Curativos' },
                        { key: 'reqLeisure', label: 'Atividades de Lazer / Social' },
                      ].map(item => {
                        const isChecked = (formData as any)[item.key] !== null && (formData as any)[item.key] !== undefined;
                        const isAssisted = (formData as any)[item.key] === true;

                        return (
                          <div key={item.key} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-slate-100 hover:bg-blue-50/20 transition-colors">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, [item.key]: true });
                                  } else {
                                    setFormData({ ...formData, [item.key]: null });
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                              />
                              <span className="text-xs text-slate-700 font-bold">{item.label}</span>
                            </label>
                            
                            {isChecked && (
                              <div className="flex items-center gap-4 pl-6.5 mt-0.5" onClick={e => e.stopPropagation()}>
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-650 select-none">
                                  <input
                                    type="radio"
                                    name={`${item.key}-assisted`}
                                    checked={isAssisted}
                                    onChange={() => setFormData({ ...formData, [item.key]: true })}
                                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                  />
                                  <span>Assistido</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-650 select-none">
                                  <input
                                    type="radio"
                                    name={`${item.key}-assisted`}
                                    checked={!isAssisted}
                                    onChange={() => setFormData({ ...formData, [item.key]: false })}
                                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                  />
                                  <span>Não assistido</span>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={photoUploading}
                  className={`flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors ${
                    photoUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {photoUploading ? 'Processando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Prescrição */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-xl overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#F8F7FF] shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Pill className="h-5 w-5 text-blue-600" /> Nova Prescrição de Medicamento
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Insira as informações da receita médica</p>
              </div>
              <button 
                onClick={() => setIsPrescriptionModalOpen(false)} 
                className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome do Medicamento</label>
                <input 
                  required 
                  type="text" 
                  value={prescriptionData.name} 
                  onChange={e => setPrescriptionData({ ...prescriptionData, name: e.target.value })} 
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Ex: Dipirona Gotas, Losartana Potássica" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dosagem</label>
                  <input 
                    required 
                    type="text" 
                    value={prescriptionData.dosage} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, dosage: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Ex: 500mg, 1 comprimido, 20 gotas" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Via de Administração</label>
                  <select 
                    value={prescriptionData.route} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, route: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Oral">Oral</option>
                    <option value="Sublingual">Sublingual</option>
                    <option value="Intravenosa (EV)">Intravenosa (EV)</option>
                    <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                    <option value="Subcutânea (SC)">Subcutânea (SC)</option>
                    <option value="Tópica">Tópica</option>
                    <option value="Inalatória">Inalatória</option>
                    <option value="Nasal">Nasal</option>
                    <option value="Ocular">Ocular</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Frequência / Horário</label>
                  <input 
                    required 
                    type="text" 
                    value={prescriptionData.frequency} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, frequency: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Ex: 12h em 12h, Uma vez ao dia" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horário da Próxima Dose</label>
                  <input 
                    type="time" 
                    value={prescriptionData.nextDose} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, nextDose: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de Início</label>
                  <input 
                    required 
                    type="date" 
                    value={prescriptionData.startDate} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, startDate: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de Término (Opcional)</label>
                  <input 
                    type="date" 
                    value={prescriptionData.endDate} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, endDate: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações (Opcional)</label>
                <textarea 
                  rows={2} 
                  value={prescriptionData.observations} 
                  onChange={e => setPrescriptionData({ ...prescriptionData, observations: e.target.value })} 
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                  placeholder="Ex: Tomar após as refeições, diluir em água..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prescrição Física Digitalizada (Opcional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-blue-100">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingDoc ? 'Carregando...' : (prescriptionData.documentUrl ? 'Alterar Documento' : 'Upload de Arquivo')}
                    <input
                      type="file"
                      accept="application/pdf, image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handlePrescriptionDocChange}
                      disabled={uploadingDoc}
                      className="hidden"
                    />
                  </label>
                  {prescriptionData.documentUrl && (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-500 truncate max-w-[180px] font-medium" title={prescriptionData.documentName || 'Documento anexado'}>
                        {prescriptionData.documentName || 'Documento anexado'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPrescriptionData(prev => ({ ...prev, documentUrl: '', documentName: '' }))}
                        className="text-rose-600 hover:text-rose-700 text-xs font-semibold shrink-0"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPrescriptionModalOpen(false)} 
                  className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  Cadastrar Prescrição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Boletins Diários Preenchidos */}
      {isAllChecklistsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-2xl overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#F8F7FF] shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-indigo-600" />
                  Histórico de Boletins Diários
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Selecione um boletim para visualizar os detalhes completos</p>
              </div>
              <button 
                onClick={() => setIsAllChecklistsModalOpen(false)} 
                className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {(() => {
                // Filter only checklists that have actual content (excluding empty templates)
                const filledChecklists = (resident.dailyChecklists || [])
                  .filter(c => c.date && (
                    c.hygiene || c.oralCare || c.feeding || c.hydration || c.mobility || c.dressings || c.leisure ||
                    c.queixaDor === 'sim' || c.estadoNeurologico || c.alimentacao || c.eliminacaoEvacuacao || 
                    c.diurese || c.usoFraldas || c.mobilidadeSet || c.alteracoesPele === 'sim' || c.sono || 
                    c.medicacoesAdministradas || c.atividadesConsulta || c.intercorrencia === 'sim'
                  ))
                  .sort((a, b) => b.date.localeCompare(a.date));

                if (filledChecklists.length === 0) {
                  return (
                    <div className="text-center py-12 px-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <ClipboardList className="h-12 w-12 text-slate-300 mb-3" />
                      <p className="text-sm font-semibold text-slate-650">Nenhum boletim diário preenchido para este residente.</p>
                      <p className="text-xs text-slate-400 mt-1">Preencha um boletim diário na aba "Rotina Diária" para iniciar o histórico.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filledChecklists.map((chk) => {
                      const formattedDate = new Date(chk.date + 'T00:00:00').toLocaleDateString('pt-BR');
                      const shiftVal = chk.shift || 'diurno';
                      return (
                        <div
                          key={`${chk.date}-${shiftVal}`}
                          onClick={() => {
                            setSelectedChecklistDate(chk.date);
                            setSelectedShift(shiftVal);
                            setActiveTab('routine');
                            setIsAllChecklistsModalOpen(false);
                          }}
                          className="bg-white hover:bg-indigo-50/40 p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 cursor-pointer transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3 group"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <CalendarCheck className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                              <span className="font-bold text-slate-800 text-sm">{formattedDate}</span>
                              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                shiftVal === 'noturno'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {shiftVal === 'noturno' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                                {shiftVal === 'noturno' ? 'Noturno' : 'Diurno'}
                              </span>
                            </div>

                            {/* Bulletins Badges/Summaries */}
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {chk.intercorrencia === 'sim' ? (
                                <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center">
                                  <AlertOctagon className="h-3 w-3 mr-0.5 animate-pulse" />
                                  Intercorrência
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                  Sem Intercorrência
                                </span>
                              )}

                              {chk.queixaDor === 'sim' && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                  Queixa de Dor
                                </span>
                              )}

                              {chk.alteracoesPele === 'sim' && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                  Alt. Pele
                                </span>
                              )}

                              {chk.alimentacao && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] border font-semibold ${
                                  chk.alimentacao === 'boa' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                  chk.alimentacao === 'moderada' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                  'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                  Alimentação: {chk.alimentacao === 'boa' ? 'Boa' : chk.alimentacao === 'moderada' ? 'Mod.' : 'Ruim'}
                                </span>
                              )}

                              {chk.estadoNeurologico && (
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-semibold truncate max-w-[180px]" title={chk.estadoNeurologico}>
                                  Neurológico: {chk.estadoNeurologico}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="text-xs font-bold text-indigo-650 group-hover:text-indigo-800 transition-colors flex items-center shrink-0"
                          >
                            Visualizar
                            <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-[#F8F7FF] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsAllChecklistsModalOpen(false)}
                className="px-5 py-2 border border-slate-250 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Registro de Visita */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-md overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#F8F7FF] shrink-0">
              <div>
                <h3 className="font-bold text-slate-800">Registrar Visita</h3>
                <p className="text-xs text-slate-400 mt-0.5">Preencha os dados do visitante</p>
              </div>
              <button 
                onClick={() => setIsVisitModalOpen(false)} 
                className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome do Visitante *</label>
                <input 
                  required 
                  type="text" 
                  value={visitData.visitorName} 
                  onChange={e => setVisitData(prev => ({ ...prev, visitorName: e.target.value }))} 
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                  placeholder="Ex: Maria da Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Grau de Parentesco / Relação *</label>
                <input 
                  required 
                  type="text" 
                  value={visitData.relation} 
                  onChange={e => setVisitData(prev => ({ ...prev, relation: e.target.value }))} 
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                  placeholder="Ex: Filho(a), Sobrinho(a), Amigo(a)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF (opcional)</label>
                  <input 
                    type="text" 
                    value={visitData.cpf} 
                    onChange={e => setVisitData(prev => ({ ...prev, cpf: e.target.value }))} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone (opcional)</label>
                  <input 
                    type="text" 
                    value={visitData.phone} 
                    onChange={e => setVisitData(prev => ({ ...prev, phone: e.target.value }))} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data e Hora *</label>
                  <input 
                    required 
                    type="datetime-local" 
                    value={visitData.date} 
                    onChange={e => setVisitData(prev => ({ ...prev, date: e.target.value }))} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Temperatura (ºC - opcional)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={visitData.temperature} 
                    onChange={e => setVisitData(prev => ({ ...prev, temperature: e.target.value }))} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                    placeholder="36.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações (opcional)</label>
                <textarea 
                  rows={3} 
                  value={visitData.observations} 
                  onChange={e => setVisitData(prev => ({ ...prev, observations: e.target.value }))} 
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none" 
                  placeholder="Ex: Residente ficou muito feliz; Visitante trouxe frutas; etc."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsVisitModalOpen(false)} 
                  className="flex-1 px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: usuário sem certificado A1 cadastrado */}
      {isNoSignatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-amber-50 flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <AlertOctagon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Certificado não cadastrado</h3>
                <p className="text-xs text-slate-500 mt-0.5">Necessário cadastrar antes de assinar</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                Você ainda não possui um <strong>certificado digital ICP-Brasil A1</strong> cadastrado no sistema.
                <br /><br />
                Para assinar documentos, solicite ao administrador para vincular seu certificado digital na <strong>Gestão de Usuários</strong>.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsNoSignatureModalOpen(false)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: usuário sem CPF cadastrado (assinatura simples) */}
      {isNoCpfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-amber-50 flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <AlertOctagon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">CPF não cadastrado</h3>
                <p className="text-xs text-slate-500 mt-0.5">Necessário antes de assinar</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                Você ainda não possui um <strong>CPF cadastrado</strong> no sistema.
                <br /><br />
                Para assinar documentos, solicite ao administrador para atualizar o seu cadastro em <strong>Gestão de Usuários</strong>.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsNoCpfModalOpen(false)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Assinatura */}
      {isSignConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-blue-50 flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {signatureMode === 'simples' ? 'Assinatura Eletrônica do Boletim' : 'Assinatura Digital do Boletim'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {signatureMode === 'simples' ? 'Confirme para assinar eletronicamente' : 'Confirme para assinar digitalmente'}
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertOctagon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-medium leading-relaxed">
                  Atenção: após assinar, o boletim <strong>não poderá sofrer nenhuma alteração</strong>. Esta ação é irreversível.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Assinatura de</p>
                <p className="text-sm font-bold text-slate-800">{currentUser?.name || 'Usuário'}</p>
                {signatureMode === 'simples' ? (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-blue-800">Assinatura Eletrônica Interna</p>
                      <p className="text-[10px] text-blue-700 font-medium mt-0.5">
                        CPF: {currentUser?.cpf}
                      </p>
                    </div>
                  </div>
                ) : (
                  currentUser?.certificate && (
                    <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2">
                      <Key className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-emerald-800">Certificado Digital ICP-Brasil A1</p>
                        <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                          Titular: {currentUser.certificate.certificate_holder_name}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-medium">
                          Emissor: {currentUser.certificate.certificate_issuer}
                        </p>
                      </div>
                    </div>
                  )
                )}
                <p className="text-xs text-slate-500">{new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsSignConfirmModalOpen(false)}
                className="px-5 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSign}
                className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Confirmar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upload de Documento */}
      {showDocUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Novo Documento</h2>
              <button
                onClick={() => { setShowDocUploadModal(false); setDocUploadFile(null); setDocUploadName(''); setDocUploadType('outro'); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Área de seleção de arquivo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Arquivo <span className="text-red-500">*</span></label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  {docUploadFile ? (
                    <div className="flex flex-col items-center text-center px-3">
                      <FileText size={24} className="text-primary-600 mb-1" />
                      <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{docUploadFile.name}</span>
                      <span className="text-xs text-slate-400">{(docUploadFile.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Upload size={24} className="mb-1" />
                      <span className="text-sm">Clique para selecionar</span>
                      <span className="text-xs">PDF, imagens até 20MB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setDocUploadFile(f);
                        if (!docUploadName) setDocUploadName(f.name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                  />
                </label>
              </div>

              {/* Nome do documento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do documento <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={docUploadName}
                  onChange={(e) => setDocUploadName(e.target.value)}
                  placeholder="Ex: Exame de sangue junho 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Tipo de documento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                <select
                  value={docUploadType}
                  onChange={(e) => setDocUploadType(e.target.value as typeof docUploadType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="exame">Exame</option>
                  <option value="laudo">Laudo</option>
                  <option value="receita">Receita</option>
                  <option value="documento_pessoal">Documento Pessoal</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => { setShowDocUploadModal(false); setDocUploadFile(null); setDocUploadName(''); setDocUploadType('outro'); }}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResidentDocUpload}
                disabled={!docUploadFile || !docUploadName.trim() || isUploadingResidentDoc}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploadingResidentDoc ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Enviar Documento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {docToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Excluir Documento</h3>
              <p className="text-sm text-slate-500 text-center">
                Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setDocToDelete(null)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteDocument}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
   </div>
  );
};


export default ResidentProfile;