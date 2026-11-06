/** Executar: node lab/demo.mjs — sem banco, login ou rede. */
import {selectSequence,traversedWallet} from './call-sequence.mjs';
import {effectiveConfirmedCount,isRoundCompleted,updateDriverStatus} from './call-status.mjs';
import {registerCall} from './transport-rules.mjs';
const wallet=['63','65','66','67','68','69'];
const blocked=['66'];
const selected=selectSequence(wallet,'65',3,blocked);
const passed=traversedWallet(wallet,'65',selected);
const called=selected.filter(x=>!blocked.includes(x));
let state={drivers:wallet.map(chapeira=>({chapeira})),calls:[],nextId:1};
const result=registerCall(state,{destination:'BTP',loadingTime:'21:00',chapeiras:called});
if(!result.ok) throw new Error(result.errors.join('; '));
state=result.state;
let rounds=[{id:result.call.id,category:'Santos · Pesado/Leve',operationDate:'2026-11-06',call:'21:00',amount:called.length,drivers:called.map(chapeira=>({chapeira,status:'sem'}))}];
for(const code of called){const update=updateDriverStatus(rounds,rounds[0].id,code,'ok');if(!update.ok)throw new Error(update.error);rounds=update.rounds;}
const report={scenario:'BTP / Santos / 06-11-2026 / 21:00',wallet,blocked,selected,passed,called,confirmed:effectiveConfirmedCount(rounds[0]),completed:isRoundCompleted(rounds[0]),databaseWrites:0};
console.log(JSON.stringify(report,null,2));
if(!report.completed)process.exitCode=1;
