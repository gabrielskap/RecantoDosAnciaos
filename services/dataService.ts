import { supabase } from './supabaseClient';
import type { Resident, FinancialRecord, Contract, Invoice, StockItem, Employee, SystemAccessLog, TrainingRecord, CalendarEvent, Room } from '../types';

export async function fetchResidents(empresaId: string): Promise<Resident[]> {
  const { data, error } = await supabase
    .from('Recanto_Residentes')
    .select(`
      *,
      emergencyContacts:Recanto_ContatosEmergencia(*),
      legalGuardian:Recanto_ResponsaveisLegais(*),
      medications:Recanto_Medicacoes(*, logs:Recanto_LogsMedicacao(*)),
      vitals:Recanto_SinaisVitais(*),
      carePlan:Recanto_PlanosAssistencia(*),
      dailyChecklists:Recanto_ChecklistDiario(*, carePlanAdherence:Recanto_AcompanhamentoPlano(*)),
      documents:Recanto_Documentos(*),
      auditLogs:Recanto_LogsAuditoria(*),
      dietPlan:Recanto_PlanosDieta(*),
      nutritionalLogs:Recanto_LogsNutricao(*),
      visits:Recanto_Visitas(*)
    `)
    .eq('empresa_id', empresaId);

  if (error) throw error;

  return (data || []).map((r: any): Resident => ({
    id: r.id,
    name: r.name,
    cpf: r.cpf || undefined,
    rg: r.rg || undefined,
    birthDate: r.birth_date || undefined,
    age: r.age,
    room: r.room,
    roomStatus: r.room_status,
    careLevel: r.care_level,
    photoUrl: r.photo_url || undefined,
    admissionDate: r.admission_date,
    addressCep: r.address_cep || undefined,
    addressState: r.address_state || undefined,
    addressCity: r.address_city || undefined,
    addressNeighborhood: r.address_neighborhood || undefined,
    addressStreet: r.address_street || undefined,
    addressNumber: r.address_number || undefined,
    addressComplement: r.address_complement || undefined,
    emergencyContacts: (r.emergencyContacts || []).map((c: any) => ({
      name: c.name,
      relation: c.relation,
      phone: c.phone
    })),
    legalGuardian: r.legalGuardian && r.legalGuardian.length > 0 ? {
      name: r.legalGuardian[0].name,
      cpf: r.legalGuardian[0].cpf,
      phone: r.legalGuardian[0].phone,
      address: r.legalGuardian[0].address
    } : undefined,
    clinicalCondition: r.clinical_condition || '',
    functionalCondition: r.functional_condition || '',
    socialHistory: r.social_history || '',
    usoFraldas: r.uso_fraldas || 'nao',
    mobilidadeSet: r.mobilidade_usual || 'independente',
    higieneCorporal: r.higiene_corporal_usual || 'independente',
    higieneOralVestir: r.higiene_oral_vestir_usual || 'independente',
    reqHygiene: r.req_hygiene ?? false,
    reqOralCare: r.req_oral_care ?? false,
    reqFeeding: r.req_feeding ?? false,
    reqHydration: r.req_hydration ?? false,
    reqMobility: r.req_mobility ?? false,
    reqDressings: r.req_dressings ?? false,
    reqLeisure: r.req_leisure ?? false,
    medications: (r.medications || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      route: m.route,
      frequency: m.frequency,
      nextDose: m.next_dose || '',
      startDate: m.start_date || undefined,
      endDate: m.end_date || undefined,
      logs: (m.logs || []).map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp,
        administeredBy: log.administered_by,
        status: log.status,
        note: log.note || undefined
      }))
    })),
    allergies: (r.allergies || []).map((a: any) => a.description),
    vitals: (r.vitals || []).map((v: any) => ({
      timestamp: v.timestamp,
      bp: v.bp || '',
      hr: v.hr || 0,
      temp: v.temp ? parseFloat(v.temp) : 36.5,
      spo2: v.spo2 || 0,
      painLevel: v.pain_level || undefined
    })),
    carePlan: (r.carePlan || []).map((cp: any) => ({
      id: cp.id,
      title: cp.title,
      description: cp.description || '',
      frequency: cp.frequency || '',
      assignedTo: cp.assigned_to || '',
      status: cp.status,
      createdAt: cp.created_at
    })),
    dailyChecklists: (r.dailyChecklists || []).map((chk: any) => {
      const shift = chk.shift || 'diurno';
      const match = (r.vitals || []).find((v: any) => {
        const vDate = new Date(v.timestamp);
        const year = vDate.getFullYear();
        const month = String(vDate.getMonth() + 1).padStart(2, '0');
        const day = String(vDate.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${day}`;
        if (localDateStr !== chk.date) return false;
        const hour = vDate.getHours();
        if (shift === 'noturno') return hour >= 18 || hour < 6;
        return hour >= 6 && hour < 18;
      });
      return {
        date: chk.date,
        shift,
        hygiene: chk.hygiene,
        oralCare: chk.oral_care,
        feeding: chk.feeding,
        hydration: chk.hydration,
        mobility: chk.mobility,
        dressings: chk.dressings,
        leisure: chk.leisure,
        queixaDor: chk.queixa_dor || undefined,
        queixaDorDesc: chk.queixa_dor_desc || undefined,
        estadoNeurologico: chk.estado_neurologico || undefined,
        arAmbiente: chk.ar_ambiente !== null ? chk.ar_ambiente : undefined,
        alimentacao: chk.alimentacao || undefined,
        alimentacaoDesc: chk.alimentacao_desc || undefined,
        agitado: chk.agitado !== null ? chk.agitado : undefined,
        prostrado: chk.prostrado !== null ? chk.prostrado : undefined,
        sonolento: chk.sonolento !== null ? chk.sonolento : undefined,
        eliminacaoEvacuacao: chk.eliminacao_evacuacao || undefined,
        eliminacaoEvacuacaoDias: chk.eliminacao_evacuacao_dias || undefined,
        aspectoEvacuacoes: chk.aspecto_evacuacoes || undefined,
        diurese: chk.diurese || undefined,
        diureseAspecto: chk.diurese_aspecto || undefined,
        usoFraldas: chk.uso_fraldas || undefined,
        mobilidadeSet: chk.mobilidade_set || undefined,
        higieneCorporal: chk.higiene_corporal || undefined,
        higieneOralVestir: chk.higiene_oral_vestir || undefined,
        alteracoesPele: chk.alteracoes_pele || undefined,
        alteracoesPeleDesc: chk.alteracoes_pele_desc || undefined,
        sono: chk.sono || undefined,
        sonoDesc: chk.sono_desc || undefined,
        medicacoesAdministradas: chk.medicacoes_administradas || undefined,
        atividadesConsulta: chk.atividades_consulta || undefined,
        intercorrencia: chk.intercorrencia || undefined,
        intercorrenciaDesc: chk.intercorrencia_desc || undefined,
        photoUrl: chk.photo_url || undefined,
        signedBy: chk.signed_by || undefined,
        signedAt: chk.signed_at || undefined,
        signatureInfo: chk.signature_info || undefined,
        frequenciaCardiaca: match && match.hr ? String(match.hr) : undefined,
        pressaoArterial: match && match.bp ? match.bp : undefined,
        saturacao: match && match.spo2 ? String(match.spo2) : undefined,
        temperatura: match && match.temp ? String(match.temp) : undefined,
        carePlanAdherence: (chk.carePlanAdherence || []).map((adh: any) => ({
          id: adh.id,
          checklistId: adh.checklist_id,
          carePlanId: adh.care_plan_id,
          status: adh.status,
          comment: adh.comment || undefined
        }))
      };
    }),
    documents: (r.documents || []).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      url: doc.url,
      uploadDate: doc.upload_date
    })),
    auditLogs: (r.auditLogs || []).map((al: any) => ({
      id: al.id,
      timestamp: al.timestamp,
      userId: al.user_id,
      userName: al.user_name,
      action: al.action,
      details: al.details || ''
    })),
    dietPlan: r.dietPlan && r.dietPlan.length > 0 ? {
      consistency: r.dietPlan[0].consistency,
      type: r.dietPlan[0].type,
      restrictions: [],
      fluidRestriction: r.dietPlan[0].fluid_restriction || undefined,
      observations: r.dietPlan[0].observations || undefined,
      updatedAt: r.dietPlan[0].updated_at
    } : undefined,
    nutritionalLogs: (r.nutritionalLogs || []).map((n: any) => ({
      id: n.id,
      date: n.date,
      meal: n.meal,
      acceptance: n.acceptance,
      fluidIntake: n.fluid_intake || undefined,
      notes: n.notes || undefined
    })),
    visits: (r.visits || []).map((v: any) => ({
      id: v.id,
      residentId: v.resident_id,
      visitorName: v.visitor_name,
      relation: v.relation,
      cpf: v.cpf || undefined,
      phone: v.phone || undefined,
      date: v.date,
      temperature: v.temperature ? parseFloat(v.temperature) : undefined,
      observations: v.observations || undefined,
      createdBy: v.created_by
    })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }));
}

export async function fetchFinancials(empresaId: string): Promise<FinancialRecord[]> {
  const { data, error } = await supabase
    .from('Recanto_RegistrosFinanceiros')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map((f: any): FinancialRecord => ({
    id: f.id,
    type: f.type,
    category: f.category,
    description: f.description,
    amount: parseFloat(f.amount),
    date: f.date,
    status: f.status,
    invoiceId: f.invoice_id || undefined
  }));
}

export async function fetchContracts(empresaId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('Recanto_Contratos')
    .select(`*, resident:Recanto_Residentes(name)`)
    .eq('empresa_id', empresaId);

  if (error) throw error;

  return (data || []).map((c: any): Contract => ({
    id: c.id,
    residentId: c.resident_id,
    residentName: c.resident?.name || 'Residente',
    startDate: c.start_date,
    endDate: c.end_date || undefined,
    monthlyValue: parseFloat(c.monthly_value),
    dueDay: c.due_day,
    status: c.status,
    fileUrl: c.file_url || undefined
  }));
}

export async function fetchInvoices(empresaId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('Recanto_Mensalidades')
    .select(`*, resident:Recanto_Residentes(name)`)
    .eq('empresa_id', empresaId);

  if (error) throw error;

  return (data || []).map((i: any): Invoice => ({
    id: i.id,
    contractId: i.contract_id,
    residentName: i.resident?.name || 'Residente',
    amount: parseFloat(i.amount),
    dueDate: i.due_date,
    status: i.status,
    monthYear: i.month_year,
    paidDate: i.paid_date || undefined
  }));
}

export async function fetchStockItems(empresaId: string): Promise<StockItem[]> {
  const { data, error } = await supabase
    .from('Recanto_Estoque')
    .select(`*, history:Recanto_MovimentacoesEstoque(*)`)
    .eq('empresa_id', empresaId);

  if (error) throw error;

  return (data || []).map((s: any): StockItem => ({
    id: s.id,
    name: s.name,
    category: s.category,
    quantity: s.quantity,
    unit: s.unit,
    minThreshold: s.min_threshold,
    residentId: s.resident_id || undefined,
    history: (s.history || []).map((h: any) => ({
      id: h.id,
      type: h.type,
      quantity: h.quantity,
      date: h.date,
      user: h.user_name,
      notes: h.notes || undefined
    })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }));
}

export async function fetchEmployees(empresaId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('Recanto_Funcionarios')
    .select('*')
    .eq('empresa_id', empresaId);

  if (error) throw error;

  return (data || []).map((e: any): Employee => ({
    id: e.id,
    auth_user_id: e.auth_user_id || undefined,
    name: e.name,
    role: e.role,
    cpf: e.cpf,
    email: e.email,
    phone: e.phone || '',
    registrationNumber: e.registration_number || undefined,
    isTechnicalLead: e.is_technical_lead,
    shift: e.shift,
    status: e.status,
    admissionDate: e.admission_date
  }));
}

export async function fetchAccessLogs(empresaId: string): Promise<SystemAccessLog[]> {
  const { data, error } = await supabase
    .from('Recanto_LogsAcesso')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('timestamp', { ascending: false });

  if (error) throw error;

  return (data || []).map((l: any): SystemAccessLog => ({
    id: l.id,
    timestamp: l.timestamp,
    userId: l.user_id,
    userName: l.user_name,
    role: l.role || 'Cuidador',
    action: l.action,
    resource: l.resource || undefined,
    ipAddress: l.ip_address || ''
  }));
}

export async function fetchTrainingRecords(empresaId: string): Promise<TrainingRecord[]> {
  const { data, error } = await supabase
    .from('Recanto_Treinamentos')
    .select(`*, participants:Recanto_TreinamentosParticipantes(*)`)
    .eq('empresa_id', empresaId);

  if (error) throw error;

  return (data || []).map((t: any): TrainingRecord => ({
    id: t.id,
    title: t.title,
    date: t.date,
    instructor: t.instructor,
    participants: (t.participants || []).map((p: any) => p.employee_name),
    validUntil: t.valid_until || undefined,
    description: t.description || ''
  }));
}

export async function fetchEvents(empresaId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('Recanto_Eventos')
    .select('*')
    .eq('empresa_id', empresaId);

  if (error) throw error;

  return (data || []).map((ev: any): CalendarEvent => ({
    id: ev.id,
    title: ev.title,
    start: ev.start_time,
    end: ev.end_time || undefined,
    type: ev.type,
    residentId: ev.resident_id || undefined,
    description: ev.description || undefined,
    location: ev.location || undefined,
    createdBy: ev.created_by
  }));
}

export async function fetchRooms(empresaId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from('Recanto_Quartos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('number', { ascending: true });

  if (error) throw error;

  return (data || []).map((q: any): Room => ({
    id: q.id,
    number: q.number,
    type: q.type,
    capacity: q.capacity,
    assets: q.assets || [],
    status: q.status || undefined
  }));
}
