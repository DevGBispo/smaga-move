export async function parseProgrammingPdf(data, getDocument) {
  const task = getDocument({ data, isEvalSupported: false });
  try {
    const document = await task.promise;
    const rows = [];
    let section = "", year, issueMonth, current;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const { items } = await page.getTextContent();
      const text = items.map(item => item.str).join(" ");
      const issued = text.match(/Emitido em\s+\d{2}\/(\d{2})\/(\d{4})/i);
      if (issued) { issueMonth = Number(issued[1]); year = Number(issued[2]); }
      const lines = new Map();
      for (const item of items) {
        if (!item.str?.trim() || !item.transform) continue;
        const y = Math.round(item.transform[5]);
        if (!lines.has(y)) lines.set(y, []);
        lines.get(y).push(item);
      }
      for (const [, line] of [...lines].sort(([a], [b]) => b - a)) {
        const columns = Array.from({ length: 8 }, () => []);
        for (const item of line.sort((a, b) => a.transform[4] - b.transform[4])) {
          const index = [90, 150, 216, 282, 324, 410, 456].filter(x => item.transform[4] >= x).length;
          columns[index].push(item.str.trim());
        }
        const [vessel, code, carrier, client, forecast, terminal, counts, notes] = columns.map(parts => parts.join(" "));
        if (vessel === "Pré-Stacking" || vessel === "Saída Exportação Consolidada") {
          section = vessel; current = null; continue;
        }
        const quantities = counts.match(/^(\d+)\s*\/\s*(\d+)$/);
        const deadline = forecast.match(/^(\d{2})\/(\d{2})\s+(\d{2}:\d{2})$/);
        if (quantities && code && vessel && section) {
          if (!deadline && !/^S\/PREVISÃO$/i.test(forecast)) throw new Error("Deadline em formato desconhecido no relatório.");
          const status = /AG\.?\s*(LIBER|DES|PROCESS)|AGUARD/i.test(notes) ? "Aguardando liberação" : /^LIBERADO\b/i.test(notes) ? "Liberado" : "Pendente";
          const month = Number(deadline?.[2]);
          const deadlineYear = year + (issueMonth >= 10 && month <= 2 ? 1 : issueMonth <= 2 && month >= 10 ? -1 : 0);
          current = {
            code, vessel, carrier, client, terminal: ({ BTP: "Brasil Terminais", "DP WORLD": "DP World", "SANTOS BRASIL": "Santos Brasil" })[terminal] ?? terminal,
            date: deadline ? `${deadlineYear}-${deadline[2]}-${deadline[1]}` : "", deadline: deadline?.[3] ?? "",
            q20: Number(quantities[1]), q40: Number(quantities[2]), notes, status,
            origin: section, operation: section === "Saída Exportação Consolidada" ? "Vazio" : "Cheio", containers: [],
          };
          rows.push(current);
        } else if (current && /^[A-Z]{4}\d{7}$/.test(vessel)) {
          if (!current.containers.includes(vessel)) current.containers.push(vessel);
        } else if (current && !code && !carrier && !client && !forecast && !terminal && !counts) {
          if (notes) current.notes = [current.notes, notes].filter(Boolean).join("\n");
          if (vessel && !vessel.startsWith("Crop") && vessel !== "NAVIO") current.vessel += " " + vessel;
        }
      }
      page.cleanup();
    }
    if (!year || !rows.length) throw new Error("Use o PDF de Planejamento de Pátio do Crystal Reports, com texto selecionável.");
    return rows;
  } finally {
    await task.destroy();
  }
}

export async function readProgrammingPdf(file) {
  const { getDocument, GlobalWorkerOptions } = await import("./pdf.mjs");
  GlobalWorkerOptions.workerSrc = new URL("./pdf.worker.mjs", import.meta.url).href;
  return parseProgrammingPdf(new Uint8Array(await file.arrayBuffer()), getDocument);
}
