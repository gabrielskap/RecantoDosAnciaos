-- ==========================================================================
-- RECANTO DOS ANCIÃOS — Backfill: ligar prescrições existentes ao Inventário
-- Data: 2026-08-25
--
-- Contexto: a baixa automática de estoque pelo Boletim Diurno/Noturno
-- (App.tsx, "debitarPorBoletim") já funciona, mas só debita quando existe um
-- item em Recanto_InventarioMedicamentos vinculado à prescrição. Prescrições
-- cadastradas em Recanto_Medicacoes antes de o Inventário existir (ou fora
-- dele) não têm esse vínculo, então a baixa silenciosamente não encontra o
-- que debitar. Este script varre todas as prescrições ativas de todas as
-- empresas e garante que cada uma tenha um item de Inventário correspondente.
--
-- Regra de ouro: nunca inventar estoque físico que ninguém contou. Itens
-- novos nascem com saldo 0 (aparecem no alerta "Esgotado" da aba até alguém
-- registrar a entrada real) e, quando a dosagem só informa potência (ex.:
-- "500mg", sem dizer quantos comprimidos), a forma cai em modo genérico de
-- contagem por dose em vez de adivinhar a composição do comprimido.
--
-- Idempotente: seguro rodar mais de uma vez (NOT EXISTS por medicacao_id +
-- vínculo por nome antes de criar duplicata).
-- ==========================================================================

DO $$
DECLARE
  rm RECORD;
  v_existing_id UUID;
  v_dtxt TEXT;
  v_freq TEXT;
  v_match TEXT[];
  v_num NUMERIC;
  v_unit TEXT;
  v_forma TEXT;
  v_conc_unidade TEXT;
  v_dose_por_tomada NUMERIC;
  v_concentracao_valor NUMERIC;
  v_tomadas_por_dia NUMERIC;
  v_hours NUMERIC;
  v_linked INT := 0;
  v_created INT := 0;
