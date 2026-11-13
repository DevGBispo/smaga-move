const statuses = ["Liberado", "Pendente", "Aguardando liberação"];
const dateLabel = (date) => date?.split("-").reverse().join("/") || "—";
const statusClass = (status) => ({ Liberado: "released", Pendente: "pending", "Aguardando liberação": "waiting" })[status] || "";
const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function createReservationDesk({ jsx, jsxs, useState, Arrow, Plus }) {
  return function ReservationDesk({ reservations, today, selected, select, form }) {
    const [query, setQuery] = useState("");
    const [date, setDate] = useState("");
    const [status, setStatus] = useState("");
    const [pageSize, setPageSize] = useState(5);
    const [page, setPage] = useState(0);
    const [mode, setMode] = useState("");
    const filtered = reservations.filter((item) =>
      (!date || item.date === date) && (!status || item.status === status) &&
      normalize([item.code, item.vessel, item.terminal, item.origin].join(" ")).includes(normalize(query.trim()))
    ).sort((a, b) => a.date.localeCompare(b.date) || (a.deadline || "24:00").localeCompare(b.deadline || "24:00") || a.code.localeCompare(b.code));
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const activePage = Math.min(page, pageCount - 1);
    const current = reservations.filter((item) => item.date === today).sort((a, b) => (a.deadline || "24:00").localeCompare(b.deadline || "24:00"));
    const open = (next, code) => { select(code); setMode(next); };
    const activeMode = mode || (selected ? "edit" : "");
    const button = (label, onClick, className, extra = {}) => jsx("button", { type: "button", onClick, className, ...extra, children: label });
    const pill = (item) => jsx("span", { className: "rd-pill " + statusClass(item.status), children: item.status });
    const cell = (label, children) => jsx("td", { "data-label": label, children });
    const fields = selected && [
      ["Reserva", selected.code], ["Navio", selected.vessel], ["Terminal", selected.terminal],
      ["Operação", selected.operation], ["Origem", selected.origin], ["Data", dateLabel(selected.date)],
      ["Deadline", selected.deadline], ["Unidades", selected.units], ["Status", selected.status], ["Observações", selected.notes],
    ];
    return jsxs("section", { className: "rd", children: [
      jsxs("header", { className: "rd-bar", children: [
        jsx("h1", { children: "Controle de Reservas" }),
        button(jsxs("span", { children: [jsx(Plus, { size: 17, "aria-hidden": true }), " Nova reserva"] }), () => open("edit", undefined), "rd-primary"),
      ] }),
      jsx("div", { className: "rd-metrics", children: [["Total de reservas", reservations.length, "total"], ...statuses.map((label) => [label === "Liberado" ? "Liberadas" : label === "Pendente" ? "Pendentes" : label, reservations.filter((item) => item.status === label).length, statusClass(label)])].map(([label, value, color]) => jsxs("div", { className: "rd-metric " + color, children: [jsx("strong", { children: value }), jsx("span", { children: label })] }, label)) }),
      jsxs("section", { "aria-label": "Reservas de hoje", children: [
        jsxs("div", { className: "rd-bar", children: [jsxs("h2", { children: ["Reservas de hoje ", jsx("small", { children: dateLabel(today) })] }), button("Ver todas de hoje", () => { setQuery(""); setStatus(""); setDate(today); setPage(0); }, "rd-link")] }),
        current.length ? jsx("div", { className: "rd-today", children: current.slice(0, 5).map((item) => button(jsxs("span", { children: [jsxs("strong", { children: [item.code, jsx("small", { children: item.deadline || "—" })] }), jsx("span", { className: "rd-terminal", children: item.terminal }), pill(item), jsx("span", { className: "rd-status-line " + statusClass(item.status), "aria-hidden": true })] }), () => open("view", item.code), "rd-today-card", { key: item.code })) }) : jsx("p", { children: "Nenhuma reserva para hoje." }),
      ] }),
      activeMode && jsxs("section", { className: "rd-editor", "aria-label": activeMode === "view" ? "Detalhes da reserva" : "Formulário de reserva", children: [
        jsxs("div", { className: "rd-bar", children: [activeMode === "view" && jsx("h2", { children: "Detalhes da reserva" }), button("Fechar", () => open("", undefined), "rd-link")] }),
        activeMode === "edit" ? form : fields && jsxs("div", { children: [
          jsx("dl", { className: "rd-details", children: fields.map(([label, value]) => jsxs("div", { children: [jsx("dt", { children: label }), jsx("dd", { children: value || "—" })] }, label)) }),
          button("Editar reserva", () => open("edit", selected.code), "rd-primary"),
        ] }),
      ] }),
      jsxs("section", { className: "rd-list", "aria-label": "Lista de reservas", children: [
        jsxs("div", { className: "rd-bar", children: [
          jsx("h2", { children: "Todas as reservas" }),
          jsxs("div", { className: "rd-filters", children: [
            jsx("input", { type: "search", placeholder: "Buscar reserva, navio ou terminal", "aria-label": "Buscar reservas", value: query, onChange: (event) => { setQuery(event.target.value); setPage(0); } }),
            jsx("input", { type: "date", "aria-label": "Filtrar por data", value: date, onChange: (event) => { setDate(event.target.value); setPage(0); } }),
            jsx("select", { "aria-label": "Filtrar por status", value: status, onChange: (event) => { setStatus(event.target.value); setPage(0); }, children: ["", ...statuses].map((label) => jsx("option", { value: label, children: label || "Todos os status" }, label)) }),
          ] }),
        ] }),
        filtered.length ? jsx("div", { className: "rd-table-wrap", children: jsxs("table", { "aria-label": "Reservas", children: [
          jsx("thead", { children: jsx("tr", { children: ["Reserva / Navio", "Terminal", "Data / Deadline", "Unidades", "Operação", "Status", "Ações"].map((label) => jsx("th", { scope: "col", children: label }, label)) }) }),
          jsx("tbody", { children: filtered.slice(activePage * pageSize, (activePage + 1) * pageSize).map((item) => jsxs("tr", { children: [
            cell("Reserva / Navio", jsxs("span", { children: [jsx("strong", { children: item.code }), jsx("small", { children: item.vessel })] })),
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
