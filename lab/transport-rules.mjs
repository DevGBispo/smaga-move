/**
 * SMAGA Move Lab — regras experimentais, sem banco ou efeitos colaterais.
 * Não substitui a lógica homologada do Controle de Embarque Smagalhães.
 */
export function normalizeChapeira(value) {
  if (typeof value !== 'string' && typeof value !== 'number') throw new TypeError('Chapeira inválida');
  const code = String(value).trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[0-9]{1,3}(?:\.?[A-Z])?$/.test(code)) throw new Error('Formato de chapeira inválido');
  const match = /^([0-9]{1,3})(?:\.?([A-Z]))?$/.exec(code);
  const number = match[1].padStart(2, '0');
  return number + (match[2] ? '.' + match[2] : '');
}
export function validateCallDraft(draft, drivers) {
  const errors = [];
  if (!draft || typeof draft !== 'object') return ['Chamada ausente'];
  if (!draft.destination?.trim()) errors.push('Destino obrigatório');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.loadingTime ?? '')) errors.push('Horário de carregamento inválido');
  if (!Array.isArray(draft.chapeiras) || !draft.chapeiras.length) errors.push('Selecione ao menos uma chapeira');
  const known = new Set(drivers.map(d => normalizeChapeira(d.chapeira)));
  const seen = new Set();
  for (const raw of draft.chapeiras ?? []) {
    try {
      const chapeira = normalizeChapeira(raw);
      if (seen.has(chapeira)) errors.push('Chapeira repetida: ' + chapeira);
      if (!known.has(chapeira)) errors.push('Chapeira não cadastrada: ' + chapeira);
      seen.add(chapeira);
    } catch { errors.push('Chapeira inválida'); }
  }
  return errors;
}
export function registerCall(state, draft) {
  const errors = validateCallDraft(draft, state.drivers);
  if (errors.length) return { ok: false, errors, state };
  const call = {
    id: 'lab-' + (state.nextId ?? 1),
    destination: draft.destination.trim(),
    loadingTime: draft.loadingTime,
    chapeiras: draft.chapeiras.map(normalizeChapeira),
    status: 'planned'
  };
  return {
    ok: true,
    call,
    state: { ...state, nextId: (state.nextId ?? 1) + 1, calls: [...state.calls, call] }
  };
}
export function cancelCall(state, id) {
  const index = state.calls.findIndex(c => c.id === id);
  if (index < 0) return { ok: false, error: 'Chamada inexistente', state };
  if (state.calls[index].status === 'cancelled') return { ok: false, error: 'Chamada já cancelada', state };
  const calls = state.calls.map(c => c.id === id ? { ...c, status: 'cancelled' } : c);
  return { ok: true, state: { ...state, calls } };
}
