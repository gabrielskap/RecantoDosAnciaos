import React, { useState, useEffect } from 'react';
import DemoLogin from './DemoLogin';
import DemoLayout from './DemoLayout';

const AUTH_KEY = 'recanto_demo_auth';

/**
 * Raiz do painel de demonstração (/demo).
 * Gate de "login" cosmético com persistência em sessionStorage para sobreviver
 * a reloads dentro da demo. Sem AuthProvider — todos os dados são mockados.
 */
const DemoApp: React.FC = () => {
  const [authed, setAuthed] = useState<boolean>(() => sessionStorage.getItem(AUTH_KEY) === '1');

  useEffect(() => {
    document.title = 'Demonstração | RecantoCare';
  }, []);

  const login = () => { sessionStorage.setItem(AUTH_KEY, '1'); setAuthed(true); };
  const logout = () => { sessionStorage.removeItem(AUTH_KEY); setAuthed(false); };

  if (!authed) return <DemoLogin onLogin={login} />;
  return <DemoLayout onLogout={logout} />;
};

export default DemoApp;
