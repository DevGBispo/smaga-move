const sectors = {
  expedicao: "Expedição",
  cheio: "Transporte Cheio",
  vazio: "Transporte Vazio",
  faturamento: "Faturamento",
  atendimento: "Atendente",
  gestor: "Gestor",
};
const topics = ["Novo procedimento", "Alteração de procedimento", "Documentação", "Prazo ou agendamento", "Outro aviso operacional"];

export function createOperationalCommunication({ jsx, jsxs, useState, useEffect, useRef }) {
  return function OperationalCommunication({ sector, author, reservations, notices, setNotices, compact = false }) {
    const [composing, setComposing] = useState(false);
    const dialogRef = useRef(null);
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!composing || !dialog) return;
      dialog.showModal();
      return () => dialog.close();
    }, [composing]);
    const clients = [...new Set(reservations.map((item) => item.client?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const allowed = sector === "atendimento" || sector === "gestor";
    const sentDate = (notice) => new Date(notice.createdAt).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const formattedDate = (date) => date.split("-").reverse().join("/");
    const statusOf = (notice) => notice.completed ? "Concluída" : "Em andamento";
    const received = (notice) => notice.recipient === sector || notice.recipient === "todos";
    const visible = notices.filter((notice) => compact
      ? received(notice) && !notice.completed && !notice.readBy?.includes(sector)
      : received(notice) || notice.sector === sector);
    const updateNotice = (id, update) => setNotices((previous) => previous.map((notice) => notice.id === id ? update(notice) : notice));
    const groups = new Map();
    for (const notice of visible) {
      const key = sentDate(notice) + "|" + notice.recipient;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(notice);
    }
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
      setComposing(false);
    }
    const field = (label, control, wide = false) => jsxs("label", { className: wide ? "oc-wide" : "", children: [label, control] });
    const option = (value, label = value) => jsx("option", { value, children: label }, value);
    const resetValidation = (event) => event.currentTarget.setCustomValidity("");
    if (compact && !visible.length) return null;
    return jsxs("section", { className: "oc", "aria-label": "Comunicação operacional", children: [
      jsxs("header", { className: "oc-header", children: [
        jsx(compact ? "h2" : "h1", { children: compact ? "Avisos para o seu setor" : "Comunicação" }),
        !compact && allowed && jsx("button", { type: "button", onClick: () => setComposing(true), children: "Nova mensagem" }),
      ] }),
      !compact && composing && allowed && jsxs("dialog", {
        ref: dialogRef, className: "oc-dialog", "aria-labelledby": "oc-compose-title",
        onCancel: (event) => { event.preventDefault(); setComposing(false); },
        children: [
          jsxs("header", { className: "oc-header", children: [
            jsx("h2", { id: "oc-compose-title", children: "Nova mensagem" }),
            jsx("button", { type: "button", onClick: () => setComposing(false), children: "Fechar" }),
          ] }),
          jsxs("form", { onSubmit: publish, children: [
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
        ],
      }),
      jsx("div", { className: "oc-feed", "aria-live": "polite", children: groups.size ? [...groups].map(([key, group]) => jsxs("section", {
        className: "oc-group",
        children: [
          jsx("h2", { children: formattedDate(sentDate(group[0])) + " · " + (group[0].recipient === "todos" ? "Todos os setores" : sectors[group[0].recipient]) }),
          ...group.map((notice) => jsxs("article", { children: [
            jsxs("div", { className: "oc-header", children: [
              jsx("span", { className: "oc-topic", children: notice.topic }),
              jsx("span", { className: "oc-status", children: statusOf(notice) }),
            ] }),
            jsx("h3", { children: notice.title }),
            jsx("p", { className: "oc-meta", children: [sectors[notice.sector], notice.author, notice.client || "Orientação geral"].filter(Boolean).join(" · ") }),
            notice.effectiveDate && jsx("p", { className: "oc-meta", children: "Válido a partir de " + formattedDate(notice.effectiveDate) }),
            jsx("p", { className: "oc-instructions", children: notice.instructions }),
            notice.readBy?.length > 0 && jsx("p", { className: "oc-meta", children: "Visualizada por " + notice.readBy.map((id) => sectors[id]).join(", ") }),
            jsxs("div", { className: "oc-message-actions", children: [
              !notice.completed && received(notice) && !notice.readBy?.includes(sector) && jsx("button", { type: "button", onClick: () => updateNotice(notice.id, (item) => ({ ...item, readBy: [...new Set([...(item.readBy ?? []), sector])] })), children: "Marcar como visualizada" }),
              !compact && !notice.completed && (notice.sector === sector || sector === "gestor") && jsx("button", { type: "button", onClick: () => updateNotice(notice.id, (item) => ({ ...item, completed: true })), children: "Finalizar mensagem" }),
            ] }),
          ] }, notice.id)),
        ],
      }, key)) : jsx("p", { children: "Nenhuma mensagem em andamento ou concluída." }) }),
    ] });
  };
}
