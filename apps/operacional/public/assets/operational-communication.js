const sectors = {
  expedicao: "Expedição",
  cheio: "Transporte Cheio",
  vazio: "Transporte Vazio",
  faturamento: "Faturamento",
  atendimento: "Atendente",
  gestor: "Gestor",
};
const topics = ["Novo procedimento", "Alteração de procedimento", "Documentação", "Prazo ou agendamento", "Outro aviso operacional"];

export function createOperationalCommunication({ jsx, jsxs }) {
  return function OperationalCommunication({ sector, author, reservations, notices, setNotices, compact = false }) {
    const clients = [...new Set(reservations.map((item) => item.client?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const allowed = sector === "atendimento" || sector === "gestor";
    const visible = notices.filter((notice) => notice.recipient === sector || notice.recipient === "todos" || (!compact && notice.sector === sector));
    function publish(event) {
      event.preventDefault();
      if (!allowed) return;
      const form = event.currentTarget;
      const data = new FormData(form);
      const values = Object.fromEntries([...data].map(([key, value]) => [key, String(value).trim()]));
      if (!values.title || !values.instructions) {
        const field = form.elements.namedItem(values.title ? "instructions" : "title");
        field.setCustomValidity("Preencha este campo.");
        field.reportValidity();
        return;
      }
      if (!(values.recipient in sectors) && values.recipient !== "todos" || !topics.includes(values.topic)) return;
      const notice = { ...values, id: crypto.randomUUID(), sector, author, createdAt: new Date().toISOString() };
      setNotices((previous) => [notice, ...previous]);
      form.reset();
    }
    const field = (label, control, wide = false) => jsxs("label", { className: wide ? "oc-wide" : "", children: [label, control] });
    const option = (value, label = value) => jsx("option", { value, children: label }, value);
    const resetValidation = (event) => event.currentTarget.setCustomValidity("");
    if (compact && !visible.length) return null;
    return jsxs("section", { className: "oc", "aria-label": "Comunicação operacional", children: [
      jsx(compact ? "h2" : "h1", { children: compact ? "Avisos para o seu setor" : "Comunicação" }),
      !compact && allowed && jsxs("form", { onSubmit: publish, children: [
        field("Setor destinatário", jsxs("select", { name: "recipient", required: true, defaultValue: "", children: [
          option("", "Selecione o setor"), option("todos", "Todos os setores"), ...Object.entries(sectors).map(([id, label]) => option(id, label)),
        ] })),
        field("Tipo de comunicação", jsx("select", { name: "topic", required: true, defaultValue: "", children: [option("", "Selecione o tipo"), ...topics.map((topic) => option(topic))] })),
        field("Cliente relacionado", jsx("input", { name: "client", list: "oc-clients", placeholder: "Deixe em branco para orientação geral" })),
        jsx("datalist", { id: "oc-clients", children: clients.map((client) => option(client)) }),
        field("Válido a partir de", jsx("input", { type: "date", name: "effectiveDate" })),
        field("Título do aviso", jsx("input", { name: "title", required: true, maxLength: 120, placeholder: "Ex.: Novo padrão para envio do romaneio", onInput: resetValidation }), true),
        field("Instruções operacionais", jsx("textarea", { name: "instructions", required: true, rows: 4, maxLength: 4000, placeholder: "Descreva a mudança, os passos a seguir e os documentos necessários.", onInput: resetValidation }), true),
        jsx("div", { className: "oc-wide oc-actions", children: jsx("button", { type: "submit", children: "Publicar aviso" }) }),
      ] }),
      jsxs("div", { className: "oc-feed", "aria-live": "polite", children: [
        !compact && jsx("h2", { children: "Avisos da sessão" }),
        visible.length ? visible.map((notice) => jsxs("article", { children: [
          jsx("span", { className: "oc-topic", children: notice.topic }),
          jsx("h3", { children: notice.title }),
          jsx("p", { className: "oc-meta", children: [sectors[notice.sector], notice.author, notice.recipient === "todos" ? "Todos os setores" : "Para " + sectors[notice.recipient], notice.client || "Orientação geral"].filter(Boolean).join(" · ") }),
          notice.effectiveDate && jsx("p", { className: "oc-meta", children: "Válido a partir de " + notice.effectiveDate.split("-").reverse().join("/") }),
          jsx("p", { className: "oc-instructions", children: notice.instructions }),
        ] }, notice.id)) : jsx("p", { children: "Nenhum aviso publicado nesta sessão." }),
      ] }),
    ] });
  };
}
