import {addShip,addContainer,changeRelease} from './ship-planning.mjs';
export function bookings(state){return state.ships.flatMap(s=>{const map=new Map();for(const c of s.containers){if(!map.has(c.reference))map.set(c.reference,{reference:c.reference,client:c.client,shipId:s.id,ship:s.name,voyage:s.voyage,terminal:s.terminal,deadline:s.deadline,owner:s.owner,containers:[]});map.get(c.reference).containers.push(c);}return [...map.values()];});}
export function bookingCounts(b){return {total:b.containers.length,released:b.containers.filter(c=>c.release==='liberado').length,waiting:b.containers.filter(c=>c.release==='ag_liberacao').length,pending:b.containers.filter(c=>c.release==='pendente').length,started:b.containers.filter(c=>c.movement!=='aguardando').length,callable:b.containers.filter(c=>c.release==='liberado'&&c.movement==='aguardando'&&!c.driver).length};}
export function registerBooking(state,draft){
 const quantity=Number(draft.quantity);
 if(!Number.isInteger(quantity)||quantity<1||quantity>100)return {ok:false,error:'Quantidade deve estar entre 1 e 100',state};
 if(!String(draft.reference||'').trim()||!String(draft.client||'').trim())return {ok:false,error:'Informe reserva e cliente',state};
 if(bookings(state).some(b=>b.reference===draft.reference))return {ok:false,error:'Reserva já cadastrada',state};
 let ship=state.ships.find(s=>s.name===draft.name&&s.voyage===draft.voyage);
 if(!ship){const created=addShip(state,draft,draft.owner);if(!created.ok)return {ok:false,error:created.errors.join('; '),state};state=created.state;ship=created.ship;}
 for(let i=0;i<quantity;i++){const created=addContainer(state,ship.id,{reference:draft.reference,client:draft.client,plannedDate:draft.plannedDate},draft.owner);if(!created.ok)return created;state=created.state;if(draft.release==='liberado'||draft.release==='pendente')state=changeRelease(state,ship.id,created.container.id,draft.release,draft.owner).state;}
 return {ok:true,state};
}
export function setBookingRelease(state,reference,release,actor){
 const b=bookings(state).find(b=>b.reference===reference);if(!b)return {ok:false,error:'Reserva inexistente',state};
 for(const c of b.containers){if(c.movement!=='aguardando')continue;const result=changeRelease(state,b.shipId,c.id,release,actor);if(!result.ok)return result;state=result.state;}
 return {ok:true,state};
}
export function assignDriver(state,reference,driver,plate,actor='transporte'){
 const b=bookings(state).find(b=>b.reference===reference);if(!b)return {ok:false,error:'Reserva não encontrada',state};
 const name=String(driver||'').trim(),vehicle=String(plate||'').trim().toUpperCase();
 if(!name||!vehicle)return {ok:false,error:'Informe motorista e placa',state};
 const target=b.containers.find(c=>c.release==='liberado'&&c.movement==='aguardando'&&!c.driver);
 if(!target)return {ok:false,error:'Não há unidades liberadas disponíveis',state};
 const at=new Date().toISOString();
 return {ok:true,containerId:target.id,state:{...state,ships:state.ships.map(s=>s.id!==b.shipId?s:{...s,containers:s.containers.map(c=>c.id!==target.id?c:{...c,driver:name,plate:vehicle,movement:'em_transporte',calledAt:at})}),events:[...state.events,{at,actor,action:'motorista_chamado',shipId:b.shipId,containerId:target.id,reference,driver:name,plate:vehicle}]}};
}
export function completeLoad(state,reference,containerId,containerNumber,actor='transporte'){
 const b=bookings(state).find(b=>b.reference===reference),ct=b?.containers.find(c=>c.id===containerId);
 if(!ct||ct.movement!=='em_transporte')return {ok:false,error:'Motorista não está em transporte',state};
 const number=String(containerNumber||'').trim().toUpperCase();
 if(!number)return {ok:false,error:'Informe a unidade carregada',state};
 if(state.ships.some(s=>s.containers.some(c=>c.id!==containerId&&c.number===number)))return {ok:false,error:'Unidade já vinculada a outro carregamento',state};
 const at=new Date().toISOString();
 return {ok:true,state:{...state,ships:state.ships.map(s=>s.id!==b.shipId?s:{...s,containers:s.containers.map(c=>c.id!==containerId?c:{...c,number,movement:'carregado',loadedAt:at})}),events:[...state.events,{at,actor,action:'carregamento_confirmado',shipId:b.shipId,containerId,reference,number}]}};
}
export function reportRows(state,reference){return bookings(state).find(b=>b.reference===reference)?.containers.filter(c=>c.driver).map(c=>({container:c.number||'Não informado',driver:c.driver,plate:c.plate,status:c.movement,calledAt:c.calledAt,loadedAt:c.loadedAt||''}))||[];}
