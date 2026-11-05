import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import { supabase, configured } from './supabase';
import './style.css';
import {installGlobalErrorMonitoring} from './error-monitor';

function App() {
  useEffect(()=>installGlobalErrorMonitoring(supabase,'operacional'),[]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'recovery'>('login');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    const recoveryLink = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery' || new URLSearchParams(window.location.search).get('type') === 'recovery';
    if (recoveryLink) setMode('recovery');
    client.auth.getSession().then(({ data, error: authError }) => {
      if (authError) setError('Não foi possível recuperar a sessão.');
      setSession(data.session); setLoading(false);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
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

  async function sendRecovery(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true); setError(''); setNotice('');
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/' });
    setBusy(false);
    if (recoveryError) setError('Não foi possível enviar o link. Verifique o e-mail ou tente novamente mais tarde.');
    else setNotice('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || busy) return;
    if (!session) { setError('Link inválido ou expirado. Solicite uma nova recuperação.'); return; }
    if (newPassword.length < 12) { setError('A nova senha deve ter pelo menos 12 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setBusy(true); setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) { setError('Não foi possível atualizar a senha. Solicite um novo link se ele tiver expirado.'); return; }
    setNewPassword(''); setConfirmPassword(''); setPassword(''); setMode('login');
    await supabase.auth.signOut({scope:'local'});
    setNotice('Senha atualizada no Supabase. Digite manualmente a nova senha para entrar; não utilize uma senha antiga salva pelo navegador.');
    window.history.replaceState({}, '', window.location.pathname);
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!supabase || signingIn) return;
    setSigningIn(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (!authError) { setPassword(''); return; }
      console.error('SMAGA Move - autenticação:', {
        name: authError.name,
        code: authError.code ?? null,
        status: authError.status ?? null,
        message: authError.message
      });
      const msg = authError.message?.toLowerCase() || '';
      if (authError.code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
        setError('E-mail ou senha incorretos. Confira a senha cadastrada no Supabase Authentication.');
      } else if (authError.code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
        setError('E-mail ainda não confirmado no Supabase Authentication.');
      } else if (authError.status === 429 || msg.includes('rate limit')) {
        setError('Limite temporário do Supabase atingido. Evite novas tentativas consecutivas.');
      } else if (msg.includes('failed to fetch') || msg.includes('fetch failed') || msg.includes('network') || msg.includes('load failed')) {
        setError('Não foi possível conectar ao Supabase. Confira a URL do projeto em .env.local, sua conexão e possíveis bloqueios no navegador.');
      } else {
        setError(`Supabase: ${authError.message || 'erro sem descrição'} (HTTP ${authError.status ?? 'indisponível'}).`);
      }
    } catch (cause) {
      console.error('SMAGA Move - falha de conexão:', cause);
      setError('Falha de conexão inesperada com o Supabase. Verifique URL, internet e bloqueios do navegador.');
    } finally {
      setSigningIn(false);
    }
  }

  if (!configured) return <main className="page"><section className="panel"><h1>SMAGA <em>Move</em></h1><p>Configure o arquivo <code>.env.local</code> com a URL e a chave pública do Supabase.</p></section></main>;
  if (loading) return <main className="page"><section className="panel"><p>Carregando sessão...</p></section></main>;
  if (mode === 'recovery') return <main className="page"><section className="panel"><small>SEGURANÇA DA CONTA</small><h1>Definir nova senha</h1><p>Escolha uma nova senha para continuar. O painel ficará bloqueado até a conclusão.</p><form onSubmit={savePassword}><label>Nova senha<input type="password" minLength={12} required autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)}/></label><label>Confirmar nova senha<input type="password" minLength={12} required autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></label>{error && <p role="alert" className="error">{error}</p>}<button disabled={busy || !session}>{busy ? 'Salvando...' : 'Salvar nova senha'}</button></form>{!session && <p className="muted">Validando link de recuperação. Se não funcionar, solicite outro link.</p>}<button className="text-button" onClick={async () => { await supabase?.auth.signOut(); setMode('forgot'); setError(''); }}>Solicitar outro link</button></section></main>;
  if (!session) return <main className="page"><section className="panel"><small>S.MAGALHÃES & ESSEMAGA · DESDE 1920</small><h1>SMAGA <em>Move</em></h1><p>Gestão Operacional de Transporte</p>{mode === 'forgot' ? <><h2>Recuperar acesso</h2><form onSubmit={sendRecovery}><label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/></label>{error && <p role="alert" className="error">{error}</p>}{notice && <p role="status">{notice}</p>}<button disabled={busy}>{busy ? 'Enviando...' : 'Enviar link de recuperação'}</button></form><button className="text-button" onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Voltar ao login</button></> : <><form onSubmit={login}><label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/></label><label>Senha<input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/></label>{error && <p role="alert" className="error">{error}</p>}{notice && <p role="status">{notice}</p>}<button type="submit" disabled={signingIn}>{signingIn ? 'Entrando...' : 'Entrar'}</button></form><button className="text-button" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }}>Esqueci minha senha</button><p className="muted">Contas criadas e aprovadas pela administração.</p></>}</section></main>;
  if (checkingAccess || !authorized) return <main className="page"><section className="panel"><h1>SMAGA <em>Move</em></h1><p>{checkingAccess ? "Verificando autorização..." : (error || "Acesso não autorizado.")}</p><button onClick={() => supabase?.auth.signOut()}>Sair</button></section></main>;
  return <div className="shell"><aside><div className="brand">SMAGA <em>Move</em></div><div className="muted">S.Magalhães & Essemaga</div><nav><div className="active">Visão geral</div><div>Operações — em construção</div><div>Motoristas — em construção</div><div>Chamada — em construção</div><div>Embarque — em construção</div></nav></aside><main className="workspace"><header><span>Fundação do sistema</span><button className="secondary" onClick={() => supabase?.auth.signOut()}>Sair</button></header><section className="panel"><small>AMBIENTE INICIAL</small><h1>Bem-vindo, {name}</h1><p>Autenticação conectada. Os módulos operacionais serão desenvolvidos sobre tabelas relacionais e regras transacionais.</p><p className="muted">Nenhum fluxo de embarque está liberado para uso nesta versão inicial.</p></section></main></div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
