import { supabase } from './supabaseClient';
import type { Resident, ResidentPrescriptionRecord, FinancialRecord, Contract, Invoice, StockItem, Employee, SystemAccessLog, TrainingRecord, CalendarEvent, Room } from '../types';

// Relations that are cheap and needed just to render the resident list/cards
// (contacts, allergies, care plan, diet, document folders). Kept identical
// between the summary and detail fetch below.
const RESIDENT_BASE_SELECT = `
  *,
  emergencyContacts:Recanto_ContatosEmergencia(*),
  legalGuardian:Recanto_ResponsaveisLegais(*),
  allergies:Recanto_Alergias(*),
  carePlan:Recanto_PlanosAssistencia(*),
  documentFolders:Recanto_DocumentosPastas(*),
  dietPlan:Recanto_PlanosDieta(*)
`;

interface ResidentHeavyData {
  medications: any[];
  prescriptions: any[];
  vitals: any[];
  glucoseReadings: any[];
  dailyChecklists: any[];
  documents: any[];
  auditLogs: any[];
  nutritionalLogs: any[];
  visits: any[];
  isDetailLoaded: boolean;
}

// Shared shaping logic between fetchResidentsSummary (light, one row per
// resident) and fetchResidentDetails (full clinical history for a single
// resident). Keeping a single mapper avoids the two fetch paths drifting
// apart and producing subtly different Resident shapes.
function mapResidentRow(r: any, heavy: ResidentHeavyData): Resident {
  const rMedications = heavy.medications;
  const rPrescriptions = heavy.prescriptions;
  const rVitals = heavy.vitals;
  const rGlucoseReadings = heavy.glucoseReadings;
  const rDailyChecklists = heavy.dailyChecklists;
  const rDocuments = heavy.documents;
  const rAuditLogs = heavy.auditLogs;
  const rNutritionalLogs = heavy.nutritionalLogs;
  const rVisits = heavy.visits;

  {
    return {
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
      reqHygiene: r.req_hygiene,
      reqOralCare: r.req_oral_care,
      reqFeeding: r.req_feeding,
      reqHydration: r.req_hydration,
      reqMobility: r.req_mobility,
      reqDressings: r.req_dressings,
      reqLeisure: r.req_leisure,
      status: r.status || 'ativo',
      dataDesligamento: r.data_desligamento || undefined,
      motivoDesligamento: r.motivo_desligamento || undefined,
      documentoDesligamento: r.documento_desligamento || undefined,
      medications: rMedications.map((m: any) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        route: m.route,
        frequency: m.frequency,
        nextDose: m.next_dose || '',
        startDate: m.start_date || undefined,
        endDate: m.end_date || undefined,
        observations: m.observations || undefined,
        documentUrl: m.document_url || undefined,
        logs: (m.logs || []).map((log: any) => ({
          id: log.id,
          timestamp: log.timestamp,
          administeredBy: log.administered_by,
          status: log.status,
          note: log.note || undefined
        }))
      })),
      prescriptions: rPrescriptions.map((p: any): ResidentPrescriptionRecord => ({
        id: p.id,
        description: p.description,
        expiryDate: p.expiry_date,
        fileUrl: p.file_url,
        fileName: p.file_name,
        createdAt: p.created_at
      })).sort((a: ResidentPrescriptionRecord, b: ResidentPrescriptionRecord) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      allergies: (r.allergies || []).map((a: any) => a.description),
      vitals: rVitals.map((v: any) => ({
        timestamp: v.timestamp,
        bp: v.bp || '',
        hr: v.hr || 0,
        temp: v.temp ? parseFloat(v.temp) : 36.5,
        spo2: v.spo2 || 0,
        painLevel: v.pain_level || undefined
      })),
      glucoseReadings: rGlucoseReadings
        .map((g: any) => ({
          id: g.id,
          timestamp: g.timestamp,
          value: g.valor_mg_dl,
          moment: g.momento,
          insulinApplied: g.insulina_aplicada || false,
          insulinUnits: g.insulina_unidades != null ? parseFloat(g.insulina_unidades) : undefined,
          insulinType: g.tipo_insulina || undefined,
          notes: g.observacoes || undefined
        }))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      carePlan: (r.carePlan || []).map((cp: any) => ({
        id: cp.id,
        title: cp.title,
        description: cp.description || '',
        frequency: cp.frequency || '',
        assignedTo: cp.assigned_to || '',
        status: cp.status,
        createdAt: cp.created_at
      })),
      dailyChecklists: rDailyChecklists.map((chk: any) => {
        const shift = chk.shift || 'diurno';
        const match = rVitals.find((v: any) => {
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
          photoUrls: (chk.photo_urls && chk.photo_urls.length > 0)
            ? chk.photo_urls
            : (chk.photo_url ? [chk.photo_url] : []),
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
      documents: rDocuments.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        url: doc.url,
        uploadDate: doc.upload_date,
        folderId: doc.folder_id ?? null
      })),
      documentFolders: (r.documentFolders || []).map((f: any) => ({
        id: f.id,
        name: f.name
      })),
      auditLogs: rAuditLogs.map((al: any) => ({
        id: al.id,
        timestamp: al.timestamp,
        userId: al.user_id,
        userName: al.user_name,
        action: al.action,
        details: al.details || '',
        data: al.dados || undefined
      })),
      dietPlan: r.dietPlan && r.dietPlan.length > 0 ? {
        consistency: r.dietPlan[0].consistency,
        type: r.dietPlan[0].type,
        restrictions: [],
        fluidRestriction: r.dietPlan[0].fluid_restriction || undefined,
        observations: r.dietPlan[0].observations || undefined,
        updatedAt: r.dietPlan[0].updated_at
      } : undefined,
      nutritionalLogs: rNutritionalLogs.map((n: any) => ({
        id: n.id,
        date: n.date,
        meal: n.meal,
        acceptance: n.acceptance,
        fluidIntake: n.fluid_intake || undefined,
        notes: n.notes || undefined
      })),
      visits: rVisits.map((v: any) => ({
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
      })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      isDetailLoaded: heavy.isDetailLoaded
    };
  }
}

// Fetches all residents of a company for the list/dashboard views.
//
// Only relations that are cheap and genuinely needed across every resident
// at once are included: current medications (small, bounded — not a growing
// log) and nutrition logs (needed by Reports/Nutrition views for all
// residents in a date range). Everything else that grows without bound
// (vitals, daily checklists, documents, audit trail, visits, prescriptions,
// medication administration logs) is history for ONE resident and is only
// fetched by fetchResidentDetails() when that resident's profile is
// actually opened. Fetching the complete unbounded history of every
// resident on every list load is what caused Postgres to cancel the query
// with a statement_timeout (57014) as the facility's operational history
// grew.
export async function fetchResidentsSummary(empresaId: string): Promise<Resident[]> {
  const { data: residentsData, error: residentsError } = await supabase
    .from('Recanto_Residentes')
    .select(RESIDENT_BASE_SELECT)
    .eq('empresa_id', empresaId);

  if (residentsError) throw residentsError;

  const residentsList = residentsData || [];
  if (residentsList.length === 0) return [];

  const residentIds = residentsList.map((r: any) => r.id);

  const [medsResult, nutriLogsResult] = await Promise.all([
    supabase.from('Recanto_Medicacoes').select('*').in('resident_id', residentIds),
    supabase.from('Recanto_LogsNutricao').select('*').in('resident_id', residentIds)
  ]);

  if (medsResult.error) throw medsResult.error;
  if (nutriLogsResult.error) throw nutriLogsResult.error;

  const medsByResident = new Map<string, any[]>();
  for (const med of medsResult.data || []) {
    const arr = medsByResident.get(med.resident_id) || [];
    arr.push({ ...med, logs: [] });
    medsByResident.set(med.resident_id, arr);
  }

  const nutriLogsByResident = new Map<string, any[]>();
  for (const log of nutriLogsResult.data || []) {
    const arr = nutriLogsByResident.get(log.resident_id) || [];
    arr.push(log);
    nutriLogsByResident.set(log.resident_id, arr);
  }

  return residentsList.map((r: any) => mapResidentRow(r, {
    medications: medsByResident.get(r.id) || [],
    prescriptions: [],
    vitals: [],
    glucoseReadings: [],
    dailyChecklists: [],
    documents: [],
    auditLogs: [],
    nutritionalLogs: nutriLogsByResident.get(r.id) || [],
    visits: [],
    isDetailLoaded: false
  }));
}

// Fetches the complete clinical history for a SINGLE resident (vitals,
// glucose readings, daily checklists, documents, audit trail, visits,
// prescriptions and medication administration logs). This is the same data
// fetchResidents() used to load for every resident at once — scoping it to
// one resident_id keeps each query bounded and fast regardless of how much
// history the facility has accumulated.
export async function fetchResidentDetails(residentId: string): Promise<Resident | null> {
  const { data: residentRow, error: residentError } = await supabase
    .from('Recanto_Residentes')
    .select(RESIDENT_BASE_SELECT)
    .eq('id', residentId)
    .maybeSingle();

  if (residentError) throw residentError;
  if (!residentRow) return null;

  const [
    medsResult,
    prescriptionsResult,
    vitalsResult,
    glucoseResult,
    checklistsResult,
    docsResult,
    auditLogsResult,
    nutriLogsResult,
    visitsResult
  ] = await Promise.all([
    supabase.from('Recanto_Medicacoes').select('*').eq('resident_id', residentId),
    supabase.from('Recanto_Receitas').select('*').eq('resident_id', residentId),
    supabase.from('Recanto_SinaisVitais').select('*').eq('resident_id', residentId),
    supabase.from('Recanto_Glicemia').select('*').eq('resident_id', residentId),
    supabase.from('Recanto_ChecklistDiario').select('*').eq('resident_id', residentId),
    supabase.from('Recanto_Documentos').select('*').eq('resident_id', residentId),
    supabase.from('Recanto_LogsAuditoria').select('*').eq('resident_id', residentId).order('timestamp', { ascending: false }),
    supabase.from('Recanto_LogsNutricao').select('*').eq('resident_id', residentId),
    supabase.from('Recanto_Visitas').select('*').eq('resident_id', residentId)
  ]);

  for (const result of [medsResult, prescriptionsResult, vitalsResult, glucoseResult, checklistsResult, docsResult, auditLogsResult, nutriLogsResult, visitsResult]) {
    if (result.error) throw result.error;
  }

  const meds = medsResult.data || [];
  const checklists = checklistsResult.data || [];
  const medIds = meds.map((m: any) => m.id);
  const checklistIds = checklists.map((c: any) => c.id);

  const [logsResult, adherenceResult] = await Promise.all([
    medIds.length > 0
      ? supabase.from('Recanto_LogsMedicacao').select('*').in('medication_id', medIds)
      : Promise.resolve({ data: [], error: null }),
    checklistIds.length > 0
      ? supabase.from('Recanto_AcompanhamentoPlano').select('*').in('checklist_id', checklistIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (logsResult.error) throw logsResult.error;
  if (adherenceResult.error) throw adherenceResult.error;

  const medLogsByMed = new Map<string, any[]>();
  for (const log of logsResult.data || []) {
    const arr = medLogsByMed.get(log.medication_id) || [];
    arr.push(log);
    medLogsByMed.set(log.medication_id, arr);
  }
  const medications = meds.map((m: any) => ({ ...m, logs: medLogsByMed.get(m.id) || [] }));

  const adherenceByChecklist = new Map<string, any[]>();
  for (const adh of adherenceResult.data || []) {
    const arr = adherenceByChecklist.get(adh.checklist_id) || [];
    arr.push(adh);
    adherenceByChecklist.set(adh.checklist_id, arr);
  }
  const dailyChecklists = checklists.map((c: any) => ({ ...c, carePlanAdherence: adherenceByChecklist.get(c.id) || [] }));

  return mapResidentRow(residentRow, {
    medications,
    prescriptions: prescriptionsResult.data || [],
    vitals: vitalsResult.data || [],
    glucoseReadings: glucoseResult.data || [],
    dailyChecklists,
    documents: docsResult.data || [],
    auditLogs: auditLogsResult.data || [],
    nutritionalLogs: nutriLogsResult.data || [],
    visits: visitsResult.data || [],
    isDetailLoaded: true
  });
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
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo');

  if (error) throw error;

  return (data || []).map((s: any): StockItem => ({
    id: s.id,
    name: s.name,
    category: s.category,
    quantity: s.quantity,
    unit: s.unit,
    minThreshold: s.min_threshold,
    expirationDate: s.expiration_date || undefined,
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
    shiftStart: e.shift_start ? e.shift_start.slice(0, 5) : undefined,
    shiftEnd: e.shift_end ? e.shift_end.slice(0, 5) : undefined,
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
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo');

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
    createdBy: ev.created_by,
    status: ev.status || undefined,
    motivoCancelamento: ev.motivo_cancelamento || undefined
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
