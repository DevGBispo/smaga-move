export function renderSectorHome(jsx, jsxs, Icon, navigate, sector, name, action, date, data) {
  const [todayWindows, activeCalls, shipments, waitingDrivers, readyPickups, pendingReservations, incompleteDrivers, activePendencies, urgentPendencies, criticalWindows, driverCount] = data;
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const greeting = hour < 6 || hour >= 18 ? "Boa noite" : hour < 12 ? "Bom dia" : "Boa tarde";
  const sectors = {
    expedicao: {
      lead: "Organize a rendição do turno e acompanhe as pendências da operação.",
      metrics: [[activePendencies, "pendências em aberto"], [urgentPendencies, "Pendências urgentes"]],
      links: [["Registro de Pendências", "Confira responsáveis e próximas ações", "pendencias"], ["Processos e Procedimentos", "Consulte as orientações da operação", "procedimentos"]],
    },
    cheio: {
      lead: "Organize as chamadas e acompanhe as janelas e os carregamentos do dia.",
      metrics: [[shipments, "embarques em andamento"], [activeCalls, "Chamadas em aberto hoje"], [todayWindows, "Janelas de hoje"]],
      links: [["Controlar embarques", "Acompanhe os carregamentos", "controle"], ["Central de Chamadas", "Consulte as chamadas abertas", "chamada"], ["Monitorar janelas", "Confira os prazos de hoje", "janelas"]],
    },
    vazio: {
      lead: "Acompanhe as indicações de motoristas e confirme as retiradas do dia.",
      metrics: [[waitingDrivers, "aguardando indicação"], [readyPickups, "Retiradas prontas para confirmar"]],
      links: [["Agendar retiradas", "Consulte reservas aguardando indicação", "agendamento"], ["Controlar retiradas", "Confira o andamento das retiradas", "retirada"], ["Chapeira Vazio", "Consulte os motoristas", "chapeira-vazio"]],
    },
    faturamento: {
      lead: "Consulte os motoristas e acompanhe os cadastros com placas pendentes.",
      metrics: [[incompleteDrivers, "cadastros com placas pendentes"], [driverCount, "Motoristas cadastrados"]],
      links: [["Consultar motoristas", "Pesquise por nome ou chapeira", "motoristas"]],
    },
    atendimento: {
      lead: "Priorize a liberação das reservas e acompanhe as pendências da Expedição.",
      metrics: [[pendingReservations, "reservas que precisam de ação"], [activePendencies, "Pendências da Expedição"]],
      links: [["Controle de Reservas", "Consulte reservas, prazos e status", "reservas"]],
    },
    gestor: {
      lead: "Acompanhe as prioridades do dia nos setores da operação.",
      metrics: [[criticalWindows, "janelas críticas hoje"], [pendingReservations, "Reservas por liberar"], [waitingDrivers, "Retiradas sem indicação"], [urgentPendencies, "Pendências urgentes"]],
      links: [["Acompanhar operação", "Abra o painel do Gestor", "painel"], ["Monitorar janelas", "Veja os prazos do Transporte Cheio", "janelas", "cheio"], ["Consultar pendências", "Veja as ocorrências da Expedição", "pendencias", "expedicao"]],
    },
  };
  const { lead, metrics, links } = sectors[sector.id];
  const [[primary, primaryLabel], ...details] = metrics;
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
        jsxs("section", { className: "move-home-summary", "aria-label": "Resumo operacional", children: [
          jsx("h2", { className: "move-home-kicker", children: "Resumo operacional" }),
          jsx("strong", { className: "move-home-count", children: count.format(primary) }),
          jsx("p", { children: primaryLabel }),
          jsx("dl", { children: details.map(([value, label]) => jsxs("div", { children: [jsx("dt", { children: label }), jsx("dd", { children: value })] }, label)) }),
        ] }),
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
