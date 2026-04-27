import { jsPDF } from "jspdf";
import type { RuralProperty, Diagnostic } from "./types";
import type { PropertyGeometry } from "./queries";

export interface ReportContext {
  property: RuralProperty;
  diagnostics: Diagnostic[];
  geometry: PropertyGeometry | null;
  organizationName: string;
  emittedBy: string;
  emittedAt: Date;
}

const carLabel: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  cancelado: "Cancelado",
  suspenso: "Suspenso",
  nao_cadastrado: "Não cadastrado",
};

const sigefLabel: Record<string, string> = {
  certificado: "Certificado",
  em_analise: "Em análise",
  nao_certificado: "Não certificado",
  desconhecido: "Desconhecido",
};

const confLabel: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const sevLabel: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

export function buildReportSummary(ctx: ReportContext): string {
  const { property, diagnostics } = ctx;
  const issues = diagnostics.filter((d) => d.severidade !== "baixa").length;
  const parts = [
    `${property.name}`,
    property.municipio || property.uf ? `${property.municipio ?? "—"}/${property.uf ?? "—"}` : null,
    property.area_ha != null ? `${Number(property.area_ha).toLocaleString("pt-BR")} ha` : null,
    `CAR: ${carLabel[property.car_status] ?? property.car_status}`,
    `SIGEF: ${sigefLabel[property.sigef_status] ?? property.sigef_status}`,
    `${diagnostics.length} diagnóstico(s) — ${issues} pendência(s)`,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function exportReportPDF(ctx: ReportContext): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // Header bar
  doc.setFillColor(20, 83, 45); // forest green
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório técnico do imóvel", margin, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${ctx.organizationName}`, margin, 54);
  const dateStr = ctx.emittedAt.toLocaleString("pt-BR");
  doc.text(`Emitido em ${dateStr}`, W - margin, 54, { align: "right" });
  y = 90;

  doc.setTextColor(20, 20, 20);

  // Property title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(ctx.property.name, margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `${ctx.property.owner_name ?? "Sem proprietário cadastrado"}` +
      (ctx.property.municipio || ctx.property.uf
        ? ` · ${ctx.property.municipio ?? "—"}/${ctx.property.uf ?? "—"}`
        : ""),
    margin,
    y
  );
  y += 22;
  doc.setTextColor(20, 20, 20);

  const drawSection = (title: string) => {
    if (y > H - 80) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(20, 83, 45);
    doc.setLineWidth(2);
    doc.line(margin, y, margin + 24, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 83, 45);
    doc.text(title.toUpperCase(), margin + 30, y + 3);
    doc.setTextColor(20, 20, 20);
    y += 16;
  };

  const drawKV = (k: string, v: string) => {
    if (y > H - 50) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(k, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(v || "—", W - margin * 2 - 160);
    doc.text(lines, margin + 160, y);
    y += Math.max(14, lines.length * 12);
  };

  drawSection("Dados fundiários");
  drawKV("Área total", ctx.property.area_ha != null ? `${Number(ctx.property.area_ha).toLocaleString("pt-BR")} ha` : "—");
  drawKV("Código CAR", ctx.property.car_code ?? "—");
  drawKV("Status CAR", carLabel[ctx.property.car_status] ?? ctx.property.car_status);
  drawKV("Status SIGEF", sigefLabel[ctx.property.sigef_status] ?? ctx.property.sigef_status);
  y += 6;

  drawSection("Matrícula");
  drawKV("Número", ctx.property.matricula_number ?? "—");
  drawKV("Fonte", ctx.property.matricula_source.replace("_", " "));
  drawKV("Confiabilidade", confLabel[ctx.property.matricula_confiabilidade] ?? ctx.property.matricula_confiabilidade);
  y += 6;

  drawSection("Geometria vinculada");
  if (ctx.geometry) {
    drawKV("Arquivo", (ctx.geometry.geojson as { _meta?: { filename?: string } })._meta?.filename ?? "geometria.geojson");
    drawKV("Origem", ctx.geometry.source ?? "—");
    drawKV("Enviada em", new Date(ctx.geometry.created_at).toLocaleString("pt-BR"));
    if (ctx.geometry.bbox) {
      const [minX, minY, maxX, maxY] = ctx.geometry.bbox;
      drawKV("Bounding box", `${minY.toFixed(4)}, ${minX.toFixed(4)} → ${maxY.toFixed(4)}, ${maxX.toFixed(4)}`);
    }
  } else {
    drawKV("Status", "Nenhuma geometria vinculada");
  }
  if (ctx.property.centroid_lat != null && ctx.property.centroid_lng != null) {
    drawKV("Centróide", `${Number(ctx.property.centroid_lat).toFixed(6)}, ${Number(ctx.property.centroid_lng).toFixed(6)}`);
  }
  y += 6;

  drawSection("Diagnósticos automáticos");
  if (ctx.diagnostics.length === 0) {
    drawKV("Status", "Nenhum diagnóstico gerado");
  } else {
    for (const d of ctx.diagnostics) {
      if (y > H - 70) {
        doc.addPage();
        y = margin;
      }
      const color: [number, number, number] =
        d.severidade === "alta" ? [185, 28, 28] : d.severidade === "media" ? [180, 120, 0] : [22, 101, 52];
      doc.setFillColor(...color);
      doc.rect(margin, y - 8, 4, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text(d.title, margin + 10, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...color);
      doc.text(`Severidade ${sevLabel[d.severidade]}`, W - margin, y, { align: "right" });
      y += 12;
      if (d.description) {
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(d.description, W - margin * 2 - 14);
        doc.text(lines, margin + 10, y);
        y += lines.length * 11;
      }
      y += 6;
    }
  }
  y += 4;

  if (ctx.property.notes) {
    drawSection("Observações");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(ctx.property.notes, W - margin * 2);
    if (y + lines.length * 12 > H - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    y += lines.length * 12 + 6;
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, H - 36, W - margin, H - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Emitido por ${ctx.emittedBy} · ${ctx.organizationName}`, margin, H - 22);
    doc.text(`Página ${i} de ${pageCount}`, W - margin, H - 22, { align: "right" });
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function reportFilename(propertyName: string, date: Date) {
  const safe = propertyName.replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 60);
  const stamp = date.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `relatorio_${safe}_${stamp}.pdf`;
}
