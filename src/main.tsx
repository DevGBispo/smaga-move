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
  const [signingIn, setSigningIn] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'recovery'>('login');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'home' | 'users'>('home');
  const [staff, setStaff] = useState<Array<{id:string;display_name:string;role:string;active:boolean;profile_sectors:Array<{sector:string}>}>>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffNotice, setStaffNotice] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('operator');
  const [inviteSectors, setInviteSectors] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      setIsAdmin(false);
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
        setIsAdmin(data.role === 'admin');
        setError('');
        setAuthorized(true);
      });
    return () => { cancelled = true; };
  }, [session?.user.id]);

  async function loadStaff() {
    if (!supabase || !isAdmin) return;
    setStaffLoading(true); setStaffError('');
    const { data, error: loadError } = await supabase.from('profiles').select('id,display_name,role,active,profile_sectors(sector)').order('created_at', {ascending:false});
    setStaffLoading(false);
    if (loadError) setStaffError('Não foi possível carregar os funcionários.');
    else setStaff((data || []) as typeof staff);
  }

  async function manageStaff(payload: Record<string, unknown>) {
    if (!supabase || !isAdmin || busy) return;
    setBusy(true); setStaffError(''); setStaffNotice('');
    const { data, error: manageError } = await supabase.functions.invoke('manage-staff', {body:payload});
    setBusy(false);
    if (manageError || data?.error) { setStaffError(data?.error || 'Falha na operação. Verifique as permissões ou tente novamente.'); return; }
    setStaffNotice(payload.action === 'invite' ? 'Convite solicitado. Confira o e-mail do funcionário.' : 'Funcionário atualizado.');
    setEditingId(null); setInviteEmail(''); setInviteName(''); setInviteRole('operator'); setInviteSectors([]);
    await loadStaff();
  }

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
    setNewPassword(''); setConfirmPassword(''); setMode('login');
    await supabase.auth.signOut();
    setNotice('Senha atualizada. Entre novamente com sua nova senha.');
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
      if (!authError) return;
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
  const sectorNames: Record<string,string> = {operations:'Operações',full:'Cheios',empty:'Vazios'};
  const roleNames: Record<string,string> = {admin:'Administrador',manager:'Gestor',operator:'Operador'};
  if (checkingAccess || !authorized) return <main className="page"><section className="panel"><h1>SMAGA <em>Move</em></h1><p>{checkingAccess ? "Verificando autorização..." : (error || "Acesso não autorizado.")}</p><button onClick={() => supabase?.auth.signOut()}>Sair</button></section></main>;
  return <div className="shell"><aside><div className="brand">SMAGA <em>Move</em></div><div className="muted">S.Magalhães & Essemaga</div><nav><button className={view === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => setView('home')}>Visão geral</button>{isAdmin && <button className={view === 'users' ? 'nav-item active' : 'nav-item'} onClick={() => {setView('users'); void loadStaff();}}>Gestão de usuários</button>}<div>Operações — em construção</div><div>Motoristas — em construção</div><div>Chamada — em construção</div><div>Embarque — em construção</div></nav></aside><main className="workspace"><header><span>{view === 'users' ? 'Administração / Usuários' : 'Fundação do sistema'}</span><button className="secondary" onClick={() => supabase?.auth.signOut()}>Sair</button></header>{view === 'users' && isAdmin ? <section className="admin-area"><div className="admin-heading"><div><small>CONTROLE DE ACESSO</small><h1>Gestão de usuários</h1><p className="muted">Convide funcionários, atribua funções e gerencie setores.</p></div><button className="secondary" onClick={() => void loadStaff()} disabled={staffLoading}>Atualizar</button></div>{staffError && <p role="alert" className="error">{staffError}</p>}{staffNotice && <p role="status">{staffNotice}</p>}<section className="panel admin-panel"><h2>Convidar funcionário</h2><form onSubmit={e => {e.preventDefault();void manageStaff({action:'invite',email:inviteEmail,name:inviteName,role:inviteRole,sectors:inviteSectors});}}><div className="form-grid"><label>Nome<input required value={inviteName} maxLength={100} onChange={e => setInviteName(e.target.value)}/></label><label>E-mail<input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}/></label><label>Função<select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>{Object.entries(roleNames).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><fieldset><legend>Setores autorizados</legend>{Object.entries(sectorNames).map(([key,label]) => <label className="check-label" key={key}><input type="checkbox" checked={inviteSectors.includes(key)} onChange={e => setInviteSectors(old => e.target.checked ? [...old,key] : old.filter(x => x !== key))}/>{label}</label>)}</fieldset><button disabled={busy}>{busy ? 'Processando...' : 'Enviar convite'}</button></form></section><section className="panel admin-panel"><h2>Funcionários cadastrados</h2>{staffLoading ? <p>Carregando...</p> : staff.length === 0 ? <p className="muted">Nenhum funcionário disponível.</p> : <div className="staff-list">{staff.map(person => <div className="staff-row" key={person.id}><div><strong>{person.display_name || 'Sem nome'}</strong><div className="muted">{roleNames[person.role] || person.role} · {person.active ? 'Ativo' : 'Inativo'} · {person.profile_sectors?.map(s => sectorNames[s.sector] || s.sector).join(', ') || 'Sem setor'}</div></div><button className="secondary" onClick={() => setEditingId(editingId === person.id ? null : person.id)}>{editingId === person.id ? 'Cancelar' : 'Editar'}</button>{editingId === person.id && <form className="edit-form" key={person.id} onSubmit={e => {e.preventDefault();const fd=new FormData(e.currentTarget);void manageStaff({action:'update',id:person.id,name:String(fd.get('name')),role:String(fd.get('role')),active:fd.get('active') === 'on',sectors:fd.getAll('sectors')});}}><label>Nome<input name="name" required defaultValue={person.display_name}/></label><label>Função<select name="role" defaultValue={person.role}>{Object.entries(roleNames).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="check-label"><input type="checkbox" name="active" defaultChecked={person.active}/>Conta ativa</label><fieldset><legend>Setores</legend>{Object.entries(sectorNames).map(([key,label]) => <label className="check-label" key={key}><input type="checkbox" name="sectors" value={key} defaultChecked={person.profile_sectors?.some(s => s.sector === key)}/>{label}</label>)}</fieldset><button disabled={busy}>Salvar alterações</button></form>}</div>)}</div>}</section></section> : <section className="panel"><small>AMBIENTE INICIAL</small><h1>Bem-vindo, {name}</h1><p>Autenticação conectada. Os módulos operacionais serão desenvolvidos sobre tabelas relacionais e regras transacionais.</p><p className="muted">Nenhum fluxo de embarque está liberado para uso nesta versão inicial.</p></section>}</main></div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
