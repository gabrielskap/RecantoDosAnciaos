import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateAIResponse = async (
  prompt: string,
  contextData?: string
): Promise<string> => {
  if (!apiKey) {
    return "Erro: Chave de API não configurada.";
  }

  try {
    const model = "gemini-3-flash-preview";
    
    let fullPrompt = `Você é um assistente especialista em gestão de ILPI (Instituições de Longa Permanência para Idosos). 
    Sua função é auxiliar enfermeiros, administradores e cuidadores.
    Seja conciso, profissional e empático. Responda em Português do Brasil.
    
    `;

    if (contextData) {
      fullPrompt += `CONTEXTO ATUAL DO SISTEMA (DADOS):
      ${contextData}
      
      Baseado nos dados acima, responda a seguinte pergunta do usuário:
      "${prompt}"`;
    } else {
      fullPrompt += `Pergunta do usuário: "${prompt}"`;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
    });

    return response.text || "Não foi possível gerar uma resposta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Desculpe, ocorreu um erro ao comunicar com a Inteligência Artificial. Verifique sua conexão.";
  }
};

export const analyzeFinancialData = async (data: any): Promise<string> => {
  const prompt = "Analise estes dados financeiros (Receitas vs Despesas). Identifique tendências, alertas de fluxo de caixa e sugira melhorias para a saúde financeira da instituição.";
  return generateAIResponse(prompt, JSON.stringify(data));
};

export const summarizePatientHealth = async (patientData: any): Promise<string> => {
  const prompt = "Crie um resumo clínico conciso deste residente para passagem de plantão. Destaque sinais vitais recentes, alergias e medicações críticas.";
  return generateAIResponse(prompt, JSON.stringify(patientData));
};