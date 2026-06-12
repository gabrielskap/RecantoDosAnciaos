import React, { useState } from 'react';
import {
  ArrowLeft, Activity, Pill, FileText, Sparkles,
  Thermometer, Heart, CheckCircle, PenTool, ShieldCheck,
  ClipboardList, History, Plus, User, Clock, File, Paperclip, CalendarCheck, AlertOctagon,
  BedDouble, Home, Wrench, PaintRoller, Edit2, X, Phone, FileHeart, Trash2, Users, Camera, Sun, Moon
} from 'lucide-react';
import { Resident, CarePlan, AuditLog, DailyChecklist, Medication, RoomStatus, Room } from '../types';
import { summarizePatientHealth } from '../services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CustomSelect from './CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { compressImage, uploadResidentPhoto } from '../services/supabaseClient';

interface ChecklistMedication {
  id: string;
  name: string;
  dosage: string;
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

interface ResidentProfileProps {
  resident: Resident;
  rooms: Room[];
  onBack: () => void;
  onUpdateResident?: (resident: Resident) => void;
}

const ResidentProfile: React.FC<ResidentProfileProps> = ({ resident, rooms, onBack, onUpdateResident }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'meds' | 'vitals' | 'routine' | 'care_plan' | 'visits' | 'docs' | 'evolution' | 'history'>('vitals');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  const { currentUser } = useAuth();
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

    setIsVisitModalOpen(false);
    setVisitData({
      visitorName: '',
      relation: '',
      cpf: '',
      phone: '',
      date: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
      temperature: '',
      observations: ''
    });
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
      reqHygiene: resident.reqHygiene || false,
      reqOralCare: resident.reqOralCare || false,
      reqFeeding: resident.reqFeeding || false,
      reqHydration: resident.reqHydration || false,
      reqMobility: resident.reqMobility || false,
      reqDressings: resident.reqDressings || false,
      reqLeisure: resident.reqLeisure || false,
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
      alert('Erro ao processar a foto. Tente novamente.');
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
      alert('Erro ao processar a foto. Tente novamente.');
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
      reqHygiene: formData.reqHygiene || false,
      reqOralCare: formData.reqOralCare || false,
      reqFeeding: formData.reqFeeding || false,
      reqHydration: formData.reqHydration || false,
      reqMobility: formData.reqMobility || false,
      reqDressings: formData.reqDressings || false,
      reqLeisure: formData.reqLeisure || false,
    };

