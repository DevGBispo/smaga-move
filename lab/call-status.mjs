/** Estados da chamada conforme o módulo original (sem, ok, aberto, troca, gancho). */
import {normalizeChapeira as norm} from './transport-rules.mjs';
export const STATUSES = Object.freeze(['sem','ok','aberto','troca','gancho']);
export function effectiveConfirmedCount(round) {
  return round.drivers.filter(d=>d.status==='ok'||d.status==='troca').length;
}
export function isRoundCompleted(round) {
  return round.drivers.every(d=>d.status!=='sem') && effectiveConfirmedCount(round)>=round.amount;
}
/** Conflito apenas para OK em outra rodada da mesma data e horário de carregamento. */
export function hasConfirmedOkConflict(rounds, roundId, chapeira) {
  const round=rounds.find(r=>r.id===roundId);
  if (!round) throw new Error('Rodada inexistente');
  const target=norm(chapeira);
  return rounds.some(other=>other.id!==roundId&&!other.cancelledAt&&other.operationDate===round.operationDate&&other.call===round.call&&other.drivers.some(d=>norm(d.chapeira)===target&&d.status==='ok'));
}
export function updateDriverStatus(rounds, roundId, chapeira, status) {
  if (!STATUSES.includes(status)) return {ok:false,error:'Status inválido',rounds};
  const round=rounds.find(r=>r.id===roundId);
  if (!round||round.cancelledAt) return {ok:false,error:'Rodada inexistente ou cancelada',rounds};
  const code=norm(chapeira);
  if (!round.drivers.some(d=>norm(d.chapeira)===code)) return {ok:false,error:'Chapeira ausente na rodada',rounds};
  if (status==='ok'&&hasConfirmedOkConflict(rounds,roundId,code)) return {ok:false,error:'Chapeira já confirmada em outra rodada no mesmo carregamento',rounds};
  return {ok:true,rounds:rounds.map(r=>r.id!==roundId?r:{...r,drivers:r.drivers.map(d=>norm(d.chapeira)===code?{...d,status}:d)})};
}
/** Titular e apoio B selecionados juntos contam como uma única seleção. */
export function uniqueCallSelection(chapeiras) {
  const codes=chapeiras.map(norm);
  const normal=new Set(codes.filter(code=>!code.endsWith('.B')));
  return codes.filter(code=>!code.endsWith('.B')||!normal.has(code.slice(0,-2)));
}
