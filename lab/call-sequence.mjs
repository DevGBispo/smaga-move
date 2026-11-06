/**
 * Smaga Move Lab — sequência experimental baseada em
 * app/chamada-feature-source.tsx (Controle de Embarque Smagalhães).
 * Não inclui ainda persistência de passagens, punições ou concorrência.
 */
import { normalizeChapeira } from './transport-rules.mjs';
const norm = normalizeChapeira;
const codes = wallet => wallet.map(item => norm(typeof item === 'string' ? item : item.chapeira));
function assertWallet(wallet) {
  const order = codes(wallet);
  if (new Set(order).size !== order.length) throw new Error('Carteira contém chapeiras duplicadas');
  return order;
}
/** Seleciona pela ordem circular. Bloqueados contam como passagem, não como vaga elegível. */
export function selectSequence(wallet, lastStop, amount, blocked = [], priority = []) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Quantidade inválida');
  const order = assertWallet(wallet);
  if (!order.length || !amount) return [];
  const blockedSet = new Set(blocked.map(norm));
  const selected = [];
  let eligible = 0;
  const target = Math.min(amount, order.filter(code => !blockedSet.has(code)).length);
  for (const raw of priority) {
    const code = norm(raw);
    if (!order.includes(code) || selected.includes(code)) continue;
    selected.push(code);
    if (!blockedSet.has(code)) eligible++;
    if (eligible >= target) return selected;
  }
  const last = lastStop ? order.indexOf(norm(lastStop)) : -1;
  const start = last < 0 ? 0 : (last + 1) % order.length;
  for (let offset = 0; eligible < target && offset < order.length; offset++) {
    const code = order[(start + offset) % order.length];
    if (selected.includes(code)) continue;
    selected.push(code);
    if (!blockedSet.has(code)) eligible++;
  }
  return selected;
}
/** Reinício manual inclui a chapeira inicial. */
export function selectSequenceFrom(wallet, startChapeira, amount, blocked = [], priority = []) {
  const order = assertWallet(wallet);
  if (!order.length) return [];
  const start = order.indexOf(norm(startChapeira));
  const preceding = order[(start < 0 ? 0 : start) - 1] ?? order[order.length - 1];
  return selectSequence(order, preceding, amount, blocked, priority);
}
/** Registra posições atravessadas, inclusive as bloqueadas e não selecionadas. */
export function traversedWallet(wallet, lastStop, selected, priority = [], from = '') {
  const order = assertWallet(wallet);
  if (!order.length) return [];
  const prioritySet = new Set(priority.map(norm));
  const regular = selected.map(norm).filter(code => !prioritySet.has(code) && order.includes(code));
  if (!regular.length) return [];
  const fromIndex = from ? order.indexOf(norm(from)) : -1;
  const lastIndex = lastStop ? order.indexOf(norm(lastStop)) : -1;
  const start = from ? Math.max(0, fromIndex) : lastIndex < 0 ? 0 : (lastIndex + 1) % order.length;
  const last = regular.at(-1);
  const passed = [];
  for (let offset = 0; offset < order.length; offset++) {
    const code = order[(start + offset) % order.length];
    passed.push(code);
    if (code === last) break;
  }
  return passed;
}
/** Reserva a última posição já na criação, sem aguardar confirmação OK. */
export function reservedLastStop(rounds, category, operationDate, fallback = '') {
  const latest = rounds
    .filter(round => round.category === category && !round.cancelledAt && round.operationDate <= operationDate)
    .sort((a,b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))[0];
  if (!latest) return fallback ? norm(fallback) : '';
  const reserved = latest.sequenceLastStop ||
    latest.drivers?.filter(driver => !driver.replacementFor).at(-1)?.chapeira;
  return reserved ? norm(reserved) : (fallback ? norm(fallback) : '');
}
