import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import { supabase, configured } from './supabase';
import './style.css';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    client.auth.getSession().then(({ data, error: authError }) => {
      if (authError) setError('Não foi possível recuperar a sessão.');
      setSession(data.session); setLoading(false);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) { setName(''); return; }
    const client = supabase;
    client.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data }) => setName(data?.display_name || session.user.email || 'Operador'));
  }, [session]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!supabase) return;
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError('Não foi possível entrar. Verifique suas credenciais e autorização.');
  }

  if (!configured) return <main className="page"><section className="panel"><h1>SMAGA <em>Move</em></h1><p>Configure o arquivo <code>.env.local</code> com a URL e a chave pública do Supabase.</p></section></main>;
  if (loading) return <main className="page"><section className="panel"><p>Carregando sessão...</p></section></main>;
  if (!session) return <main className="page"><section className="panel"><small>S.MAGALHÃES & ESSEMAGA · DESDE 1920</small><h1>SMAGA <em>Move</em></h1><p>Gestão Operacional de Transporte</p><form onSubmit={login}><label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/></label><label>Senha<input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/></label>{error && <p role="alert" className="error">{error}</p>}<button type="submit">Entrar</button></form><p className="muted">Contas criadas e aprovadas pela administração.</p></section></main>;
  return <div className="shell"><aside><div className="brand">SMAGA <em>Move</em></div><div className="muted">S.Magalhães & Essemaga</div><nav><div className="active">Visão geral</div><div>Operações — em construção</div><div>Motoristas — em construção</div><div>Chamada — em construção</div><div>Embarque — em construção</div></nav></aside><main className="workspace"><header><span>Fundação do sistema</span><button className="secondary" onClick={() => supabase?.auth.signOut()}>Sair</button></header><section className="panel"><small>AMBIENTE INICIAL</small><h1>Bem-vindo, {name}</h1><p>Autenticação conectada. Os módulos operacionais serão desenvolvidos sobre tabelas relacionais e regras transacionais.</p><p className="muted">Nenhum fluxo de embarque está liberado para uso nesta versão inicial.</p></section></main></div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
