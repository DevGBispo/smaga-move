import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Session} from '@supabase/supabase-js';
import {supabase} from './supabase';
import './style.css';
import {recordError,installGlobalErrorMonitoring} from './error-monitor';

type ErrorEventRow={id:string;occurred_at:string;application:string;module:string;operation:string;severity:string;message:string;error_code:string|null;route:string|null;status:string;resolution_note:string|null};
type Staff={id:string;display_name:string;role:string;active:boolean;profile_sectors:{sector:string}[]};
const roles={admin:'Administrador',manager:'Gestor',operator:'Operador'};
const sectors={operations:'Operações',full:'Cheios',empty:'Vazios'};
const sectorOptions=Object.entries(sectors);
function App(){
 const [session,setSession]=useState<Session|null>(null);
 const [ready,setReady]=useState(false);
 const [allowed,setAllowed]=useState(false);
 const [authError,setAuthError]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [people,setPeople]=useState<Staff[]>([]);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [name,setName]=useState('');
 const [inviteEmail,setInviteEmail]=useState('');
 const [role,setRole]=useState('operator');
 const [selected,setSelected]=useState<string[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [tab,setTab]=useState<'staff'|'errors'>('staff');
 const [events,setEvents]=useState<ErrorEventRow[]>([]);
 const [eventsLoading,setEventsLoading]=useState(false);
 const [eventFilter,setEventFilter]=useState('open');
 useEffect(()=>installGlobalErrorMonitoring(supabase,'admin'),[]);
 useEffect(()=>{
   if(!supabase){setReady(true);return;}
   const client=supabase;
   void client.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});
   const {data:{subscription}}=client.auth.onAuthStateChange((_event,next)=>setSession(next));
   return ()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{
   if(!session||!supabase){setAllowed(false);return;}
   let live=true;
   setAllowed(false);
   void supabase.from('profiles').select('role,active').eq('id',session.user.id).single().then(({data})=>{
     if(live)setAllowed(data?.role==='admin' && data.active===true);
   });
   return ()=>{live=false};
 },[session?.user.id]);
 useEffect(()=>{if(allowed)void load()},[allowed]);
 useEffect(()=>{if(allowed && tab==='errors')void loadEvents()},[allowed,tab,eventFilter]);
 async function loadEvents(){if(!supabase)return;setEventsLoading(true);let q=supabase.from('error_events').select('id,occurred_at,application,module,operation,severity,message,error_code,route,status,resolution_note').order('occurred_at',{ascending:false}).limit(100);if(eventFilter!=='all')q=q.eq('status',eventFilter);const {data,error:err}=await q;setEventsLoading(false);if(err){setError('Não foi possível consultar o histórico de erros.');void recordError(supabase,'admin',{module:'monitoramento',operation:'listar_erros',message:err.message,code:err.code});}else setEvents((data||[]) as ErrorEventRow[])}
 async function resolveEvent(id:string){if(!supabase)return;const note=window.prompt('Descreva como o erro foi resolvido:');if(!note?.trim())return;const {error:err}=await supabase.from('error_events').update({status:'resolved',resolved_at:new Date().toISOString(),resolution_note:note.trim().slice(0,1000)}).eq('id',id);if(err){setError('Não foi possível marcar o incidente como resolvido.');return;}void loadEvents();}
 async function load(){
   if(!supabase)return;
   const {data,error:err}=await supabase.from('profiles').select('id,display_name,role,active,profile_sectors(sector)').order('created_at',{ascending:false});
   if(err){setError('Não foi possível carregar os usuários.');void recordError(supabase,'admin',{module:'usuarios',operation:'listar',message:err.message,code:err.code});}
   else setPeople((data||[]) as Staff[]);
 }
 async function login(e:React.FormEvent){
   e.preventDefault();if(!supabase)return;setBusy(true);setAuthError('');
   const {error:err}=await supabase.auth.signInWithPassword({email,password});
   setBusy(false);if(err)setAuthError('E-mail ou senha inválidos.');
 }
 async function manage(body:Record<string,unknown>){
   if(!supabase)return;setBusy(true);setError('');setNotice('');
   const {data,error:err}=await supabase.functions.invoke('manage-staff',{body});
   let reason=typeof data?.error==='string'?data.error:'';
   if(err && !reason){
     const response='context' in err?err.context:null;
     if(response instanceof Response){try{const result=await response.clone().json();reason=result?.error||''}catch{/* no JSON */}}
   }
   setBusy(false);
   if(err||reason){setError(reason||'Não foi possível concluir a operação.');void recordError(supabase,'admin',{module:'usuarios',operation:String(body.action||'gerenciar'),message:reason||err?.message||'Falha na operação',code:'STAFF_ACTION_FAILED'});return}
   setNotice(body.action==='invite'?'Convite processado.':'Alterações salvas.');
   setName('');setInviteEmail('');setRole('operator');setSelected([]);setEditing(null);
   await load();
 }
 if(!supabase)return <div className="auth"><div className="card"><h1>SMAGA Admin</h1><p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no deploy administrativo.</p></div></div>;
 if(!ready)return <div className="auth">Carregando...</div>;
 if(!session)return <div className="auth"><section className="card"><h1>SMAGA Admin</h1><p className="muted">Acesso administrativo restrito</p><form onSubmit={login}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{authError&&<p className="error">{authError}</p>}<button disabled={busy}>Entrar</button></form></section></div>;
 if(!allowed)return <div className="auth"><section className="card"><h1>Acesso restrito</h1><p>Este painel é exclusivo para administradores ativos.</p><button onClick={()=>void supabase?.auth.signOut()}>Sair</button></section></div>;
 return <div className="layout"><aside><h2>SMAGA Admin</h2><p>Gestão e monitoramento</p><nav className="admin-nav"><button className={tab==='staff'?'selected':''} onClick={()=>{setTab('staff');setError('')}}>Usuários</button><button className={tab==='errors'?'selected':''} onClick={()=>{setTab('errors');setError('')}}>Erros do sistema</button></nav></aside><main><header><div><h1>{tab==='staff'?'Usuários e permissões':'Central de erros'}</h1><p className="muted">Administração independente do sistema operacional</p></div><button className="secondary" onClick={()=>void supabase?.auth.signOut()}>Sair</button></header>{error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status" className="ok">{notice}</p>}{tab==='errors'?<section className="card"><div className="person-head"><div><h2>Incidentes registrados</h2><p className="muted">Últimos 100 registros. Sem senhas, tokens ou parâmetros de URL.</p></div><button className="secondary" onClick={()=>void loadEvents()}>Atualizar</button></div><label style={{maxWidth:220}}>Situação<select value={eventFilter} onChange={e=>setEventFilter(e.target.value)}><option value="open">Em aberto</option><option value="resolved">Resolvidos</option><option value="all">Todos</option></select></label>{eventsLoading?<p>Carregando...</p>:events.length===0?<p className="muted">Nenhum incidente encontrado.</p>:<div className="staff">{events.map(ev=><article className="person" key={ev.id}><div className="person-head"><strong>{ev.severity.toUpperCase()} · {ev.application} / {ev.module}</strong><span className="muted">{new Date(ev.occurred_at).toLocaleString('pt-BR')}</span></div><p>{ev.message}</p><p className="muted">Operação: {ev.operation} · Código: {ev.error_code||'Não informado'} · Rota: {ev.route||'—'} · Status: {ev.status==='open'?'Aberto':'Resolvido'}</p>{ev.resolution_note&&<p className="muted">Resolução: {ev.resolution_note}</p>}{ev.status==='open'&&<button className="secondary" onClick={()=>void resolveEvent(ev.id)}>Marcar resolvido</button>}</article>)}</div>}</section>:<><section className="card"><h2>Convidar funcionário</h2><form onSubmit={e=>{e.preventDefault();void manage({action:'invite',email:inviteEmail,name,role,sectors:selected})}}><div className="grid"><label>Nome<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label>E-mail<input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></label><label>Função<select value={role} onChange={e=>setRole(e.target.value)}>{Object.entries(roles).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label></div><fieldset><legend>Setores</legend>{sectorOptions.map(([key,value])=><label key={key}><input type="checkbox" checked={selected.includes(key)} onChange={e=>setSelected(old=>e.target.checked?[...old,key]:old.filter(x=>x!==key))}/>{value}</label>)}</fieldset><button disabled={busy}>Enviar convite</button></form></section><section className="card" style={{marginTop:18}}><div className="person-head"><h2>Funcionários ({people.length})</h2><button className="secondary" onClick={()=>void load()}>Atualizar</button></div><div className="staff">{people.map(p=><div className="person" key={p.id}><div className="person-head"><div><strong>{p.display_name||'Sem nome'}</strong><p className="muted">{roles[p.role as keyof typeof roles]||p.role} · {p.active?'Ativo':'Inativo'} · {p.profile_sectors?.map(s=>sectors[s.sector as keyof typeof sectors]||s.sector).join(', ')||'Sem setor'}</p></div><button className="secondary" onClick={()=>setEditing(editing===p.id?null:p.id)}>Editar</button></div>{editing===p.id&&<form className="edit" key={p.id} onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);void manage({action:'update',id:p.id,name:String(form.get('name')),role:String(form.get('role')),active:form.get('active')==='on',sectors:form.getAll('sectors')})}}><div className="grid"><label>Nome<input name="name" required defaultValue={p.display_name}/></label><label>Função<select name="role" defaultValue={p.role}>{Object.entries(roles).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label></div><label style={{display:'flex',alignItems:'center'}}><input style={{width:'auto'}} type="checkbox" name="active" defaultChecked={p.active}/>Conta ativa</label><fieldset><legend>Setores</legend>{sectorOptions.map(([key,value])=><label key={key}><input type="checkbox" name="sectors" value={key} defaultChecked={p.profile_sectors?.some(s=>s.sector===key)}/>{value}</label>)}</fieldset><button disabled={busy}>Salvar</button></form>}</div>)}</div></section></>}</main></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
