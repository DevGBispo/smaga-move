import type { SupabaseClient } from '@supabase/supabase-js';

export type ErrorApplication='admin'|'operacional';
type ErrorDetails={module:string;operation:string;severity?:'warning'|'error'|'critical';code?:string;message:string};
const scrub=(value:string,max:number)=>value
 .replace(/(Bearer\s+)[\w.\-]+/gi,'$1[REDACTED]')
 .replace(/(sb_(?:secret|publishable)_[A-Za-z0-9_\-]+)/g,'[REDACTED_KEY]')
 .replace(/([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g,'[REDACTED_EMAIL]')
 .replace(/([?&](?:token|access_token|refresh_token|code|apikey|key|password|secret)=[^&\s]+)/gi,'[REDACTED_PARAM]')
 .slice(0,max);

export async function recordError(client:SupabaseClient|null,application:ErrorApplication,details:ErrorDetails){
 if(!client)return;
 try{
   const {data:{user}}=await client.auth.getUser();
   if(!user)return;
   const route=location.pathname;
   await client.from('error_events').insert({
     application,module:scrub(details.module,80),operation:scrub(details.operation,100),
     severity:details.severity||'error',message:scrub(details.message||'Erro não especificado',500),
     error_code:details.code?scrub(details.code,80):null,route:scrub(route,200),actor_id:user.id
   });
 }catch{/* Logging must never interrupt the application. */}
}
export function installGlobalErrorMonitoring(client:SupabaseClient|null,application:ErrorApplication){
 const onError=(event:ErrorEvent)=>{void recordError(client,application,{module:'frontend',operation:'uncaught_exception',message:event.message||'Exceção não tratada',code:'JS_UNCAUGHT'});};
 const onRejection=(event:PromiseRejectionEvent)=>{const reason=event.reason;void recordError(client,application,{module:'frontend',operation:'unhandled_rejection',message:typeof reason?.message==='string'?reason.message:'Promise rejeitada sem tratamento',code:'JS_UNHANDLED_REJECTION'});};
 window.addEventListener('error',onError);window.addEventListener('unhandledrejection',onRejection);
 return ()=>{window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onRejection);};
}
