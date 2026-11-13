const statuses = ["Liberado", "Pendente", "Aguardando liberação"];
const dateLabel = (date) => date?.split("-").reverse().join("/") || "—";
const statusClass = (status) => ({ Liberado: "released", Pendente: "pending", "Aguardando liberação": "waiting" })[status] || "";
const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function createReservationDesk({ jsx, jsxs, useState, useEffect, useRef, Plus }) {
  return function ReservationDesk({ reservations, today, selected, select, form }) {
    const [query, setQuery] = useState("");
    const [date, setDate] = useState("");
    const [terminal, setTerminal] = useState("");
    const [status, setStatus] = useState("");
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(0);
    const [mode, setMode] = useState("");
    const dialogRef = useRef(null);
    const filtered = reservations.filter((item) =>
      (!terminal || item.terminal === terminal) && (!date || item.date === date) && (!status || item.status === status) &&
      normalize([item.code, item.vessel, item.terminal, item.origin].join(" ")).includes(normalize(query.trim()))
    ).sort((a, b) => a.date.localeCompare(b.date) || (a.deadline || "24:00").localeCompare(b.deadline || "24:00") || a.code.localeCompare(b.code));
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const activePage = Math.min(page, pageCount - 1);
    const terminals = [...new Set(reservations.map((item) => item.terminal).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const metrics = [
      ["", "Todas as reservas", reservations.length, "total"],
      ...["Pendente", "Aguardando liberação", "Liberado"].map((value) => [
        value, value === "Liberado" ? "Liberadas" : value === "Pendente" ? "Pendentes" : value,
        reservations.filter((item) => item.status === value).length, statusClass(value),
      ]),
    ];
    const open = (next, code) => { select(code); setMode(next); };
    const activeMode = mode || (selected ? "view" : "");
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.open) return;
      dialog.showModal();
      return () => { if (dialog.open) dialog.close(); };
    }, [Boolean(activeMode)]);
    const button = (label, onClick, className, extra = {}) => jsx("button", { type: "button", onClick, className, ...extra, children: label });
    const pill = (item) => jsx("span", { className: "rd-pill " + statusClass(item.status), children: item.status });
    const cell = (label, children) => jsx("td", { "data-label": label, children });
    const details = (fields) => jsx("dl", { className: "rd-details", children: fields.map(([label, value]) =>
      jsxs("div", { children: [jsx("dt", { children: label }), jsx("dd", { children: value === "" || value == null ? "—" : value })] }, label)
    ) });
    const summary = selected && [
      ["Navio", selected.vessel], ["Deadline", selected.deadline], ["Status", pill(selected)],
      ["Unidades", selected.units ?? (selected.q20 != null && selected.q40 != null ? Number(selected.q20) + Number(selected.q40) : null)],
    ];
    const programming = selected && [
      ["Cliente", selected.client], ["Armador", selected.carrier], ["Terminal", selected.terminal],
      ["Data da operação", dateLabel(selected.date)], ["Operação", selected.operation], ["Origem", selected.origin || selected.section],
      ["Contêineres 20′", selected.q20], ["Contêineres 40′", selected.q40], ["Agendamento", selected.appointment],
      ["Horário", selected.time], ["Gate", selected.gate], ["Período", selected.period], ["Local da operação", selected.local],
    ];
    return jsxs("section", { className: "rd", children: [
      jsxs("header", { className: "rd-bar rd-page-header", children: [
        jsx("h1", { children: "Controle de Reservas" }),
        jsxs("div", { className: "rd-header-actions", children: [
          jsx("input", { type: "search", placeholder: "Buscar reserva, navio ou terminal", "aria-label": "Buscar reservas", value: query, onChange: (event) => { setQuery(event.target.value); setPage(0); } }),
          button(jsxs("span", { children: [jsx(Plus, { size: 17, "aria-hidden": true }), " Nova reserva"] }), () => open("edit", undefined), "rd-primary"),
        ] }),
      ] }),
      jsx("div", { className: "rd-metrics", role: "group", "aria-label": "Filtrar por situação da reserva", children: metrics.map(([value, label, count, color]) =>
        button(jsxs("span", { children: [jsx("span", { className: "rd-pill " + color, children: label }), jsx("strong", { children: count })] }),
          () => { setStatus(value); setPage(0); }, "rd-metric " + color, { key: label, "aria-pressed": status === value })
      ) }),
      activeMode && jsxs("dialog", {
        ref: dialogRef, className: "rd-drawer", "aria-labelledby": "rd-drawer-title",
        onCancel: (event) => { event.preventDefault(); open("", undefined); },
        onClick: (event) => { if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) open("", undefined); },
        children: [
        jsxs("header", { className: "rd-drawer-header", children: [
          jsxs("div", { children: [
            jsx("p", { className: "rd-dialog-kicker", children: "Programação diária" }),
            jsx("h2", { id: "rd-drawer-title", children: activeMode === "view" ? "Reserva " + (selected?.code ?? "") : selected ? "Editar reserva" : "Nova reserva" }),
          ] }),
          button("Fechar", () => open("", undefined), "rd-link", { "aria-label": "Fechar painel da reserva" }),
        ] }),
        jsxs("div", { className: "rd-drawer-content", children: [
          activeMode === "edit" ? form : selected && jsxs("div", { className: "rd-dialog-details", children: [
            jsx("div", { className: "rd-dialog-summary", children: details(summary) }),
            jsxs("section", { children: [jsx("h3", { children: "Dados da programação" }), details(programming)] }),
            jsxs("section", { className: "rd-dialog-notes", children: [
              jsx("h3", { children: "Observações operacionais" }),
              jsx("p", { children: selected.notes || "Nenhuma observação registrada." }),
            ] }),
            jsx("footer", { className: "rd-dialog-footer", children: button("Editar reserva", () => open("edit", selected.code), "rd-primary") }),
          ] }),
        ] }),
      ] }),
      jsxs("section", { className: "rd-list", "aria-label": "Lista de reservas", children: [
        jsxs("div", { className: "rd-bar", children: [
          jsx("h2", { children: "Lista de reservas" }),
          jsxs("div", { className: "rd-filters", children: [
            jsx("select", { "aria-label": "Filtrar por terminal", value: terminal, onChange: (event) => { setTerminal(event.target.value); setPage(0); }, children: ["", ...terminals].map((value) => jsx("option", { value, children: value || "Todos os terminais" }, value)) }),
            button("Hoje", () => { setDate(date === today ? "" : today); setPage(0); }, "rd-secondary", { "aria-pressed": date === today }),
            jsx("input", { type: "date", "aria-label": "Filtrar por data", value: date, onChange: (event) => { setDate(event.target.value); setPage(0); } }),
            jsx("select", { "aria-label": "Filtrar por status", value: status, onChange: (event) => { setStatus(event.target.value); setPage(0); }, children: ["", ...statuses].map((label) => jsx("option", { value: label, children: label || "Todos os status" }, label)) }),
          ] }),
        ] }),
        filtered.length ? jsx("div", { className: "rd-table-wrap", children: jsxs("table", { "aria-label": "Reservas", children: [
          jsx("thead", { children: jsx("tr", { children: ["Reserva / Navio", "Terminal", "Data / Deadline", "Unidades", "Operação", "Status", "Ações"].map((label) => jsx("th", { scope: "col", children: label }, label)) }) }),
          jsx("tbody", { children: filtered.slice(activePage * pageSize, (activePage + 1) * pageSize).map((item) => jsxs("tr", {
            onClick: (event) => { if (!event.target.closest("button")) open("view", item.code); },
            children: [
            cell("Reserva / Navio", jsxs("span", { className: "rd-reservation-id", children: [
              jsx("span", { className: "rd-reservation-icon", "aria-hidden": true, children: item.operation === "Vazio" ? "V" : "C" }),
              jsxs("span", { children: [jsx("strong", { children: item.code }), jsx("small", { children: item.vessel })] }),
            ] })),
            cell("Terminal", item.terminal),
            cell("Data / Deadline", jsxs("span", { children: [dateLabel(item.date), jsx("small", { children: item.deadline || "Sem deadline" })] })),
            cell("Unidades", item.units),
            cell("Operação", jsxs("span", { children: [item.operation, item.operation === "Vazio" && jsx("small", { children: item.origin })] })),
            cell("Status", pill(item)),
            cell("Ações", jsxs("span", { className: "rd-row-actions", children: [
              button("Ver", () => open("view", item.code), "rd-link", { "aria-label": "Ver reserva " + item.code }),
              button("Editar", () => open("edit", item.code), "rd-link", { "aria-label": "Editar reserva " + item.code }),
            ] })),
          ] }, item.code)) }),
        ] }) }) : jsx("p", { role: "status", children: "Nenhuma reserva corresponde aos filtros." }),
        jsxs("footer", { className: "rd-bar rd-pagination", children: [
          jsxs("label", { children: ["Reservas por página ", jsx("select", { value: pageSize, onChange: (event) => { setPageSize(Number(event.target.value)); setPage(0); }, children: [5, 10, 20].map((size) => jsx("option", { children: size }, size)) })] }),
          jsxs("div", { children: [button("Anterior", () => setPage(activePage - 1), "rd-secondary", { disabled: activePage === 0 }), jsx("span", { "aria-live": "polite", children: (activePage + 1) + " / " + pageCount }), button("Próxima", () => setPage(activePage + 1), "rd-secondary", { disabled: activePage + 1 >= pageCount })] }),
        ] }),
      ] }),
    ] });
  };
}
