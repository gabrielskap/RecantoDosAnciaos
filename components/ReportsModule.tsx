import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Resident, Employee, Invoice, FinancialRecord,
  Contract, StockItem, CalendarEvent,
} from '../types';
import {
  ClipboardCheck, Users, Pill, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, PieChart as PieIcon, FileBarChart,
  Download, Calendar, Package, DollarSign, Utensils,
  AlertTriangle, Archive,
} from 'lucide-react';
import { toast } from '../services/toast';
import { useAuth } from '../contexts/AuthContext';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportsModuleProps {
  residents: Resident[];
  employees: Employee[];
  invoices: Invoice[];
  financials?: FinancialRecord[];
  contracts?: Contract[];
  stockItems?: StockItem[];
  events?: CalendarEvent[];
}

type ModuleId = 'conformidade' | 'residentes' | 'financas' | 'nutricao' | 'estoque' | 'equipe' | 'agenda';

interface ModuleOption {
  id: ModuleId;
  label: string;
  icon: React.ElementType;
  hasDateRange: boolean;
  accent: string;
  accentBg: string;
  accentText: string;
}

const MODULES: ModuleOption[] = [
  { id: 'conformidade', label: 'Conformidade RDC', icon: ClipboardCheck, hasDateRange: false, accent: 'border-emerald-400', accentBg: 'bg-emerald-50', accentText: 'text-emerald-700' },
  { id: 'residentes',   label: 'Residentes',       icon: Users,          hasDateRange: false, accent: 'border-blue-400',    accentBg: 'bg-blue-50',    accentText: 'text-blue-700'    },
  { id: 'financas',     label: 'Financeiro',        icon: DollarSign,     hasDateRange: true,  accent: 'border-violet-400',  accentBg: 'bg-violet-50',  accentText: 'text-violet-700'  },
  { id: 'nutricao',     label: 'Nutrição',          icon: Utensils,       hasDateRange: true,  accent: 'border-orange-400',  accentBg: 'bg-orange-50',  accentText: 'text-orange-700'  },
  { id: 'estoque',      label: 'Estoque',           icon: Archive,        hasDateRange: false, accent: 'border-cyan-400',    accentBg: 'bg-cyan-50',    accentText: 'text-cyan-700'    },
  { id: 'equipe',       label: 'Equipe',            icon: Users,          hasDateRange: false, accent: 'border-indigo-400',  accentBg: 'bg-indigo-50',  accentText: 'text-indigo-700'  },
  { id: 'agenda',       label: 'Agenda',            icon: Calendar,       hasDateRange: true,  accent: 'border-rose-400',    accentBg: 'bg-rose-50',    accentText: 'text-rose-700'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (d?: string) => {
  if (!d) return '-';
  const parts = d.split('T')[0].split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const fmtDateTime = (d?: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const dateOf = (iso: string) => iso.split('T')[0];

// ─── PDF export ───────────────────────────────────────────────────────────────

const PDF_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 11px; padding: 20px 0; line-height: 1.4; background: #f1f5f9; display: flex; flex-direction: column; align-items: center; }
@media print {
  body { background: transparent; padding: 0; margin: 0; display: block; }
}
h1 { font-size: 18px; font-weight: bold; margin-bottom: 6px; text-align: center; color: #0f172a; }
h2 { font-size: 13px; font-weight: bold; margin: 20px 0 10px; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
.meta { font-size: 10px; color: #64748b; margin-bottom: 20px; text-align: center; }
table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; background: rgba(255, 255, 255, 0.85); table-layout: auto; border-left: none !important; border-right: none !important; }
th { background: rgba(248, 250, 252, 0.9); padding: 6px 8px; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; border-left: none !important; border-right: none !important; }
td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; border-left: none !important; border-right: none !important; }
tr:last-child td { border-bottom: none; }
.badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
.g { background:#d1fae5;color:#065f46 } .y { background:#fef3c7;color:#92400e }
.r { background:#fee2e2;color:#991b1b } .b { background:#dbeafe;color:#1d4ed8 }
.v { background:#ede9fe;color:#5b21b6 } .o { background:#ffedd5;color:#9a3412 }
.kpi-row { display:flex; gap:12px; margin-bottom:20px; }
.kpi { flex:1; background: rgba(248, 250, 252, 0.85); border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; page-break-inside: avoid; break-inside: avoid; }
.kpi-label { font-size:9px; color:#64748b; margin-bottom:4px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
.kpi-value { font-size:18px; font-weight:800; }
.empty { text-align:center; color:#94a3b8; padding:20px; }
.footer { margin-top:20px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; text-align: center; page-break-inside: avoid; break-inside: avoid; }

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
`;

const openPrintWindow = (title: string, body: string) => {
  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) { toast.warning('Permita popups para gerar o PDF.'); return; }

  let watermarkSrc = '';
  let hasLetterhead = false;
  try {
    const settingsKey = `recanto_system_settings_${currentUser?.empresaId ?? currentUser?.id ?? 'anon'}`;
    const raw = localStorage.getItem(settingsKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      const src = parsed?.institution?.watermarkImage;
      if (src) {
        hasLetterhead = true;
        watermarkSrc = src;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar papel timbrado:', e);
  }

  const now = new Date().toLocaleString('pt-BR');

  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      @page { size: A4; margin: 0; }
      ${PDF_STYLES}
    </style>
  </head><body>
    <div id="pdf-source" style="position: absolute; left: -9999px; top: 0; width: 170mm; box-sizing: border-box;">
      ${body}
      <div class="footer">Gerado em ${now} · Recanto dos Anciãos · Sistema de Gestão ILPI</div>
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

        function handleTable(table) {
          currentSafeContent.appendChild(table);
          if (currentSafeContent.scrollHeight <= maxHeight) {
            return;
          }
          currentSafeContent.removeChild(table);

          if (currentSafeContent.children.length > 0) {
            createPage();
            currentSafeContent.appendChild(table);
            if (currentSafeContent.scrollHeight <= maxHeight) {
              return;
            }
            currentSafeContent.removeChild(table);
          }

          const thead = table.querySelector('thead');
          const tbody = table.querySelector('tbody');
          const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

          let currentTable = document.createElement('table');
          currentTable.className = table.className;
          currentTable.style.cssText = table.style.cssText;
          if (thead) {
            currentTable.appendChild(thead.cloneNode(true));
          }
          let currentTbody = document.createElement('tbody');
          currentTable.appendChild(currentTbody);
          currentSafeContent.appendChild(currentTable);

          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            currentTbody.appendChild(row);
            
            if (currentSafeContent.scrollHeight > maxHeight) {
              currentTbody.removeChild(row);
              createPage();
              
              currentTable = document.createElement('table');
              currentTable.className = table.className;
              currentTable.style.cssText = table.style.cssText;
              if (thead) {
                currentTable.appendChild(thead.cloneNode(true));
              }
              currentTbody = document.createElement('tbody');
              currentTable.appendChild(currentTbody);
              currentSafeContent.appendChild(currentTable);
              
              currentTbody.appendChild(row);
            }
          }
        }

        createPage();

        const elements = Array.from(sourceContainer.children);
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (el.tagName === 'TABLE') {
            handleTable(el);
          } else {
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
        }

        sourceContainer.style.display = 'none';

        setTimeout(() => {
          window.print();
        }, 150);
      };
    </script>
  </body></html>`);
  win.document.close();
};

// ─── PDF builders per module ──────────────────────────────────────────────────

function buildConformidadePDF(residents: Resident[], employees: Employee[], rdcList: { item: string; status: boolean }[]) {
  const compliance = Math.round((rdcList.filter(i => i.status).length / rdcList.length) * 100);
  return `
    <h1>Conformidade RDC 502</h1>
    <div class="meta">Gerado em: ${fmtDate(new Date().toISOString())}</div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Conformidade</div><div class="kpi-value" style="color:${compliance>=80?'#059669':'#d97706'}">${compliance}%</div></div>
      <div class="kpi"><div class="kpi-label">Residentes</div><div class="kpi-value">${residents.length}</div></div>
      <div class="kpi"><div class="kpi-label">Colaboradores</div><div class="kpi-value">${employees.length}</div></div>
      <div class="kpi"><div class="kpi-label">Critérios Pendentes</div><div class="kpi-value" style="color:#e11d48">${rdcList.filter(i=>!i.status).length}</div></div>
    </div>
    <h2>Critérios de Auto-avaliação</h2>
    <table>
      <thead><tr><th>#</th><th>Critério</th><th>Status</th></tr></thead>
      <tbody>
        ${rdcList.map((i, idx) => `<tr>
          <td>${idx+1}</td><td>${i.item}</td>
          <td><span class="badge ${i.status?'g':'r'}">${i.status?'Atendido':'Pendente'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function buildResidentesPDF(residents: Resident[], startDate: string, endDate: string) {
  return `
    <h1>Relatório de Residentes</h1>
    <div class="meta">Data: ${fmtDate(new Date().toISOString())}</div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Total</div><div class="kpi-value">${residents.length}</div></div>
      <div class="kpi"><div class="kpi-label">Grau I</div><div class="kpi-value">${residents.filter(r=>r.careLevel==='I').length}</div></div>
      <div class="kpi"><div class="kpi-label">Grau II</div><div class="kpi-value">${residents.filter(r=>r.careLevel==='II').length}</div></div>
      <div class="kpi"><div class="kpi-label">Grau III</div><div class="kpi-value">${residents.filter(r=>r.careLevel==='III').length}</div></div>
    </div>
    <h2>Lista Completa</h2>
    <table>
      <thead><tr><th>Nome</th><th>Quarto</th><th>Grau</th><th>Idade</th><th>Admissão</th><th>Medicamentos</th><th>Alergias</th></tr></thead>
      <tbody>
        ${residents.length===0?`<tr><td colspan="7" class="empty">Nenhum residente cadastrado</td></tr>`:
          residents.map(r=>`<tr>
            <td>${r.name}</td><td>${r.room}</td>
            <td><span class="badge ${r.careLevel==='I'?'g':r.careLevel==='II'?'y':'r'}">Grau ${r.careLevel}</span></td>
            <td>${r.age} anos</td><td>${fmtDate(r.admissionDate)}</td>
            <td>${r.medications.length}</td><td>${r.allergies.join(', ')||'—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function buildFinancasPDF(financials: FinancialRecord[], invoices: Invoice[], startDate: string, endDate: string) {
  const period = financials.filter(f => f.date >= startDate && f.date <= endDate);
  const income = period.filter(f=>f.type==='receita').reduce((a,f)=>a+f.amount,0);
  const expense = period.filter(f=>f.type==='despesa').reduce((a,f)=>a+f.amount,0);
  const balance = income - expense;
  const overdue = invoices.filter(i=>i.status==='Atrasado').reduce((a,i)=>a+i.amount,0);
  return `
    <h1>Relatório Financeiro</h1>
    <div class="meta">Período: ${fmtDate(startDate)} a ${fmtDate(endDate)}</div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Receitas</div><div class="kpi-value" style="color:#059669">${fmtCurrency(income)}</div></div>
      <div class="kpi"><div class="kpi-label">Despesas</div><div class="kpi-value" style="color:#e11d48">${fmtCurrency(expense)}</div></div>
      <div class="kpi"><div class="kpi-label">Saldo</div><div class="kpi-value" style="color:${balance>=0?'#059669':'#e11d48'}">${fmtCurrency(balance)}</div></div>
      <div class="kpi"><div class="kpi-label">Inadimplência</div><div class="kpi-value" style="color:#d97706">${fmtCurrency(overdue)}</div></div>
    </div>
    <h2>Lançamentos do Período</h2>
    <table>
      <thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>
        ${period.length===0?`<tr><td colspan="6" class="empty">Nenhum registro no período</td></tr>`:
          period.map(f=>`<tr>
            <td>${fmtDate(f.date)}</td>
            <td><span class="badge ${f.type==='receita'?'g':'r'}">${f.type==='receita'?'Receita':'Despesa'}</span></td>
            <td>${f.category}</td><td>${f.description}</td>
            <td style="font-weight:600">${fmtCurrency(f.amount)}</td>
            <td><span class="badge ${f.status==='pago'?'g':'y'}">${f.status==='pago'?'Pago':'Pendente'}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function buildNutricaoPDF(residents: Resident[], startDate: string, endDate: string) {
  return `
    <h1>Relatório Nutricional</h1>
    <div class="meta">Período: ${fmtDate(startDate)} a ${fmtDate(endDate)}</div>
    <h2>Planos Alimentares dos Residentes</h2>
    <table>
      <thead><tr><th>Residente</th><th>Consistência</th><th>Tipo de Dieta</th><th>Restrição Hídrica</th><th>Aceitação Média (%)</th></tr></thead>
      <tbody>
        ${residents.length===0?`<tr><td colspan="5" class="empty">Nenhum residente</td></tr>`:
          residents.map(r => {
            const logs = (r.nutritionalLogs||[]).filter(l=>l.date>=startDate&&l.date<=endDate);
            const avg = logs.length ? Math.round(logs.reduce((a,l)=>a+l.acceptance,0)/logs.length) : null;
            return `<tr>
              <td>${r.name}</td>
              <td>${r.dietPlan?.consistency||'—'}</td>
              <td>${r.dietPlan?.type||'—'}</td>
              <td>${r.dietPlan?.fluidRestriction||'Sem restrição'}</td>
              <td>${avg!==null?`<span class="badge ${avg>=70?'g':avg>=40?'y':'r'}">${avg}%</span>`:'—'}</td>
            </tr>`;
          }).join('')}
      </tbody>
    </table>`;
}

function buildEstoquePDF(stockItems: StockItem[]) {
  const low = stockItems.filter(i=>i.quantity<=i.minThreshold);
  return `
    <h1>Relatório de Estoque</h1>
    <div class="meta">Gerado em: ${fmtDate(new Date().toISOString())}</div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Total de Itens</div><div class="kpi-value">${stockItems.length}</div></div>
      <div class="kpi"><div class="kpi-label">Estoque Baixo</div><div class="kpi-value" style="color:#e11d48">${low.length}</div></div>
      <div class="kpi"><div class="kpi-label">Medicamentos</div><div class="kpi-value">${stockItems.filter(i=>i.category==='medicamento').length}</div></div>
      <div class="kpi"><div class="kpi-label">Insumos</div><div class="kpi-value">${stockItems.filter(i=>i.category==='insumo').length}</div></div>
    </div>
    <h2>Inventário Completo</h2>
    <table>
      <thead><tr><th>Item</th><th>Categoria</th><th>Qtd.</th><th>Unidade</th><th>Mínimo</th><th>Status</th></tr></thead>
      <tbody>
        ${stockItems.length===0?`<tr><td colspan="6" class="empty">Nenhum item cadastrado</td></tr>`:
          stockItems.map(i=>`<tr>
            <td>${i.name}</td>
            <td><span class="badge b">${i.category}</span></td>
            <td style="font-weight:600">${i.quantity}</td>
            <td>${i.unit}</td>
            <td>${i.minThreshold}</td>
            <td><span class="badge ${i.quantity>i.minThreshold?'g':i.quantity>0?'y':'r'}">${i.quantity>i.minThreshold?'OK':i.quantity>0?'Baixo':'Esgotado'}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function buildEquipePDF(employees: Employee[]) {
  return `
    <h1>Relatório de Equipe</h1>
    <div class="meta">Gerado em: ${fmtDate(new Date().toISOString())}</div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Total</div><div class="kpi-value">${employees.length}</div></div>
      <div class="kpi"><div class="kpi-label">Ativos</div><div class="kpi-value" style="color:#059669">${employees.filter(e=>e.status==='Ativo').length}</div></div>
      <div class="kpi"><div class="kpi-label">Resp. Técnico</div><div class="kpi-value">${employees.filter(e=>e.isTechnicalLead).length}</div></div>
    </div>
    <h2>Quadro de Colaboradores</h2>
    <table>
      <thead><tr><th>Nome</th><th>Função</th><th>Turno</th><th>Status</th><th>Admissão</th></tr></thead>
      <tbody>
        ${employees.length===0?`<tr><td colspan="5" class="empty">Nenhum colaborador cadastrado</td></tr>`:
          employees.map(e=>`<tr>
            <td>${e.name}${e.isTechnicalLead?' <span class="badge v">RT</span>':''}</td>
            <td>${e.role}</td><td>${e.shift}</td>
            <td><span class="badge ${e.status==='Ativo'?'g':e.status==='Férias'?'y':'r'}">${e.status}</span></td>
            <td>${fmtDate(e.admissionDate)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function buildAgendaPDF(events: CalendarEvent[], startDate: string, endDate: string) {
  const period = events.filter(e => dateOf(e.start) >= startDate && dateOf(e.start) <= endDate);
  const typeLabel: Record<string, string> = { medico:'Médico', visita:'Visita', terapia:'Terapia', atividade:'Atividade', reuniao:'Reunião', outro:'Outro' };
  return `
    <h1>Relatório de Agenda</h1>
    <div class="meta">Período: ${fmtDate(startDate)} a ${fmtDate(endDate)}</div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Total de Eventos</div><div class="kpi-value">${period.length}</div></div>
      <div class="kpi"><div class="kpi-label">Consultas Médicas</div><div class="kpi-value">${period.filter(e=>e.type==='medico').length}</div></div>
      <div class="kpi"><div class="kpi-label">Visitas</div><div class="kpi-value">${period.filter(e=>e.type==='visita').length}</div></div>
      <div class="kpi"><div class="kpi-label">Atividades</div><div class="kpi-value">${period.filter(e=>e.type==='atividade').length}</div></div>
    </div>
    <h2>Eventos do Período</h2>
    <table>
      <thead><tr><th>Data/Hora</th><th>Título</th><th>Tipo</th><th>Local</th><th>Criado por</th></tr></thead>
      <tbody>
        ${period.length===0?`<tr><td colspan="5" class="empty">Nenhum evento no período</td></tr>`:
          period.sort((a,b)=>a.start.localeCompare(b.start)).map(e=>`<tr>
            <td>${fmtDateTime(e.start)}</td>
            <td>${e.title}</td>
            <td><span class="badge b">${typeLabel[e.type]||e.type}</span></td>
            <td>${e.location||'—'}</td>
            <td>${e.createdBy}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ReportsModule: React.FC<ReportsModuleProps> = ({
  residents, employees, invoices,
  financials = [], contracts = [], stockItems = [], events = [],
}) => {
  const { currentUser } = useAuth();
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [selectedModule, setSelectedModule] = useState<ModuleId>('conformidade');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const mod = MODULES.find(m => m.id === selectedModule)!;

  const PIE_COLORS = ['#10b981', '#f59e0b', '#f43f5e'];

  const dependencyData = [
    { name: 'Grau I',   value: residents.filter(r => r.careLevel === 'I').length },
    { name: 'Grau II',  value: residents.filter(r => r.careLevel === 'II').length },
    { name: 'Grau III', value: residents.filter(r => r.careLevel === 'III').length },
  ];

  const rdcChecklist = [
    { item: 'Responsável Técnico (RT) vigente',      status: employees.some(e => e.isTechnicalLead && e.status === 'Ativo') },
    { item: 'Proporção Cuidador/Idoso (Diurno)',     status: true  },
    { item: 'Proporção Cuidador/Idoso (Noturno)',    status: true  },
    { item: 'Plano de Atenção Integral à Saúde',     status: residents.every(r => r.carePlan && r.carePlan.length > 0) },
    { item: 'Registro de Intercorrências Diárias',   status: true  },
    { item: 'Licença Sanitária Atualizada',          status: false },
  ];

  const medData = useMemo(() => {
    const counts: Record<string, number> = {};
    residents.forEach(r => r.medications.forEach(m => { counts[m.name] = (counts[m.name] || 0) + 1; }));
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({ name, count }));
  }, [residents]);

  const filteredFinancials = useMemo(() =>
    financials.filter(f => f.date >= startDate && f.date <= endDate),
    [financials, startDate, endDate],
  );

  const filteredEvents = useMemo(() =>
    events.filter(e => dateOf(e.start) >= startDate && dateOf(e.start) <= endDate),
    [events, startDate, endDate],
  );

  const compliance = Math.round((rdcChecklist.filter(i => i.status).length / rdcChecklist.length) * 100);
  const totalResidents = residents.length || 1;

  const polypharmacyCount = residents.filter(r => (r.medications || []).length > 5).length;
  const polypharmacyPct = residents.length > 0 ? Math.round((polypharmacyCount / residents.length) * 100) : 0;

  const income = filteredFinancials.filter(f=>f.type==='receita').reduce((a,f)=>a+f.amount,0);
  const expense = filteredFinancials.filter(f=>f.type==='despesa').reduce((a,f)=>a+f.amount,0);
  const lowStock = stockItems.filter(i=>i.quantity<=i.minThreshold);

  const EVENT_TYPE_LABELS: Record<string, string> = { medico:'Médico', visita:'Visita', terapia:'Terapia', atividade:'Atividade', reuniao:'Reunião', outro:'Outro' };

  const handleExportPDF = () => {
    let body = '';
    switch (selectedModule) {
      case 'conformidade': body = buildConformidadePDF(residents, employees, rdcChecklist); break;
      case 'residentes':   body = buildResidentesPDF(residents, startDate, endDate); break;
      case 'financas':     body = buildFinancasPDF(financials, invoices, startDate, endDate); break;
      case 'nutricao':     body = buildNutricaoPDF(residents, startDate, endDate); break;
      case 'estoque':      body = buildEstoquePDF(stockItems); break;
      case 'equipe':       body = buildEquipePDF(employees); break;
      case 'agenda':       body = buildAgendaPDF(events, startDate, endDate); break;
    }
    openPrintWindow(`Relatório — ${mod.label}`, body);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatórios e Indicadores</h1>
          <p className="text-slate-500 text-sm mt-0.5">Selecione o módulo e o período para gerar o relatório</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
          <FileBarChart className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      {/* Module selector + date range + PDF button */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        {/* Module tabs */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Módulo</p>
          <div className="flex flex-wrap gap-2">
            {MODULES.map(m => {
              const Icon = m.icon;
              const active = selectedModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModule(m.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    active
                      ? `${m.accent} ${m.accentBg} ${m.accentText}`
                      : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date range + PDF */}
        <div className="flex flex-wrap items-end gap-4">
          {mod.hasDateRange && (
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"
                />
              </div>
            </div>
          )}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors ml-auto shadow-sm"
          >
            <Download className="h-4 w-4" />
            Gerar PDF
          </button>
        </div>

        {mod.hasDateRange && (
          <p className="text-xs text-slate-400">
            Exibindo dados de <span className="font-semibold text-slate-600">{fmtDate(startDate)}</span> a{' '}
            <span className="font-semibold text-slate-600">{fmtDate(endDate)}</span>
          </p>
        )}
      </div>

      {/* ── CONFORMIDADE ── */}
      {selectedModule === 'conformidade' && (
        <div className="space-y-5">
          <div className={`rounded-2xl p-4 flex items-center gap-4 ${compliance >= 80 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${compliance >= 80 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <ClipboardCheck className={`h-6 w-6 ${compliance >= 80 ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div className="flex-1">
              <p className={`font-bold text-sm ${compliance >= 80 ? 'text-emerald-800' : 'text-amber-800'}`}>
                Conformidade RDC 502: {compliance}%
              </p>
              <p className={`text-xs mt-0.5 ${compliance >= 80 ? 'text-emerald-600' : 'text-amber-700'}`}>
                {rdcChecklist.filter(i => !i.status).length === 0
                  ? 'Todos os critérios atendidos.'
                  : `${rdcChecklist.filter(i => !i.status).length} critério(s) pendente(s)`}
              </p>
            </div>
            <span className={`text-2xl font-bold ${compliance >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{compliance}%</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Residentes', value: String(residents.length), sub: `Idade média: ${residents.length ? Math.round(residents.reduce((a, r) => a + r.age, 0) / residents.length) : '—'} anos`, icon: Users, bg:'bg-blue-50', color:'text-blue-600' },
              { label: 'Medicados',        value: String(residents.filter(r => (r.medications || []).length > 0).length), sub: 'Com prescrição ativa', icon: Pill, bg:'bg-amber-50', color:'text-amber-600' },
              { label: 'Polifarmácia',     value: `${polypharmacyPct}%`, sub: `${polypharmacyCount} residente(s) com >5 medicamentos`, icon: AlertTriangle, bg:'bg-rose-50', color:'text-rose-600' },
              { label: 'Alta Complexidade',value: String(residents.filter(r => r.careLevel === 'III').length), sub: 'Residentes Grau III', icon: TrendingUp, bg:'bg-emerald-50', color:'text-emerald-600'},
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                  <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
                <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <PieIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Perfil por Grau de Dependência</h3>
                  <p className="text-xs text-slate-400">{residents.length} residentes</p>
                </div>
              </div>
              <div className="flex items-center gap-6 h-48">
                <div style={{ width: '60%', height: 192, minWidth: 0, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height={192} minWidth={0}>
                  <PieChart>
                    <Pie data={dependencyData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                      {dependencyData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                </div>
                <div className="space-y-3 flex-1">
                  {dependencyData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                        <span className="text-xs text-slate-600 font-medium">{entry.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Pill className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Medicamentos Mais Utilizados</h3>
                  <p className="text-xs text-slate-400">Prescrições ativas</p>
                </div>
              </div>
              <div className="h-48">
                {medData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados de medicamentos</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={medData} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f8f7ff' }} />
                      <Bar dataKey="count" fill="#1d4ed8" radius={[0,6,6,0]} barSize={18} label={{ position:'right', fill:'#94a3b8', fontSize:11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Critérios RDC 502 · Auto-avaliação</h3>
                <p className="text-xs text-slate-400">{rdcChecklist.filter(i => i.status).length} de {rdcChecklist.length} critérios atendidos</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rdcChecklist.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3.5 rounded-xl border ${item.status ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <span className={`text-sm font-medium ${item.status ? 'text-emerald-800' : 'text-rose-800'}`}>{item.item}</span>
                  {item.status
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 ml-2" />
                    : <XCircle className="h-5 w-5 text-rose-500 shrink-0 ml-2" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RESIDENTES ── */}
      {selectedModule === 'residentes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: residents.length, color: 'text-slate-800' },
              { label: 'Grau I',   value: residents.filter(r=>r.careLevel==='I').length,   color: 'text-emerald-600' },
              { label: 'Grau II',  value: residents.filter(r=>r.careLevel==='II').length,  color: 'text-amber-600'   },
              { label: 'Grau III', value: residents.filter(r=>r.careLevel==='III').length, color: 'text-rose-600'    },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Lista de Residentes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {['Nome','Quarto','Grau','Idade','Admissão','Medicamentos'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {residents.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Nenhum residente cadastrado</td></tr>
                  ) : residents.map(r => (
                    <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.room}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          r.careLevel==='I' ? 'bg-emerald-100 text-emerald-700' :
                          r.careLevel==='II'? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>Grau {r.careLevel}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.age} anos</td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(r.admissionDate)}</td>
                      <td className="px-4 py-3 text-slate-600">{r.medications.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCEIRO ── */}
      {selectedModule === 'financas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Receitas',      value: fmtCurrency(income),          color: 'text-emerald-600', icon: TrendingUp   },
              { label: 'Despesas',      value: fmtCurrency(expense),         color: 'text-rose-600',    icon: TrendingDown },
              { label: 'Saldo',         value: fmtCurrency(income-expense),  color: income>=expense?'text-emerald-600':'text-rose-600', icon: DollarSign },
              { label: 'Inadimplência', value: fmtCurrency(invoices.filter(i=>i.status==='Atrasado').reduce((a,i)=>a+i.amount,0)), color:'text-amber-600', icon: AlertTriangle },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">{k.label}</p>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Lançamentos do Período</h3>
              <span className="text-xs text-slate-400">{filteredFinancials.length} registro(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {['Data','Tipo','Categoria','Descrição','Valor','Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFinancials.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Nenhum registro no período selecionado</td></tr>
                  ) : filteredFinancials.map(f => (
                    <tr key={f.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-600">{fmtDate(f.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${f.type==='receita'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>
                          {f.type==='receita'?'Receita':'Despesa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{f.category}</td>
                      <td className="px-4 py-3 text-slate-700">{f.description}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{fmtCurrency(f.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${f.status==='pago'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                          {f.status==='pago'?'Pago':'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── NUTRIÇÃO ── */}
      {selectedModule === 'nutricao' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Planos Alimentares e Aceitação</h3>
            <p className="text-xs text-slate-400 mt-0.5">Logs nutricionais no período selecionado</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {['Residente','Consistência','Tipo de Dieta','Restrição Hídrica','Aceitação Média'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {residents.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Nenhum residente cadastrado</td></tr>
                ) : residents.map(r => {
                  const logs = (r.nutritionalLogs||[]).filter(l => l.date >= startDate && l.date <= endDate);
                  const avg = logs.length ? Math.round(logs.reduce((a,l)=>a+l.acceptance,0)/logs.length) : null;
                  return (
                    <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.dietPlan?.consistency || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.dietPlan?.type || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.dietPlan?.fluidRestriction || 'Sem restrição'}</td>
                      <td className="px-4 py-3">
                        {avg !== null ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${avg>=70?'bg-emerald-100 text-emerald-700':avg>=40?'bg-amber-100 text-amber-700':'bg-rose-100 text-rose-700'}`}>
                            {avg}%
                          </span>
                        ) : <span className="text-slate-400 text-xs">Sem logs</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ESTOQUE ── */}
      {selectedModule === 'estoque' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total de Itens',  value: stockItems.length, color: 'text-slate-800' },
              { label: 'Estoque Baixo',   value: lowStock.length,   color: 'text-rose-600'  },
              { label: 'Medicamentos',    value: stockItems.filter(i=>i.category==='medicamento').length, color:'text-indigo-600' },
              { label: 'Insumos',         value: stockItems.filter(i=>i.category==='insumo').length,     color:'text-cyan-600'   },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          {lowStock.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
              <p className="text-sm text-rose-700 font-medium">
                {lowStock.length} item(s) abaixo do estoque mínimo: {lowStock.slice(0,3).map(i=>i.name).join(', ')}{lowStock.length>3?' e outros.':'.'}
              </p>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Inventário</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {['Item','Categoria','Quantidade','Unidade','Mínimo','Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockItems.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Nenhum item cadastrado</td></tr>
                  ) : stockItems.map(item => (
                    <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{item.category}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.quantity}</td>
                      <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                      <td className="px-4 py-3 text-slate-600">{item.minThreshold}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          item.quantity > item.minThreshold ? 'bg-emerald-100 text-emerald-700' :
                          item.quantity > 0 ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {item.quantity > item.minThreshold ? 'OK' : item.quantity > 0 ? 'Estoque Baixo' : 'Esgotado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── EQUIPE ── */}
      {selectedModule === 'equipe' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total',           value: employees.length,                             color: 'text-slate-800'  },
              { label: 'Ativos',          value: employees.filter(e=>e.status==='Ativo').length, color: 'text-emerald-600'},
              { label: 'Resp. Técnico',   value: employees.filter(e=>e.isTechnicalLead).length,  color: 'text-indigo-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Quadro de Colaboradores</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {['Nome','Função','Turno','Status','Admissão'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Nenhum colaborador cadastrado</td></tr>
                  ) : employees.map(e => (
                    <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {e.name}
                        {e.isTechnicalLead && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-violet-100 text-violet-700">RT</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{e.role}</td>
                      <td className="px-4 py-3 text-slate-600">{e.shift}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          e.status==='Ativo'?'bg-emerald-100 text-emerald-700':
                          e.status==='Férias'?'bg-amber-100 text-amber-700':
                          'bg-slate-100 text-slate-600'
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(e.admissionDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── AGENDA ── */}
      {selectedModule === 'agenda' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Eventos',    value: filteredEvents.length,                                color: 'text-slate-800' },
              { label: 'Consultas',        value: filteredEvents.filter(e=>e.type==='medico').length,   color: 'text-blue-600'  },
              { label: 'Visitas',          value: filteredEvents.filter(e=>e.type==='visita').length,   color: 'text-emerald-600'},
              { label: 'Atividades',       value: filteredEvents.filter(e=>e.type==='atividade').length,color: 'text-violet-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Eventos do Período</h3>
              <span className="text-xs text-slate-400">{filteredEvents.length} evento(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {['Data/Hora','Título','Tipo','Local','Criado por'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Nenhum evento no período selecionado</td></tr>
                  ) : [...filteredEvents].sort((a,b)=>a.start.localeCompare(b.start)).map(ev => (
                    <tr key={ev.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDateTime(ev.start)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{ev.title}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {EVENT_TYPE_LABELS[ev.type] || ev.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ev.location || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{ev.createdBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsModule;
