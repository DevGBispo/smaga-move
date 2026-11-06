import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveConfirmedCount,isRoundCompleted,hasConfirmedOkConflict,updateDriverStatus,uniqueCallSelection} from './call-status.mjs';
const round=(id,call='21:00',date='2026-11-06')=>({id,operationDate:date,call,amount:2,drivers:[{chapeira:'63',status:'sem'},{chapeira:'65',status:'sem'}]});
test('pendências impedem conclusão',()=>{
 const r=round('a');assert.equal(isRoundCompleted(r),false);assert.equal(effectiveConfirmedCount(r),0);
});
test('OK e troca contam; gancho e aberto não contam',()=>{
 const r=round('a');r.drivers[0].status='ok';r.drivers[1].status='troca';
 assert.equal(effectiveConfirmedCount(r),2);assert.equal(isRoundCompleted(r),true);
 r.drivers[1].status='gancho';assert.equal(isRoundCompleted(r),false);
 r.drivers[1].status='aberto';assert.equal(isRoundCompleted(r),false);
});
test('atualização imutável não modifica chamada original',()=>{
 const before=[round('a')];const result=updateDriverStatus(before,'a','63','ok');
 assert.equal(result.ok,true);assert.equal(result.rounds[0].drivers[0].status,'ok');assert.equal(before[0].drivers[0].status,'sem');
});
test('dois OK no mesmo carregamento são bloqueados',()=>{
 const a=round('a'),b=round('b');a.drivers[0].status='ok';
 assert.equal(hasConfirmedOkConflict([a,b],'b','63'),true);
 assert.equal(updateDriverStatus([a,b],'b','63','ok').ok,false);
});
test('horários ou datas diferentes não conflitam',()=>{
 const a=round('a'),b=round('b','22:00'),c=round('c','21:00','2026-11-07');a.drivers[0].status='ok';
 assert.equal(updateDriverStatus([a,b],'b','63','ok').ok,true);
 assert.equal(updateDriverStatus([a,c],'c','63','ok').ok,true);
});
test('troca e em aberto não bloqueiam OK em outra rodada',()=>{
 const a=round('a'),b=round('b');a.drivers[0].status='troca';
 assert.equal(updateDriverStatus([a,b],'b','63','ok').ok,true);
 a.drivers[0].status='aberto';assert.equal(updateDriverStatus([a,b],'b','63','ok').ok,true);
});
test('canceladas não bloqueiam OK',()=>{
 const a={...round('a'),cancelledAt:123},b=round('b');a.drivers[0].status='ok';
 assert.equal(updateDriverStatus([a,b],'b','63','ok').ok,true);
});
test('status inválido, rodada cancelada ou chapeira ausente são rejeitados',()=>{
 const a=round('a');assert.equal(updateDriverStatus([a],'a','63','desconhecido').ok,false);
 assert.equal(updateDriverStatus([a],'a','99','ok').ok,false);
 assert.equal(updateDriverStatus([{...a,cancelledAt:1}],'a','63','ok').ok,false);
});
test('apoio B é ignorado quando titular está junto',()=>{
 assert.deepEqual(uniqueCallSelection(['50','50B','07.B','63']),['50','07.B','63']);
});
