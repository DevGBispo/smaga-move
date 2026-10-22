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
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);

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
    if (!session || !supabase) {
      setName('');
      setAuthorized(false);
      setCheckingAccess(false);
      return;
    }
    let cancelled = false;
    setAuthorized(false);
    setCheckingAccess(true);
    supabase.from('profiles').select('display_name, active, role').eq('id', session.user.id).single()
      .then(({ data, error: profileError }) => {
        if (cancelled) return;
        setCheckingAccess(false);
        if (profileError || !data?.active) {
          setError(profileError ? 'Não foi possível verificar a autorização do perfil.' : 'Sua conta ainda não foi ativada pela administração.');
          setAuthorized(false);
          return;
        }
        setName(data.display_name || session.user.email || 'Operador');
        setError('');
        setAuthorized(true);
      });
    return () => { cancelled = true; };
  }, [session?.user.id]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!supabase) return;
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      console.error('Falha de autenticação SMAGA Move:', { code: authError.code, status: authError.status, message: authError.message });
      if (authError.code === 'invalid_credentials') setError('E-mail ou senha incorretos. Utilize a senha definida para este usuário no Supabase Auth.');
      else if (authError.code === 'email_not_confirmed') setError('O e-mail desta conta ainda não foi confirmado.');
      else if (authError.status === 429) setError('Muitas tentativas de autenticação. Tente novamente após o limite do Supabase ser liberado.');
      else setError(`Falha na autenticação (${authError.code || authError.status || 'desconhecida'}). Consulte o Console para o detalhe.`);
    }
  }

  if (!configured) return <main className="page"><section className="panel"><h1>SMAGA <em>Move</em></h1><p>Configure o arquivo <code>.env.local</code> com a URL e a chave pública do Supabase.</p></section></main>;
  if (loading) return <main className="page"><section className="panel"><p>Carregando sessão...</p></section></main>;
  if (!session) return <main className="page"><section className="panel"><small>S.MAGALHÃES & ESSEMAGA · DESDE 1920</small><h1>SMAGA <em>Move</em></h1><p>Gestão Operacional de Transporte</p><form onSubmit={login}><label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/></label><label>Senha<input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/></label>{error && <p role="alert" className="error">{error}</p>}<button type="submit">Entrar</button></form><p className="muted">Contas criadas e aprovadas pela administração.</p></section></main>;
  if (checkingAccess || !authorized) return <main className="page"><section className="panel"><h1>SMAGA <em>Move</em></h1><p>{checkingAccess ? "Verificando autorização..." : (error || "Acesso não autorizado.")}</p><button onClick={() => supabase?.auth.signOut()}>Sair</button></section></main>;
  return <div className="shell"><aside><div className="brand">SMAGA <em>Move</em></div><div className="muted">S.Magalhães & Essemaga</div><nav><div className="active">Visão geral</div><div>Operações — em construção</div><div>Motoristas — em construção</div><div>Chamada — em construção</div><div>Embarque — em construção</div></nav></aside><main className="workspace"><header><span>Fundação do sistema</span><button className="secondary" onClick={() => supabase?.auth.signOut()}>Sair</button></header><section className="panel"><small>AMBIENTE INICIAL</small><h1>Bem-vindo, {name}</h1><p>Autenticação conectada. Os módulos operacionais serão desenvolvidos sobre tabelas relacionais e regras transacionais.</p><p className="muted">Nenhum fluxo de embarque está liberado para uso nesta versão inicial.</p></section></main></div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
