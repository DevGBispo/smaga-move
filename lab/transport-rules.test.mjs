import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChapeira, validateCallDraft, registerCall, cancelCall } from './transport-rules.mjs';
const drivers = [{chapeira:'63'}, {chapeira:'65'}, {chapeira:'07.B'}, {chapeira:'50.B'}];
const state = () => ({ drivers, calls: [], nextId: 1 });
const draft = () => ({ destination:'BTP', loadingTime:'00:00', chapeiras:['63','65'] });
test('chapeiras preservam zeros e sufixos e normalizam variantes', () => {
  assert.equal(normalizeChapeira('7b'), '07.B');
  assert.equal(normalizeChapeira('07.B'), '07.B');
  assert.equal(normalizeChapeira('50B'), '50.B');
  assert.equal(normalizeChapeira('63'), '63');
  assert.notEqual(normalizeChapeira('07'), normalizeChapeira('07.B'));
});
test('recusa chapeira inexistente e repetida', () => {
  assert.match(validateCallDraft({...draft(), chapeiras:['63','63']}, drivers).join(' '), /repetida/);
  assert.match(validateCallDraft({...draft(), chapeiras:['99']}, drivers).join(' '), /não cadastrada/);
});
test('exige destino, horário válido e ao menos uma chapeira', () => {
  const errors = validateCallDraft({destination:'', loadingTime:'25:99', chapeiras:[]}, drivers);
  assert.equal(errors.length, 3);
});
test('registra chamada sem alterar estado original', () => {
  const initial = state();
  const result = registerCall(initial, draft());
  assert.equal(result.ok, true);
  assert.equal(initial.calls.length, 0);
  assert.equal(result.state.calls.length, 1);
  assert.equal(result.state.calls[0].status, 'planned');
});
test('cancelamento preserva registro e não altera outras chamadas', () => {
  const a = registerCall(state(), draft()).state;
  const b = registerCall(a, {...draft(), chapeiras:['07.B']}).state;
  const result = cancelCall(b, 'lab-1');
  assert.equal(result.ok, true);
  assert.equal(result.state.calls[0].status, 'cancelled');
  assert.equal(result.state.calls[1].status, 'planned');
  assert.equal(b.calls[0].status, 'planned');
});
test('cancelar duas vezes ou id inexistente não altera estado', () => {
  const a = registerCall(state(), draft()).state;
  const b = cancelCall(a, 'lab-1').state;
  assert.equal(cancelCall(b, 'lab-1').ok, false);
  assert.equal(cancelCall(b, 'lab-999').ok, false);
});
