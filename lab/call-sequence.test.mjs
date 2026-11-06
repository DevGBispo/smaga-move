import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSequence,selectSequenceFrom,traversedWallet,reservedLastStop} from './call-sequence.mjs';
const wallet=['01','02','03','04','05','06'];
test('sequência circular continua depois da última chapeira',()=>{
 assert.deepEqual(selectSequence(wallet,'05',3),['06','01','02']);
});
test('bloqueados são atravessados mas não preenchem vagas',()=>{
 assert.deepEqual(selectSequence(wallet,'02',2,['03']),['03','04','05']);
 assert.deepEqual(traversedWallet(wallet,'02',['03','04','05']),['03','04','05']);
});
test('passagem inclui bloqueado não selecionado',()=>{
 assert.deepEqual(traversedWallet(wallet,'03',['04','06']),['04','05','06']);
});
test('prioridade não altera passagem regular',()=>{
 assert.deepEqual(selectSequence(wallet,'02',2,[],['06']),['06','03']);
 assert.deepEqual(traversedWallet(wallet,'02',['06','03'],['06']),['03']);
});
test('reinício manual começa na chapeira indicada',()=>{
 assert.deepEqual(selectSequenceFrom(wallet,'03',2),['03','04']);
 assert.deepEqual(traversedWallet(wallet,'02',['03','04'],[],'03'),['03','04']);
});
test('reserva posição sem confirmação e ignora canceladas',()=>{
 const rounds=[
  {id:'a',category:'Santos',operationDate:'2026-11-06',createdAt:1,sequenceLastStop:'02'},
  {id:'b',category:'Santos',operationDate:'2026-11-06',createdAt:2,sequenceLastStop:'04'},
 ];
 assert.equal(reservedLastStop(rounds,'Santos','2026-11-06'),'04');
 assert.equal(reservedLastStop(rounds.map(r=>r.id==='b'?{...r,cancelledAt:3}:r),'Santos','2026-11-06'),'02');
});
test('reserva de outra categoria ou data futura não interfere',()=>{
 const rounds=[{id:'a',category:'Guarujá',operationDate:'2026-11-06',createdAt:2,sequenceLastStop:'04'}];
 assert.equal(reservedLastStop(rounds,'Santos','2026-11-06','01'),'01');
 assert.equal(reservedLastStop(rounds,'Guarujá','2026-11-05','01'),'01');
});
test('carteira com duplicatas é rejeitada',()=>{
 assert.throws(()=>selectSequence(['07B','07.B'], '',1),/duplicadas/);
});
