/** Smaga Move Lab: protótipo isolado do fluxo entre atendimento e gestão. */
export const STATUS = Object.freeze(['aguardando_carga','em_consolidacao','consolidado','liberado','em_transporte','entregue_terminal']);
export const LABELS = Object.freeze({aguardando_carga:'Aguardando carga',em_consolidacao:'Em consolidação',consolidado:'Consolidado',liberado:'Liberado',em_transporte:'Em transporte',entregue_terminal:'Entregue no terminal'});
const transitions={aguardando_carga:['em_consolidacao'],em_consolidacao:['consolidado'],consolidado:['liberado'],liberado:['em_transporte'],em_transporte:['entregue_terminal'],entregue_terminal:[]};
export function createReservation(state,draft,actor='atendente') {
 const client=String(draft?.client??'').trim(),reference=String(draft?.reference??'').trim().toUpperCase(),terminal=String(draft?.terminal??'').trim(),deadline=String(draft?.deadline??'');
 const quantity=Number(draft?.quantity);
 const errors=[];
 if(!client)errors.push('Cliente obrigatório');
 if(!reference)errors.push('Reserva obrigatória');
 if(!terminal)errors.push('Terminal obrigatório');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deadline)||Number.isNaN(new Date(deadline).getTime()))errors.push('Deadline inválido');
 if(!Number.isInteger(quantity)||quantity<1||quantity>500)errors.push('Quantidade deve ser entre 1 e 500');
 if(state.reservations.some(r=>r.reference===reference))errors.push('Reserva já cadastrada');
 if(errors.length)return {ok:false,errors,state};
 const id='res-'+state.nextId,now=new Date().toISOString();
 const reservation={id,client,reference,terminal,deadline,quantity,owner:String(draft.owner||actor),containers:Array.from({length:quantity},(_,i)=>({id:id+'-ct-'+(i+1),number:'',status:'aguardando_carga'})),createdAt:now};
 return {ok:true,reservation,state:{...state,nextId:state.nextId+1,reservations:[...state.reservations,reservation],events:[...state.events,{at:now,actor,action:'reserva_criada',reservationId:id}]}};
}
export function advanceContainer(state,reservationId,containerId,nextStatus,actor='atendente'){
 const reservation=state.reservations.find(r=>r.id===reservationId);
 const container=reservation?.containers.find(c=>c.id===containerId);
 if(!container)return {ok:false,error:'Contêiner inexistente',state};
 if(!transitions[container.status].includes(nextStatus))return {ok:false,error:'Transição não permitida',state};
 const now=new Date().toISOString();
 return {ok:true,state:{...state,reservations:state.reservations.map(r=>r.id!==reservationId?r:{...r,containers:r.containers.map(c=>c.id!==containerId?c:{...c,status:nextStatus})}),events:[...state.events,{at:now,actor,action:'status_alterado',reservationId,containerId,from:container.status,to:nextStatus}]}};
}
export function summary(state,now=new Date()){
 const containers=state.reservations.flatMap(r=>r.containers);
 return {reservations:state.reservations.length,containers:containers.length,released:containers.filter(c=>['liberado','em_transporte','entregue_terminal'].includes(c.status)).length,delivered:containers.filter(c=>c.status==='entregue_terminal').length,atRisk:state.reservations.filter(r=>new Date(r.deadline).getTime()<now.getTime()+24*60*60*1000&&r.containers.some(c=>c.status!=='entregue_terminal')).length};
}
export function initialState(){return {nextId:1,reservations:[],events:[]};}

/** Fila de transporte: só contêiner liberado pode ser programado. */
export function transportQueue(state){
 return state.reservations.flatMap(r=>r.containers.filter(c=>c.status==='liberado').map(c=>({reservationId:r.id,reference:r.reference,client:r.client,terminal:r.terminal,deadline:r.deadline,containerId:c.id,owner:r.owner})));
}
export function deadlineRisk(reservation,now=new Date()){
 if(reservation.containers.every(c=>c.status==='entregue_terminal'))return 'concluida';
 const remaining=new Date(reservation.deadline).getTime()-now.getTime();
 if(remaining<0)return 'vencida';
 if(remaining<=6*3600000)return 'critica';
 if(remaining<=24*3600000)return 'atencao';
 return 'normal';
}
export function operationAlerts(state,now=new Date()){
 return state.reservations.map(r=>({reservationId:r.id,reference:r.reference,client:r.client,owner:r.owner,terminal:r.terminal,risk:deadlineRisk(r,now),pending:r.containers.filter(c=>c.status!=='entregue_terminal').length,readyForTransport:r.containers.filter(c=>c.status==='liberado').length})).filter(a=>a.risk!=='normal'&&a.risk!=='concluida').sort((a,b)=>({vencida:0,critica:1,atencao:2}[a.risk]-{vencida:0,critica:1,atencao:2}[b.risk]));
}
