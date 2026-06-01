import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Olá! Sou o assistente inteligente do Recanto dos Anciãos. Posso ajudar com análises de prontuários, dúvidas sobre legislações (RDC 502), sugestões de cardápios ou gestão financeira. Como posso ajudar hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Context mock - in a real app, this would pull from the current active store slice
    const contextMock = "Ocupação atual: 85%. 2 Residentes com febre nas últimas 24h. Estoque de Dipirona baixo.";
    
    const response = await generateAIResponse(userMsg, contextMock);
    
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setLoading(false);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-800 p-4 text-white flex items-center shadow-md">
        <Bot className="h-6 w-6 mr-3" />
        <div>
          <h2 className="font-semibold">Assistente Recanto dos Anciãos</h2>
          <p className="text-xs text-slate-300">Inteligência Artificial Integrada</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              <div className="flex items-start gap-2">
                {msg.role === 'ai' && <Bot size={16} className="mt-1 text-primary-500 shrink-0" />}
                <p className="text-sm whitespace-pre-line leading-relaxed">{msg.text}</p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-200 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-xs text-slate-400">Pensando...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

       <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua pergunta..."
            className="flex-1 border border-slate-300 rounded-lg px-4 py-3 sm:py-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-none text-base sm:text-sm h-11 bg-white"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-primary-600 hover:bg-primary-700 text-white w-11 h-11 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 shrink-0"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;