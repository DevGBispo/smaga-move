/** Regras do planejamento diário por navio, isoladas do ambiente de produção. */
export const ROLES=Object.freeze(['gestor','atendente','transporte']);
export const RELEASE=Object.freeze(['ag_liberacao','pendente','liberado']);
export function allowed(role,action){
 return ({gestor:['view_all','view_daily'],atendente:['view_assigned','create_ship','add_container','set_release'],transporte:['view_released','dispatch']}[role]||[]).includes(action);
}
export function emptyPlanning(){return {nextId:1,ships:[],events:[]};}
const clean=v=>String(v??'').trim();
export function addShip(state,draft,actor='atendente'){
 const name=clean(draft?.name),voyage=clean(draft?.voyage),terminal=clean(draft?.terminal),eta=clean(draft?.eta),deadline=clean(draft?.deadline),owner=clean(draft?.owner)||actor;
 const errors=[];if(!name)errors.push('Nome do navio obrigatório');if(!voyage)errors.push('Viagem obrigatória');if(!terminal)errors.push('Terminal obrigatório');if(!eta||Number.isNaN(Date.parse(eta)))errors.push('ETA inválida');if(!deadline||Number.isNaN(Date.parse(deadline)))errors.push('Deadline inválido');
 if(state.ships.some(s=>s.name.toLowerCase()===name.toLowerCase()&&s.voyage.toLowerCase()===voyage.toLowerCase()))errors.push('Navio e viagem já cadastrados');
 if(errors.length)return {ok:false,errors,state};
 const id='ship-'+state.nextId,ship={id,name,voyage,terminal,eta,deadline,owner,containers:[]};
 return {ok:true,ship,state:{...state,nextId:state.nextId+1,ships:[...state.ships,ship],events:[...state.events,{at:new Date().toISOString(),actor,action:'navio_criado',shipId:id}]}};
}
export function addContainer(state,shipId,draft,actor='atendente'){
 const ship=state.ships.find(s=>s.id===shipId);if(!ship)return {ok:false,error:'Navio não encontrado',state};
 const reference=clean(draft?.reference),client=clean(draft?.client),number=clean(draft?.number).toUpperCase(),plannedDate=clean(draft?.plannedDate);
 if(!reference||!client||!/^\d{4}-\d{2}-\d{2}$/.test(plannedDate))return {ok:false,error:'Informe reserva, cliente e data planejada',state};
 if(number&&ship.containers.some(c=>c.number===number))return {ok:false,error:'Contêiner já cadastrado no navio',state};
 const id='ct-'+state.nextId,container={id,reference,client,number,plannedDate,release:'ag_liberacao',movement:'aguardando'};
 return {ok:true,container,state:{...state,nextId:state.nextId+1,ships:state.ships.map(s=>s.id===shipId?{...s,containers:[...s.containers,container]}:s),events:[...state.events,{at:new Date().toISOString(),actor,action:'conteiner_cadastrado',shipId,containerId:id}]}};
}
export function changeRelease(state,shipId,containerId,release,actor='atendente'){
 if(!RELEASE.includes(release))return {ok:false,error:'Liberação inválida',state};
 const ship=state.ships.find(s=>s.id===shipId),ct=ship?.containers.find(c=>c.id===containerId);
 if(!ct)return {ok:false,error:'Contêiner não encontrado',state};
 if(ct.movement!=='aguardando')return {ok:false,error:'Movimentação já iniciada',state};
 return mutate(state,shipId,containerId,{release},actor,'liberacao_alterada');
}
export function dispatch(state,shipId,containerId,actor='transporte'){
 const ct=state.ships.find(s=>s.id===shipId)?.containers.find(c=>c.id===containerId);
 if(!ct||ct.release!=='liberado'||ct.movement!=='aguardando')return {ok:false,error:'Contêiner indisponível para transporte',state};
 return mutate(state,shipId,containerId,{movement:'em_transporte'},actor,'transporte_iniciado');
}
function mutate(state,shipId,containerId,patch,actor,action){
 return {ok:true,state:{...state,ships:state.ships.map(s=>s.id!==shipId?s:{...s,containers:s.containers.map(c=>c.id!==containerId?c:{...c,...patch})}),events:[...state.events,{at:new Date().toISOString(),actor,action,shipId,containerId,...patch}]}};
}
export function visibleShips(state,role,owner){return role==='atendente'?state.ships.filter(s=>s.owner===owner):role==='gestor'?state.ships:[];}
export function dailyPlan(state,date){return state.ships.flatMap(s=>s.containers.filter(c=>c.plannedDate===date).map(c=>({...c,shipId:s.id,ship:s.name,voyage:s.voyage,terminal:s.terminal,deadline:s.deadline,owner:s.owner})));}
export function releasedQueue(state){return state.ships.flatMap(s=>s.containers.filter(c=>c.release==='liberado'&&c.movement==='aguardando').map(c=>({...c,shipId:s.id,ship:s.name,voyage:s.voyage,terminal:s.terminal,deadline:s.deadline})));}
export function shipSummary(ship){const c=ship.containers;return {total:c.length,released:c.filter(x=>x.release==='liberado').length,pending:c.filter(x=>x.release==='pendente').length,waiting:c.filter(x=>x.release==='ag_liberacao').length,inTransport:c.filter(x=>x.movement==='em_transporte').length};}
