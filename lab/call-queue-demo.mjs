import {bookings} from './booking-flow.mjs';
import {DRIVERS} from './demo-drivers.mjs';
export function initialCallQueue(){return {sequence:DRIVERS.map((d,i)=>({...d,position:i+1,queueStatus:'na_vez'})),sessions:{}};}
export function startBookingCall(queue,state,reference){
 const b=bookings(state).find(b=>b.reference===reference);
 if(!b)return {ok:false,error:'Reserva inexistente',queue};
 if(queue.sessions[reference])return {ok:true,queue,session:queue.sessions[reference]};
 const needed=b.containers.filter(c=>c.release==='liberado'&&c.movement==='aguardando').length;
 if(!needed)return {ok:false,error:'Não há unidades liberadas para chamada',queue};
 const taken=new Set(Object.values(queue.sessions).flatMap(s=>s.drivers.map(d=>d.id)));
 const eligible=queue.sequence.filter(d=>d.queueStatus==='na_vez'&&!taken.has(d.id)).slice(0,needed);
 if(eligible.length<needed)return {ok:false,error:'Motoristas disponíveis insuficientes: '+eligible.length+' de '+needed,queue};
 const session={reference,needed,drivers:eligible.map(d=>({...d,status:'selecionado',replacementFor:null})),startedAt:new Date().toISOString()};
 return {ok:true,session,queue:{...queue,sessions:{...queue.sessions,[reference]:session}}};
}
export function setCallDecision(queue,reference,driverId,status,replacementId){
 if(!['ok','em_aberto','gancho','troca'].includes(status))return {ok:false,error:'Decisão inválida',queue};
 const session=queue.sessions[reference],driver=session?.drivers.find(d=>d.id===driverId);
 if(!driver)return {ok:false,error:'Motorista não pertence à chamada',queue};
 let replacement=null;
 if(status==='troca'){
  const reserved=new Set(Object.values(queue.sessions).flatMap(s=>s.drivers.map(d=>d.id)));
  replacement=queue.sequence.find(d=>d.id===replacementId&&d.queueStatus==='na_vez'&&!reserved.has(d.id));
  if(!replacement)return {ok:false,error:'Motorista substituto não está disponível na fila',queue};
 }
 const drivers=session.drivers.map(d=>d.id===driverId?{...d,status,replacementFor:replacement?.id||null}:d);
 if(replacement)drivers.push({...replacement,status:'selecionado',replacementFor:null,replaces:driverId});
 return {ok:true,queue:{...queue,sessions:{...queue.sessions,[reference]:{...session,drivers}}}};
}
