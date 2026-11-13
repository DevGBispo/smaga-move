export function renderSectorHome(jsx, jsxs, Icon, navigate, sector, name, action, date, data) {
  const [todayWindows, activeCalls, shipments, waitingDrivers, readyPickups, pendingReservations, incompleteDrivers, activePendencies, urgentPendencies, criticalWindows, ] = data;
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const greeting = hour < 6 || hour >= 18 ? "Boa noite" : hour < 12 ? "Bom dia" : "Boa tarde";
  const sectors = {
    expedicao: {
      lead: "Organize a rendição do turno e acompanhe as pendências da operação.",
      links: [["Registro de Pendências", "Confira responsáveis e próximas ações", "pendencias"], ["Processos e Procedimentos", "Consulte as orientações da operação", "procedimentos"]],
    },
    cheio: {
      lead: "Organize as chamadas e acompanhe as janelas e os carregamentos do dia.",
      links: [["Controlar embarques", "Acompanhe os carregamentos", "controle"], ["Central de Chamadas", "Consulte as chamadas abertas", "chamada"], ["Monitorar janelas", "Confira os prazos de hoje", "janelas"]],
    },
    vazio: {
      lead: "Acompanhe as indicações de motoristas e confirme as retiradas do dia.",
      links: [["Agendar retiradas", "Consulte reservas aguardando indicação", "agendamento"], ["Controlar retiradas", "Confira o andamento das retiradas", "retirada"], ["Chapeira Vazio", "Consulte os motoristas", "chapeira-vazio"]],
    },
    faturamento: {
      lead: "Consulte os motoristas e acompanhe os cadastros com placas pendentes.",
      links: [["Consultar motoristas", "Pesquise por nome ou chapeira", "motoristas"]],
    },
    atendimento: {
      lead: "Priorize a liberação das reservas e acompanhe as pendências da Expedição.",
      links: [["Controle de Reservas", "Consulte reservas, prazos e status", "reservas"]],
    },
    gestor: {
      lead: "Acompanhe as prioridades do dia nos setores da operação.",
      links: [["Acompanhar operação", "Abra o painel do Gestor", "painel"], ["Monitorar janelas", "Veja os prazos do Transporte Cheio", "janelas", "cheio"], ["Consultar pendências", "Veja as ocorrências da Expedição", "pendencias", "expedicao"]],
    },
  };
  const { lead, links } = sectors[sector.id];
  const taskCards = {
    expedicao: [[urgentPendencies, "Priorizar pendências urgentes", "pendencias"], [activePendencies, "Revisar a rendição do turno", "pendencias"]],
    cheio: [[todayWindows, "Conferir janelas de hoje", "janelas"], [activeCalls, "Confirmar chamadas", "chamada"], [shipments, "Acompanhar embarques", "controle"]],
    vazio: [[waitingDrivers, "Indicar motoristas", "agendamento"], [readyPickups, "Confirmar retiradas", "retirada"]],
    faturamento: [[incompleteDrivers, "Completar placas dos motoristas", "motoristas"]],
    atendimento: [[pendingReservations, "Revisar a liberação de reservas", "reservas"], [activePendencies, "Consultar pendências da Expedição", "inicio"]],
    gestor: [[criticalWindows, "Verificar janelas críticas", "janelas", "cheio"], [pendingReservations, "Acompanhar reservas por liberar", "reservas"], [waitingDrivers, "Acompanhar retiradas sem indicação", "agendamento", "vazio"], [urgentPendencies, "Revisar pendências urgentes", "pendencias", "expedicao"]],
  }[sector.id].sort(([a], [b]) => Number(b > 0) - Number(a > 0));
  const count = new Intl.NumberFormat("pt-BR", { minimumIntegerDigits: 2 });
  return jsxs("div", {
    className: "move-home",
    children: [
      jsxs("header", { className: "move-home-hero", children: [
        jsxs("div", { className: "move-home-intro", children: [
          jsx("p", { className: "move-home-kicker", children: sector.label }),
          jsxs("h1", { children: [greeting + ",", jsx("strong", { children: (name?.trim() || "Operação").split(/\s+/)[0] + "." })] }),
          jsx("p", { className: "move-home-lead", children: lead }),
          jsx("p", { className: "move-home-date", children: date }),
          jsx("button", { type: "button", className: "move-home-cta", onClick: action.run, children: action.label }),
        ] }),
      ] }),
      jsxs("section", { className: "move-home-tasks", "aria-labelledby": "move-home-tasks-title", children: [
        jsx("h2", { id: "move-home-tasks-title", children: "O que fazer hoje" }),
        jsx("div", { className: "move-home-task-grid", children: taskCards.map(([value, label, tab, target], index) => jsxs("button", {
          type: "button", className: "move-home-task", "data-priority": index === 0 && value > 0,
          onClick: () => navigate(tab, target),
          children: [
            jsx("span", { className: "move-home-task-label", children: label }),
            jsxs("span", { className: "move-home-task-footer", children: [jsx("strong", { children: count.format(value) }), jsx(Icon, { size: 20, "aria-hidden": true })] }),
          ],
        }, label)) }),
      ] }),
      jsx("nav", { className: "move-home-links", "aria-label": "Atalhos do setor", children: links.map(([label, detail, tab, target]) => jsxs("button", {
        type: "button", onClick: () => navigate(tab, target), children: [
          jsxs("span", { children: [jsx("strong", { children: label }), jsx("small", { children: detail })] }),
          jsx(Icon, { size: 17, "aria-hidden": true }),
        ],
      }, label)) }),
      jsx("h2", { className: "move-home-insights", children: "Insights do setor" }),
    ],
  });
}
