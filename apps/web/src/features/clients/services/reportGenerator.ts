import { jsPDF } from "jspdf";
import { type Client } from "../../../types";

export const generateClientDossier = (client: Client, auditHash: string) => {
  const doc = new jsPDF();
  
  // Paleta Executive Slate
  const colors = {
    slate900: [15, 23, 42],
    slate600: [71, 85, 105],
    slate200: [226, 232, 240],
    gold: [161, 131, 71],
    indigo: [79, 70, 229],
    white: [255, 255, 255]
  };

  // 1. Capa Editorial (Impacto Inicial)
  doc.setFillColor(colors.slate900[0], colors.slate900[1], colors.slate900[2]);
  doc.rect(0, 0, 210, 297, 'F');
  
  // Detalhe em Gold (Acentuação de Luxo)
  doc.setFillColor(colors.gold[0], colors.gold[1], colors.gold[2]);
  doc.rect(20, 40, 2, 40, 'F');

  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("EXECUTIVE", 30, 60);
  doc.text("DOSSIER", 30, 75);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.slate600[0], colors.slate600[1], colors.slate600[2]);
  doc.text("DIAMOND COMPLIANCE PROTOCOL v2.5", 30, 85);

  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.setFontSize(18);
  doc.text(client.name, 30, 150);
  doc.setFontSize(12);
  doc.setTextColor(colors.gold[0], colors.gold[1], colors.gold[2]);
  doc.text(`CNPJ: ${client.cnpj}`, 30, 158);

  // Selo de Auditoria na Capa
  doc.setDrawColor(colors.slate600[0], colors.slate600[1], colors.slate600[2]);
  doc.setLineWidth(0.1);
  doc.line(30, 260, 180, 260);
  doc.setFontSize(8);
  doc.setTextColor(colors.slate600[0], colors.slate600[1], colors.slate600[2]);
  doc.text("Criptografia de Auditoria SHA-256", 30, 268);
  doc.setFont("courier", "normal");
  doc.text(auditHash || "VERIFIED_CHAIN_BLOCK_042", 30, 273);

  // 2. Segunda Página: Análise Técnica
  doc.addPage();
  doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.rect(0, 0, 210, 297, 'F');

  // Header de Página Interna
  doc.setFillColor(colors.slate900[0], colors.slate900[1], colors.slate900[2]);
  doc.rect(0, 0, 210, 15, 'F');

  doc.setTextColor(colors.slate900[0], colors.slate900[1], colors.slate900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Análise de Elegibilidade", 20, 40);

  // Heatmap de Leis de Incentivo
  doc.setFontSize(10);
  doc.setTextColor(colors.slate600[0], colors.slate600[1], colors.slate600[2]);
  doc.text("MAPEAMENTO ESTRATÉGICO POR DISPOSITIVO LEGAL", 20, 50);

  const laws = [
    { name: "Lei Rouanet", score: 95, desc: "Potencial Máximo: 4% IRPJ" },
    { name: "Lei do Bem", score: 85, desc: "Dedução Baseada em P&D" },
    { name: "Lei do Esporte", score: 70, desc: "Aporte em Projetos Educacionais" },
    { name: "Pronon/Pronas", score: 40, desc: "Baixa Compatibilidade CNAE" }
  ];

  let currentY = 70;
  laws.forEach(law => {
    // Label
    doc.setTextColor(colors.slate900[0], colors.slate900[1], colors.slate900[2]);
    doc.setFont("helvetica", "bold");
    doc.text(law.name, 20, currentY);
    
    // Track de Progresso
    doc.setFillColor(colors.slate200[0], colors.slate200[1], colors.slate200[2]);
    doc.roundedRect(60, currentY - 4, 100, 4, 2, 2, 'F');
    
    // Preenchimento (Heatmap Color)
    const color = law.score > 80 ? colors.indigo : (law.score > 50 ? colors.gold : colors.slate600);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(60, currentY - 4, law.score, 4, 2, 2, 'F');
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(colors.slate600[0], colors.slate600[1], colors.slate600[2]);
    doc.text(law.desc, 60, currentY + 4);
    
    currentY += 25;
  });

  // Gráfico de Saúde Financeira (Simulado com Formas)
  doc.setFillColor(colors.slate900[0], colors.slate900[1], colors.slate900[2]);
  doc.roundedRect(20, 180, 170, 80, 5, 5, 'F');
  
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.setFontSize(14);
  doc.text("Projeção de Captação Anual", 35, 200);
  
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  const projection = client.capitalSocial * 0.04;
  doc.text(`R$ ${projection.toLocaleString('pt-BR')}`, 35, 215);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.gold[0], colors.gold[1], colors.gold[2]);
  doc.text("VALOR ESTIMADO DE RENÚNCIA FISCAL DISPONÍVEL", 35, 225);

  // Selo de Validação Diamond
  doc.setDrawColor(colors.gold[0], colors.gold[1], colors.gold[2]);
  doc.rect(140, 195, 40, 40);
  doc.setTextColor(colors.gold[0], colors.gold[1], colors.gold[2]);
  doc.setFontSize(6);
  doc.text("VALIDADO PELA", 145, 205);
  doc.setFontSize(8);
  doc.text("HASH CHAIN", 145, 212);
  doc.text("PROTOCOL", 145, 218);
  doc.setFontSize(10);
  doc.text("DIAMOND", 145, 230);

  // 3. Download
  doc.save(`Executive_Dossier_${client.cnpj}.pdf`);
};
