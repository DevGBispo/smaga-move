import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
const origin = 'https://dev-smaga-move.smaga-move.workers.dev';
const allowedOrigins = new Set([origin, 'https://smaga-admin.smaga-move.workers.dev']);
const headersFor = (requestOrigin: string | null) => ({ 'Access-Control-Allow-Origin': allowedOrigins.has(requestOrigin || '') ? requestOrigin! : origin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' });
Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('Origin');
  const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers: {...headersFor(requestOrigin), 'Content-Type':'application/json'} });
  if(req.method === 'OPTIONS') return new Response(null,{status:204,headers:headersFor(requestOrigin)});
  if(req.method !== 'POST') return reply({error:'Método não permitido'},405);
  const auth = req.headers.get('Authorization') || '';
  if(!auth.startsWith('Bearer ')) return reply({error:'Autenticação necessária'},401);
  const url=Deno.env.get('SUPABASE_URL')!;
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const publishable=Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient=createClient(url,publishable);
  const {data:{user},error:userError}=await userClient.auth.getUser(auth.slice(7));
  if(userError || !user) return reply({error:'Sessão inválida'},401);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:caller,error:callerError}=await admin.from('profiles').select('role,active').eq('id',user.id).single();
  if(callerError || !caller?.active || caller.role!=='admin') return reply({error:'Acesso restrito aos administradores'},403);
  let body:Record<string,unknown>;
  try {body=await req.json()} catch {return reply({error:'JSON inválido'},400)}
  const action=body.action;
  const name=typeof body.name==='string'?body.name.trim():'';
  const role=body.role;
  const sectors=body.sectors;
  if(!['invite','update'].includes(String(action)) || !name || name.length>100 || !['admin','manager','operator'].includes(String(role)) || !Array.isArray(sectors) || sectors.some(x=>!['operations','full','empty'].includes(x)) || new Set(sectors).size!==sectors.length) return reply({error:'Dados inválidos'},400);
  let id:string;
  if(action==='invite') {
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) return reply({error:'E-mail inválido'},400);
    const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:origin+'/',data:{display_name:name}});
    if(error || !data.user) return reply({error:'Não foi possível convidar. Verifique se o e-mail já existe ou se há limite de envios.'},400);
    id=data.user.id;
  } else {
    id=typeof body.id==='string'?body.id:'';
    if(!/^[0-9a-f-]{36}$/i.test(id) || typeof body.active!=='boolean') return reply({error:'Identificador ou status inválido'},400);
    if(id===user.id && (role!=='admin' || !body.active)) return reply({error:'Não é permitido remover o próprio acesso administrativo'},400);
  }
  const active=action==='invite'?true:body.active;
  const {error:profileError}=await admin.from('profiles').upsert({id,display_name:name,role,active},{onConflict:'id'});
  if(profileError) return reply({error:'Falha ao salvar perfil'},500);
  const {error:deleteError}=await admin.from('profile_sectors').delete().eq('profile_id',id);
  if(deleteError) return reply({error:'Falha ao atualizar setores'},500);
  if(sectors.length) {
    const {error:sectorError}=await admin.from('profile_sectors').insert(sectors.map(sector=>({profile_id:id,sector})));
    if(sectorError) return reply({error:'Falha ao associar setores'},500);
  }
  return reply({ok:true});
});