BEGIN
  FOR rm IN
    SELECT m.id, m.resident_id, m.name, m.dosage, m.frequency, m.created_at,
           r.empresa_id
    FROM public."Recanto_Medicacoes" m
    JOIN public."Recanto_Residentes" r ON r.id = m.resident_id
    WHERE (m.end_date IS NULL OR m.end_date >= CURRENT_DATE)
      AND r.status = 'ativo'
      AND NOT EXISTS (
        SELECT 1 FROM public."Recanto_InventarioMedicamentos" im
        WHERE im.medicacao_id = m.id
      )
  LOOP
    -- ── Já existe item de Inventário para esse residente com o mesmo nome,
    -- só sem o vínculo (cadastrado manualmente antes)? Vincula em vez de
    -- criar um item novo zerado, para não perder saldo/histórico reais e não
    -- disputar prioridade com o item que já tem estoque de verdade.
    SELECT id INTO v_existing_id
    FROM public."Recanto_InventarioMedicamentos"
    WHERE resident_id = rm.resident_id
      AND medicacao_id IS NULL
      AND lower(nome) = lower(rm.name)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public."Recanto_InventarioMedicamentos"
      SET medicacao_id = rm.id
      WHERE id = v_existing_id;
      v_linked := v_linked + 1;
      CONTINUE;
    END IF;

    -- ── Parse da dosagem (texto livre, ex.: "500mg", "2 comprimidos", "20 gotas") ──
    v_dtxt := lower(rm.dosage);
    v_match := regexp_match(
      v_dtxt,
      '(\d+(?:[.,]\d+)?)\s*(mg|mcg|ml|g|ui|gotas?|gts?|compr\w*|c[aá]psul\w*|ampolas?|amp\.?|sach[eê]s?)'
    );

    v_forma := NULL;
    v_num := NULL;

    IF v_match IS NOT NULL THEN
      v_num := replace(v_match[1], ',', '.')::NUMERIC;
      v_unit := v_match[2];
      v_forma := CASE
        WHEN v_unit LIKE 'compr%'            THEN 'comprimido'
        WHEN v_unit LIKE 'c_psul%'           THEN 'capsula'
        WHEN v_unit LIKE 'gota%' OR v_unit LIKE 'gt%' THEN 'gota'
        WHEN v_unit LIKE 'ampola%' OR v_unit LIKE 'amp%' THEN 'ampola'
        WHEN v_unit LIKE 'sach%'             THEN 'sache'
        WHEN v_unit = 'ml'                   THEN 'ml'
        ELSE NULL -- mg/mcg/g/ui: só a potência, não a forma física contável
      END;
    END IF;

    IF v_forma IS NOT NULL AND v_num IS NOT NULL AND v_num > 0 THEN
      -- Forma física contável: a própria dosagem já diz quantas unidades por tomada.
      v_concentracao_valor := 1;
      v_conc_unidade := CASE v_forma
        WHEN 'comprimido' THEN 'comprimido'
        WHEN 'capsula'    THEN 'cápsula'
        WHEN 'gota'       THEN 'gota'
        WHEN 'ampola'     THEN 'ampola'
        WHEN 'sache'      THEN 'sachê'
        WHEN 'ml'         THEN 'ml'
      END;
      v_dose_por_tomada := v_num;
    ELSE
      -- Só a potência (ex.: "500mg") ou texto não reconhecido: sem a
      -- concentração real do comprimido/frasco não dá pra converter em
      -- unidades físicas sem adivinhar. Conta por dose administrada.
      v_forma := 'outro';
      v_concentracao_valor := 1;
      v_conc_unidade := 'dose';
      v_dose_por_tomada := 1;
    END IF;

    -- ── Parse da frequência (rótulos padrão do app + texto legado) ──
    v_freq := lower(rm.frequency);
    v_tomadas_por_dia := NULL;

    IF v_freq LIKE 'semanal%' THEN
      v_tomadas_por_dia := 1.0 / 7;
    ELSE
      v_hours := NULL;
      v_match := regexp_match(v_freq, '^(\d+)h');
      IF v_match IS NOT NULL THEN
        v_hours := v_match[1]::NUMERIC;
      END IF;

      IF v_hours IS NOT NULL AND v_hours > 0 THEN
        v_tomadas_por_dia := 24.0 / v_hours;
      ELSIF v_freq LIKE '%necess%' OR v_freq LIKE '%s/n%' OR v_freq LIKE '%sos%' THEN
        v_tomadas_por_dia := NULL; -- PRN: sem taxa prevista, sem forecast inventado
      ELSE
        v_match := regexp_match(v_freq, '(\d+)\s*x');
        IF v_match IS NOT NULL THEN
          v_tomadas_por_dia := v_match[1]::NUMERIC;
        ELSIF v_freq LIKE '%di_rio%' THEN
          v_tomadas_por_dia := 1;
        END IF;
      END IF;
    END IF;

    INSERT INTO public."Recanto_InventarioMedicamentos" (
      empresa_id, resident_id, medicacao_id, nome, forma,
      concentracao_valor, concentracao_unidade, dose_por_tomada, tomadas_por_dia,
      estoque_minimo_unidades, observacoes
    ) VALUES (
      rm.empresa_id, rm.resident_id, rm.id, rm.name, v_forma,
      v_concentracao_valor, v_conc_unidade, v_dose_por_tomada, v_tomadas_por_dia,
      0,
      'Criado automaticamente a partir da prescrição cadastrada em ' ||
      to_char(rm.created_at, 'DD/MM/YYYY') ||
      '. Confira forma/concentração e registre a entrada de estoque real para iniciar o controle.'
    );

    v_created := v_created + 1;
  END LOOP;

  RAISE NOTICE 'Inventário de medicamentos: % itens existentes vinculados, % itens novos criados.', v_linked, v_created;
END $$;
