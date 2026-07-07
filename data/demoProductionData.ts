// ─────────────────────────────────────────────────────────────────────────────
// Dados mockados de produção para a rota /demo.
// Simula uma ILPI ativa com residentes, equipe, financeiro, estoque e agenda.
// Todos os tipos correspondem exatamente aos tipos do sistema real (types.ts).
// ─────────────────────────────────────────────────────────────────────────────

import {
  Resident, Employee, FinancialRecord, Contract, Invoice,
  StockItem, CalendarEvent, TrainingRecord, SystemAccessLog, Room,
  Medication, VitalSign, CarePlan, DailyChecklist, EmergencyContact,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const today = '2026-06-22';
const isoNow = (hour: number, min = 0) =>
  `2026-06-22T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
const future = (days: number, hour = 9) => {
  const d = new Date('2026-06-22');
  d.setDate(d.getDate() + days);
  return `${d.toISOString().split('T')[0]}T${String(hour).padStart(2, '0')}:00:00`;
};

const vitals = (residentId: string): VitalSign[] => [
  { timestamp: isoNow(8), bp: '130/80', hr: 72, temp: 36.4, spo2: 97 },
  { timestamp: `2026-06-21T08:00:00`, bp: '128/82', hr: 74, temp: 36.5, spo2: 96 },
  { timestamp: `2026-06-20T08:00:00`, bp: '132/78', hr: 70, temp: 36.3, spo2: 98 },
];

const carePlan = (residentId: string): CarePlan[] => [
  {
    id: `cp-${residentId}-1`, title: 'Banho assistido',
    description: 'Auxílio total no banho diário.', frequency: 'Diário',
    assignedTo: 'Cuidador', status: 'ativo', createdAt: '2026-01-10',
  },
  {
    id: `cp-${residentId}-2`, title: 'Exercícios de mobilização',
    description: 'Fisioterapia motora preventiva.', frequency: '3x por semana',
    assignedTo: 'Fisioterapeuta', status: 'ativo', createdAt: '2026-01-10',
  },
];

const checklist = (residentId: string): DailyChecklist[] => [
  {
    date: today, shift: 'diurno',
    hygiene: true, oralCare: true, feeding: true, hydration: true,
    mobility: true, dressings: false, leisure: true,
    queixaDor: 'nao', estadoNeurologico: 'Alerta e orientado',
    alimentacao: 'boa', sono: 'preservado', diurese: 'aumentada',
    eliminacaoEvacuacao: 'presente',
  },
];

const contacts = (name: string, phone: string): EmergencyContact[] => [
  { name, relation: 'Filho(a)', phone },
];

const med = (id: string, name: string, dosage: string, freq: string, next: string): Medication => ({
  id, name, dosage, route: 'Oral', frequency: freq, nextDose: next,
  startDate: '2025-01-01', logs: [],
});

// ─── Rooms ───────────────────────────────────────────────────────────────────

export const DEMO_ROOMS: Room[] = [
  { id: 'q101', number: '101', type: 'Individual', capacity: 1, assets: ['Televisão', 'Ar Condicionado', 'Frigobar', 'Banheiro Adaptado', 'Campainha de Emergência', 'Guarda-roupa', 'Ventilador', 'Cama Hospitalar', 'Poltrona Reclinável'] },
  { id: 'q102', number: '102', type: 'Compartilhado', capacity: 4, assets: ['Televisão', 'Ar Condicionado', 'Frigobar', 'Banheiro Adaptado', 'Guarda-roupa', 'Campainha de Emergência', '4 Janelas'] },
  { id: 'q103', number: '103', type: 'Individual', capacity: 1, assets: ['Televisão', 'Ar Condicionado', 'Banheiro Adaptado', 'Guarda-roupa', 'Campainha de Emergência'] },
  { id: 'q104', number: '104', type: 'Compartilhado', capacity: 2, assets: ['Televisão', 'Guarda-roupa', 'Ventilador', 'Campainha de Emergência'] },
  { id: 'q105', number: '105', type: 'Individual', capacity: 1, assets: ['Televisão', 'Ar Condicionado', 'Frigobar', 'Banheiro Adaptado', 'Guarda-roupa', 'Cama Hospitalar'] },
  { id: 'q106', number: '106', type: 'Compartilhado', capacity: 3, assets: ['Televisão', 'Ar Condicionado', 'Banheiro Adaptado', 'Guarda-roupa'] },
  { id: 'q107', number: '107', type: 'Individual', capacity: 1, assets: ['Televisão', 'Guarda-roupa', 'Banheiro Adaptado', 'Campainha de Emergência'] },
  { id: 'q108', number: '108', type: 'Compartilhado', capacity: 2, assets: ['Televisão', 'Ar Condicionado', 'Guarda-roupa', 'Ventilador'] },
];

// ─── Residents ────────────────────────────────────────────────────────────────

export const DEMO_PROD_RESIDENTS: Resident[] = [
  {
    id: 'r1', name: 'Maria das Graças Santos', cpf: '123.456.789-00', rg: '12.345.678-9',
    birthDate: '1947-03-15', age: 79, room: '101', careLevel: 'III', photoUrl: 'https://randomuser.me/api/portraits/women/72.jpg',
    admissionDate: '2022-01-15', roomStatus: 'Ocupado',
    clinicalCondition: 'Hipertensão arterial, Diabetes mellitus tipo 2, Insuficiência cardíaca compensada',
    functionalCondition: 'Mobilidade reduzida, dependente para AVDs básicas, uso de andador',
    socialHistory: 'Viúva, 3 filhos. Adaptação excelente à rotina da ILPI.',
    medications: [
      med('m1a', 'Losartana', '50mg', 'Diário', '08:00'),
      med('m1b', 'Metformina', '500mg', '2x ao dia', '12:00'),
      med('m1c', 'Furosemida', '40mg', 'Diário', '08:00'),
    ],
    allergies: ['Dipirona'],
    vitals: vitals('r1'), carePlan: carePlan('r1'), dailyChecklists: checklist('r1'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('João Santos', '(11) 99123-4567'),
    dietPlan: { consistency: 'Branda', type: 'Diabética', restrictions: ['Açúcar simples'], updatedAt: today },
    usoFraldas: 'sim', mobilidadeSet: 'auxilio', higieneCorporal: 'auxilio', higieneOralVestir: 'auxilio',
  },
  {
    id: 'r2', name: 'José Antônio Oliveira', cpf: '234.567.890-11',
    birthDate: '1943-07-22', age: 82, room: '102', careLevel: 'II', photoUrl: 'https://randomuser.me/api/portraits/men/76.jpg',
    admissionDate: '2021-06-10',
    clinicalCondition: 'Doença de Parkinson estágio inicial, Hipertensão',
    functionalCondition: 'Deambulação com supervisão, leve tremor em repouso',
    socialHistory: 'Casado. Esposa visita 3x por semana. Gosta de xadrez.',
    medications: [
      med('m2a', 'Levodopa', '100mg', '3x ao dia', '08:00'),
      med('m2b', 'Amlodipina', '5mg', 'Diário', '08:00'),
    ],
    allergies: [],
    vitals: vitals('r2'), carePlan: carePlan('r2'), dailyChecklists: checklist('r2'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Ana Oliveira', '(11) 98765-4321'),
    dietPlan: { consistency: 'Geral', type: 'Hipossódica', restrictions: [], updatedAt: today },
    usoFraldas: 'nao', mobilidadeSet: 'auxilio', higieneCorporal: 'independente', higieneOralVestir: 'independente',
  },
  {
    id: 'r3', name: 'Ana Maria Lima', cpf: '345.678.901-22',
    birthDate: '1950-11-08', age: 75, room: '103', careLevel: 'I', photoUrl: 'https://randomuser.me/api/portraits/women/63.jpg',
    admissionDate: '2023-03-20',
    clinicalCondition: 'Artrose bilateral de joelhos, Osteoporose',
    functionalCondition: 'Independente para AVDs, deambulação sem auxílio',
    socialHistory: 'Aposentada professora. Participativa nas atividades do grupo.',
    medications: [
      med('m3a', 'Calcitriola', '0,25mcg', 'Diário', '08:00'),
      med('m3b', 'Paracetamol', '500mg', 'Se necessário', '—'),
    ],
    allergies: ['Penicilina'],
    vitals: vitals('r3'), carePlan: carePlan('r3'), dailyChecklists: checklist('r3'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Carlos Lima', '(11) 91234-5678'),
    dietPlan: { consistency: 'Geral', type: 'Livre', restrictions: [], updatedAt: today },
    usoFraldas: 'nao', mobilidadeSet: 'independente', higieneCorporal: 'independente', higieneOralVestir: 'independente',
  },
  {
    id: 'r4', name: 'Pedro Henrique Costa', cpf: '456.789.012-33',
    birthDate: '1936-05-30', age: 90, room: '104', careLevel: 'III', photoUrl: 'https://randomuser.me/api/portraits/men/85.jpg',
    admissionDate: '2020-09-01',
    clinicalCondition: 'Demência senil moderada, AVC isquêmico prévio, Hipertensão',
    functionalCondition: 'Totalmente dependente para AVDs, em cadeira de rodas',
    socialHistory: 'Viúvo. Filha única como responsável. Desorientação temporoespacial.',
    medications: [
      med('m4a', 'Donepezila', '10mg', 'Diário', '20:00'),
      med('m4b', 'Quetiapina', '25mg', 'À noite', '20:00'),
      med('m4c', 'Enalapril', '10mg', '2x ao dia', '08:00'),
      med('m4d', 'AAS', '100mg', 'Diário', '08:00'),
    ],
    allergies: [],
    vitals: vitals('r4'), carePlan: carePlan('r4'), dailyChecklists: checklist('r4'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Lúcia Costa', '(11) 97654-3210'),
    dietPlan: { consistency: 'Pastosa', type: 'Hipossódica', restrictions: ['Alimentos de difícil mastigação'], updatedAt: today },
    usoFraldas: 'sim', mobilidadeSet: 'acamado', higieneCorporal: 'auxilio', higieneOralVestir: 'auxilio',
  },
  {
    id: 'r5', name: 'Rosa Maria Ferreira', cpf: '567.890.123-44',
    birthDate: '1954-09-03', age: 71, room: '102', careLevel: 'I', photoUrl: 'https://randomuser.me/api/portraits/women/57.jpg',
    admissionDate: '2024-01-08',
    clinicalCondition: 'Pós-operatório de fratura de fêmur, Hipertensão leve',
    functionalCondition: 'Deambulação com auxílio de muletas, em reabilitação fisioterapêutica',
    socialHistory: 'Separada, 2 filhos. Moradora de Belo Horizonte. Boa adesão ao tratamento.',
    medications: [
      med('m5a', 'Enoxaparina', '40mg SC', 'Diário', '20:00'),
      med('m5b', 'Losartana', '25mg', 'Diário', '08:00'),
    ],
    allergies: [],
    vitals: vitals('r5'), carePlan: carePlan('r5'), dailyChecklists: checklist('r5'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Roberto Ferreira', '(31) 99876-5432'),
    dietPlan: { consistency: 'Geral', type: 'Livre', restrictions: [], updatedAt: today },
    usoFraldas: 'nao', mobilidadeSet: 'auxilio', higieneCorporal: 'independente', higieneOralVestir: 'independente',
  },
  {
    id: 'r6', name: 'Antônio Carlos Ribeiro', cpf: '678.901.234-55',
    birthDate: '1942-01-17', age: 84, room: '104', careLevel: 'II', photoUrl: 'https://randomuser.me/api/portraits/men/68.jpg',
    admissionDate: '2022-07-22',
    clinicalCondition: 'DPOC moderado, Cardiopatia isquêmica estável, Hipertensão',
    functionalCondition: 'Limitação leve para AVDs, uso de oxigênio suplementar noturno',
    socialHistory: 'Viúvo, ex-engenheiro. Filho no exterior. Orientado e comunicativo.',
    medications: [
      med('m6a', 'Salbutamol inalatório', '100mcg', '4x ao dia', '08:00'),
      med('m6b', 'Budesonida', '200mcg', '2x ao dia', '08:00'),
      med('m6c', 'Atenolol', '50mg', 'Diário', '08:00'),
    ],
    allergies: ['Sulfa'],
    vitals: vitals('r6'), carePlan: carePlan('r6'), dailyChecklists: checklist('r6'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Paulo Ribeiro', '(11) 95432-1098'),
    dietPlan: { consistency: 'Geral', type: 'Hipossódica', restrictions: [], updatedAt: today },
    usoFraldas: 'nao', mobilidadeSet: 'independente', higieneCorporal: 'independente', higieneOralVestir: 'independente',
  },
  {
    id: 'r7', name: 'Helena Regina Martins', cpf: '789.012.345-66',
    birthDate: '1947-04-25', age: 79, room: '105', careLevel: 'II', photoUrl: 'https://randomuser.me/api/portraits/women/79.jpg',
    admissionDate: '2023-05-30',
    clinicalCondition: 'Insuficiência cardíaca congestiva compensada, Fibrilação atrial',
    functionalCondition: 'Mobilidade reduzida por dispneia aos médios esforços, uso de andador',
    socialHistory: 'Casada, marido com limitações. 4 filhos colaborativos nas visitas.',
    medications: [
      med('m7a', 'Digoxina', '0,25mg', 'Diário', '08:00'),
      med('m7b', 'Warfarina', '5mg', 'Diário', '18:00'),
      med('m7c', 'Carvedilol', '6,25mg', '2x ao dia', '08:00'),
      med('m7d', 'Espironolactona', '25mg', 'Diário', '08:00'),
    ],
    allergies: [],
    vitals: vitals('r7'), carePlan: carePlan('r7'), dailyChecklists: checklist('r7'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Roberto Martins', '(11) 93210-9876'),
    dietPlan: { consistency: 'Branda', type: 'Hipossódica', restrictions: ['Sódio < 2g/dia', 'Líquidos < 1,5L/dia'], updatedAt: today },
    usoFraldas: 'nao', mobilidadeSet: 'auxilio', higieneCorporal: 'auxilio', higieneOralVestir: 'independente',
  },
  {
    id: 'r8', name: 'Sebastião Dias Neto', cpf: '890.123.456-77',
    birthDate: '1935-12-10', age: 90, room: '106', careLevel: 'III', photoUrl: 'https://randomuser.me/api/portraits/men/91.jpg',
    admissionDate: '2021-02-11',
    clinicalCondition: 'AVC isquêmico com hemiplegia direita, Afasia de Broca, Disfagia',
    functionalCondition: 'Totalmente dependente, sonda nasoenteral, em cadeira de rodas',
    socialHistory: 'Viúvo. Sobrinha como responsável legal. Não verbaliza, comunica por gestos.',
    medications: [
      med('m8a', 'Clopidogrel', '75mg', 'Diário', '08:00'),
      med('m8b', 'Atorvastatina', '40mg', 'Diário', '20:00'),
      med('m8c', 'Ramipril', '5mg', 'Diário', '08:00'),
    ],
    allergies: ['Contraste iodado'],
    vitals: vitals('r8'), carePlan: carePlan('r8'), dailyChecklists: checklist('r8'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Marta Dias', '(11) 92109-8765'),
    dietPlan: { consistency: 'Líquida', type: 'Hiperproteica', restrictions: ['Engrossante obrigatório'], updatedAt: today },
    usoFraldas: 'sim', mobilidadeSet: 'acamado', higieneCorporal: 'auxilio', higieneOralVestir: 'auxilio',
  },
  {
    id: 'r9', name: 'Conceição Aparecida Souza', cpf: '901.234.567-88',
    birthDate: '1952-08-14', age: 73, room: '102', careLevel: 'I', photoUrl: 'https://randomuser.me/api/portraits/women/61.jpg',
    admissionDate: '2024-04-18',
    clinicalCondition: 'Hipotireoidismo, Depressão leve controlada',
    functionalCondition: 'Independente para AVDs, leve lentidão psicomotora',
    socialHistory: 'Divorciada, 1 filho. Participativa no coral e nas atividades de grupo.',
    medications: [
      med('m9a', 'Levotiroxina', '75mcg', 'Diário (jejum)', '07:00'),
      med('m9b', 'Sertralina', '50mg', 'Diário', '08:00'),
    ],
    allergies: [],
    vitals: vitals('r9'), carePlan: carePlan('r9'), dailyChecklists: checklist('r9'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Felipe Souza', '(31) 98901-2345'),
    dietPlan: { consistency: 'Geral', type: 'Livre', restrictions: [], updatedAt: today },
    usoFraldas: 'nao', mobilidadeSet: 'independente', higieneCorporal: 'independente', higieneOralVestir: 'independente',
  },
  {
    id: 'r10', name: 'Manoel Alves Pereira', cpf: '012.345.678-99',
    birthDate: '1944-02-28', age: 82, room: '107', careLevel: 'II', photoUrl: 'https://randomuser.me/api/portraits/men/80.jpg',
    admissionDate: '2022-11-05',
    clinicalCondition: 'Diabetes mellitus tipo 2, Neuropatia diabética, Retinopatia',
    functionalCondition: 'Visão reduzida, auxílio para AVDs por baixa acuidade visual',
    socialHistory: 'Viúvo, 5 filhos. Família muito presente. Aprecia música sertaneja.',
    medications: [
      med('m10a', 'Insulina NPH', '20UI', '2x ao dia', '08:00'),
      med('m10b', 'Metformina', '850mg', '3x ao dia', '08:00'),
      med('m10c', 'Gabapentina', '300mg', '3x ao dia', '08:00'),
    ],
    allergies: [],
    vitals: vitals('r10'), carePlan: carePlan('r10'), dailyChecklists: checklist('r10'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Sandra Alves', '(11) 90123-4567'),
    dietPlan: { consistency: 'Geral', type: 'Diabética', restrictions: ['Açúcar simples', 'Alimentos de alto índice glicêmico'], updatedAt: today },
    usoFraldas: 'nao', mobilidadeSet: 'auxilio', higieneCorporal: 'auxilio', higieneOralVestir: 'independente',
  },
  {
    id: 'r11', name: 'Lúcia de Fátima Pereira', cpf: '111.222.333-00',
    birthDate: '1940-06-05', age: 86, room: '106', careLevel: 'III', photoUrl: 'https://randomuser.me/api/portraits/women/88.jpg',
    admissionDate: '2020-12-01',
    clinicalCondition: 'Doença de Alzheimer estágio moderado, Hipertensão, Incontinência urinária',
    functionalCondition: 'Desorientada, dependente total, agitação vespertina (sundowning)',
    socialHistory: 'Viúva, família comprometida. Filha única cuida das questões legais.',
    medications: [
      med('m11a', 'Rivastigmina patch', '4,6mg/24h', 'Diário', '08:00'),
      med('m11b', 'Memantina', '10mg', '2x ao dia', '08:00'),
      med('m11c', 'Risperidona', '0,5mg', 'À noite', '20:00'),
      med('m11d', 'Losartana', '50mg', 'Diário', '08:00'),
    ],
    allergies: [],
    vitals: vitals('r11'), carePlan: carePlan('r11'), dailyChecklists: checklist('r11'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Renata Pereira', '(11) 98880-7766'),
    dietPlan: { consistency: 'Pastosa', type: 'Hipossódica', restrictions: ['Supervisão durante refeições'], updatedAt: today },
    usoFraldas: 'sim', mobilidadeSet: 'auxilio', higieneCorporal: 'auxilio', higieneOralVestir: 'auxilio',
  },
  {
    id: 'r12', name: 'Geraldo Nunes da Silva', cpf: '222.333.444-11',
    birthDate: '1949-09-18', age: 76, room: '108', careLevel: 'I', photoUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
    admissionDate: '2023-08-14',
    clinicalCondition: 'Hipertensão controlada, Dislipidemia',
    functionalCondition: 'Totalmente independente para AVDs e AIVDs',
    socialHistory: 'Divorciado, 2 filhos adultos. Ex-contador. Ativo, participa de todas as atividades.',
    medications: [
      med('m12a', 'Enalapril', '10mg', 'Diário', '08:00'),
      med('m12b', 'Sinvastatina', '40mg', 'À noite', '20:00'),
    ],
    allergies: [],
    vitals: vitals('r12'), carePlan: carePlan('r12'), dailyChecklists: checklist('r12'),
    documents: [], auditLogs: [], visits: [], glucoseReadings: [],
    emergencyContacts: contacts('Gabriela Nunes', '(11) 94567-8901'),
    dietPlan: { consistency: 'Geral', type: 'Hipolipídica', restrictions: ['Gorduras saturadas'], updatedAt: today },
    usoFraldas: 'nao', mobilidadeSet: 'independente', higieneCorporal: 'independente', higieneOralVestir: 'independente',
  },
];

// ─── Employees ────────────────────────────────────────────────────────────────

export const DEMO_PROD_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Dra. Carla Mendes', role: 'Médico', cpf: '555.666.777-88', email: 'carla.mendes@recantoanciaos.com.br', phone: '(31) 99001-0001', registrationNumber: 'CRM/MG 12345', isTechnicalLead: true, shift: 'Matutino', status: 'Ativo', admissionDate: '2020-03-01' },
  { id: 'e2', name: 'Paulo Henrique Souza', role: 'Enfermeiro', cpf: '444.555.666-77', email: 'paulo.souza@recantoanciaos.com.br', phone: '(31) 99002-0002', registrationNumber: 'COREN/MG 98765', isTechnicalLead: false, shift: 'Matutino', status: 'Ativo', admissionDate: '2021-01-15' },
  { id: 'e3', name: 'Juliana Alves Costa', role: 'Cuidador', cpf: '333.444.555-66', email: 'juliana.alves@recantoanciaos.com.br', phone: '(31) 99003-0003', isTechnicalLead: false, shift: 'Matutino', status: 'Ativo', admissionDate: '2021-06-01' },
  { id: 'e4', name: 'Patrícia Gomes Lima', role: 'Nutricionista', cpf: '222.333.444-55', email: 'patricia.gomes@recantoanciaos.com.br', phone: '(31) 99004-0004', registrationNumber: 'CFN 67890', isTechnicalLead: false, shift: 'Matutino', status: 'Ativo', admissionDate: '2022-02-01' },
  { id: 'e5', name: 'Rodrigo Farias', role: 'Fisioterapeuta', cpf: '111.222.333-44', email: 'rodrigo.farias@recantoanciaos.com.br', phone: '(31) 99005-0005', registrationNumber: 'CREFITO 11111', isTechnicalLead: false, shift: 'Vespertino', status: 'Ativo', admissionDate: '2022-05-15' },
  { id: 'e6', name: 'Fernanda Lima', role: 'Cuidador', cpf: '666.777.888-99', email: 'fernanda.lima@recantoanciaos.com.br', phone: '(31) 99006-0006', isTechnicalLead: false, shift: '12x36', status: 'Ativo', admissionDate: '2023-01-10' },
  { id: 'e7', name: 'Marcos Antônio Braga', role: 'Cuidador', cpf: '777.888.999-00', email: 'marcos.braga@recantoanciaos.com.br', phone: '(31) 99007-0007', isTechnicalLead: false, shift: 'Noturno', status: 'Férias', admissionDate: '2022-09-01' },
];

// ─── Financial Records ────────────────────────────────────────────────────────

export const DEMO_PROD_FINANCIALS: FinancialRecord[] = [
  // Receitas (mensalidades de junho)
  { id: 'f1',  type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Maria das Graças Santos', amount: 5500, date: '2026-06-05', status: 'pago', invoiceId: 'inv1' },
  { id: 'f2',  type: 'receita', category: 'Mensalidade', description: 'Mensalidade - José Antônio Oliveira', amount: 4200, date: '2026-06-05', status: 'pago', invoiceId: 'inv2' },
  { id: 'f3',  type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Ana Maria Lima', amount: 3800, date: '2026-06-05', status: 'pago', invoiceId: 'inv3' },
  { id: 'f4',  type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Pedro Henrique Costa', amount: 6200, date: '2026-06-05', status: 'pago', invoiceId: 'inv4' },
  { id: 'f5',  type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Antônio Carlos Ribeiro', amount: 4500, date: '2026-06-05', status: 'pago', invoiceId: 'inv6' },
  { id: 'f6',  type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Helena Regina Martins', amount: 4800, date: '2026-06-10', status: 'pago', invoiceId: 'inv7' },
  { id: 'f7',  type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Sebastião Dias Neto', amount: 7100, date: '2026-06-05', status: 'pago', invoiceId: 'inv8' },
  { id: 'f8',  type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Conceição Aparecida Souza', amount: 3600, date: '2026-06-05', status: 'pago', invoiceId: 'inv9' },
  { id: 'f9',  type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Manoel Alves Pereira', amount: 4300, date: '2026-06-05', status: 'pago', invoiceId: 'inv10' },
  { id: 'f10', type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Lúcia de Fátima Pereira', amount: 6500, date: '2026-06-05', status: 'pago', invoiceId: 'inv11' },
  { id: 'f11', type: 'receita', category: 'Mensalidade', description: 'Mensalidade - Geraldo Nunes da Silva', amount: 3400, date: '2026-06-05', status: 'pago', invoiceId: 'inv12' },
  // Despesas de junho
  { id: 'f20', type: 'despesa', category: 'Pessoal', description: 'Folha de pagamento - equipe de cuidadores', amount: 18500, date: '2026-06-05', status: 'pago' },
  { id: 'f21', type: 'despesa', category: 'Medicamentos', description: 'Compra de medicamentos - Farmácia Central', amount: 4200, date: '2026-06-08', status: 'pago' },
  { id: 'f22', type: 'despesa', category: 'Alimentação', description: 'Compras do mês - Fornecedor Nutrir', amount: 5800, date: '2026-06-01', status: 'pago' },
  { id: 'f23', type: 'despesa', category: 'Manutenção', description: 'Manutenção preventiva ar-condicionado', amount: 1200, date: '2026-06-15', status: 'pago' },
  { id: 'f24', type: 'despesa', category: 'Energia', description: 'Conta de energia elétrica', amount: 2400, date: '2026-06-12', status: 'pago' },
  { id: 'f25', type: 'despesa', category: 'Insumos', description: 'Fraldas geriátricas e materiais de higiene', amount: 1900, date: '2026-06-10', status: 'pago' },
];

// ─── Contracts ────────────────────────────────────────────────────────────────

export const DEMO_PROD_CONTRACTS: Contract[] = [
  { id: 'c1',  residentId: 'r1',  residentName: 'Maria das Graças Santos',    startDate: '2022-01-15', monthlyValue: 5500, dueDay: 5,  status: 'Ativo' },
  { id: 'c2',  residentId: 'r2',  residentName: 'José Antônio Oliveira',       startDate: '2021-06-10', monthlyValue: 4200, dueDay: 5,  status: 'Ativo' },
  { id: 'c3',  residentId: 'r3',  residentName: 'Ana Maria Lima',              startDate: '2023-03-20', monthlyValue: 3800, dueDay: 5,  status: 'Ativo' },
  { id: 'c4',  residentId: 'r4',  residentName: 'Pedro Henrique Costa',        startDate: '2020-09-01', monthlyValue: 6200, dueDay: 5,  status: 'Ativo' },
  { id: 'c5',  residentId: 'r5',  residentName: 'Rosa Maria Ferreira',         startDate: '2024-01-08', monthlyValue: 4000, dueDay: 10, status: 'Ativo' },
  { id: 'c6',  residentId: 'r6',  residentName: 'Antônio Carlos Ribeiro',      startDate: '2022-07-22', monthlyValue: 4500, dueDay: 5,  status: 'Ativo' },
  { id: 'c7',  residentId: 'r7',  residentName: 'Helena Regina Martins',       startDate: '2023-05-30', monthlyValue: 4800, dueDay: 10, status: 'Ativo' },
  { id: 'c8',  residentId: 'r8',  residentName: 'Sebastião Dias Neto',         startDate: '2021-02-11', monthlyValue: 7100, dueDay: 5,  status: 'Ativo' },
  { id: 'c9',  residentId: 'r9',  residentName: 'Conceição Aparecida Souza',   startDate: '2024-04-18', monthlyValue: 3600, dueDay: 5,  status: 'Ativo' },
  { id: 'c10', residentId: 'r10', residentName: 'Manoel Alves Pereira',        startDate: '2022-11-05', monthlyValue: 4300, dueDay: 5,  status: 'Ativo' },
  { id: 'c11', residentId: 'r11', residentName: 'Lúcia de Fátima Pereira',     startDate: '2020-12-01', monthlyValue: 6500, dueDay: 5,  status: 'Ativo' },
  { id: 'c12', residentId: 'r12', residentName: 'Geraldo Nunes da Silva',      startDate: '2023-08-14', monthlyValue: 3400, dueDay: 5,  status: 'Ativo' },
];

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const DEMO_PROD_INVOICES: Invoice[] = [
  { id: 'inv1',  contractId: 'c1',  residentName: 'Maria das Graças Santos',    amount: 5500, dueDate: '2026-06-05', status: 'Pago',     monthYear: '06/2026', paidDate: '2026-06-04' },
  { id: 'inv2',  contractId: 'c2',  residentName: 'José Antônio Oliveira',       amount: 4200, dueDate: '2026-06-05', status: 'Pago',     monthYear: '06/2026', paidDate: '2026-06-03' },
  { id: 'inv3',  contractId: 'c3',  residentName: 'Ana Maria Lima',              amount: 3800, dueDate: '2026-06-05', status: 'Pago',     monthYear: '06/2026', paidDate: '2026-06-05' },
  { id: 'inv4',  contractId: 'c4',  residentName: 'Pedro Henrique Costa',        amount: 6200, dueDate: '2026-06-05', status: 'Pago',     monthYear: '06/2026', paidDate: '2026-06-04' },
  { id: 'inv5',  contractId: 'c5',  residentName: 'Rosa Maria Ferreira',         amount: 4000, dueDate: '2026-06-10', status: 'Atrasado', monthYear: '06/2026' },
  { id: 'inv6',  contractId: 'c6',  residentName: 'Antônio Carlos Ribeiro',      amount: 4500, dueDate: '2026-06-05', status: 'Pago',     monthYear: '06/2026', paidDate: '2026-06-02' },
  { id: 'inv7',  contractId: 'c7',  residentName: 'Helena Regina Martins',       amount: 4800, dueDate: '2026-06-10', status: 'Pendente', monthYear: '06/2026' },
  { id: 'inv8',  contractId: 'c8',  residentName: 'Sebastião Dias Neto',         amount: 7100, dueDate: '2026-06-05', status: 'Atrasado', monthYear: '06/2026' },
  { id: 'inv9',  contractId: 'c9',  residentName: 'Conceição Aparecida Souza',   amount: 3600, dueDate: '2026-06-05', status: 'Pago',     monthYear: '06/2026', paidDate: '2026-06-05' },
  { id: 'inv10', contractId: 'c10', residentName: 'Manoel Alves Pereira',        amount: 4300, dueDate: '2026-06-05', status: 'Pago',     monthYear: '06/2026', paidDate: '2026-06-06' },
  { id: 'inv11', contractId: 'c11', residentName: 'Lúcia de Fátima Pereira',     amount: 6500, dueDate: '2026-06-05', status: 'Pago',     monthYear: '06/2026', paidDate: '2026-06-04' },
  { id: 'inv12', contractId: 'c12', residentName: 'Geraldo Nunes da Silva',      amount: 3400, dueDate: '2026-06-05', status: 'Pago',     monthYear: '06/2026', paidDate: '2026-06-05' },
];

// ─── Stock ────────────────────────────────────────────────────────────────────

export const DEMO_PROD_STOCK: StockItem[] = [
  // Medicamentos (alguns abaixo do mínimo)
  { id: 's1',  name: 'Donepezila 10mg',          category: 'medicamento', quantity: 18,  unit: 'comprimidos', minThreshold: 30 },
  { id: 's2',  name: 'Losartana 50mg',             category: 'medicamento', quantity: 120, unit: 'comprimidos', minThreshold: 60 },
  { id: 's3',  name: 'Metformina 500mg',           category: 'medicamento', quantity: 200, unit: 'comprimidos', minThreshold: 90 },
  { id: 's4',  name: 'Quetiapina 25mg',            category: 'medicamento', quantity: 22,  unit: 'comprimidos', minThreshold: 30 },
  { id: 's5',  name: 'Levodopa 100mg',             category: 'medicamento', quantity: 90,  unit: 'comprimidos', minThreshold: 60 },
  { id: 's6',  name: 'Digoxina 0,25mg',            category: 'medicamento', quantity: 45,  unit: 'comprimidos', minThreshold: 30 },
  { id: 's7',  name: 'Warfarina 5mg',              category: 'medicamento', quantity: 60,  unit: 'comprimidos', minThreshold: 30 },
  { id: 's8',  name: 'Insulina NPH 100UI/mL',      category: 'medicamento', quantity: 4,   unit: 'frascos',     minThreshold: 10, expirationDate: '2026-09-30' },
  // Insumos (alguns críticos)
  { id: 's9',  name: 'Fraldas Geriátricas G',      category: 'insumo',      quantity: 40,  unit: 'unidades',    minThreshold: 60 },
  { id: 's10', name: 'Álcool Gel 70%',             category: 'insumo',      quantity: 8,   unit: 'litros',      minThreshold: 15 },
  { id: 's11', name: 'Luvas Descartáveis M',        category: 'insumo',      quantity: 200, unit: 'pares',       minThreshold: 100 },
  { id: 's12', name: 'Curativo Estéril',            category: 'insumo',      quantity: 85,  unit: 'unidades',    minThreshold: 50 },
  { id: 's13', name: 'Sonda Nasoenteral FR 12',     category: 'insumo',      quantity: 3,   unit: 'unidades',    minThreshold: 10 },
  { id: 's14', name: 'Nutrição Enteral Isosource',  category: 'alimento',    quantity: 12,  unit: 'latas',       minThreshold: 24 },
  { id: 's15', name: 'Espessante Alimentar',        category: 'insumo',      quantity: 5,   unit: 'kg',          minThreshold: 10 },
];

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const DEMO_PROD_EVENTS: CalendarEvent[] = [
  { id: 'ev1',  title: 'Consulta Cardiologia — Helena Martins',  start: future(0, 9),  type: 'medico',    residentId: 'r7',  location: 'Consultório 1', createdBy: 'Ricardo' },
  { id: 'ev2',  title: 'Consulta Neurologia — Pedro Costa',      start: future(0, 10), type: 'medico',    residentId: 'r4',  location: 'Consultório 2', createdBy: 'Ricardo' },
  { id: 'ev3',  title: 'Fisioterapia — Rosa Ferreira',           start: future(0, 14), type: 'terapia',   residentId: 'r5',  location: 'Sala de Fisio', createdBy: 'Ricardo' },
  { id: 'ev4',  title: 'Visita familiar — José Oliveira',        start: future(0, 15), type: 'visita',    residentId: 'r2',  createdBy: 'Ricardo' },
  { id: 'ev5',  title: 'Musicoterapia em grupo',                 start: future(0, 16), type: 'atividade', createdBy: 'Ricardo' },
  { id: 'ev6',  title: 'Consulta Geriatria — Maria Santos',      start: future(1, 9),  type: 'medico',    residentId: 'r1',  location: 'Consultório 1', createdBy: 'Ricardo' },
  { id: 'ev7',  title: 'Fisioterapia — Antônio Ribeiro',         start: future(1, 10), type: 'terapia',   residentId: 'r6',  location: 'Sala de Fisio', createdBy: 'Ricardo' },
  { id: 'ev8',  title: 'Reunião de equipe multiprofissional',    start: future(2, 8),  type: 'reuniao',   location: 'Sala de Reuniões', createdBy: 'Ricardo' },
  { id: 'ev9',  title: 'Visita familiar — Ana Lima',             start: future(2, 14), type: 'visita',    residentId: 'r3',  createdBy: 'Ricardo' },
  { id: 'ev10', title: 'Oficina de Artesanato',                  start: future(2, 15), type: 'atividade', createdBy: 'Ricardo' },
  { id: 'ev11', title: 'Avaliação Nutricional — r.8',            start: future(3, 9),  type: 'medico',    residentId: 'r8',  location: 'Consultório 2', createdBy: 'Ricardo' },
  { id: 'ev12', title: 'Sessão de Fisioterapia — Manoel Alves',  start: future(3, 10), type: 'terapia',   residentId: 'r10', location: 'Sala de Fisio', createdBy: 'Ricardo' },
  { id: 'ev13', title: 'Aniversário — Lúcia de Fátima Pereira',  start: future(5, 10), type: 'atividade', residentId: 'r11', createdBy: 'Ricardo' },
  { id: 'ev14', title: 'Consulta Oftalmologia — Manoel Alves',   start: future(7, 14), type: 'medico',    residentId: 'r10', location: 'Consultório 1', createdBy: 'Ricardo' },
  { id: 'ev15', title: 'Revisão de prontuários',                 start: future(8, 8),  type: 'reuniao',   location: 'Sala de Reuniões', createdBy: 'Ricardo' },
];

// ─── Trainings ────────────────────────────────────────────────────────────────

export const DEMO_PROD_TRAININGS: TrainingRecord[] = [
  {
    id: 'tr1', title: 'Prevenção de Lesões por Pressão', date: '2026-05-10',
    instructor: 'Dra. Carla Mendes', validUntil: '2027-05-10',
    participants: ['Juliana Alves Costa', 'Fernanda Lima', 'Marcos Antônio Braga'],
    description: 'Treinamento sobre identificação, estadiamento e prevenção de LPP conforme protocolo NPUAP/EPUAP.',
  },
  {
    id: 'tr2', title: 'Manejo de Pacientes com Demência', date: '2026-04-15',
    instructor: 'Paulo Henrique Souza', validUntil: '2027-04-15',
    participants: ['Juliana Alves Costa', 'Fernanda Lima', 'Marcos Antônio Braga'],
    description: 'Abordagem não farmacológica, comunicação terapêutica e gestão de comportamentos.',
  },
  {
    id: 'tr3', title: 'ANVISA RDC 502/2021 — Conformidade', date: '2026-03-20',
    instructor: 'Consultora Especialista', validUntil: '2027-03-20',
    participants: ['Dra. Carla Mendes', 'Paulo Henrique Souza', 'Patrícia Gomes Lima', 'Rodrigo Farias'],
    description: 'Atualização sobre os requisitos da RDC 502 e adequação dos processos internos.',
  },
  {
    id: 'tr4', title: 'Suporte Básico de Vida (SBV)', date: '2026-02-08',
    instructor: 'Instrutor CFR', validUntil: '2027-02-08',
    participants: ['Juliana Alves Costa', 'Fernanda Lima', 'Paulo Henrique Souza'],
    description: 'Reanimação cardiopulmonar, uso de DEA e manejo de emergências básicas.',
  },
];

// ─── Access Logs ──────────────────────────────────────────────────────────────

export const DEMO_PROD_ACCESS_LOGS: SystemAccessLog[] = [
  { id: 'al1',  timestamp: isoNow(8, 2),  userId: 'e1', userName: 'Dra. Carla Mendes',     role: 'Médico',        action: 'Login',                  ipAddress: '192.168.1.10' },
  { id: 'al2',  timestamp: isoNow(8, 5),  userId: 'e2', userName: 'Paulo Henrique Souza',  role: 'Enfermeiro',    action: 'Login',                  ipAddress: '192.168.1.11' },
  { id: 'al3',  timestamp: isoNow(8, 10), userId: 'e1', userName: 'Dra. Carla Mendes',     role: 'Médico',        action: 'Visualização Prontuário', resource: 'Pedro Costa', ipAddress: '192.168.1.10' },
  { id: 'al4',  timestamp: isoNow(8, 15), userId: 'e2', userName: 'Paulo Henrique Souza',  role: 'Enfermeiro',    action: 'Visualização Prontuário', resource: 'Maria Santos', ipAddress: '192.168.1.11' },
  { id: 'al5',  timestamp: isoNow(9, 0),  userId: 'e3', userName: 'Juliana Alves Costa',   role: 'Cuidador',      action: 'Login',                  ipAddress: '192.168.1.12' },
  { id: 'al6',  timestamp: isoNow(12, 0), userId: 'e4', userName: 'Patrícia Gomes Lima',   role: 'Nutricionista', action: 'Login',                  ipAddress: '192.168.1.13' },
  { id: 'al7',  timestamp: isoNow(14, 0), userId: 'e1', userName: 'Dra. Carla Mendes',     role: 'Médico',        action: 'Edição Financeira',       resource: 'Prontuário r7', ipAddress: '192.168.1.10' },
];

// ─── Demo system settings (para popular o localStorage) ──────────────────────

export const DEMO_SYSTEM_SETTINGS = {
  institution: {
    name: 'Vila Serena',
    cnpj: '33.435.705/0001-90',
    phone: '(31) 3191-5909',
    email: 'contato@recantoanciaos.com.br',
    address: 'Rua das Acácias, 150',
    city: 'Belo Horizonte',
    state: 'MG',
    cep: '31520-530',
    capacity: 40,
    directorName: 'Ricardo Almeida',
    technicalDirector: 'Dra. Carla Mendes — CRM/MG 12345',
    anvisa: 'RDC/MG 2024-0042',
    watermarkImage: '',
  },
  notifications: {
    stockAlertThreshold: 5,
    medicationReminderEnabled: true,
    medicationReminderMinutes: 30,
    birthdayRemindersEnabled: true,
    contractDueDaysWarning: 30,
    checklistMissedAlerts: true,
    lowOccupancyThreshold: 20,
  },
  security: {
    sessionTimeoutMinutes: 60,
    requirePasswordChange: false,
    passwordChangeDays: 90,
    twoFactorEnabled: false,
    auditLogRetentionDays: 365,
    maxLoginAttempts: 5,
  },
};
