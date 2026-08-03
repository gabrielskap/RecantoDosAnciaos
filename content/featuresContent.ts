import {
  Users, Stethoscope, DollarSign, Package, UserCog, BarChart3, Utensils, Calendar, Brain,
  Search, FileText, AlertTriangle, ClipboardList, Activity, FolderOpen, ShieldCheck, Clock,
  HeartPulse, BadgeCheck, Pill, Thermometer, Bell, Receipt, TrendingDown, Wallet, CreditCard,
  TrendingUp, Boxes, Truck, GraduationCap, Lock, UserCheck, PieChart, Download, Apple, Soup,
  CalendarCheck, MapPin, Sparkles, MessageSquare, Eye,
} from 'lucide-react';
import type { FeatureContent } from '../components/marketing/types';

/**
 * Conteúdo de cada página de módulo ("Saiba mais"). Um template único
 * (FeaturePage) é alimentado por estas configurações — código DRY e pronto
 * para integração futura. Adicionar/editar um módulo = editar este arquivo.
 */
export const FEATURES: Record<string, FeatureContent> = {
  residentes: {
    slug: 'residentes',
    icon: Users,
    accent: 'blue',
    eyebrow: 'Gestão de Residentes',
    title: 'O prontuário completo de cada residente, sempre à mão',
    subtitle: 'Centralize dados pessoais, clínicos, documentos e histórico de cada residente em um prontuário digital seguro — acessível por toda a equipe, de qualquer lugar.',
    heroBullets: [
      'Prontuário eletrônico individual e completo',
      'Histórico clínico, fotos e documentos digitalizados',
      'Acesso seguro com controle por perfil',
    ],
    problem: {
      title: 'Informações espalhadas custam tempo e segurança',
      intro: 'Fichas em papel, planilhas soltas e dados “na cabeça” da equipe geram retrabalho e risco no cuidado.',
      pains: [
        { icon: Search, text: 'Procurar a ficha certa em pastas de papel toma minutos preciosos em cada atendimento.' },
        { icon: FileText, text: 'Documentos importantes se perdem ou ficam desatualizados entre turnos.' },
        { icon: AlertTriangle, text: 'Falta de histórico acessível aumenta o risco de erros no cuidado.' },
        { icon: Users, text: 'Cada cuidador anota de um jeito — sem padronização não há continuidade.' },
      ],
    },
    solution: {
      title: 'Tudo sobre o residente em um só lugar',
      description: 'Do cadastro à evolução clínica, o RecantoCare reúne todas as informações do residente em um prontuário digital padronizado, com busca instantânea e acesso conforme o perfil de cada usuário.',
      highlights: [
        { icon: ClipboardList, title: 'Cadastro padronizado', text: 'Dados pessoais, contatos de emergência e responsável legal organizados.' },
        { icon: Activity, title: 'Histórico clínico vivo', text: 'Condições, alergias, evolução e sinais vitais sempre atualizados.' },
        { icon: FolderOpen, title: 'Documentos digitalizados', text: 'Exames, laudos e receitas anexados diretamente ao prontuário.' },
      ],
    },
    benefits: [
      { icon: Search, title: 'Busca instantânea', text: 'Encontre qualquer residente por nome ou quarto em segundos.' },
      { icon: ShieldCheck, title: 'Acesso seguro', text: 'Permissões por perfil garantem que cada um veja apenas o necessário.' },
      { icon: Clock, title: 'Menos tempo em papelada', text: 'A equipe foca no cuidado, não na burocracia.' },
      { icon: FolderOpen, title: 'Documentos sempre à mão', text: 'Nada de pastas perdidas ou papéis vencidos.' },
      { icon: HeartPulse, title: 'Cuidado personalizado', text: 'Necessidades especiais visíveis para toda a equipe.' },
      { icon: BadgeCheck, title: 'Pronto para fiscalização', text: 'Prontuário completo e organizado para a vigilância sanitária.' },
    ],
    comparison: [
      { manual: 'Fichas em papel que se perdem ou rasgam', sistema: 'Prontuário digital seguro e sempre disponível' },
      { manual: 'Busca manual em arquivos físicos', sistema: 'Busca instantânea por nome ou quarto' },
      { manual: 'Informação presa com um funcionário', sistema: 'Histórico acessível por toda a equipe autorizada' },
      { manual: 'Documentos soltos e desatualizados', sistema: 'Documentos digitalizados e versionados' },
      { manual: 'Sem rastreio de alterações', sistema: 'Log de auditoria de cada mudança' },
    ],
  },

  saude: {
    slug: 'saude',
    icon: Stethoscope,
    accent: 'rose',
    eyebrow: 'Saúde & Clínica',
    title: 'Controle clínico que protege quem você cuida',
    subtitle: 'Sinais vitais, medicações, checklists diários e planos de cuidado — monitorados em tempo real, com alertas que evitam falhas no atendimento.',
    heroBullets: [
      'Controle de medicações com horários e registro',
      'Checklists diários de cuidado por turno',
      'Sinais vitais com histórico e gráficos',
    ],
    problem: {
      title: 'No cuidado ao idoso, um esquecimento pode ser grave',
      intro: 'Sem controle sistemático, medicações e cuidados essenciais dependem da memória da equipe.',
      pains: [
        { icon: Pill, text: 'Medicação esquecida ou administrada em horário errado.' },
        { icon: Thermometer, text: 'Sinais vitais anotados em papel, sem visão da evolução.' },
        { icon: ClipboardList, text: 'Checklists de cuidado feitos “de cabeça”, sem registro.' },
        { icon: AlertTriangle, text: 'Intercorrências sem rastreio dificultam a conduta médica.' },
      ],
    },
    solution: {
      title: 'Cada cuidado registrado, cada alerta no tempo certo',
      description: 'O módulo de saúde transforma a rotina clínica em processos rastreáveis: medicações com horários, checklists por turno e sinais vitais com histórico — tudo com alertas automáticos.',
      highlights: [
        { icon: Pill, title: 'Controle de medicações', text: 'Horários, doses e registro de administração por residente.' },
        { icon: Activity, title: 'Sinais vitais em gráficos', text: 'Tendências de PA, FC, SpO₂ e temperatura ao longo do tempo.' },
        { icon: ClipboardList, title: 'Checklists por turno', text: 'Higiene, alimentação, mobilidade e mais, com assinatura.' },
      ],
    },
    benefits: [
      { icon: Bell, title: 'Alertas de medicação', text: 'Lembretes automáticos evitam doses esquecidas.' },
      { icon: Activity, title: 'Evolução visível', text: 'Gráficos de sinais vitais facilitam decisões clínicas.' },
      { icon: ShieldCheck, title: 'Mais segurança', text: 'Registro completo reduz erros e protege a instituição.' },
      { icon: ClipboardList, title: 'Rotina padronizada', text: 'Checklists garantem que nada seja esquecido.' },
      { icon: HeartPulse, title: 'Planos de cuidado', text: 'Atividades personalizadas com acompanhamento de adesão.' },
      { icon: FileText, title: 'Pronto para auditoria', text: 'Histórico clínico documentado para fiscalização.' },
    ],
    comparison: [
      { manual: 'Controle de medicação na memória', sistema: 'Agenda de medicações com alertas automáticos' },
      { manual: 'Sinais vitais perdidos em papel', sistema: 'Histórico com gráficos de evolução' },
      { manual: 'Checklists informais', sistema: 'Checklists assinados por turno' },
      { manual: 'Intercorrências sem registro', sistema: 'Registro rastreável de cada evento' },
      { manual: 'Plano de cuidado genérico', sistema: 'Plano individual com adesão monitorada' },
    ],
  },

  financeiro: {
    slug: 'financeiro',
    icon: DollarSign,
    accent: 'emerald',
    eyebrow: 'Financeiro & Contratos',
    title: 'A saúde financeira da sua ILPI sob controle total',
    subtitle: 'Contratos, mensalidades, receitas e despesas em um só painel. Reduza a inadimplência e enxergue o resultado do mês em tempo real.',
    heroBullets: [
      'Contratos e mensalidades automatizados',
      'Controle de inadimplência com alertas',
      'Receitas, despesas e fluxo de caixa claros',
    ],
    problem: {
      title: 'Planilhas não mostram a real saúde do seu negócio',
      intro: 'A gestão financeira manual esconde inadimplência, atrasa cobranças e dificulta decisões.',
      pains: [
        { icon: Receipt, text: 'Mensalidades controladas em planilhas que ninguém atualiza.' },
        { icon: TrendingDown, text: 'Inadimplência que só aparece quando já é tarde.' },
        { icon: Clock, text: 'Horas fechando o mês manualmente, com risco de erro.' },
        { icon: Wallet, text: 'Sem visão clara de quanto entra e quanto sai.' },
      ],
    },
    solution: {
      title: 'Do contrato ao caixa, tudo conectado',
      description: 'O módulo financeiro automatiza contratos e mensalidades, sinaliza atrasos e consolida receitas e despesas em indicadores claros — para você decidir com dados.',
      highlights: [
        { icon: Receipt, title: 'Mensalidades automáticas', text: 'Geração e acompanhamento de faturas por residente.' },
        { icon: CreditCard, title: 'Controle de inadimplência', text: 'Alertas de vencimento e status de pagamento.' },
        { icon: BarChart3, title: 'Resultado em tempo real', text: 'Receita × despesa e saldo líquido sempre atualizados.' },
      ],
    },
    benefits: [
      { icon: TrendingUp, title: 'Menos inadimplência', text: 'Alertas reduzem atrasos e perdas.' },
      { icon: Clock, title: 'Fechamento em minutos', text: 'Esqueça o fim de mês com planilhas.' },
      { icon: BarChart3, title: 'Decisões com dados', text: 'Indicadores claros de receita e despesa.' },
      { icon: Receipt, title: 'Contratos organizados', text: 'Valores, vencimentos e status em um só lugar.' },
      { icon: Wallet, title: 'Fluxo de caixa visível', text: 'Saiba exatamente quanto entra e sai.' },
      { icon: FileText, title: 'Relatórios financeiros', text: 'Exportações prontas para a contabilidade.' },
    ],
    comparison: [
      { manual: 'Mensalidades em planilha manual', sistema: 'Faturas geradas e acompanhadas automaticamente' },
      { manual: 'Inadimplência descoberta tarde', sistema: 'Alertas de vencimento em tempo real' },
      { manual: 'Fechamento de mês demorado', sistema: 'Resultado consolidado instantâneo' },
      { manual: 'Despesas sem categorização', sistema: 'Receitas e despesas organizadas por categoria' },
      { manual: 'Sem visão de fluxo de caixa', sistema: 'Saldo líquido e tendências sempre visíveis' },
    ],
  },

  estoque: {
    slug: 'estoque',
    icon: Package,
    accent: 'amber',
    eyebrow: 'Estoque & Insumos',
    title: 'Nunca mais fique sem um medicamento essencial',
    subtitle: 'Controle medicamentos, insumos e alimentos com alertas automáticos de estoque mínimo e validade — e itens vinculados a cada residente.',
    heroBullets: [
      'Alertas automáticos de estoque mínimo',
      'Controle de validade de medicamentos',
      'Itens por residente e histórico de movimentação',
    ],
    problem: {
      title: 'Faltar insumo não é opção em uma ILPI',
      intro: 'Sem controle, a equipe descobre a falta de um item bem na hora de usar.',
      pains: [
        { icon: Boxes, text: 'Contagem manual que nunca bate com a realidade.' },
        { icon: AlertTriangle, text: 'Medicamento essencial acaba sem ninguém perceber.' },
        { icon: Clock, text: 'Validades vencendo sem aviso, gerando desperdício.' },
        { icon: Search, text: 'Sem saber o que é de cada residente.' },
      ],
    },
    solution: {
      title: 'Estoque sob controle, sem surpresas',
      description: 'O módulo de estoque acompanha quantidades, validades e movimentações, dispara alertas de mínimo e permite vincular itens a cada residente.',
      highlights: [
        { icon: Bell, title: 'Alertas de mínimo', text: 'Avisos automáticos quando um item está acabando.' },
        { icon: Clock, title: 'Controle de validade', text: 'Saiba o que vence antes de virar desperdício.' },
        { icon: Truck, title: 'Histórico de movimentação', text: 'Entradas, saídas e ajustes totalmente rastreados.' },
      ],
    },
    benefits: [
      { icon: Bell, title: 'Zero rupturas', text: 'Alertas garantem reposição a tempo.' },
      { icon: Clock, title: 'Menos desperdício', text: 'Controle de validade evita perdas.' },
      { icon: Package, title: 'Itens por residente', text: 'Saiba exatamente o que pertence a cada um.' },
      { icon: Search, title: 'Inventário confiável', text: 'Quantidades sempre atualizadas.' },
      { icon: TrendingDown, title: 'Compras inteligentes', text: 'Reponha só o necessário, na hora certa.' },
      { icon: FileText, title: 'Rastreabilidade total', text: 'Histórico para auditoria e prestação de contas.' },
    ],
    comparison: [
      { manual: 'Contagem manual em caderno', sistema: 'Inventário digital sempre atualizado' },
      { manual: 'Descobrir a falta na hora de usar', sistema: 'Alerta automático de estoque mínimo' },
      { manual: 'Medicamentos vencendo sem aviso', sistema: 'Controle de validade com antecedência' },
      { manual: 'Itens misturados entre residentes', sistema: 'Estoque individual por residente' },
      { manual: 'Sem histórico de movimentação', sistema: 'Entradas e saídas totalmente rastreadas' },
    ],
  },

  equipe: {
    slug: 'equipe',
    icon: UserCog,
    accent: 'purple',
    eyebrow: 'Equipe & RH',
    title: 'Uma equipe organizada é um cuidado mais seguro',
    subtitle: 'Funcionários, escalas, treinamentos e registros de acesso em um só lugar — com controle de quem fez o quê e quando.',
    heroBullets: [
      'Cadastro completo de funcionários e funções',
      'Treinamentos e certificações controlados',
      'Registros de acesso e auditoria',
    ],
    problem: {
      title: 'Gestão de pessoas no papel gera riscos trabalhistas e de cuidado',
      intro: 'Sem controle, faltam registros de treinamento, escalas claras e responsabilidades definidas.',
      pains: [
        { icon: Users, text: 'Dados de funcionários espalhados e desatualizados.' },
        { icon: GraduationCap, text: 'Treinamentos obrigatórios sem comprovação.' },
        { icon: Clock, text: 'Escalas confusas que geram furos no turno.' },
        { icon: Lock, text: 'Sem rastreio de quem acessou o quê no sistema.' },
      ],
    },
    solution: {
      title: 'Toda a equipe sob gestão, com responsabilidade',
      description: 'O módulo de equipe organiza funcionários, escalas e treinamentos, e registra acessos — dando transparência e segurança jurídica à operação.',
      highlights: [
        { icon: UserCheck, title: 'Cadastro e funções', text: 'Cargos, registros profissionais e turnos definidos.' },
        { icon: GraduationCap, title: 'Treinamentos', text: 'Certificações com validade e comprovação.' },
        { icon: Lock, title: 'Registros de acesso', text: 'Auditoria de ações por usuário.' },
      ],
    },
    benefits: [
      { icon: UserCheck, title: 'Equipe organizada', text: 'Funções e turnos claros para todos.' },
      { icon: GraduationCap, title: 'Conformidade de treinamentos', text: 'Comprove a capacitação exigida por lei.' },
      { icon: Lock, title: 'Acesso controlado', text: 'Permissões por perfil e auditoria.' },
      { icon: ShieldCheck, title: 'Segurança jurídica', text: 'Registros que protegem a instituição.' },
      { icon: Clock, title: 'Escalas sem furos', text: 'Cobertura de turnos garantida.' },
      { icon: ClipboardList, title: 'Responsabilidade clara', text: 'Saiba quem fez cada registro.' },
    ],
    comparison: [
      { manual: 'Cadastros de equipe em papel', sistema: 'Ficha digital completa por funcionário' },
      { manual: 'Treinamentos sem comprovação', sistema: 'Certificações com validade controlada' },
      { manual: 'Escalas em quadro branco', sistema: 'Escalas organizadas e visíveis' },
      { manual: 'Sem rastreio de acessos', sistema: 'Log de auditoria por usuário' },
      { manual: 'Permissões abertas a todos', sistema: 'Acesso por perfil e função' },
    ],
  },

  relatorios: {
    slug: 'relatorios',
    icon: BarChart3,
    accent: 'cyan',
    eyebrow: 'Relatórios & Indicadores',
    title: 'Decisões melhores começam com dados na tela',
    subtitle: 'Indicadores de ocupação, saúde, financeiro e equipe em tempo real — e relatórios de conformidade prontos para a vigilância sanitária.',
    heroBullets: [
      'Dashboards com KPIs em tempo real',
      'Relatórios de conformidade (RDC ANVISA)',
      'Exportação em PDF com poucos cliques',
    ],
    problem: {
      title: 'Gestão sem indicadores é gestão no escuro',
      intro: 'Sem dados consolidados, decisões viram achismo e auditorias viram pesadelo.',
      pains: [
        { icon: PieChart, text: 'Indicadores calculados à mão, quando são calculados.' },
        { icon: FileText, text: 'Relatórios para fiscalização montados às pressas.' },
        { icon: Clock, text: 'Horas compilando dados de várias planilhas.' },
        { icon: AlertTriangle, text: 'Problemas percebidos tarde demais.' },
      ],
    },
    solution: {
      title: 'Seus números, claros e prontos para agir',
      description: 'O módulo de relatórios consolida os dados de todos os módulos em dashboards e relatórios de conformidade exportáveis — sem trabalho manual.',
      highlights: [
        { icon: BarChart3, title: 'Dashboards em tempo real', text: 'Ocupação, saúde, financeiro e equipe num olhar.' },
        { icon: FileText, title: 'Conformidade RDC', text: 'Relatórios alinhados às exigências da ANVISA.' },
        { icon: Download, title: 'Exportação em PDF', text: 'Documentos prontos para imprimir ou enviar.' },
      ],
    },
    benefits: [
      { icon: BarChart3, title: 'Visão completa', text: 'Todos os indicadores em um só lugar.' },
      { icon: FileText, title: 'Auditoria tranquila', text: 'Relatórios de conformidade sempre prontos.' },
      { icon: Clock, title: 'Zero trabalho manual', text: 'Dados consolidados automaticamente.' },
      { icon: TrendingUp, title: 'Decisões ágeis', text: 'Aja sobre tendências, não suposições.' },
      { icon: Download, title: 'Compartilhamento fácil', text: 'Exporte e envie em segundos.' },
      { icon: PieChart, title: 'Indicadores visuais', text: 'Gráficos que qualquer gestor entende.' },
    ],
    comparison: [
      { manual: 'KPIs calculados manualmente', sistema: 'Dashboards atualizados em tempo real' },
      { manual: 'Relatórios de fiscalização às pressas', sistema: 'Conformidade RDC sempre pronta' },
      { manual: 'Dados em planilhas separadas', sistema: 'Indicadores consolidados de todos os módulos' },
      { manual: 'Decisão por intuição', sistema: 'Decisão baseada em dados' },
      { manual: 'Exportação trabalhosa', sistema: 'PDF gerado em poucos cliques' },
    ],
  },

  nutricao: {
    slug: 'nutricao',
    icon: Utensils,
    accent: 'orange',
    eyebrow: 'Alimentação & Nutrição',
    title: 'Nutrição individualizada, do plano ao prato',
    subtitle: 'Planos dietéticos por residente, cardápios e acompanhamento de aceitação das refeições — com alertas para quem está comendo pouco.',
    heroBullets: [
      'Plano alimentar individual por residente',
      'Registro de aceitação por refeição',
      'Alertas de baixa aceitação alimentar',
    ],
    problem: {
      title: 'A alimentação errada compromete a saúde do idoso',
      intro: 'Sem controle, restrições são esquecidas e quem come pouco passa despercebido.',
      pains: [
        { icon: Apple, text: 'Restrições e alergias alimentares esquecidas na cozinha.' },
        { icon: Soup, text: 'Sem registro de quem aceitou ou recusou a refeição.' },
        { icon: AlertTriangle, text: 'Perda de peso percebida tarde demais.' },
        { icon: ClipboardList, text: 'Cardápios desconectados das prescrições.' },
      ],
    },
    solution: {
      title: 'Cada refeição alinhada à necessidade de cada um',
      description: 'O módulo de nutrição mantém planos dietéticos individuais, registra a aceitação por refeição e alerta sobre baixa ingestão — protegendo a saúde do residente.',
      highlights: [
        { icon: Utensils, title: 'Planos dietéticos', text: 'Consistência, tipo e restrições por residente.' },
        { icon: ClipboardList, title: 'Registro de aceitação', text: 'Percentual aceito em cada refeição.' },
        { icon: Bell, title: 'Alertas de ingestão', text: 'Avisos quando a aceitação cai.' },
      ],
    },
    benefits: [
      { icon: Apple, title: 'Restrições respeitadas', text: 'Alergias e dietas sempre visíveis à cozinha.' },
      { icon: Bell, title: 'Detecção precoce', text: 'Identifique baixa aceitação antes que vire problema.' },
      { icon: Utensils, title: 'Cardápios alinhados', text: 'Refeições conforme a prescrição.' },
      { icon: Activity, title: 'Saúde acompanhada', text: 'Aceitação ligada ao estado do residente.' },
      { icon: PieChart, title: 'Visão nutricional', text: 'Distribuição de dietas num olhar.' },
      { icon: ClipboardList, title: 'Registro confiável', text: 'Histórico de cada refeição.' },
    ],
    comparison: [
      { manual: 'Restrições anotadas em papel na cozinha', sistema: 'Plano dietético digital por residente' },
      { manual: 'Sem registro de aceitação', sistema: 'Aceitação registrada por refeição' },
      { manual: 'Perda de peso percebida tarde', sistema: 'Alertas de baixa ingestão' },
      { manual: 'Cardápio genérico para todos', sistema: 'Refeições individualizadas' },
      { manual: 'Sem visão nutricional do todo', sistema: 'Indicadores de dieta consolidados' },
    ],
  },

  agenda: {
    slug: 'agenda',
    icon: Calendar,
    accent: 'indigo',
    eyebrow: 'Agenda & Atividades',
    title: 'Toda a rotina da instituição em um calendário só',
    subtitle: 'Consultas médicas, terapias, visitas de familiares e atividades — organizadas em uma agenda integrada que toda a equipe acompanha.',
    heroBullets: [
      'Calendário integrado de eventos e consultas',
      'Atividades, terapias e visitas organizadas',
      'Eventos vinculados a cada residente',
    ],
    problem: {
      title: 'Agendas soltas geram conflitos e esquecimentos',
      intro: 'Consultas, terapias e visitas em papéis diferentes se perdem ou se sobrepõem.',
      pains: [
        { icon: Calendar, text: 'Compromissos anotados em vários lugares.' },
        { icon: AlertTriangle, text: 'Consultas médicas esquecidas ou em conflito.' },
        { icon: Users, text: 'Famílias sem previsibilidade das visitas.' },
        { icon: Clock, text: 'Atividades de lazer sem planejamento.' },
      ],
    },
    solution: {
      title: 'Uma agenda que toda a equipe enxerga',
      description: 'O módulo de agenda reúne consultas, terapias, visitas e atividades em um calendário único, com tipos coloridos e vínculo ao residente.',
      highlights: [
        { icon: CalendarCheck, title: 'Calendário integrado', text: 'Todos os eventos em uma visão mensal clara.' },
        { icon: MapPin, title: 'Eventos por tipo', text: 'Médico, visita, terapia, atividade e reunião.' },
        { icon: Users, title: 'Vínculo ao residente', text: 'Saiba a agenda de cada pessoa.' },
      ],
    },
    benefits: [
      { icon: CalendarCheck, title: 'Zero conflitos', text: 'Visão única evita sobreposição de horários.' },
      { icon: Bell, title: 'Nada esquecido', text: 'Consultas e terapias sempre visíveis.' },
      { icon: Users, title: 'Famílias informadas', text: 'Visitas organizadas e previsíveis.' },
      { icon: Clock, title: 'Rotina planejada', text: 'Atividades de lazer no calendário.' },
      { icon: MapPin, title: 'Organização por tipo', text: 'Identifique cada evento num olhar.' },
      { icon: Activity, title: 'Equipe alinhada', text: 'Todos sabem o que acontece no dia.' },
    ],
    comparison: [
      { manual: 'Compromissos em vários papéis', sistema: 'Calendário único e integrado' },
      { manual: 'Consultas esquecidas', sistema: 'Eventos sempre visíveis para a equipe' },
      { manual: 'Visitas sem previsibilidade', sistema: 'Agenda de visitas organizada' },
      { manual: 'Atividades sem planejamento', sistema: 'Rotina de lazer planejada' },
      { manual: 'Sem vínculo com o residente', sistema: 'Eventos ligados a cada residente' },
    ],
  },

  ia: {
    slug: 'ia',
    icon: Brain,
    accent: 'violet',
    eyebrow: 'IA Assistente',
    title: 'Inteligência artificial a serviço do cuidado',
    subtitle: 'Resumos clínicos automáticos, análise de dados e insights que ajudam sua equipe a priorizar quem precisa de mais atenção — hoje.',
    heroBullets: [
      'Resumos clínicos gerados automaticamente',
      'Insights sobre quem precisa de atenção',
      'Análise de dados sem esforço manual',
    ],
    problem: {
      title: 'Há informação demais e tempo de menos',
      intro: 'Os dados existem, mas extrair conclusões úteis manualmente é inviável no dia a dia.',
      pains: [
        { icon: FileText, text: 'Resumir prontuários longos consome tempo da equipe.' },
        { icon: Search, text: 'Padrões e riscos passam despercebidos no volume de dados.' },
        { icon: Clock, text: 'Priorizar quem precisa de atenção depende de memória.' },
        { icon: AlertTriangle, text: 'Sinais de alerta diluídos entre tantos registros.' },
      ],
    },
    solution: {
      title: 'Seu copiloto inteligente na gestão do cuidado',
      description: 'A IA Assistente lê os dados dos residentes e entrega resumos, alertas e sugestões — para sua equipe agir onde mais importa, com menos esforço.',
      highlights: [
        { icon: Sparkles, title: 'Resumos automáticos', text: 'Síntese clínica do residente em segundos.' },
        { icon: Brain, title: 'Insights acionáveis', text: 'Sugestões de prioridade baseadas nos dados.' },
        { icon: MessageSquare, title: 'Pergunte em linguagem natural', text: 'Tire dúvidas sobre seus dados conversando.' },
      ],
    },
    benefits: [
      { icon: Sparkles, title: 'Resumos instantâneos', text: 'Entenda o residente sem ler tudo.' },
      { icon: Brain, title: 'Priorização inteligente', text: 'Saiba quem precisa de atenção hoje.' },
      { icon: Clock, title: 'Tempo de volta', text: 'Menos análise manual, mais cuidado.' },
      { icon: TrendingUp, title: 'Decisões melhores', text: 'Insights apoiados em dados reais.' },
      { icon: Eye, title: 'Nada passa batido', text: 'Sinais de alerta destacados.' },
      { icon: MessageSquare, title: 'Respostas rápidas', text: 'Converse com seus dados.' },
    ],
    comparison: [
      { manual: 'Resumir prontuários manualmente', sistema: 'Resumos clínicos gerados pela IA' },
      { manual: 'Riscos percebidos por acaso', sistema: 'Insights destacam quem precisa de atenção' },
      { manual: 'Priorização pela memória', sistema: 'Sugestões baseadas em dados' },
      { manual: 'Análise de dados inviável', sistema: 'Análise automática e contínua' },
      { manual: 'Dúvidas sem resposta rápida', sistema: 'Pergunte em linguagem natural' },
    ],
  },
};

/** Ordem de exibição (hub e navegação). */
export const FEATURE_ORDER: string[] = [
  'residentes', 'saude', 'financeiro', 'estoque', 'equipe', 'relatorios', 'nutricao', 'agenda', 'ia',
];

export const FEATURE_LIST: FeatureContent[] = FEATURE_ORDER.map(slug => FEATURES[slug]);

export const getFeature = (slug: string): FeatureContent | undefined => FEATURES[slug];
