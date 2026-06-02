import React, { useState } from 'react';
import {
  ArrowLeft, Activity, Pill, FileText, Sparkles,
  Thermometer, Heart, CheckCircle, PenTool, ShieldCheck,
  ClipboardList, History, Plus, User, Clock, File, Paperclip, CalendarCheck, AlertOctagon,
  BedDouble, Home, Wrench, PaintRoller, Edit2, Printer
} from 'lucide-react';
import { Resident, CarePlan, AuditLog, DailyChecklist, Medication, RoomStatus } from '../types';
import { summarizePatientHealth } from '../services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ResidentProfileProps {
  resident: Resident;
  onBack: () => void;
  onUpdateResident?: (resident: Resident) => void;
}

const ResidentProfile: React.FC<ResidentProfileProps> = ({ resident, onBack, onUpdateResident }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'meds' | 'vitals' | 'care' | 'docs' | 'evolution' | 'history'>('vitals');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  // Care Plan Form
  const [newPlan, setNewPlan] = useState({ title: '', description: '', frequency: '', assignedTo: 'Enfermagem' });
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Daily Checklist State (Mock for today)
  const today = new Date().toISOString().split('T')[0];
  const todayChecklist = resident.dailyChecklists?.find(c => c.date === today) || {
    date: today,
    hygiene: false,
    oralCare: false,
    feeding: false,
    hydration: false,
    mobility: false,
    dressings: false,
    leisure: false
  };

  const [checklistDraft, setChecklistDraft] = useState<DailyChecklist | null>(null);

  const handleStartEditChecklist = () => {
    setChecklistDraft({ ...todayChecklist });
  };

  const handleSaveChecklist = () => {
    if (!onUpdateResident || !checklistDraft) return;
    
    const otherChecklists = resident.dailyChecklists?.filter(c => c.date !== today) || [];
    onUpdateResident({
      ...resident,
      dailyChecklists: [checklistDraft, ...otherChecklists]
    });
    setChecklistDraft(null);
  };

  const handleCancelEditChecklist = () => {
    setChecklistDraft(null);
  };

  const handlePrintFilledChecklist = () => {
    const c = todayChecklist;
    const dateFormatted = new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const careLevelLabel = resident.careLevel === 'I' ? 'Grau I – Baixa Dependência' :
      resident.careLevel === 'II' ? 'Grau II – Média Dependência' : 'Grau III – Alta Dependência';

    const val = (v: string | undefined | boolean, fallback = 'Não informado') =>
      v !== undefined && v !== '' && v !== false ? String(v) : fallback;

    const check = (condition: boolean) => condition ? '&#10003;' : '&#9633;';

    const rowHtml = (label: string, value: string, highlight = false) => `
      <tr>
        <td class="lbl">${label}</td>
        <td class="vl ${highlight ? 'hl' : ''}">${value}</td>
      </tr>`;

    const alimentacaoLabel = c.alimentacao === 'boa' ? 'Boa Aceitação' :
      c.alimentacao === 'moderada' ? 'Aceitação Moderada' :
      c.alimentacao === 'ruim' ? `Ruim${c.alimentacaoDesc ? ': ' + c.alimentacaoDesc : ''}` : 'Não informado';

    const evacuacaoLabel = c.eliminacaoEvacuacao === 'presente'
      ? `Presente${c.eliminacaoEvacuacaoDias ? ' (há ' + c.eliminacaoEvacuacaoDias + ' dias)' : ''}`
      : c.eliminacaoEvacuacao === 'ausente' ? `Ausente${c.eliminacaoEvacuacaoDias ? ' (há ' + c.eliminacaoEvacuacaoDias + ' dias)' : ''}` : 'Não informado';

    const aspectoFecalLabel = c.aspectoEvacuacoes === 'endurecidas' ? 'Fezes Endurecidas' :
      c.aspectoEvacuacoes === 'pastosa' ? 'Pastosa' :
      c.aspectoEvacuacoes === 'semi-liquidas' ? 'Semi-líquidas' :
      c.aspectoEvacuacoes === 'liquida-diarreia' ? 'Líquida / Diarreia' : 'Não informado';

    const diureseLabel = c.diurese === 'ausente' ? 'Ausente' :
      c.diurese === 'aumentada' ? 'Aumentada' :
      c.diurese === 'diminuida' ? 'Diminuída' : 'Adequada / Normal';

    const diureseAspectoLabel = c.diureseAspecto === 'clara' ? 'Urina Clara' :
      c.diureseAspecto === 'concentrada' ? 'Concentrada' :
      c.diureseAspecto === 'odor-sangue-ardencia' ? 'Com Odor, Sangue ou Ardência' : 'Não informado';

    const mobilidadeLabel = c.mobilidadeSet === 'independente' ? 'Independente' :
      c.mobilidadeSet === 'auxilio' ? 'Necessita de Auxílio' :
      c.mobilidadeSet === 'acamado' ? 'Acamado' : 'Não informado';

    const comportamento = [
      c.agitado && 'Agitado',
      c.prostrado && 'Prostrado',
      c.sonolento && 'Sonolento',
    ].filter(Boolean);
    const comportamentoLabel = comportamento.length > 0 ? comportamento.join(', ') : 'Calmo / Estável';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Boletim Diário – ${resident.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;padding:20px 28px;background:#fff}
    h1{font-size:17px;font-weight:700;text-align:center;letter-spacing:.5px;margin-bottom:2px}
    .subtitle{font-size:10px;text-align:center;color:#555;margin-bottom:14px}
    .header-box{border:1.5px solid #333;border-radius:6px;padding:10px 14px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 16px}
    .hf{display:flex;gap:4px;align-items:baseline}
    .hf .lb{font-weight:700;font-size:10px;white-space:nowrap}
    .hf .hv{font-size:11px;color:#111}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
    .section{page-break-inside:avoid}
    .section-title{background:#1e293b;color:#fff;font-size:10px;font-weight:700;padding:4px 8px;text-transform:uppercase;letter-spacing:.6px;border-radius:3px 3px 0 0}
    table{width:100%;border-collapse:collapse;border:1px solid #ccc;border-top:none;border-radius:0 0 3px 3px;overflow:hidden}
    tr:nth-child(even){background:#f8fafc}
    td{padding:4px 8px;vertical-align:middle;border-bottom:1px solid #e2e8f0}
    td.lbl{font-weight:600;font-size:10px;color:#475569;width:42%;white-space:nowrap}
    td.vl{font-size:11px;color:#0f172a}
    td.hl{font-weight:700;color:#be123c}
    td.ok{font-weight:700;color:#15803d}
    td.warn{font-weight:700;color:#b45309}
    .full-section{margin-bottom:10px;page-break-inside:avoid}
    .text-block{border:1px solid #ccc;border-top:none;padding:6px 8px;font-size:11px;min-height:32px;white-space:pre-wrap;background:#fafafa;color:#0f172a}
    .intercorrencia-block{background:#fff1f2;border:1px solid #fca5a5;border-top:none;padding:6px 8px;font-size:11px;font-weight:600;color:#991b1b;min-height:32px;white-space:pre-wrap}
    .footer{margin-top:18px;border-top:1.5px solid #333;padding-top:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
    .ff{display:flex;flex-direction:column;gap:3px}
    .ff .lb{font-weight:700;font-size:10px}
    .ff .ln{border-bottom:1px solid #555;min-height:20px}
    .sig{grid-column:1/3}
    .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700}
    .badge-ok{background:#dcfce7;color:#166534;border:1px solid #86efac}
    .badge-warn{background:#fef3c7;color:#92400e;border:1px solid #fcd34d}
    .badge-danger{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}
    .badge-neutral{background:#f1f5f9;color:#334155;border:1px solid #cbd5e1}
    .print-meta{font-size:9px;text-align:center;color:#94a3b8;margin-top:10px}
    @media print{body{padding:12px 16px}@page{margin:10mm 12mm;size:A4}}
  </style>
</head>
<body>
  <h1>RECANTO DOS ANCIÃOS</h1>
  <div class="subtitle">Boletim Diário de Acompanhamento — Prontuário Clínico e de Rotina</div>

  <div class="header-box">
    <div class="hf"><span class="lb">Residente:</span><span class="hv">${resident.name}</span></div>
    <div class="hf"><span class="lb">Quarto:</span><span class="hv">${resident.room}</span></div>
    <div class="hf"><span class="lb">Data:</span><span class="hv">${dateFormatted}</span></div>
    <div class="hf"><span class="lb">Nível de Cuidado:</span><span class="hv">${careLevelLabel}</span></div>
    <div class="hf"><span class="lb">Idade:</span><span class="hv">${resident.age} anos</span></div>
    <div class="hf"><span class="lb">Status:</span><span class="badge badge-ok">&#10003; Registrado no Prontuário</span></div>
  </div>

  <div class="two-col">
    <div class="section">
      <div class="section-title">1. Sintomas &amp; Estado Geral</div>
      <table>
        ${rowHtml('Queixa de Dor',
          c.queixaDor === 'sim'
            ? `<span class="badge badge-danger">Sim${c.queixaDorDesc ? ': ' + c.queixaDorDesc : ''}</span>`
            : '<span class="badge badge-ok">Não relatada</span>'
        )}
        ${rowHtml('Oxigenação',
          c.arAmbiente
            ? '<span class="badge badge-ok">Ar Ambiente (Respiração normal)</span>'
            : '<span class="badge badge-warn">Necessitando de O₂ Suplementar</span>'
        )}
        ${rowHtml('Estado Neurológico', `<span>${val(c.estadoNeurologico)}</span>`)}
        ${rowHtml('Comportamento',
          comportamento.length > 0
            ? `<span class="badge badge-warn">${comportamentoLabel}</span>`
            : '<span class="badge badge-ok">Calmo / Estável</span>'
        )}
      </table>
    </div>

    <div class="section">
      <div class="section-title">2. Alimentação &amp; Eliminações</div>
      <table>
        ${rowHtml('Alimentação',
          c.alimentacao === 'boa' ? '<span class="badge badge-ok">Boa Aceitação</span>' :
          c.alimentacao === 'moderada' ? '<span class="badge badge-warn">Aceitação Moderada</span>' :
          c.alimentacao === 'ruim' ? `<span class="badge badge-danger">${alimentacaoLabel}</span>` :
          '<span class="badge badge-neutral">Não informado</span>'
        )}
        ${rowHtml('Evacuação',
          c.eliminacaoEvacuacao === 'presente' ? `<span class="badge badge-ok">${evacuacaoLabel}</span>` :
          c.eliminacaoEvacuacao === 'ausente' ? `<span class="badge badge-danger">${evacuacaoLabel}</span>` :
          '<span class="badge badge-neutral">Não informado</span>'
        )}
        ${rowHtml('Aspecto Fecal',
          c.aspectoEvacuacoes === 'liquida-diarreia' ? `<span class="badge badge-danger">${aspectoFecalLabel}</span>` :
          `<span class="badge badge-neutral">${aspectoFecalLabel}</span>`
        )}
        ${rowHtml('Diurese', `<span class="badge badge-neutral">${diureseLabel}</span>`)}
        ${rowHtml('Aspecto Urinário',
          c.diureseAspecto === 'odor-sangue-ardencia' ? `<span class="badge badge-danger">${diureseAspectoLabel}</span>` :
          `<span class="badge badge-neutral">${diureseAspectoLabel}</span>`
        )}
      </table>
    </div>

    <div class="section">
      <div class="section-title">3. Cuidados &amp; Mobilidade</div>
      <table>
        ${rowHtml('Uso de Fraldas',
          `<span class="badge badge-neutral">${c.usoFraldas === 'sim' ? 'Sim, usa fraldas' : c.usoFraldas === 'nao' ? 'Não faz uso' : 'Não informado'}</span>`
        )}
        ${rowHtml('Mobilidade Geral', `<span class="badge badge-neutral">${mobilidadeLabel}</span>`)}
        ${rowHtml('Higiene / Banho',
          `<span class="badge badge-neutral">${c.higieneCorporal === 'independente' ? 'Independente' : c.higieneCorporal === 'auxilio' ? 'Com Auxílio' : 'Não informado'}</span>`
        )}
        ${rowHtml('Higiene Oral &amp; Vestir',
          `<span class="badge badge-neutral">${c.higieneOralVestir === 'independente' ? 'Independente' : c.higieneOralVestir === 'auxilio' ? 'Com Auxílio' : 'Não informado'}</span>`
        )}
      </table>
    </div>

    <div class="section">
      <div class="section-title">4. Diagnósticos, Sono &amp; Rotina</div>
      <table>
        ${rowHtml('Pele e Lesões',
          c.alteracoesPele === 'sim'
            ? `<span class="badge badge-danger">Com Alteração / Edema${c.alteracoesPeleDesc ? ': ' + c.alteracoesPeleDesc : ''}</span>`
            : '<span class="badge badge-ok">Pele íntegra / Sem Lesões</span>'
        )}
        ${rowHtml('Qualidade do Sono',
          c.sono === 'insatisfatorio'
            ? `<span class="badge badge-warn">Insatisfatório${c.sonoDesc ? ': ' + c.sonoDesc : ''}</span>`
            : c.sono === 'preservado' ? '<span class="badge badge-ok">Sono Preservado</span>'
            : '<span class="badge badge-neutral">Não informado</span>'
        )}
        ${rowHtml('Intercorrências',
          c.intercorrencia === 'sim'
            ? '<span class="badge badge-danger">&#9888; Houve Intercorrência</span>'
            : '<span class="badge badge-ok">Nenhuma registrada</span>'
        )}
      </table>
    </div>
  </div>

  <div class="full-section">
    <div class="section-title">Medicações Administradas no Plantão</div>
    <div class="text-block">${c.medicacoesAdministradas ? c.medicacoesAdministradas.replace(/</g,'&lt;').replace(/>/g,'&gt;') : 'Nenhuma registrada.'}</div>
  </div>

  <div class="full-section">
    <div class="section-title">Atividades &amp; Consultas Realizadas</div>
    <div class="text-block">${c.atividadesConsulta ? c.atividadesConsulta.replace(/</g,'&lt;').replace(/>/g,'&gt;') : 'Nenhuma registrada.'}</div>
  </div>

  ${c.intercorrencia === 'sim' && c.intercorrenciaDesc ? `
  <div class="full-section">
    <div class="section-title" style="background:#b91c1c">&#9888; Descrição da Intercorrência</div>
    <div class="intercorrencia-block">${c.intercorrenciaDesc.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  </div>` : ''}

  <div class="footer">
    <div class="ff">
      <span class="lb">Profissional Responsável</span>
      <div class="ln"></div>
    </div>
    <div class="ff">
      <span class="lb">Cargo / Função</span>
      <div class="ln"></div>
    </div>
    <div class="ff">
      <span class="lb">Horário de Preenchimento</span>
      <div class="ln"></div>
    </div>
    <div class="ff sig">
      <span class="lb">Assinatura</span>
      <div class="ln" style="min-height:30px"></div>
    </div>
    <div class="ff">
      <span class="lb">Carimbo</span>
      <div class="ln" style="min-height:30px"></div>
    </div>
  </div>

  <div class="print-meta">
    Documento de uso interno — Recanto dos Anciãos &nbsp;•&nbsp; Impresso em ${new Date().toLocaleString('pt-BR')}
  </div>

  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handlePrintBlankChecklist = () => {
    const dateFormatted = new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const careLevelLabel = resident.careLevel === 'I' ? 'Grau I – Baixa Dependência' :
      resident.careLevel === 'II' ? 'Grau II – Média Dependência' : 'Grau III – Alta Dependência';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Boletim Diário – ${resident.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;padding:20px 28px;background:#fff}
    h1{font-size:16px;font-weight:700;text-align:center;letter-spacing:.5px;margin-bottom:2px}
    .subtitle{font-size:10px;text-align:center;color:#555;margin-bottom:14px;letter-spacing:.3px}
    .header-box{border:1.5px solid #333;border-radius:6px;padding:10px 14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:6px 20px;align-items:flex-start}
    .header-box .field{display:flex;gap:4px;align-items:baseline}
    .header-box .label{font-weight:700;font-size:10px;white-space:nowrap}
    .header-box .value{font-size:11px;border-bottom:1px solid #555;min-width:160px;padding-bottom:1px}
    .section{margin-bottom:12px;page-break-inside:avoid}
    .section-title{background:#222;color:#fff;font-size:10px;font-weight:700;padding:4px 8px;text-transform:uppercase;letter-spacing:.6px;border-radius:3px 3px 0 0;margin-bottom:0}
    .section-body{border:1px solid #bbb;border-top:none;border-radius:0 0 3px 3px;padding:8px 10px;display:flex;flex-direction:column;gap:7px}
    .row{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
    .row-label{font-weight:700;font-size:10px;white-space:nowrap;min-width:130px}
    .opts{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .opt{display:flex;align-items:center;gap:3px;font-size:10px}
    .box{display:inline-block;width:11px;height:11px;border:1.2px solid #333;border-radius:2px;flex-shrink:0}
    .line{border-bottom:1px solid #888;flex:1;min-width:80px;margin-bottom:1px}
    .line-wide{border-bottom:1px solid #888;width:100%;margin-top:4px}
    .textarea-line{border:1px solid #bbb;border-radius:3px;min-height:36px;width:100%;margin-top:3px;padding:3px 5px;font-size:10px}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .footer{margin-top:18px;border-top:1.5px solid #333;padding-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
    .footer-field{display:flex;flex-direction:column;gap:3px}
    .footer-field .label{font-weight:700;font-size:10px}
    .footer-field .line{border-bottom:1px solid #555;height:18px}
    .alert{font-size:9px;color:#666;font-style:italic;margin-top:2px}
    @media print{body{padding:12px 16px}@page{margin:10mm 12mm;size:A4}}
  </style>
</head>
<body>
  <h1>RECANTO DOS ANCIÃOS</h1>
  <div class="subtitle">Boletim Diário de Acompanhamento — Prontuário Clínico e de Rotina</div>

  <div class="header-box">
    <div class="field"><span class="label">Residente:</span><span class="value">${resident.name}</span></div>
    <div class="field"><span class="label">Quarto:</span><span class="value">${resident.room}</span></div>
    <div class="field"><span class="label">Data:</span><span class="value">${dateFormatted}</span></div>
    <div class="field"><span class="label">Nível de Cuidado:</span><span class="value">${careLevelLabel}</span></div>
    <div class="field"><span class="label">Turno:</span>
      <span class="opts">
        <span class="opt"><span class="box"></span> Manhã</span>
        <span class="opt"><span class="box"></span> Tarde</span>
        <span class="opt"><span class="box"></span> Noite</span>
      </span>
    </div>
  </div>

  <div class="two-col">
    <!-- SECTION 1 -->
    <div class="section">
      <div class="section-title">1. Sintomas &amp; Estado Geral</div>
      <div class="section-body">
        <div class="row">
          <span class="row-label">Queixa de Dor:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Não</span>
            <span class="opt"><span class="box"></span> Sim</span>
          </span>
        </div>
        <div class="row"><span class="row-label">Descrição da Dor:</span><span class="line"></span></div>
        <div class="row">
          <span class="row-label">Oxigenação:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Ar ambiente</span>
            <span class="opt"><span class="box"></span> O₂ Suplementar</span>
          </span>
        </div>
        <div class="row"><span class="row-label">Estado Neurológico:</span><span class="line"></span></div>
        <div class="row">
          <span class="row-label">Comportamento:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Calmo</span>
            <span class="opt"><span class="box"></span> Agitado</span>
            <span class="opt"><span class="box"></span> Prostrado</span>
            <span class="opt"><span class="box"></span> Sonolento</span>
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 2 -->
    <div class="section">
      <div class="section-title">2. Alimentação &amp; Eliminações</div>
      <div class="section-body">
        <div class="row">
          <span class="row-label">Alimentação:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Boa</span>
            <span class="opt"><span class="box"></span> Moderada</span>
            <span class="opt"><span class="box"></span> Ruim</span>
          </span>
        </div>
        <div class="row"><span class="row-label">Obs. Alimentação:</span><span class="line"></span></div>
        <div class="row">
          <span class="row-label">Evacuação:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Presente</span>
            <span class="opt"><span class="box"></span> Ausente</span>
          </span>
          <span style="font-size:10px;white-space:nowrap">Dias s/ evacuação:</span><span class="line" style="min-width:30px;max-width:40px"></span>
        </div>
        <div class="row">
          <span class="row-label">Aspecto Fecal:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Endurecidas</span>
            <span class="opt"><span class="box"></span> Pastosa</span>
            <span class="opt"><span class="box"></span> Semi-líquidas</span>
            <span class="opt"><span class="box"></span> Diarreia</span>
          </span>
        </div>
        <div class="row">
          <span class="row-label">Diurese:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Ausente</span>
            <span class="opt"><span class="box"></span> Aumentada</span>
            <span class="opt"><span class="box"></span> Diminuída</span>
            <span class="opt"><span class="box"></span> Normal</span>
          </span>
        </div>
        <div class="row">
          <span class="row-label">Aspecto Urinário:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Clara</span>
            <span class="opt"><span class="box"></span> Concentrada</span>
            <span class="opt"><span class="box"></span> Odor/Sangue/Ardência</span>
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 3 -->
    <div class="section">
      <div class="section-title">3. Cuidados &amp; Mobilidade</div>
      <div class="section-body">
        <div class="row">
          <span class="row-label">Uso de Fraldas:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Sim</span>
            <span class="opt"><span class="box"></span> Não</span>
          </span>
        </div>
        <div class="row">
          <span class="row-label">Mobilidade Geral:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Independente</span>
            <span class="opt"><span class="box"></span> Necessita Auxílio</span>
            <span class="opt"><span class="box"></span> Acamado</span>
          </span>
        </div>
        <div class="row">
          <span class="row-label">Higiene / Banho:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Independente</span>
            <span class="opt"><span class="box"></span> Com Auxílio</span>
          </span>
        </div>
        <div class="row">
          <span class="row-label">Higiene Oral &amp; Vestir:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Independente</span>
            <span class="opt"><span class="box"></span> Com Auxílio</span>
          </span>
        </div>
      </div>
    </div>

    <!-- SECTION 4 -->
    <div class="section">
      <div class="section-title">4. Diagnósticos, Sono &amp; Rotina</div>
      <div class="section-body">
        <div class="row">
          <span class="row-label">Alterações de Pele:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Não / Íntegra</span>
            <span class="opt"><span class="box"></span> Sim (Lesão/Edema)</span>
          </span>
        </div>
        <div class="row"><span class="row-label">Descrição Pele:</span><span class="line"></span></div>
        <div class="row">
          <span class="row-label">Qualidade do Sono:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Preservado</span>
            <span class="opt"><span class="box"></span> Insatisfatório</span>
          </span>
        </div>
        <div class="row"><span class="row-label">Obs. Sono:</span><span class="line"></span></div>
        <div class="row">
          <span class="row-label">Intercorrências:</span>
          <span class="opts">
            <span class="opt"><span class="box"></span> Nenhuma</span>
            <span class="opt"><span class="box"></span> Sim (descrever abaixo)</span>
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Textos longos -->
  <div class="section" style="margin-top:8px">
    <div class="section-title">Medicações Administradas no Plantão</div>
    <div class="section-body">
      <div class="textarea-line"></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Atividades &amp; Consultas Realizadas</div>
    <div class="section-body">
      <div class="textarea-line"></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Descrição de Intercorrências</div>
    <div class="section-body">
      <div class="textarea-line" style="min-height:48px"></div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-field">
      <span class="label">Profissional Responsável</span>
      <div class="line"></div>
    </div>
    <div class="footer-field">
      <span class="label">Cargo / Função</span>
      <div class="line"></div>
    </div>
    <div class="footer-field">
      <span class="label">Horário de Preenchimento</span>
      <div class="line"></div>
    </div>
    <div class="footer-field" style="grid-column:1/3">
      <span class="label">Assinatura</span>
      <div class="line" style="height:32px"></div>
    </div>
    <div class="footer-field">
      <span class="label">Carimbo</span>
      <div class="line" style="height:32px"></div>
    </div>
  </div>
  <div class="alert" style="margin-top:10px;text-align:center">
    Documento de uso interno — Recanto dos Anciãos • Boletim gerado em ${new Date().toLocaleString('pt-BR')}
  </div>

  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
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
    if (!onUpdateResident) return;

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
    const updatedChecklist = { ...todayChecklist, [field]: !todayChecklist[field as keyof DailyChecklist] };
    const otherChecklists = resident.dailyChecklists?.filter(c => c.date !== today) || [];
    
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
      
      const updatedChecklist = { ...todayChecklist, [field]: value };
      const otherChecklists = resident.dailyChecklists?.filter(c => c.date !== today) || [];
      
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
    { id: 'care', label: 'Rotina & Plano', icon: ClipboardList },
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
          )}

          {activeTab === 'vitals' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex items-center text-slate-500 mb-2">
                    <Heart className="h-4 w-4 mr-2" /> Frequência Cardíaca
                  </div>
                  <p className="text-2xl font-bold text-slate-800">72 <span className="text-sm font-normal text-slate-500">bpm</span></p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <div className="flex items-center text-slate-500 mb-2">
                    <Activity className="h-4 w-4 mr-2" /> Pressão Arterial
                  </div>
                  <p className="text-2xl font-bold text-slate-800">120/80 <span className="text-sm font-normal text-slate-500">mmHg</span></p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <div className="flex items-center text-slate-500 mb-2">
                    <Thermometer className="h-4 w-4 mr-2" /> Temperatura
                  </div>
                  <p className="text-2xl font-bold text-slate-800">36.5 <span className="text-sm font-normal text-slate-500">°C</span></p>
                </div>
              </div>
              
              <div className="h-64 w-full mt-8">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Histórico de Pressão Sistólica (7 dias)</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={resident.vitals}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => v.split('T')[0].slice(5)} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={[100, 180]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Line type="monotone" dataKey="hr" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="BPM" />
                    <Line type="monotone" dataKey="spo2" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="SPO2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'meds' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-slate-800">Gestão de Medicamentos</h3>
                 <button className="flex items-center text-sm text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100">
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

          {activeTab === 'care' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Daily Checklist */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                {checklistDraft === null ? (
                  /* READ-ONLY & COMPLETED VIEW OR UNFILLED PLACEHOLDER */
                  !(
                    todayChecklist.queixaDor ||
                    todayChecklist.estadoNeurologico ||
                    todayChecklist.alimentacao ||
                    todayChecklist.eliminacaoEvacuacao ||
                    todayChecklist.diurese ||
                    todayChecklist.usoFraldas ||
                    todayChecklist.mobilidadeSet ||
                    todayChecklist.alteracoesPele ||
                    todayChecklist.sono ||
                    todayChecklist.medicacoesAdministradas ||
                    todayChecklist.atividadesConsulta ||
                    todayChecklist.intercorrencia
                  ) ? (
                    /* Unfilled Placeholder */
                    <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-slate-350 shadow-sm flex flex-col items-center">
                      <div className="p-4 bg-primary-50 rounded-full text-primary-600 mb-4 animate-bounce">
                        <CalendarCheck className="h-10 w-10" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">Rotina Diária Pendente</h3>
                      <p className="text-sm text-slate-500 max-w-sm mb-6">
                        O prontuário diário de hoje ainda não foi iniciado para este residente. Crie o boletim para registrar a evolução de rotina.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <button
                          onClick={handleStartEditChecklist}
                          className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Preencher Boletim Diário
                        </button>
                        <button
                          onClick={handlePrintBlankChecklist}
                          className="flex items-center px-5 py-3 bg-white text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                        >
                          <Printer className="h-4 w-4 mr-2 text-slate-500" />
                          Imprimir Formulário em Branco
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Completed Summary Card View */
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 flex items-center">
                            <CalendarCheck className="h-6 w-6 mr-2 text-primary-600" />
                            Boletim Diário de Acompanhamento
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Acompanhamento clínico e de rotina do residente para este dia de plantão.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full font-medium flex items-center shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                            Salvo no prontuário
                          </span>
                          <button
                            onClick={handlePrintFilledChecklist}
                            className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                            Imprimir Boletim
                          </button>
                          <button
                            onClick={handleStartEditChecklist}
                            className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1.5 text-primary-600" />
                            Editar Boletim
                          </button>
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
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Queixa de Dor:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${todayChecklist.queixaDor === 'sim' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                                {todayChecklist.queixaDor === 'sim' ? `Sim: ${todayChecklist.queixaDorDesc || 'Sem descrição'}` : 'Não relatada'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Oxigenação:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${todayChecklist.arAmbiente ? 'bg-sky-105 text-sky-800' : 'bg-slate-100 text-slate-700'}`}>
                                {todayChecklist.arAmbiente ? 'Ar Ambiente (Respiração normal)' : 'Necessitando de O2 Suplementar'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Estado Neurológico:</span>
                              <span className="font-semibold text-slate-700 text-xs shadow-none">
                                {todayChecklist.estadoNeurologico || 'Não informado'}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5 pt-1">
                              <span className="text-slate-505 font-medium text-xs">Comportamento de Observação:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {todayChecklist.agitado && <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-amber-200">Agitado</span>}
                                {todayChecklist.prostrado && <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-blue-200">Prostrado</span>}
                                {todayChecklist.sonolento && <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-slate-205">Sonolento</span>}
                                {!todayChecklist.agitado && !todayChecklist.prostrado && !todayChecklist.sonolento && (
                                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-200">Calmo / Estável</span>
                                )}
                              </div>
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
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Alimentação:</span>
                              <span className={`font-semibold px-2.5 py-0.5 rounded text-xs ${
                                todayChecklist.alimentacao === 'boa' ? 'bg-emerald-105 text-emerald-800' :
                                todayChecklist.alimentacao === 'moderada' ? 'bg-amber-100 text-amber-800' :
                                todayChecklist.alimentacao === 'ruim' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {todayChecklist.alimentacao === 'boa' ? 'Boa Aceitação' :
                                todayChecklist.alimentacao === 'moderada' ? 'Aceitação Moderada' :
                                todayChecklist.alimentacao === 'ruim' ? `Ruim: ${todayChecklist.alimentacaoDesc || ''}` : 'Não informado'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Bolo Fecal (Evacuação):</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${todayChecklist.eliminacaoEvacuacao === 'presente' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-850'}`}>
                                {todayChecklist.eliminacaoEvacuacao === 'presente' ? 'Presente' : 'Ausente'} 
                                {todayChecklist.eliminacaoEvacuacaoDias ? ` (Dias: ${todayChecklist.eliminacaoEvacuacaoDias})` : ''}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Aspecto Fecal:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${todayChecklist.aspectoEvacuacoes === 'liquida-diarreia' ? 'bg-rose-500 text-white font-bold' : 'bg-slate-105 text-slate-700'}`}>
                                {todayChecklist.aspectoEvacuacoes === 'endurecidas' ? 'Fezes Endurecidas' :
                                todayChecklist.aspectoEvacuacoes === 'pastosa' ? 'Pastosa' :
                                todayChecklist.aspectoEvacuacoes === 'semi-liquidas' ? 'Semi-líquidas' :
                                todayChecklist.aspectoEvacuacoes === 'liquida-diarreia' ? 'Líquida / Diarreia' : 'Não informado'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Diurese:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {todayChecklist.diurese === 'ausente' ? 'Ausente' : todayChecklist.diurese === 'aumentada' ? 'Aumentada' : todayChecklist.diurese === 'diminuida' ? 'Diminuída' : 'Adequada / Normal'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Aspecto Urinário:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${todayChecklist.diureseAspecto === 'odor-sangue-ardencia' ? 'bg-rose-100 text-rose-800 font-bold border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
                                {todayChecklist.diureseAspecto === 'clara' ? 'Urina Clara' :
                                todayChecklist.diureseAspecto === 'concentrada' ? 'Concentrada' :
                                todayChecklist.diureseAspecto === 'odor-sangue-ardencia' ? 'Com Odor, Sangue ou Ardência' : 'Não informado'}
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
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Uso de Fraldas:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {todayChecklist.usoFraldas === 'sim' ? 'Sim, usa fraldas' : 'Não faz uso'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Mobilidade Geral:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {todayChecklist.mobilidadeSet === 'independente' ? 'Independente' :
                                todayChecklist.mobilidadeSet === 'auxilio' ? 'Necessita de Auxílio' :
                                todayChecklist.mobilidadeSet === 'acamado' ? 'Acamado' : 'Não informado'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-500 font-medium text-xs sm:text-sm">Higiene / Banho:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {todayChecklist.higieneCorporal === 'independente' ? 'Independente' :
                                todayChecklist.higieneCorporal === 'auxilio' ? 'Com Auxílio' : 'Não informado'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Higiene Oral & Vestir:</span>
                              <span className="font-semibold text-xs text-slate-700">
                                {todayChecklist.higieneOralVestir === 'independente' ? 'Independente' :
                                todayChecklist.higieneOralVestir === 'auxilio' ? 'Com Auxílio' : 'Não informado'}
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
                                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${todayChecklist.alteracoesPele === 'sim' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-55 text-emerald-800'}`}>
                                  {todayChecklist.alteracoesPele === 'sim' ? 'Com Alteração / Edema' : 'Pele íntegra / Sem Lesões'}
                                </span>
                              </div>
                              {todayChecklist.alteracoesPele === 'sim' && todayChecklist.alteracoesPeleDesc && (
                                <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded mt-1 font-medium bg-rose-100/50">{todayChecklist.alteracoesPeleDesc}</p>
                              )}
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-slate-50 border-dotted">
                              <span className="text-slate-505 font-medium text-xs sm:text-sm">Qualidade do Sono:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${todayChecklist.sono === 'insatisfatorio' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-55 text-emerald-800'}`}>
                                {todayChecklist.sono === 'preservado' ? 'Sono Preservado' : todayChecklist.sono === 'insatisfatorio' ? `Insatisfatório: ${todayChecklist.sonoDesc || ''}` : 'Não informado'}
                              </span>
                            </div>

                            {todayChecklist.medicacoesAdministradas && (
                              <div className="flex flex-col gap-1 py-1 border-b border-slate-50 border-dotted">
                                <span className="text-slate-500 font-medium text-xs">Medicações Administradas:</span>
                                <p className="text-xs bg-slate-50 p-2 rounded text-slate-700 whitespace-pre-wrap">{todayChecklist.medicacoesAdministradas}</p>
                              </div>
                            )}

                            {todayChecklist.atividadesConsulta && (
                              <div className="flex flex-col gap-1 py-1 border-b border-slate-50 border-dotted">
                                <span className="text-slate-505 font-medium text-xs">Atividades & Consultas:</span>
                                <p className="text-xs bg-slate-50 p-2 rounded text-slate-800 whitespace-pre-wrap">{todayChecklist.atividadesConsulta}</p>
                              </div>
                            )}

                            <div className="flex flex-col gap-1 pt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-700 font-bold text-xs">Intercorrências no Plantão:</span>
                                <span className={`font-bold px-2.5 py-0.5 rounded text-xs border ${todayChecklist.intercorrencia === 'sim' ? 'bg-rose-500 text-white animate-pulse border-rose-600' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                                  {todayChecklist.intercorrencia === 'sim' ? 'Houve Intercorrência' : 'Nenhuma registrada'}
                                </span>
                              </div>
                              {todayChecklist.intercorrencia === 'sim' && todayChecklist.intercorrenciaDesc && (
                                <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded border border-rose-205 mt-1.5 font-medium whitespace-pre-wrap leading-relaxed animate-pulse">
                                  {todayChecklist.intercorrenciaDesc}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
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
                          Preenchimento de Boletim Diário
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Selecione o estado clínico observado e preencha as descrições. Clique em Salvar ao finalizar.
                        </p>
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
                          onClick={handleSaveChecklist}
                          className="flex items-center px-4 py-2 bg-primary-600 text-white border border-primary-700 rounded-xl text-xs font-semibold hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
                        >
                          Salvar Boletim
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

                      {/* SECTION 3: CUIDADOS BÁSICOS & MOBILIDADE */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                          3. Cuidados & Mobilidade
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Uso de Fraldas */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Fralda</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('usoFraldas', 'sim')}
                                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.usoFraldas === 'sim'
                                    ? 'bg-primary-50 border-primary-300 text-primary-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Usa Fraldas
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('usoFraldas', 'nao')}
                                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.usoFraldas === 'nao'
                                    ? 'bg-slate-100 border-slate-355 text-slate-700 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Não Usa
                              </button>
                            </div>
                          </div>

                          {/* Mobilidade */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Mobilidade</label>
                            <div className="grid grid-cols-3 gap-1.5 font-bold">
                              {[
                                { value: 'independente', label: 'Independente' },
                                { value: 'auxilio', label: 'Com auxílio' },
                                { value: 'acamado', label: 'Acamado' }
                              ].map((mob) => (
                                <button
                                  key={mob.value}
                                  type="button"
                                  onClick={() => handleChecklistFieldChange('mobilidadeSet', mob.value as any)}
                                  className={`py-1.5 px-2 rounded-lg border text-[11px] text-center transition-all ${
                                    checklistDraft.mobilidadeSet === mob.value
                                      ? 'bg-primary-50 border-primary-300 text-primary-800 font-bold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {mob.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {/* Higiene Corporal / Banho */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Higiene Corporal / Banho</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('higieneCorporal', 'independente')}
                                className={`flex-1 py-1 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.higieneCorporal === 'independente'
                                    ? 'bg-emerald-50 border-emerald-305 text-emerald-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Independente
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('higieneCorporal', 'auxilio')}
                                className={`flex-1 py-1 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.higieneCorporal === 'auxilio'
                                    ? 'bg-amber-50 border-amber-300 text-amber-850 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Com auxílio
                              </button>
                            </div>
                          </div>

                          {/* Higiene Oral / Vestir */}
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Higiene Oral / Vestir</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('higieneOralVestir', 'independente')}
                                className={`flex-1 py-1 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.higieneOralVestir === 'independente'
                                    ? 'bg-emerald-50 border-emerald-305 text-emerald-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Independente
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistFieldChange('higieneOralVestir', 'auxilio')}
                                className={`flex-1 py-1 px-3 rounded-lg border text-xs font-medium transition-all ${
                                  checklistDraft.higieneOralVestir === 'auxilio'
                                    ? 'bg-amber-50 border-amber-300 text-amber-850 font-bold'
                                    : 'bg-white border-slate-205 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                Com auxílio
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 4: PELE, SONO, MEDICAÇÃO & INTERCORRÊNCIAS */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider text-primary-700">
                          4. Dermatologia, Sono & Rotina de Cuidados
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
                        <div className="space-y-1.5 pt-2">
                          <label className="block text-xs font-bold text-slate-700">Medicações administradas e horários:</label>
                          <textarea
                            rows={2}
                            value={checklistDraft.medicacoesAdministradas || ''}
                            onChange={(e) => handleChecklistFieldChange('medicacoesAdministradas', e.target.value)}
                            placeholder="Descreva as medicações que foram de fato ofertadas neste plantão..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
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
                          onClick={handleSaveChecklist}
                          className="flex items-center px-6 py-2.5 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
                        >
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Salvar Boletim Clínico
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-6">
                <h3 className="text-lg font-semibold text-slate-800">Plano Individual de Cuidados</h3>
                <button 
                  onClick={() => setShowPlanForm(!showPlanForm)}
                  className="flex items-center px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" /> Novo Plano
                </button>
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
                       <select className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" value={newPlan.assignedTo} onChange={e => setNewPlan({...newPlan, assignedTo: e.target.value})}>
                         <option>Enfermagem</option>
                         <option>Fisioterapia</option>
                         <option>Nutrição</option>
                         <option>Médico</option>
                         <option>Cuidadores</option>
                       </select>
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
        </div>
      </div>
    </div>
  );
};

const BotIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
);

export default ResidentProfile;