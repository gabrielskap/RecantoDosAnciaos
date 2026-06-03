import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';

const QUICK_PROMPTS = [
  'Resumo de saúde dos residentes',
  'Sugestão de cardápio semanal',
  'Verificar conformidade RDC 502',
  'Análise de custos do mês',
];

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    {
      role: 'ai',
      text: 'Olá! Sou o assistente inteligente do Recanto dos Anciãos. Posso ajudar com análises de prontuários, dúvidas sobre legislações (RDC 502), sugestões de cardápios ou gestão financeira. Como posso ajudar hoje?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim()) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    const context = 'Ocupação atual: 85%. 2 Residentes com febre nas últimas 24h. Estoque de Dipirona baixo.';
    const response = await generateAIResponse(msg, context);
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setLoading(false);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white rounded-2xl shadow-sm shadow-violet-100/40 overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 to-indigo-800 px-6 py-4 text-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="font-bold text-base">Assistente IA · Recanto dos Anciãos</h2>
          <p className="text-xs text-violet-200">Inteligência Artificial Integrada</p>
        </div>
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-full transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F8F7FF]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-line ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm shadow-violet-50'
            }`}>
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-slate-500" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              <span className="text-xs text-slate-400">Pensando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite sua pergunta..."
            className="flex-1 bg-[#F8F7FF] border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            aria-label="Enviar mensagem"
            className="w-10 h-10 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