    onUpdateResident(updated);
    setIsEditModalOpen(false);
  };

  // Care Plan Form
  const [newPlan, setNewPlan] = useState({ title: '', description: '', frequency: '', assignedTo: 'Enfermagem' });
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Daily Checklist State
  const today = new Date().toISOString().split('T')[0];
  const [selectedChecklistDate, setSelectedChecklistDate] = useState(today);
  const [selectedShift, setSelectedShift] = useState<'diurno' | 'noturno'>('diurno');
  const [isAllChecklistsModalOpen, setIsAllChecklistsModalOpen] = useState(false);
  const [isSignConfirmModalOpen, setIsSignConfirmModalOpen] = useState(false);
  const [signConfirmContext, setSignConfirmContext] = useState<'read' | 'edit'>('read');

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

  const handleRequestSign = (context: 'read' | 'edit') => {
    setSignConfirmContext(context);
    setIsSignConfirmModalOpen(true);
  };

  const handleConfirmSign = () => {
    const signedBy = currentUser?.profile.name || 'Usuário';
    const signedAt = new Date().toISOString();
    setIsSignConfirmModalOpen(false);

    if (signConfirmContext === 'edit' && checklistDraft && onUpdateResident) {
      const signedDraft = { ...checklistDraft, signedBy, signedAt, shift: selectedShift };
      const otherChecklists = resident.dailyChecklists?.filter(
        c => !(c.date === signedDraft.date && (c.shift || 'diurno') === selectedShift)
      ) || [];
      onUpdateResident({ ...resident, dailyChecklists: [signedDraft, ...otherChecklists] });
      setSelectedChecklistDate(signedDraft.date);
      setChecklistDraft(null);
    } else if (signConfirmContext === 'read' && onUpdateResident) {
      const updatedChecklist = { ...selectedChecklist, signedBy, signedAt, shift: selectedShift };
      const otherChecklists = resident.dailyChecklists?.filter(
        c => !(c.date === updatedChecklist.date && (c.shift || 'diurno') === selectedShift)
      ) || [];
      onUpdateResident({ ...resident, dailyChecklists: [updatedChecklist, ...otherChecklists] });
    }
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
        status: 'pendente' as const,
        time: med.nextDose || '08:00'
      }));
      draft.medicacoesAdministradas = JSON.stringify(initialMeds);
    }

    // Initialize carePlanAdherence for active care plans
    if (!draft.carePlanAdherence) {
      draft.carePlanAdherence = [];
    }
    const activePlans = (resident.carePlan || []).filter(p => p.status === 'ativo');
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

  // Prescription Form Modal States
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState({
    name: '',
    dosage: '',
    route: 'Oral',
    frequency: '12h em 12h',
    nextDose: '08:00',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

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
      logs: []
    };

    onUpdateResident({
      ...resident,
      medications: [...(resident.medications || []), newMed]
    });

    setIsPrescriptionModalOpen(false);
    // Reset form
    setPrescriptionData({
      name: '',
      dosage: '',
      route: 'Oral',
      frequency: '12h em 12h',
      nextDose: '08:00',
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    });
  };

  const handleDeleteMedication = (medId: string) => {
    if (!onUpdateResident) return;
    if (confirm("Tem certeza que deseja excluir esta prescrição de medicamento?")) {
      const updatedMeds = (resident.medications || []).filter(med => med.id !== medId);
      onUpdateResident({ ...resident, medications: updatedMeds });
    }
  };

  const handleAiSummary = async () => {
    setLoadingAi(true);
    const summary = await summarizePatientHealth(resident);
    setAiAnalysis(summary);
    setLoadingAi(false);
  };

  const handleSignature = () => {
    setIsSigned(true);
    if (onUpdateResident) {
      const newLog: AuditLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        userId: 'current-user',
        userName: 'Usuário Atual',
        action: 'Assinatura Digital',
        details: 'Assinou o prontuário do turno.'
      };
      onUpdateResident({
        ...resident,
        auditLogs: [newLog, ...(resident.auditLogs || [])]
      });
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

    const plan: CarePlan = {
      id: Math.random().toString(36).substr(2, 9),
      title: newPlan.title,
      description: newPlan.description,
      frequency: newPlan.frequency,
      assignedTo: newPlan.assignedTo,
      status: 'ativo',
      createdAt: new Date().toISOString()
    };

    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: 'current-user',
      userName: 'Usuário Atual',
      action: 'Plano de Cuidado',
      details: `Criou plano: ${plan.title}`
    };

    onUpdateResident({
      ...resident,
      carePlan: [plan, ...(resident.carePlan || [])],
      auditLogs: [newLog, ...(resident.auditLogs || [])]
    });

    setNewPlan({ title: '', description: '', frequency: '', assignedTo: 'Enfermagem' });
    setShowPlanForm(false);
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
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors p-2 md:p-0">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Profile Header */}
        <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start gap-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center w-full md:w-auto">
            <img 
              src={resident.photoUrl} 
              alt={resident.name} 
              className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover border-4 border-white shadow-sm"
            />
            <div className="ml-4 md:ml-5">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex flex-wrap items-center gap-2">
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
                 <p className="text-slate-500 text-xs md:text-sm">
                   {resident.age} anos
                 </p>
                 <span className="text-slate-300">•</span>
                 <div className="flex items-center group">
                   <span className="text-slate-500 text-xs md:text-sm mr-2">Quarto: {resident.room}</span>
                   
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
                 <p className="text-xs text-slate-400 mt-1 truncate max-w-[200px] md:max-w-none">Resp: {resident.legalGuardian.name}</p>
              )}
            </div>
          </div>
          
          <div className="flex w-full md:w-auto gap-2 mt-2 md:mt-0">
             <button
               onClick={handleStartEditResident}
               className="flex-1 md:flex-none flex justify-center items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
             >
                <Edit2 className="h-4 w-4 mr-2 text-violet-600" />
                <span>Editar Perfil</span>
             </button>
             {isSigned ? (
               <div className="flex-1 md:flex-none flex justify-center items-center px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Assinado
               </div>
             ) : (
               <button 
                onClick={handleSignature}
                className="flex-1 md:flex-none flex justify-center items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
               >
                  <PenTool className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Assinar Prontuário</span>
                  <span className="sm:hidden">Assinar</span>
               </button>
             )}
             <button 
              onClick={handleAiSummary}
              disabled={loadingAi}
              className="flex-1 md:flex-none flex justify-center items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
             >
                <Sparkles className="h-4 w-4 mr-2" />
                {loadingAi ? '...' : 'Resumo IA'}
             </button>
          </div>
        </div>

        {/* AI Analysis Result */}
        {aiAnalysis && (
          <div className="p-4 md:p-6 bg-indigo-50 border-b border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center">
              <BotIcon className="h-4 w-4 mr-2" /> Resumo Inteligente do Prontuário
            </h3>
            <p className="text-sm text-indigo-800 whitespace-pre-line leading-relaxed">
              {aiAnalysis}
            </p>
          </div>
        )}

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
                  className="flex items-center gap-1.5 text-xs font-semibold text-violet-650 hover:text-violet-750 bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-xl border border-violet-200 transition-colors shadow-sm"
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
                      {resident.reqHygiene && <span className="bg-violet-50 text-violet-750 px-2.5 py-1 rounded-lg text-xs font-bold border border-violet-100">Auxílio Banho/Higiene</span>}
                      {resident.reqOralCare && <span className="bg-violet-50 text-violet-750 px-2.5 py-1 rounded-lg text-xs font-bold border border-violet-100">Higiene Oral assistida</span>}
                      {resident.reqFeeding && <span className="bg-violet-50 text-violet-750 px-2.5 py-1 rounded-lg text-xs font-bold border border-violet-100">Auxílio Alimentação</span>}
                      {resident.reqHydration && <span className="bg-violet-50 text-violet-750 px-2.5 py-1 rounded-lg text-xs font-bold border border-violet-100">Hidratação assistida</span>}
                      {resident.reqMobility && <span className="bg-violet-50 text-violet-750 px-2.5 py-1 rounded-lg text-xs font-bold border border-violet-100">Mobilização/Mudança decúbito</span>}
                      {resident.reqDressings && <span className="bg-violet-50 text-violet-750 px-2.5 py-1 rounded-lg text-xs font-bold border border-violet-100">Realização de Curativos</span>}
                      {resident.reqLeisure && <span className="bg-violet-50 text-violet-750 px-2.5 py-1 rounded-lg text-xs font-bold border border-violet-100">Atividade Lazer/Social</span>}
                      {!resident.reqHygiene && !resident.reqOralCare && !resident.reqFeeding && !resident.reqHydration && !resident.reqMobility && !resident.reqDressings && !resident.reqLeisure && (
                        <span className="text-slate-400 text-xs italic font-medium">Nenhum cuidado diário programado.</span>
                      )}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <td className="px-4 py-3 font-medium text-slate-800">{med.name}</td>
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
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-start">
                 <Sparkles className="h-5 w-5 mr-2 flex-shrink-0" />
                 <p>Sugestão IA: Verifique interações medicamentosas entre Omeprazol e Clopidogrel.</p>
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
                            <span className="text-xs bg-violet-100 text-violet-800 border border-violet-200 px-3 py-1.5 rounded-full font-medium flex items-center shadow-sm gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
                              Assinado por {selectedChecklist.signedBy}
                            </span>
                          ) : (
                            <>
                              <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full font-medium flex items-center shadow-sm">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                                Salvo no prontuário
                              </span>
                              <button
                                onClick={() => handleRequestSign('read')}
                                className="flex items-center px-4 py-2 bg-violet-600 text-white border border-violet-700 rounded-xl text-xs font-semibold hover:bg-violet-700 transition-all shadow-sm"
                              >
                                <PenTool className="h-3.5 w-3.5 mr-1.5" />
                                Assinar Digitalmente
                              </button>
                              <button
                                onClick={handleStartEditChecklist}
                                className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm"
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-1.5 text-primary-600" />
                                Editar Boletim
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

                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Qualidade do Sono:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${selectedChecklist.sono === 'insatisfatorio' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-55 text-emerald-800'}`}>
                                {selectedChecklist.sono === 'preservado' ? 'Sono Preservado' : selectedChecklist.sono === 'insatisfatorio' ? `Insatisfatório: ${selectedChecklist.sonoDesc || ''}` : 'Não informado'}
                              </span>
                            </div>

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
                          className="flex items-center px-4 py-2 bg-violet-600 text-white border border-violet-700 rounded-xl text-xs font-semibold hover:bg-violet-700 transition-all shadow-md hover:shadow-lg"
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

                          {/* Sono */}
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
                                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-violet-500 outline-none bg-white w-20 text-center"
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
                                      className="text-xs text-violet-600 hover:text-violet-850 font-bold flex items-center gap-1"
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
                          className="flex items-center px-6 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-all shadow-md hover:shadow-lg"
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
                       <CustomSelect
                         value={newPlan.assignedTo}
                         onChange={v => setNewPlan({ ...newPlan, assignedTo: v })}
                         options={[
                           { value: 'Enfermagem', label: 'Enfermagem' },
                           { value: 'Fisioterapia', label: 'Fisioterapia' },
                           { value: 'Nutrição', label: 'Nutrição' },
                           { value: 'Médico', label: 'Médico' },
                           { value: 'Cuidadores', label: 'Cuidadores' },
                         ]}
                       />
                     </div>
                   </div>
                   <div className="mb-4">
                     <label className="block text-xs font-medium text-slate-700 mb-1">Descrição / Intervenção</label>
                     <textarea required rows={2} value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" placeholder="Descreva as ações necessárias..." />
                   </div>
                   <div className="flex justify-between items-center">
                     <div className="w-1/2 pr-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Frequência</label>
                        <input type="text" value={newPlan.frequency} onChange={e => setNewPlan({...newPlan, frequency: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" placeholder="Ex: Diário, 2x ao dia" />
                     </div>
                     <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Salvar Plano</button>
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
                        <div className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {plan.frequency}</div>
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
                 <button className="flex items-center text-sm text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100">
                   <Plus className="h-4 w-4 mr-1" /> Novo Upload
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {resident.documents?.map((doc) => (
                   <div key={doc.id} className="border border-slate-200 rounded-lg p-4 flex items-start bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="p-2 bg-slate-100 rounded text-slate-600 mr-3">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-medium text-slate-800 text-sm truncate">{doc.name}</h4>
                        <p className="text-xs text-slate-500 capitalize">{doc.type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                      </div>
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

          {activeTab === 'evolution' && (
            <div className="space-y-4">
               <div className="flex gap-2 mb-4">
                 <textarea className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" rows={3} placeholder="Nova anotação de enfermagem..."></textarea>
                 <button className="bg-primary-600 text-white px-4 rounded-lg font-medium hover:bg-primary-700">Salvar</button>
               </div>
               <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  {[1, 2].map((_, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded bg-white border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between space-x-2 mb-1">
                                <div className="font-bold text-slate-900">Enf. Carlos</div>
                                <time className="font-caveat font-medium text-slate-500 text-xs">Hoje, 09:30</time>
                            </div>
                            <div className="text-slate-500 text-sm">Residente aceitou bem a dieta. Deambulou pelo jardim com auxílio. Sinais vitais estáveis.</div>
                        </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

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
                      className="flex items-center text-xs font-semibold text-violet-650 hover:text-violet-755 bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-xl border border-violet-200 transition-colors shadow-sm cursor-pointer"
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
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-750 font-bold border border-violet-100">
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
                      <Users size={40} className="mx-auto mb-3 opacity-30 text-violet-500" />
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

            <div className="flex gap-1 px-4 pt-4 pb-0 shrink-0">
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
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${modalActiveTab === tab.id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100'
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
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-violet-100"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-violet-50 border-2 border-dashed border-violet-200 flex items-center justify-center text-violet-400">
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
                        <label className="relative flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-violet-100">
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
                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF</label>
                      <input type="text" value={formData.cpf || ''} onChange={e => setFormData({ ...formData, cpf: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">RG</label>
                      <input type="text" value={formData.rg || ''} onChange={e => setFormData({ ...formData, rg: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
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
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Idade</label>
                      <input required type="number" value={formData.age || ''} onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quarto</label>
                      {rooms && rooms.length > 0 ? (
                        <select
                          required
                          value={formData.room || ''}
                          onChange={e => setFormData({ ...formData, room: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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
                      <Home className="h-4 w-4 text-violet-500" />
                      Endereço do Residente
                    </h4>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                          <span>CEP</span>
                          {loadingCep && <span className="text-[10px] text-violet-500 font-semibold animate-pulse">...</span>}
                          {cepError && <span className="text-[10px] text-rose-500 font-semibold">{cepError}</span>}
                        </label>
                        <input
                          type="text"
                          placeholder="00000-000"
                          maxLength={9}
                          value={formData.addressCep || ''}
                          onChange={e => handleCepChange(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logradouro / Rua</label>
                        <input
                          type="text"
                          placeholder="Ex: Av. Brasil"
                          value={formData.addressStreet || ''}
                          onChange={e => setFormData({ ...formData, addressStreet: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Número</label>
                        <input
                          type="text"
                          placeholder="Nº"
                          value={formData.addressNumber || ''}
                          onChange={e => setFormData({ ...formData, addressNumber: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Complemento</label>
                        <input
                          type="text"
                          placeholder="Ex: Apto 101, Bloco B"
                          value={formData.addressComplement || ''}
                          onChange={e => setFormData({ ...formData, addressComplement: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cidade</label>
                        <input
                          type="text"
                          placeholder="Cidade"
                          value={formData.addressCity || ''}
                          onChange={e => setFormData({ ...formData, addressCity: e.target.value })}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalActiveTab === 'contacts' && (
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
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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
                      <textarea rows={3} placeholder={f.placeholder} value={(formData as any)[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white resize-none" />
                    </div>
                  ))}
                </div>
              )}

              {modalActiveTab === 'routine' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-violet-500" />
                    Plano de Rotina Usual & Cuidados
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Uso de Fraldas</label>
                      <select
                        value={formData.usoFraldas || 'nao'}
                        onChange={e => setFormData({ ...formData, usoFraldas: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      >
                        <option value="independente">Independente</option>
                        <option value="auxilio">Necessita de Auxílio</option>
                        <option value="acamado">Acamado</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Higiene Corporal Usual</label>
                      <select
                        value={formData.higieneCorporal || 'independente'}
                        onChange={e => setFormData({ ...formData, higieneCorporal: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      >
                        <option value="independente">Independente</option>
                        <option value="auxilio">Necessita de Auxílio</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-[#F8F7FF] border border-violet-100 rounded-2xl p-4 mt-2">
                    <span className="block text-xs font-bold text-slate-700 mb-3">
                      Necessidades de Cuidado Diário Programado (Plano):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'reqHygiene', label: 'Auxílio Banho/Higiene' },
                        { key: 'reqOralCare', label: 'Higiene Oral assistida' },
                        { key: 'reqFeeding', label: 'Auxílio Alimentação' },
                        { key: 'reqHydration', label: 'Hidratação assistida' },
                        { key: 'reqMobility', label: 'Mobilização/Mudança decúbito' },
                        { key: 'reqDressings', label: 'Realização de Curativos' },
                        { key: 'reqLeisure', label: 'Atividade Lazer/Social' },
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-100 hover:bg-violet-50 cursor-pointer select-none transition-colors">
                          <input
                            type="checkbox"
                            checked={!!(formData as any)[item.key]}
                            onChange={e => setFormData({ ...formData, [item.key]: e.target.checked })}
                            className="rounded text-violet-600 focus:ring-violet-500 h-4 w-4"
                          />
                          <span className="text-xs text-slate-600 font-semibold">{item.label}</span>
                        </label>
                      ))}
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
                  className={`flex-1 sm:flex-none px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors ${
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
                  <Pill className="h-5 w-5 text-violet-600" /> Nova Prescrição de Medicamento
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
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  placeholder="Ex: Dipirona Gotas, Losartana Potássica" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dosagem</label>
                  <input 
                    required 
                    type="text" 
                    value={prescriptionData.dosage} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, dosage: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    placeholder="Ex: 500mg, 1 comprimido, 20 gotas" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Via de Administração</label>
                  <select 
                    value={prescriptionData.route} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, route: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Frequência / Horário</label>
                  <input 
                    required 
                    type="text" 
                    value={prescriptionData.frequency} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, frequency: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    placeholder="Ex: 12h em 12h, Uma vez ao dia" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horário da Próxima Dose</label>
                  <input 
                    type="time" 
                    value={prescriptionData.nextDose} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, nextDose: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de Início</label>
                  <input 
                    required 
                    type="date" 
                    value={prescriptionData.startDate} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, startDate: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de Término (Opcional)</label>
                  <input 
                    type="date" 
                    value={prescriptionData.endDate} 
                    onChange={e => setPrescriptionData({ ...prescriptionData, endDate: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  />
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
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors"
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
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" 
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
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" 
                  placeholder="Ex: Filho(a), Sobrinho(a), Amigo(a)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF (opcional)</label>
                  <input 
                    type="text" 
                    value={visitData.cpf} 
                    onChange={e => setVisitData(prev => ({ ...prev, cpf: e.target.value }))} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" 
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone (opcional)</label>
                  <input 
                    type="text" 
                    value={visitData.phone} 
                    onChange={e => setVisitData(prev => ({ ...prev, phone: e.target.value }))} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" 
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data e Hora *</label>
                  <input 
                    required 
                    type="datetime-local" 
                    value={visitData.date} 
                    onChange={e => setVisitData(prev => ({ ...prev, date: e.target.value }))} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Temperatura (ºC - opcional)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={visitData.temperature} 
                    onChange={e => setVisitData(prev => ({ ...prev, temperature: e.target.value }))} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" 
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
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white resize-none" 
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
                  className="flex-1 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Assinatura Digital */}
      {isSignConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-violet-50 flex items-center gap-3">
              <div className="p-2.5 bg-violet-100 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Assinatura Digital do Boletim</h3>
                <p className="text-xs text-slate-500 mt-0.5">Confirme para assinar digitalmente</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertOctagon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-medium leading-relaxed">
                  Atenção: após assinar digitalmente, o boletim <strong>não poderá sofrer nenhuma alteração</strong>. Esta ação é irreversível.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Assinatura de</p>
                <p className="text-sm font-bold text-slate-800">{currentUser?.profile.name || 'Usuário'}</p>
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
                className="flex items-center px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all shadow-md"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Confirmar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}
   </div>
  );
};

const BotIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
);

export default ResidentProfile;