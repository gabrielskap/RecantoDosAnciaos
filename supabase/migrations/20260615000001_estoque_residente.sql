-- Adiciona a coluna resident_id na tabela Recanto_Estoque para associar insumos a residentes específicos
ALTER TABLE public."Recanto_Estoque" 
ADD COLUMN resident_id UUID REFERENCES public."Recanto_Residentes"(id) ON DELETE CASCADE;
