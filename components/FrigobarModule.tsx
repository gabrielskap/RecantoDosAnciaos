import React, { useState, useEffect, useMemo } from 'react';
import { 
  Thermometer, 
  ThermometerSnowflake, 
  ThermometerSun, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Trash2, 
  ShieldAlert, 
  Info, 
  Sparkles, 
  RefreshCw, 
  FileSpreadsheet, 
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../services/toast';
import { FrigobarReading, FrigobarShift, FrigobarStatus } from '../types';
import { 
  fetchFrigobarReadings, 
  saveFrigobarReading, 
  deleteFrigobarReading, 
  evaluateOmsStatus 
} from '../services/frigobarService';

const DEFAULT_EQUIPMENTS = [
  { name: 'Frigobar Medicamentos Enfermagem', loc: 'Posto de Enfermagem - Bloco A' },
  { name: 'Frigobar Vacinas & Insulinas', loc: 'Sala de Medicamentos Especial' },
  { name: 'Frigobar Cozinha & Dietas', loc: 'Nutrição / Cozinha Central' },
  { name: 'Frigobar Enfermagem Bloco B', loc: 'Posto de Enfermagem - Bloco B' }
];

const FrigobarModule: React.FC = () => {
  const { currentUser } = useAuth();
  const [readings, setReadings] = useState<FrigobarReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [selectedEquipment, setSelectedEquipment] = useState<string>('todos');
  const [selectedShift, setSelectedShift] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Modal de Novo Registro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReadingDetail, setSelectedReadingDetail] = useState<FrigobarReading | null>(null);

  // Form State
  const [equipamentoNome, setEquipamentoNome] = useState(DEFAULT_EQUIPMENTS[0].name);
  const [customEquipamento, setCustomEquipamento] = useState('');
  const [isCustomEquipment, setIsCustomEquipment] = useState(false);
  const [localizacao, setLocalizacao] = useState(DEFAULT_EQUIPMENTS[0].loc);
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date();
    // Format YYYY-MM-DDTHH:mm for datetime-local input
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  
  // Auto-detect shift based on current hour: 06:00 to 17:59 = diurno, 18:00 to 05:59 = noturno
  const [turno, setTurno] = useState<FrigobarShift>(() => {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
  });

  const [temperaturaAtual, setTemperaturaAtual] = useState<string>('4.5');
  const [temperaturaMinima, setTemperaturaMinima] = useState<string>('');
  const [temperaturaMaxima, setTemperaturaMaxima] = useState<string>('');
  const [responsavelNome, setResponsavelNome] = useState(currentUser?.name || '');
  const [observacoes, setObservacoes] = useState('');
  const [acaoCorretiva, setAcaoCorretiva] = useState('');
  const [saving, setSaving] = useState(false);

  // Carregar dados
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchFrigobarReadings(currentUser?.empresaId);
      setReadings(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar medições de frigobar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.empresaId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Status calculado em tempo real para o formulário
  const numericTemp = parseFloat(temperaturaAtual.replace(',', '.'));
  const currentTempStatus: FrigobarStatus | null = !isNaN(numericTemp) ? evaluateOmsStatus(numericTemp) : null;
  const isOutOfRange = currentTempStatus === 'alerta_frio' || currentTempStatus === 'alerta_quente';

  // Atualiza a localização sugerida quando muda o equipamento selecionado
  const handleEquipmentChange = (val: string) => {
    if (val === 'custom') {
      setIsCustomEquipment(true);
      setEquipamentoNome('');
      setLocalizacao('');
    } else {
      setIsCustomEquipment(false);
      setEquipamentoNome(val);
      const found = DEFAULT_EQUIPMENTS.find(e => e.name === val);
      if (found) {
        setLocalizacao(found.loc);
      }
    }
  };

  // Abrir Modal Limpo
  const openNewReadingModal = () => {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const hour = now.getHours();
    
    setDataHora(localIso);
    setTurno((hour >= 6 && hour < 18) ? 'diurno' : 'noturno');
    setTemperaturaAtual('4.5');
    setTemperaturaMinima('');
    setTemperaturaMaxima('');
    setObservacoes('');
    setAcaoCorretiva('');
    setResponsavelNome(currentUser?.name || '');
    setIsModalOpen(true);
  };

  // Submeter novo registro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEquipName = isCustomEquipment ? customEquipamento.trim() : equipamentoNome;

    if (!finalEquipName) {
      toast.error('Por favor, informe o nome do frigobar/equipamento.');
      return;
    }

    if (isNaN(numericTemp)) {
      toast.error('Informe um valor de temperatura válido (ex: 4.5).');
      return;
    }

    if (numericTemp < -10 || numericTemp > 40) {
      toast.error('A temperatura informada está fora de limites razoáveis.');
      return;
    }

    // Validação da recomendação OMS: Ação corretiva obrigatória em caso de desvio térmico
    if (isOutOfRange && !acaoCorretiva.trim()) {
      toast.error('⚠️ Ação Corretiva é OBRIGATÓRIA segundo as normas da OMS quando a temperatura está fora do limite (+2.0 °C a +8.0 °C)!');
      return;
    }

    setSaving(true);
    try {
      const minVal = temperaturaMinima !== '' ? parseFloat(temperaturaMinima.replace(',', '.')) : undefined;
      const maxVal = temperaturaMaxima !== '' ? parseFloat(temperaturaMaxima.replace(',', '.')) : undefined;

      const newReading = await saveFrigobarReading({
        equipamentoNome: finalEquipName,
        localizacao: localizacao.trim() || 'Posto de Enfermagem',
        dataHora: new Date(dataHora).toISOString(),
        turno,
        temperaturaAtual: numericTemp,
        temperaturaMinima: isNaN(minVal!) ? undefined : minVal,
        temperaturaMaxima: isNaN(maxVal!) ? undefined : maxVal,
        status: currentTempStatus!,
        responsavelNome: responsavelNome.trim() || currentUser?.name || 'Profissional de Saúde',
        usuarioId: currentUser?.id,
        observacoes: observacoes.trim() || undefined,
        acaoCorretiva: acaoCorretiva.trim() || undefined
      }, currentUser?.empresaId);

      setReadings(prev => [newReading, ...prev.filter(r => r.id !== newReading.id)]);
      toast.success('Medição de temperatura registrada com sucesso!');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar registro de temperatura.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta medição de frigobar?')) {
      return;
    }

    try {
      await deleteFrigobarReading(id);
      setReadings(prev => prev.filter(r => r.id !== id));
      toast.success('Medição excluída com sucesso!');
    } catch (err) {
      toast.error('Erro ao excluir medição.');
    }
  };

  // Estatísticas e Métricas Rápidas
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const todayReadings = useMemo(() => {
    return readings.filter(r => (r.dataHora || '').slice(0, 10) === todayStr);
  }, [readings, todayStr]);

  const latestReading = useMemo(() => {
    return readings.length > 0 ? readings[0] : null;
  }, [readings]);

  const todayDiurnoDone = useMemo(() => {
    return todayReadings.some(r => r.turno === 'diurno');
  }, [todayReadings]);

  const todayNoturnoDone = useMemo(() => {
    return todayReadings.some(r => r.turno === 'noturno');
  }, [todayReadings]);

  const monthlyMetrics = useMemo(() => {
    if (readings.length === 0) return { total: 0, conforme: 0, taxa: 100, alertas: 0 };
    const total = readings.length;
    const conforme = readings.filter(r => r.status === 'conforme').length;
    const alertas = total - conforme;
    const taxa = Math.round((conforme / total) * 100);
    return { total, conforme, taxa, alertas };
  }, [readings]);

  // Lista de equipamentos únicos para o filtro
  const uniqueEquipments = useMemo(() => {
    const setNames = new Set(readings.map(r => r.equipamentoNome));
    DEFAULT_EQUIPMENTS.forEach(e => setNames.add(e.name));
    return Array.from(setNames);
  }, [readings]);

  // Filtragem e Paginação
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      if (selectedEquipment !== 'todos' && r.equipamentoNome !== selectedEquipment) return false;
      if (selectedShift !== 'todos' && r.turno !== selectedShift) return false;
      if (selectedStatus !== 'todos' && r.status !== selectedStatus) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesEquip = r.equipamentoNome.toLowerCase().includes(query);
        const matchesResp = r.responsavelNome.toLowerCase().includes(query);
        const matchesLoc = (r.localizacao || '').toLowerCase().includes(query);
        const matchesObs = (r.observacoes || '').toLowerCase().includes(query);
        const matchesAcao = (r.acaoCorretiva || '').toLowerCase().includes(query);
        return matchesEquip || matchesResp || matchesLoc || matchesObs || matchesAcao;
      }
      return true;
    });
  }, [readings, selectedEquipment, selectedShift, selectedStatus, searchTerm]);

  const totalPages = Math.ceil(filteredReadings.length / itemsPerPage) || 1;
  const paginatedReadings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReadings.slice(start, start + itemsPerPage);
  }, [filteredReadings, currentPage]);

  // Exportar para CSV
  const exportCSV = () => {
    if (filteredReadings.length === 0) {
      toast.error('Nenhum registro para exportar.');
      return;
    }

    const headers = [
      'Data/Hora',
      'Equipamento',
      'Localizacao',
      'Turno',
      'Temperatura Atual (C)',
      'Temperatura Minima (C)',
      'Temperatura Maxima (C)',
      'Status OMS',
      'Responsavel',
      'Observacoes',
      'Acao Corretiva'
    ];

    const rows = filteredReadings.map(r => [
      new Date(r.dataHora).toLocaleString('pt-BR'),
      `"${r.equipamentoNome.replace(/"/g, '""')}"`,
      `"${(r.localizacao || '').replace(/"/g, '""')}"`,
      r.turno === 'diurno' ? 'Diurno (Manha/Tarde)' : 'Noturno (Noite)',
      r.temperaturaAtual.toFixed(1),
      r.temperaturaMinima != null ? r.temperaturaMinima.toFixed(1) : '',
      r.temperaturaMaxima != null ? r.temperaturaMaxima.toFixed(1) : '',
      r.status === 'conforme' ? 'Conforme OMS' : r.status === 'alerta_frio' ? 'Alerta Congelamento' : 'Alerta Aquecimento',
      `"${r.responsavelNome.replace(/"/g, '""')}"`,
      `"${(r.observacoes || '').replace(/"/g, '""')}"`,
      `"${(r.acaoCorretiva || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `controle_temperatura_frigobar_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Relatório CSV exportado com sucesso!');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Thermometer className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Controle de Temperatura de Frigobar</h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Normas OMS / ANVISA
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-0.5">
                Monitoramento sistemático de 12 em 12 horas para preservação de medicamentos, insulinas e alimento.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            className={`p-2.5 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-xl transition-colors ${refreshing ? 'animate-spin' : ''}`}
            title="Atualizar dados"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow-sm"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={openNewReadingModal}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-md shadow-blue-600/20"
          >
            <Plus className="h-5 w-5" />
            <span>Nova Medição 12h</span>
          </button>
        </div>
      </div>

      {/* CARDS DE MONITORAMENTO DOS TURNOS DE HOJE & MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Turno Diurno */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
              <ThermometerSun className="h-5 w-5" />
              <span>Turno Diurno (08:00)</span>
            </div>
            {todayDiurnoDone ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Registrado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                <Clock className="h-3 w-3" /> Pendente
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              {todayReadings.find(r => r.turno === 'diurno')
                ? `${todayReadings.find(r => r.turno === 'diurno')?.temperaturaAtual.toFixed(1)} °C`
                : '-- °C'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {todayDiurnoDone ? 'Medição matinal realizada com sucesso.' : 'Aguardando lançamento da medição da manhã.'}
            </p>
          </div>
        </div>

        {/* Card Turno Noturno */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
              <ThermometerSnowflake className="h-5 w-5" />
              <span>Turno Noturno (20:00)</span>
            </div>
            {todayNoturnoDone ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Registrado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                <Clock className="h-3 w-3" /> Pendente
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              {todayReadings.find(r => r.turno === 'noturno')
                ? `${todayReadings.find(r => r.turno === 'noturno')?.temperaturaAtual.toFixed(1)} °C`
                : '-- °C'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {todayNoturnoDone ? 'Medição noturna realizada com sucesso.' : 'Aguardando lançamento da medição da noite.'}
            </p>
          </div>
        </div>

        {/* Card Taxa de Conformidade OMS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm font-semibold">
            <span>Conformidade OMS</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{monthlyMetrics.taxa}%</p>
            <span className="text-xs font-medium text-slate-500">({monthlyMetrics.conforme}/{monthlyMetrics.total} medições)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${monthlyMetrics.taxa >= 90 ? 'bg-emerald-500' : monthlyMetrics.taxa >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${monthlyMetrics.taxa}%` }}
            />
          </div>
        </div>

        {/* Card Alertas e Desvios */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm font-semibold">
            <span>Alertas & Desvios</span>
            <AlertTriangle className={`h-4 w-4 ${monthlyMetrics.alertas > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">{monthlyMetrics.alertas}</p>
            <p className="text-xs text-slate-500 mt-1">
              {monthlyMetrics.alertas === 0
                ? 'Nenhum desvio térmico registrado.'
                : `${monthlyMetrics.alertas} medição(ões) fora da faixa da OMS (+2°C a +8°C).`}
            </p>
          </div>
        </div>
      </div>

      {/* BANNER INFORMATIVO: GUIA DE CONFORMIDADE OMS */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-emerald-400 shrink-0" />
              <h3 className="font-bold text-lg text-white">Diretriz da OMS & ANVISA para Refrigeração de Medicamentos</h3>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed">
              Equipamentos de refrigeração para fármacos e insulinas em ILPIs devem manter obrigatoriamente a temperatura entre <strong className="text-emerald-300 font-semibold">+2,0 °C e +8,0 °C</strong>. Registros devem ser efetuados no mínimo a cada <strong>12 horas</strong> e, caso haja desvio, a <strong>Ação Corretiva</strong> deve ser registrada imediatamente.
            </p>
          </div>

          {/* Visual Gauge de Temperatura */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shrink-0 min-w-[280px]">
            <div className="text-xs text-slate-200 font-medium mb-2 flex justify-between">
              <span>Faixa de Temperatura</span>
              <span className="text-emerald-400 font-bold">Faixa Segura: +2°C a +8°C</span>
            </div>
            
            <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex text-[10px] font-bold text-center text-white">
              <div className="w-1/4 bg-cyan-600 flex items-center justify-center" title="Abaixo de +2°C (Congelamento)">
                &lt; 2°C
              </div>
              <div className="w-2/4 bg-emerald-500 flex items-center justify-center shadow-inner" title="Ideal (+2°C a +8°C)">
                +2°C a +8°C (Ideal)
              </div>
              <div className="w-1/4 bg-rose-600 flex items-center justify-center" title="Acima de +8°C (Aquecimento)">
                &gt; 8°C
              </div>
            </div>

            <div className="flex justify-between text-[11px] text-slate-300 mt-2">
              <span className="text-cyan-300 flex items-center gap-1">❄️ Congelamento</span>
              <span className="text-emerald-300 font-semibold">✓ Conforme</span>
              <span className="text-rose-300 flex items-center gap-1">🔥 Deterioração</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS E PESQUISA */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Campo de Pesquisa */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por equipamento, responsável ou observação..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros em Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Equipamento */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Building2 className="h-4 w-4 text-slate-400" />
              <select
                value={selectedEquipment}
                onChange={(e) => { setSelectedEquipment(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="todos">Todos os Equipamentos</option>
                {uniqueEquipments.map((eq) => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>

            {/* Turno */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Clock className="h-4 w-4 text-slate-400" />
              <select
                value={selectedShift}
                onChange={(e) => { setSelectedShift(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="todos">Todos os Turnos (12h)</option>
                <option value="diurno">Diurno (08:00)</option>
                <option value="noturno">Noturno (20:00)</option>
              </select>
            </div>

            {/* Status OMS */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="todos">Todos os Status OMS</option>
                <option value="conforme">✓ Conforme (+2°C a +8°C)</option>
                <option value="alerta_frio">❄️ Alerta Congelamento (&lt;2°C)</option>
                <option value="alerta_quente">🔥 Alerta Aquecimento (&gt;8°C)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TABELA DE MEDIÇÕES */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-slate-600" />
            <h2 className="font-bold text-slate-800 text-base">Histórico de Registros de Temperatura</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Exibindo {paginatedReadings.length} de {filteredReadings.length} registros
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Carregando histórico de frigobares...</p>
          </div>
        ) : paginatedReadings.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Thermometer className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Nenhuma medição encontrada</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              {searchTerm || selectedEquipment !== 'todos' || selectedStatus !== 'todos'
                ? 'Nenhuma medição atende aos filtros selecionados. Tente ajustar os parâmetros de busca.'
                : 'Nenhuma medição de frigobar foi registrada ainda. Clique no botão "Nova Medição 12h" para começar.'}
            </p>
            <button
              onClick={openNewReadingModal}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Primeira Medição</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Data / Hora</th>
                  <th className="px-6 py-3.5">Equipamento & Local</th>
                  <th className="px-6 py-3.5">Turno</th>
                  <th className="px-6 py-3.5">Temp. Atual (°C)</th>
                  <th className="px-6 py-3.5">Mín / Máx (°C)</th>
                  <th className="px-6 py-3.5">Status OMS</th>
                  <th className="px-6 py-3.5">Responsável</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedReadings.map((r) => {
                  const isConforme = r.status === 'conforme';
                  const isFrio = r.status === 'alerta_frio';
                  const isQuente = r.status === 'alerta_quente';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>{new Date(r.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 leading-tight">{r.equipamentoNome}</p>
                        <p className="text-xs text-slate-400">{r.localizacao || 'Posto de Enfermagem'}</p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {r.turno === 'diurno' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
                            <ThermometerSun className="h-3.5 w-3.5 text-amber-500" /> Diurno (08:00)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            <ThermometerSnowflake className="h-3.5 w-3.5 text-indigo-500" /> Noturno (20:00)
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-base font-extrabold px-2.5 py-1 rounded-xl inline-block ${
                          isConforme ? 'text-emerald-700 bg-emerald-50' : isFrio ? 'text-cyan-700 bg-cyan-50' : 'text-rose-700 bg-rose-50'
                        }`}>
                          {r.temperaturaAtual.toFixed(1)} °C
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {r.temperaturaMinima != null || r.temperaturaMaxima != null ? (
                          <span>
                            {r.temperaturaMinima != null ? `${r.temperaturaMinima.toFixed(1)}°C` : '--'} / {r.temperaturaMaxima != null ? `${r.temperaturaMaxima.toFixed(1)}°C` : '--'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Não registrado</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {isConforme && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Conforme OMS (+2°C a +8°C)
                          </span>
                        )}
                        {isFrio && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 animate-pulse">
                            <ThermometerSnowflake className="h-3.5 w-3.5 text-cyan-600" /> Alerta Congelamento (&lt;2°C)
                          </span>
                        )}
                        {isQuente && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Alerta Deterioração (&gt;8°C)
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                          <span>{r.responsavelNome}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSelectedReadingDetail(r); setIsDetailModalOpen(true); }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir medição"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Página <strong className="text-slate-800">{currentPage}</strong> de <strong className="text-slate-800">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE NOVA MEDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            {/* Header Modal */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Thermometer className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Registrar Medição de Frigobar</h3>
                  <p className="text-xs text-blue-200">Monitoramento 12h - Padrão OMS (+2°C a +8°C)</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Seleção do Frigobar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Equipamento / Frigobar <span className="text-rose-500">*</span>
                </label>
                <select
                  value={isCustomEquipment ? 'custom' : equipamentoNome}
                  onChange={(e) => handleEquipmentChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
                >
                  {DEFAULT_EQUIPMENTS.map(eq => (
                    <option key={eq.name} value={eq.name}>{eq.name}</option>
                  ))}
                  <option value="custom">+ Outro Frigobar (Cadastrar Novo)</option>
                </select>

                {isCustomEquipment && (
                  <input
                    type="text"
                    placeholder="Digite o nome do novo frigobar..."
                    value={customEquipamento}
                    onChange={(e) => setCustomEquipamento(e.target.value)}
                    required
                    className="mt-2 w-full px-3.5 py-2 text-sm bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                  />
                )}
              </div>

              {/* Localização */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Localização na Instituição
                </label>
                <input
                  type="text"
                  placeholder="Ex: Posto de Enfermagem - Bloco A"
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Data/Hora e Turno */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Data e Hora <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dataHora}
                    onChange={(e) => setDataHora(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Turno (Intervalo 12h) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={turno}
                    onChange={(e) => setTurno(e.target.value as FrigobarShift)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  >
                    <option value="diurno">☀️ Turno Diurno (Manhã / 08:00)</option>
                    <option value="noturno">🌙 Turno Noturno (Noite / 20:00)</option>
                  </select>
                </div>
              </div>

              {/* TEMPERATURA ATUAL COM FEEDBACK OMS EM TEMPO REAL */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Temperatura Atual (°C) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs text-slate-500 font-medium">Ref. OMS: +2,0°C a +8,0°C</span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 4.5"
                      value={temperaturaAtual}
                      onChange={(e) => setTemperaturaAtual(e.target.value)}
                      required
                      className={`w-full text-2xl font-extrabold px-4 py-3 bg-white border-2 rounded-xl focus:outline-none transition-all ${
                        currentTempStatus === 'conforme'
                          ? 'border-emerald-400 text-emerald-800 focus:ring-emerald-500/20'
                          : currentTempStatus === 'alerta_frio'
                          ? 'border-cyan-400 text-cyan-800 focus:ring-cyan-500/20'
                          : currentTempStatus === 'alerta_quente'
                          ? 'border-rose-400 text-rose-800 focus:ring-rose-500/20'
                          : 'border-slate-300'
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                      °C
                    </span>
                  </div>
                </div>

                {/* Banner de Feedback OMS */}
                {currentTempStatus === 'conforme' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>✓ Temperatura ideal conforme diretrizes da OMS (+2,0 °C a +8,0 °C).</span>
                  </div>
                )}

                {currentTempStatus === 'alerta_frio' && (
                  <div className="p-3 bg-cyan-50 border border-cyan-300 rounded-xl flex items-start gap-2.5 text-cyan-900 text-xs font-medium">
                    <ThermometerSnowflake className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block text-cyan-900">⚠️ ALERTA OMS: Risco de Congelamento (&lt; +2.0 °C)!</strong>
                      Insulinas e vacinas podem sofrer inativação biológica. Ação corretiva obrigatória!
                    </div>
                  </div>
                )}

                {currentTempStatus === 'alerta_quente' && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs font-medium">
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block text-rose-900">⚠️ ALERTA OMS: Risco de Aquecimento (&gt; +8.0 °C)!</strong>
                      Medicamentos e insumos correm risco de deterioração térmica. Ação corretiva obrigatória!
                    </div>
                  </div>
                )}
              </div>

              {/* Mínima e Máxima (Termômetro com memória) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Temp. Mínima Registrada (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 3.2 (opcional)"
                    value={temperaturaMinima}
                    onChange={(e) => setTemperaturaMinima(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Temp. Máxima Registrada (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 5.8 (opcional)"
                    value={temperaturaMaxima}
                    onChange={(e) => setTemperaturaMaxima(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Responsável pelo registro */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Profissional Responsável <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  required
                  placeholder="Nome do enfermeiro / cuidador"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* CAMPO DE AÇÃO CORRETIVA (OBRIGATÓRIO SE OUT OF RANGE) */}
              {isOutOfRange && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2 animate-in fade-in duration-300">
                  <label className="block text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-700" />
                    Ação Corretiva Aplicada <span className="text-rose-600">* (OBRIGATÓRIO PELA OMS)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Descreva a ação imediata efetuada (Ex: Ajustado o termostato do frigobar para o nível 3, notificada a equipe de enfermagem e inspecionada a integridade dos frascos de insulina)."
                    value={acaoCorretiva}
                    onChange={(e) => setAcaoCorretiva(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-amber-400 rounded-xl focus:ring-2 focus:ring-amber-500/30 text-slate-900 font-medium placeholder-slate-400"
                  />
                </div>
              )}

              {/* Observações Gerais */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Gerais (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Observações adicionais (ex: limpeza realizada, reabastecimento...)"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Salvar Medição 12h</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DA MEDIÇÃO */}
      {isDetailModalOpen && selectedReadingDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Thermometer className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-base">Detalhes do Registro de Temperatura</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-700">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <p><strong className="text-slate-900">Equipamento:</strong> {selectedReadingDetail.equipamentoNome}</p>
                <p><strong className="text-slate-900">Localização:</strong> {selectedReadingDetail.localizacao || 'Posto de Enfermagem'}</p>
                <p><strong className="text-slate-900">Data e Hora:</strong> {new Date(selectedReadingDetail.dataHora).toLocaleString('pt-BR')}</p>
                <p><strong className="text-slate-900">Turno:</strong> {selectedReadingDetail.turno === 'diurno' ? '☀️ Diurno (Manhã/Tarde)' : '🌙 Noturno (Noite)'}</p>
                <p><strong className="text-slate-900">Responsável:</strong> {selectedReadingDetail.responsavelNome}</p>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block">Temperatura Medida</span>
                  <span className="text-3xl font-extrabold text-slate-900">
                    {selectedReadingDetail.temperaturaAtual.toFixed(1)} °C
                  </span>
                </div>
                <div>
                  {selectedReadingDetail.status === 'conforme' && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                      ✓ Conforme OMS
                    </span>
                  )}
                  {selectedReadingDetail.status === 'alerta_frio' && (
                    <span className="bg-cyan-100 text-cyan-800 text-xs font-bold px-3 py-1 rounded-full border border-cyan-300">
                      ❄️ Alerta Congelamento
                    </span>
                  )}
                  {selectedReadingDetail.status === 'alerta_quente' && (
                    <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full border border-rose-300">
                      🔥 Alerta Aquecimento
                    </span>
                  )}
                </div>
              </div>

              {selectedReadingDetail.acaoCorretiva && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-1">
                  <strong className="text-amber-900 font-extrabold text-xs uppercase flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4 text-amber-700" /> Ação Corretiva Registrada:
                  </strong>
                  <p className="text-amber-950 font-medium leading-relaxed">{selectedReadingDetail.acaoCorretiva}</p>
                </div>
              )}

              {selectedReadingDetail.observacoes && (
                <div>
                  <strong className="text-slate-900 text-xs uppercase block mb-1">Observações:</strong>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">{selectedReadingDetail.observacoes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrigobarModule;
