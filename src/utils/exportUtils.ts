/**
 * Export Utilities for PDF and Excel
 * Provides month-on-month incentive reports with fuel bonus
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Driver, DriverPerformance, IncentiveCalculation } from "../types/database";
import { formatCurrency, formatNumber, getMonthName } from "./formatters";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface MonthlyIncentiveData {
  month: number;
  monthName: string;
  totalKm: number;
  totalIncentive: number;
  totalFuelBonus: number;
  totalCombined: number;
  driverCount: number;
  avgIncentive: number;
  avgFuelBonus: number;
  localKm: number;
  localIncentive: number;
  localFuelBonus: number;
  exportKm: number;
  exportIncentive: number;
  exportFuelBonus: number;
}

interface DriverMonthlyData {
  driverId: string;
  driverName: string;
  driverType: "local" | "export";
  employeeId: string;
  monthlyData: {
    month: number;
    km: number;
    incentive: number;
    fuelBonus: number;
    combined: number;
  }[];
  totalKm: number;
  totalIncentive: number;
  totalFuelBonus: number;
  totalCombined: number;
}

export interface ExportData {
  year: number;
  month?: number | "all"; // Optional month filter - if specified, only export that month
  drivers: Driver[];
  performance: DriverPerformance[];
  calculations: IncentiveCalculation[];
  companyName?: string;
  typeFilter?: "all" | "local" | "export";
}

/**
 * Extract fuel bonus from calculation_details if available
 */
function getFuelBonusFromCalculation(calc: IncentiveCalculation | undefined): number {
  if (!calc?.calculation_details) return 0;
  
  try {
    const details = calc.calculation_details as {
      bonus_breakdown?: {
        fuel_efficiency_bonus?: number;
      };
    };
    return details.bonus_breakdown?.fuel_efficiency_bonus || 0;
  } catch {
    return 0;
  }
}

/**
 * Generate monthly summary data for export including fuel bonus
 */
function generateMonthlySummary(data: ExportData): MonthlyIncentiveData[] {
  const { year, month: selectedMonth, drivers, performance, calculations, typeFilter = "all" } = data;

  const filteredDrivers = drivers.filter(
    (d) => d.status === "active" && (typeFilter === "all" || d.driver_type === typeFilter)
  );
  const driverIds = new Set(filteredDrivers.map((d) => d.id));

  const months: MonthlyIncentiveData[] = [];

  // Determine which months to process
  const monthsToProcess = selectedMonth && selectedMonth !== "all" 
    ? [selectedMonth] 
    : Array.from({ length: 12 }, (_, i) => i + 1);

  for (const month of monthsToProcess) {
    const monthPerf = performance.filter(
      (p) => p.year === year && p.month === month && driverIds.has(p.driver_id)
    );
    const monthCalc = calculations.filter(
      (c) => c.year === year && c.month === month && driverIds.has(c.driver_id)
    );

    // Separate by type
    const localDrivers = filteredDrivers.filter((d) => d.driver_type === "local");
    const exportDrivers = filteredDrivers.filter((d) => d.driver_type === "export");
    const localDriverIds = new Set(localDrivers.map((d) => d.id));
    const exportDriverIds = new Set(exportDrivers.map((d) => d.id));

    // Calculate totals for local drivers
    const localKm = monthPerf
      .filter((p) => localDriverIds.has(p.driver_id))
      .reduce((sum, p) => sum + p.actual_kilometers, 0);
    
    const localIncentive = monthCalc
      .filter((c) => localDriverIds.has(c.driver_id))
      .reduce((sum, c) => sum + (c.total_incentive || 0), 0);
    
    // Get local fuel bonus from stored calculation_details
    const localFuelBonus = monthCalc
      .filter((c) => localDriverIds.has(c.driver_id))
      .reduce((sum, c) => sum + getFuelBonusFromCalculation(c), 0);

    // Calculate totals for export drivers
    const exportKm = monthPerf
      .filter((p) => exportDriverIds.has(p.driver_id))
      .reduce((sum, p) => sum + p.actual_kilometers, 0);
    
    const exportIncentive = monthCalc
      .filter((c) => exportDriverIds.has(c.driver_id))
      .reduce((sum, c) => sum + (c.total_incentive || 0), 0);
    
    // Get export fuel bonus from stored calculation_details
    const exportFuelBonus = monthCalc
      .filter((c) => exportDriverIds.has(c.driver_id))
      .reduce((sum, c) => sum + getFuelBonusFromCalculation(c), 0);

    // Calculate overall totals
    const totalKm = localKm + exportKm;
    const totalIncentive = localIncentive + exportIncentive;
    const totalFuelBonus = localFuelBonus + exportFuelBonus;
    const totalCombined = totalIncentive + totalFuelBonus;
    const driverCount = monthPerf.length;

    months.push({
      month,
      monthName: getMonthName(month),
      totalKm,
      totalIncentive,
      totalFuelBonus,
      totalCombined,
      driverCount,
      avgIncentive: driverCount > 0 ? totalIncentive / driverCount : 0,
      avgFuelBonus: driverCount > 0 ? totalFuelBonus / driverCount : 0,
      localKm,
      localIncentive,
      localFuelBonus,
      exportKm,
      exportIncentive,
      exportFuelBonus,
    });
  }

  return months;
}

/**
 * Generate driver-level monthly data including fuel bonus
 */
function generateDriverMonthlyData(data: ExportData): DriverMonthlyData[] {
  const { year, month: selectedMonth, drivers, performance, calculations, typeFilter = "all" } = data;

  const filteredDrivers = drivers.filter(
    (d) => d.status === "active" && (typeFilter === "all" || d.driver_type === typeFilter)
  );

  // Determine which months to include
  const monthsToInclude = selectedMonth && selectedMonth !== "all" 
    ? [selectedMonth] 
    : Array.from({ length: 12 }, (_, i) => i + 1);

  return filteredDrivers.map((driver) => {
    const driverPerf = performance.filter(
      (p) => p.driver_id === driver.id && p.year === year
    );
    const driverCalc = calculations.filter(
      (c) => c.driver_id === driver.id && c.year === year
    );

    const monthlyData = monthsToInclude.map((month) => {
      const perf = driverPerf.find((p) => p.month === month);
      const calc = driverCalc.find((c) => c.month === month);
      
      const incentive = calc?.total_incentive || 0;
      // Get fuel bonus from the stored calculation_details
      const fuelBonus = getFuelBonusFromCalculation(calc);

      return {
        month,
        km: perf?.actual_kilometers || 0,
        incentive,
        fuelBonus,
        combined: incentive + fuelBonus,
      };
    });

    const totalKm = monthlyData.reduce((sum, m) => sum + m.km, 0);
    const totalIncentive = monthlyData.reduce((sum, m) => sum + m.incentive, 0);
    const totalFuelBonus = monthlyData.reduce((sum, m) => sum + m.fuelBonus, 0);
    const totalCombined = totalIncentive + totalFuelBonus;

    return {
      driverId: driver.id,
      driverName: `${driver.first_name} ${driver.last_name}`,
      driverType: driver.driver_type,
      employeeId: driver.employee_id,
      monthlyData,
      totalKm,
      totalIncentive,
      totalFuelBonus,
      totalCombined,
    };
  });
}

/**
 * Export to PDF with fuel bonus
 */
export function exportToPDF(data: ExportData): void {
  const { year, month: selectedMonth, companyName = "Driver Incentives" } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const isSingleMonth = selectedMonth && selectedMonth !== "all";

  // Determine period label
  const periodLabel = isSingleMonth 
    ? `${getMonthName(selectedMonth)} ${year}`
    : `Full Year ${year}`;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(33, 37, 41);
  doc.text(`${companyName}`, pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(108, 117, 125);
  doc.text(`Incentive Summary - ${periodLabel}`, pageWidth / 2, 28, {
    align: "center",
  });

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 35, {
    align: "center",
  });

  // Get driver data
  const driverData = generateDriverMonthlyData(data);
  const monthlyData = generateMonthlySummary(data);

  // For single month - show clean summary
  if (isSingleMonth) {
    // Summary totals at top
    const summary = monthlyData[0];
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text("Summary", 14, 48);

    autoTable(doc, {
      startY: 52,
      head: [["Description", "Value"]],
      body: [
        ["Total Drivers", summary.driverCount.toString()],
        ["Total KM", formatNumber(summary.totalKm)],
        ["KM Incentive", formatCurrency(summary.totalIncentive)],
        ["Fuel Efficiency Bonus", formatCurrency(summary.totalFuelBonus)],
        ["Grand Total", formatCurrency(summary.totalCombined)],
      ],
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: "right" },
      },
    });

    // Driver details
    const lastY = doc.lastAutoTable.finalY + 15;
    doc.text("Driver Details", 14, lastY);

    autoTable(doc, {
      startY: lastY + 4,
      head: [["Driver", "Type", "KM", "KM Incentive", "Fuel Bonus", "Total"]],
      body: driverData.map((d) => [
        d.driverName,
        d.driverType === "local" ? "Local" : "Export",
        formatNumber(d.totalKm),
        formatCurrency(d.totalIncentive),
        formatCurrency(d.totalFuelBonus),
        formatCurrency(d.totalCombined),
      ]),
      foot: [
        [
          "TOTAL",
          "",
          formatNumber(driverData.reduce((s, d) => s + d.totalKm, 0)),
          formatCurrency(driverData.reduce((s, d) => s + d.totalIncentive, 0)),
          formatCurrency(driverData.reduce((s, d) => s + d.totalFuelBonus, 0)),
          formatCurrency(driverData.reduce((s, d) => s + d.totalCombined, 0)),
        ],
      ],
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [33, 37, 41],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });
  } else {
    // Full year - show monthly breakdown
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text("Monthly Summary", 14, 48);

    autoTable(doc, {
      startY: 52,
      head: [
        ["Month", "Drivers", "KM", "KM Incentive", "Fuel Bonus", "Total"],
      ],
      body: monthlyData.map((m) => [
        m.monthName,
        m.driverCount.toString(),
        formatNumber(m.totalKm),
        formatCurrency(m.totalIncentive),
        formatCurrency(m.totalFuelBonus),
        formatCurrency(m.totalCombined),
      ]),
      foot: [
        [
          "TOTAL",
          "",
          formatNumber(monthlyData.reduce((s, m) => s + m.totalKm, 0)),
          formatCurrency(monthlyData.reduce((s, m) => s + m.totalIncentive, 0)),
          formatCurrency(monthlyData.reduce((s, m) => s + m.totalFuelBonus, 0)),
          formatCurrency(monthlyData.reduce((s, m) => s + m.totalCombined, 0)),
        ],
      ],
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [33, 37, 41],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });

    // Driver Details (new page for full year)
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Driver Details - Annual Totals", 14, 20);

    autoTable(doc, {
      startY: 24,
      head: [["Driver", "Type", "Total KM", "KM Incentive", "Fuel Bonus", "Total"]],
      body: driverData.map((d) => [
        d.driverName,
        d.driverType === "local" ? "L" : "E",
        formatNumber(d.totalKm),
        formatCurrency(d.totalIncentive),
        formatCurrency(d.totalFuelBonus),
        formatCurrency(d.totalCombined),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });
  }

  // Generate filename
  const filenamePeriod = isSingleMonth 
    ? `${getMonthName(selectedMonth)}_${year}` 
    : `${year}`;

  // Save
  doc.save(`Incentive_Summary_${filenamePeriod}_${new Date().toISOString().split("T")[0]}.pdf`);
}

/**
 * Export to Excel with fuel bonus
 */
export function exportToExcel(data: ExportData): void {
  const { year, month: selectedMonth, companyName = "Driver Incentives" } = data;
  const workbook = XLSX.utils.book_new();

  // Determine period label
  const isSingleMonth = selectedMonth && selectedMonth !== "all";
  const periodLabel = isSingleMonth 
    ? `${getMonthName(selectedMonth)} ${year}`
    : `Full Year ${year}`;

  // Get data
  const monthlyData = generateMonthlySummary(data);
  const driverData = generateDriverMonthlyData(data);

  if (isSingleMonth) {
    // Single month - clean summary on one sheet
    const summary = monthlyData[0];
    const summaryRows = [
      [`${companyName} - Incentive Summary`],
      [`Period: ${periodLabel}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["SUMMARY"],
      ["Total Drivers", summary.driverCount],
      ["Total KM", summary.totalKm],
      ["KM Incentive", summary.totalIncentive],
      ["Fuel Efficiency Bonus", summary.totalFuelBonus],
      ["Grand Total", summary.totalCombined],
      [],
      [],
      ["DRIVER DETAILS"],
      ["Employee ID", "Driver Name", "Type", "KM", "KM Incentive", "Fuel Bonus", "Total"],
      ...driverData.map((d) => [
        d.employeeId,
        d.driverName,
        d.driverType === "local" ? "Local" : "Export",
        d.totalKm,
        d.totalIncentive,
        d.totalFuelBonus,
        d.totalCombined,
      ]),
      [],
      ["TOTAL", "", "", 
        driverData.reduce((s, d) => s + d.totalKm, 0),
        driverData.reduce((s, d) => s + d.totalIncentive, 0),
        driverData.reduce((s, d) => s + d.totalFuelBonus, 0),
        driverData.reduce((s, d) => s + d.totalCombined, 0),
      ],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet["!cols"] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  } else {
    // Full year - multiple sheets
    // Monthly Summary Sheet
    const summaryRows = [
      [`${companyName} - Incentive Report ${periodLabel}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["Month", "Drivers", "Total KM", "KM Incentive", "Fuel Bonus", "Total Payment"],
      ...monthlyData.map((m) => [
        m.monthName,
        m.driverCount,
        m.totalKm,
        m.totalIncentive,
        m.totalFuelBonus,
        m.totalCombined,
      ]),
      [],
      [
        "TOTAL",
        "",
        monthlyData.reduce((s, m) => s + m.totalKm, 0),
        monthlyData.reduce((s, m) => s + m.totalIncentive, 0),
        monthlyData.reduce((s, m) => s + m.totalFuelBonus, 0),
        monthlyData.reduce((s, m) => s + m.totalCombined, 0),
      ],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet["!cols"] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Monthly Summary");

    // Driver Details Sheet
    const driverRows = [
      ["Driver Details - Annual Totals"],
      [],
      ["Employee ID", "Driver Name", "Type", "Total KM", "KM Incentive", "Fuel Bonus", "Total Payment"],
      ...driverData.map((d) => [
        d.employeeId,
        d.driverName,
        d.driverType === "local" ? "Local" : "Export",
        d.totalKm,
        d.totalIncentive,
        d.totalFuelBonus,
        d.totalCombined,
      ]),
    ];

    const driverSheet = XLSX.utils.aoa_to_sheet(driverRows);
    driverSheet["!cols"] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(workbook, driverSheet, "Driver Totals");
  }

  // Generate filename
  const filenamePeriod = isSingleMonth 
    ? `${getMonthName(selectedMonth)}_${year}` 
    : `${year}`;

  // Save
  XLSX.writeFile(
    workbook,
    `Incentive_Summary_${filenamePeriod}_${new Date().toISOString().split("T")[0]}.xlsx`
  );
}

// Export the helper functions if needed elsewhere
export { generateDriverMonthlyData, generateMonthlySummary };

// ============================================
// SCORECARD PDF EXPORT
// ============================================

export interface ScorecardExportData {
  employeeName: string;
  employeeId: string;
  roleName: string;
  year: number;
  month: number;
  monthName: string;
  companyName?: string;
  kraScores: {
    kraName: string;
    kraWeighting: number;
    kpiScores: {
      kpiName: string;
      target: number;
      actual: number;
      unit: string | null;
      achievementPercent: number;
      score: number;
      kpiWeighting: number;
      weightedScore: number;
    }[];
    kraWeightedScore: number;
    finalKraScore: number;
  }[];
  totalWeightedScore: number;
  rating: string;
}

/**
 * Export scorecard to PDF
 */
export function exportScorecardToPDF(data: ScorecardExportData): void {
  const { 
    employeeName, 
    employeeId, 
    roleName, 
    year,
    monthName,
    companyName = "Performance Scorecard",
    kraScores,
    totalWeightedScore,
    rating
  } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header with company/title
  doc.setFontSize(18);
  doc.setTextColor(33, 37, 41);
  doc.text(companyName, pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text(`${roleName} Scorecard`, pageWidth / 2, 26, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(108, 117, 125);
  doc.text(`${monthName} ${year}`, pageWidth / 2, 33, { align: "center" });

  // Employee Info Box
  doc.setFillColor(249, 250, 251);
  doc.rect(14, 40, pageWidth - 28, 20, "F");
  doc.setDrawColor(229, 231, 235);
  doc.rect(14, 40, pageWidth - 28, 20, "S");

  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text(`Employee: ${employeeName}`, 20, 48);
  doc.text(`Employee ID: ${employeeId}`, 20, 55);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 65, 48);

  // Build table data
  const tableBody: (string | { content: string; colSpan?: number; styles?: object })[][] = [];

  kraScores.forEach((kraScore) => {
    kraScore.kpiScores.forEach((kpiScore, kpiIndex) => {
      if (kpiIndex === 0) {
        // First row with KRA info
        tableBody.push([
          { content: `${kraScore.kraWeighting}%`, styles: { fillColor: [239, 246, 255], fontStyle: "bold" } },
          { content: kraScore.kraName, styles: { fillColor: [239, 246, 255], fontStyle: "bold" } },
          kpiScore.kpiName,
          `${kpiScore.target} ${kpiScore.unit || ""}`.trim(),
          kpiScore.actual.toString(),
          `${kpiScore.achievementPercent.toFixed(1)}%`,
          `${kpiScore.score.toFixed(0)}%`,
          `${kpiScore.kpiWeighting}%`,
          kpiScore.weightedScore.toFixed(2),
        ]);
      } else {
        // Subsequent KPI rows without KRA info
        tableBody.push([
          "",
          "",
          kpiScore.kpiName,
          `${kpiScore.target} ${kpiScore.unit || ""}`.trim(),
          kpiScore.actual.toString(),
          `${kpiScore.achievementPercent.toFixed(1)}%`,
          `${kpiScore.score.toFixed(0)}%`,
          `${kpiScore.kpiWeighting}%`,
          kpiScore.weightedScore.toFixed(2),
        ]);
      }
    });

    // KRA subtotal row
    tableBody.push([
      { content: `${kraScore.kraName} Sub Total`, colSpan: 7, styles: { fillColor: [243, 244, 246], halign: "right", fontStyle: "bold" } },
      { content: "100%", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
      { content: kraScore.finalKraScore.toFixed(2), styles: { fillColor: [243, 244, 246], fontStyle: "bold", textColor: [37, 99, 235] } },
    ]);
  });

  // Total row
  tableBody.push([
    { content: "TOTAL SCORE", colSpan: 7, styles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], halign: "right", fontStyle: "bold" } },
    { content: "100%", styles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold" } },
    { content: totalWeightedScore.toFixed(1), styles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 11 } },
  ]);

  autoTable(doc, {
    startY: 65,
    head: [["Weight", "KRA", "KPI / Deliverable", "Target", "Actual", "Achieve %", "Score", "KPI Wt", "Weighted"]],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: 42 },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 16, halign: "right" },
      7: { cellWidth: 14, halign: "right" },
      8: { cellWidth: 18, halign: "right" },
    },
    didParseCell: (hookData) => {
      // Color code achievement percentage
      if (hookData.column.index === 5 && hookData.section === "body") {
        const value = parseFloat(hookData.cell.raw as string);
        if (!isNaN(value)) {
          if (value >= 100) {
            hookData.cell.styles.textColor = [22, 163, 74]; // green
          } else if (value >= 80) {
            hookData.cell.styles.textColor = [37, 99, 235]; // blue
          } else if (value >= 60) {
            hookData.cell.styles.textColor = [202, 138, 4]; // yellow
          } else {
            hookData.cell.styles.textColor = [220, 38, 38]; // red
          }
        }
      }
    },
  });

  // Rating summary box
  const finalY = doc.lastAutoTable.finalY + 10;

  // Get rating color
  let ratingBgColor: [number, number, number] = [243, 244, 246];
  let ratingTextColor: [number, number, number] = [55, 65, 81];
  
  switch (rating) {
    case "Excellent":
      ratingBgColor = [220, 252, 231];
      ratingTextColor = [22, 101, 52];
      break;
    case "Very Good":
      ratingBgColor = [219, 234, 254];
      ratingTextColor = [30, 64, 175];
      break;
    case "Good":
      ratingBgColor = [207, 250, 254];
      ratingTextColor = [14, 116, 144];
      break;
    case "Satisfactory":
      ratingBgColor = [254, 249, 195];
      ratingTextColor = [161, 98, 7];
      break;
    case "Needs Improvement":
      ratingBgColor = [255, 237, 213];
      ratingTextColor = [194, 65, 12];
      break;
    case "Unsatisfactory":
      ratingBgColor = [254, 226, 226];
      ratingTextColor = [153, 27, 27];
      break;
  }

  // Final Rating Box
  doc.setFillColor(...ratingBgColor);
  doc.roundedRect(pageWidth - 80, finalY, 66, 18, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text("Final Rating:", pageWidth - 75, finalY + 7);
  doc.setFontSize(12);
  doc.setTextColor(...ratingTextColor);
  doc.text(rating, pageWidth - 75, finalY + 14);

  // Score Box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(pageWidth - 150, finalY, 66, 18, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text("Total Score:", pageWidth - 145, finalY + 7);
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(`${totalWeightedScore.toFixed(1)}%`, pageWidth - 145, finalY + 14);

  // Legend
  const legendY = finalY + 28;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("Performance Rating Scale:", 14, legendY);
  
  const legends = [
    { color: [34, 197, 94] as [number, number, number], text: "Excellent (90-100%)" },
    { color: [59, 130, 246] as [number, number, number], text: "Very Good (80-90%)" },
    { color: [6, 182, 212] as [number, number, number], text: "Good (70-80%)" },
    { color: [234, 179, 8] as [number, number, number], text: "Satisfactory (60-70%)" },
    { color: [249, 115, 22] as [number, number, number], text: "Needs Improvement (50-60%)" },
    { color: [239, 68, 68] as [number, number, number], text: "Unsatisfactory (<50%)" },
  ];

  let legendX = 14;
  doc.setFontSize(7);
  legends.forEach((legend) => {
    doc.setFillColor(...legend.color);
    doc.circle(legendX + 2, legendY + 6, 2, "F");
    doc.setTextColor(75, 85, 99);
    doc.text(legend.text, legendX + 6, legendY + 7);
    legendX += 32;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "This scorecard is auto-generated. Please verify all data before use.",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  // Save
  const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Scorecard_${sanitizedName}_${monthName}_${year}.pdf`);
}

/**
 * Driver Earnings Report Export Interface
 */
export interface DriverEarningsExportData {
  driver: Driver;
  year: number;
  companyName?: string;
  monthlyEarnings: {
    month: number;
    usdBaseSalary: number;
    zigBaseSalary: number;
    conversionRate: number;
    zigInUsd: number;
    totalBaseSalary: number;
    kmIncentive: number;
    fuelBonus: number;
    performanceBonus: number;
    safetyBonus: number;
    deductions: number;
    totalIncentive: number;
    totalEarnings: number;
  }[];
  yearOverYearData?: {
    month: string;
    currentYear: number;
    previousYear: number;
    growth: number;
  }[];
  annualSummary?: {
    year: string;
    baseSalary: number;
    incentives: number;
    totalEarnings: number;
    incentivePercent: number;
  }[];
  chartImages?: {
    earningsChart?: string;
    yearOverYearChart?: string;
    cumulativeChart?: string;
    pieChart?: string;
    annualChart?: string;
  };
}

/**
 * Export Driver Earnings Report to PDF with charts
 */
export function exportDriverEarningsToPDF(data: DriverEarningsExportData): void {
  const { 
    driver, 
    year, 
    companyName = "Driver Incentives",
    monthlyEarnings,
    yearOverYearData,
    annualSummary,
    chartImages 
  } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const driverName = `${driver.first_name} ${driver.last_name}`;

  // Helper function to add a new page
  const addNewPage = () => {
    doc.addPage();
    // Add header to each page
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text(`${driverName} - Earnings Report ${year}`, 14, 10);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 25, 10);
    return 20;
  };

  // ============ PAGE 1: Title & Summary ============
  // Title
  doc.setFontSize(22);
  doc.setTextColor(33, 37, 41);
  doc.text(companyName, pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(16);
  doc.setTextColor(59, 130, 246);
  doc.text("Driver Earnings Report", pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(108, 117, 125);
  doc.text(`${driverName} - ${year}`, pageWidth / 2, 38, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, 45, {
    align: "center",
  });

  // Driver Info Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 52, pageWidth - 28, 25, 3, 3, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(33, 37, 41);
  doc.text("Employee ID:", 20, 62);
  doc.text("Driver Type:", 80, 62);
  doc.text("Status:", 140, 62);
  
  doc.setTextColor(59, 130, 246);
  doc.text(driver.employee_id || "N/A", 20, 70);
  doc.text(driver.driver_type === "local" ? "Local" : "Export", 80, 70);
  doc.text(driver.status === "active" ? "Active" : "Inactive", 140, 70);

  // Calculate totals
  const totalBaseSalary = monthlyEarnings.reduce((sum, e) => sum + e.totalBaseSalary, 0);
  const totalKmIncentive = monthlyEarnings.reduce((sum, e) => sum + e.kmIncentive, 0);
  const totalFuelBonus = monthlyEarnings.reduce((sum, e) => sum + e.fuelBonus, 0);
  const totalPerfBonus = monthlyEarnings.reduce((sum, e) => sum + e.performanceBonus, 0);
  const totalSafetyBonus = monthlyEarnings.reduce((sum, e) => sum + e.safetyBonus, 0);
  const totalDeductions = monthlyEarnings.reduce((sum, e) => sum + e.deductions, 0);
  const grandTotalIncentives = totalKmIncentive + totalFuelBonus + totalPerfBonus + totalSafetyBonus;
  const grandTotal = monthlyEarnings.reduce((sum, e) => sum + e.totalEarnings, 0);
  const incentivePercent = grandTotal > 0 ? (grandTotalIncentives / grandTotal) * 100 : 0;

  // Annual Summary Box
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41);
  doc.text(`Annual Summary - ${year}`, 14, 88);

  autoTable(doc, {
    startY: 92,
    head: [["Category", "Amount (USD)"]],
    body: [
      ["Base Salary (USD + ZIG converted)", formatCurrency(totalBaseSalary)],
      ["KM Incentive", formatCurrency(totalKmIncentive)],
      ["Diesel/Fuel Bonus", formatCurrency(totalFuelBonus)],
      ["Performance Bonus", formatCurrency(totalPerfBonus)],
      ["Safety Bonus", formatCurrency(totalSafetyBonus)],
      ["Total Incentives", formatCurrency(grandTotalIncentives)],
      ["Deductions", `-${formatCurrency(totalDeductions)}`],
    ],
    foot: [
      ["Grand Total Earnings", formatCurrency(grandTotal)],
    ],
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [34, 197, 94],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 11,
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: "right" },
    },
  });

  // Incentive Impact Box  
  const summaryY = doc.lastAutoTable.finalY + 10;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, summaryY, pageWidth - 28, 20, 3, 3, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246);
  doc.text("Incentive Impact:", 20, summaryY + 8);
  doc.setFontSize(14);
  doc.setTextColor(34, 197, 94);
  doc.text(`${incentivePercent.toFixed(1)}%`, 60, summaryY + 8);
  doc.setFontSize(9);
  doc.setTextColor(108, 117, 125);
  doc.text("of total earnings came from incentives and bonuses", 80, summaryY + 8);
  
  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246);
  doc.text("Monthly Average:", 20, summaryY + 16);
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41);
  doc.text(formatCurrency(grandTotal / 12), 60, summaryY + 16);
  doc.setFontSize(9);
  doc.setTextColor(108, 117, 125);
  doc.text(`per month (Base: ${formatCurrency(totalBaseSalary / 12)} + Incentives: ${formatCurrency(grandTotalIncentives / 12)})`, 95, summaryY + 16);

  // ============ PAGE 2: Monthly Earnings Table ============
  let currentY = addNewPage();
  
  doc.setFontSize(14);
  doc.setTextColor(33, 37, 41);
  doc.text(`Monthly Earnings Breakdown - ${year}`, 14, currentY);

  autoTable(doc, {
    startY: currentY + 5,
    head: [["Month", "Base USD", "ZIG→USD", "Total Base", "KM Inc", "Fuel", "Perf", "Safety", "Deduct", "Total"]],
    body: monthlyEarnings.map((e) => [
      getMonthName(e.month).substring(0, 3),
      formatCurrency(e.usdBaseSalary),
      formatCurrency(e.zigInUsd),
      formatCurrency(e.totalBaseSalary),
      formatCurrency(e.kmIncentive),
      formatCurrency(e.fuelBonus),
      formatCurrency(e.performanceBonus),
      formatCurrency(e.safetyBonus),
      `-${formatCurrency(e.deductions)}`,
      formatCurrency(e.totalEarnings),
    ]),
    foot: [
      [
        "TOTAL",
        formatCurrency(monthlyEarnings.reduce((s, e) => s + e.usdBaseSalary, 0)),
        formatCurrency(monthlyEarnings.reduce((s, e) => s + e.zigInUsd, 0)),
        formatCurrency(totalBaseSalary),
        formatCurrency(totalKmIncentive),
        formatCurrency(totalFuelBonus),
        formatCurrency(totalPerfBonus),
        formatCurrency(totalSafetyBonus),
        `-${formatCurrency(totalDeductions)}`,
        formatCurrency(grandTotal),
      ],
    ],
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
    },
    footStyles: {
      fillColor: [34, 197, 94],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 18, halign: "right" },
      2: { cellWidth: 18, halign: "right" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 16, halign: "right" },
      6: { cellWidth: 16, halign: "right" },
      7: { cellWidth: 16, halign: "right" },
      8: { cellWidth: 18, halign: "right" },
      9: { cellWidth: 22, halign: "right", fontStyle: "bold" },
    },
  });

  // ============ PAGE 3: Charts (if provided) ============
  if (chartImages) {
    currentY = addNewPage();
    
    doc.setFontSize(14);
    doc.setTextColor(33, 37, 41);
    doc.text("Earnings Visualizations", 14, currentY);
    currentY += 8;

    // Earnings Chart
    if (chartImages.earningsChart) {
      doc.setFontSize(10);
      doc.setTextColor(108, 117, 125);
      doc.text("Monthly Earnings Breakdown", 14, currentY);
      currentY += 3;
      
      try {
        doc.addImage(chartImages.earningsChart, "PNG", 14, currentY, pageWidth - 28, 70);
        currentY += 75;
      } catch (e) {
        console.error("Failed to add earnings chart:", e);
      }
    }

    // Year-over-Year Chart
    if (chartImages.yearOverYearChart && currentY < pageHeight - 80) {
      doc.setFontSize(10);
      doc.setTextColor(108, 117, 125);
      doc.text("Year-over-Year Comparison", 14, currentY);
      currentY += 3;
      
      try {
        doc.addImage(chartImages.yearOverYearChart, "PNG", 14, currentY, pageWidth - 28, 70);
        currentY += 75;
      } catch (e) {
        console.error("Failed to add YoY chart:", e);
      }
    }

    // New page for more charts if needed
    if (chartImages.cumulativeChart || chartImages.pieChart) {
      currentY = addNewPage();
      
      // Cumulative Growth Chart
      if (chartImages.cumulativeChart) {
        doc.setFontSize(10);
        doc.setTextColor(108, 117, 125);
        doc.text("Cumulative Earnings Growth", 14, currentY);
        currentY += 3;
        
        try {
          doc.addImage(chartImages.cumulativeChart, "PNG", 14, currentY, pageWidth - 28, 70);
          currentY += 75;
        } catch (e) {
          console.error("Failed to add cumulative chart:", e);
        }
      }

      // Pie Chart - Incentive Breakdown
      if (chartImages.pieChart && currentY < pageHeight - 80) {
        doc.setFontSize(10);
        doc.setTextColor(108, 117, 125);
        doc.text("Incentive Distribution", 14, currentY);
        currentY += 3;
        
        try {
          doc.addImage(chartImages.pieChart, "PNG", 14, currentY, 80, 60);
        } catch (e) {
          console.error("Failed to add pie chart:", e);
        }
      }
    }
  }

  // ============ PAGE: Year-over-Year Data Table ============
  if (yearOverYearData && yearOverYearData.length > 0) {
    currentY = addNewPage();
    
    doc.setFontSize(14);
    doc.setTextColor(33, 37, 41);
    doc.text(`Year-over-Year Comparison: ${year - 1} vs ${year}`, 14, currentY);

    autoTable(doc, {
      startY: currentY + 5,
      head: [["Month", `${year - 1}`, `${year}`, "Growth %"]],
      body: yearOverYearData.map((d) => [
        d.month,
        formatCurrency(d.previousYear),
        formatCurrency(d.currentYear),
        `${d.growth >= 0 ? '+' : ''}${d.growth.toFixed(1)}%`,
      ]),
      foot: [
        [
          "TOTAL",
          formatCurrency(yearOverYearData.reduce((s, d) => s + d.previousYear, 0)),
          formatCurrency(yearOverYearData.reduce((s, d) => s + d.currentYear, 0)),
          (() => {
            const prev = yearOverYearData.reduce((s, d) => s + d.previousYear, 0);
            const curr = yearOverYearData.reduce((s, d) => s + d.currentYear, 0);
            const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
            return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
          })(),
        ],
      ],
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40, halign: "right" },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 30, halign: "right" },
      },
    });
  }

  // ============ PAGE: Annual Summary (Multi-Year) ============
  if (annualSummary && annualSummary.length > 1) {
    currentY = addNewPage();
    
    doc.setFontSize(14);
    doc.setTextColor(33, 37, 41);
    doc.text("Multi-Year Earnings Summary", 14, currentY);

    autoTable(doc, {
      startY: currentY + 5,
      head: [["Year", "Base Salary", "Incentives", "Total Earnings", "Incentive %"]],
      body: annualSummary.map((s) => [
        s.year,
        formatCurrency(s.baseSalary),
        formatCurrency(s.incentives),
        formatCurrency(s.totalEarnings),
        `${s.incentivePercent.toFixed(1)}%`,
      ]),
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: "bold" },
        1: { cellWidth: 40, halign: "right" },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 45, halign: "right", fontStyle: "bold" },
        4: { cellWidth: 30, halign: "right" },
      },
    });

    // Annual chart if provided
    if (chartImages?.annualChart) {
      const chartY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(108, 117, 125);
      doc.text("Annual Earnings Trend", 14, chartY);
      
      try {
        doc.addImage(chartImages.annualChart, "PNG", 14, chartY + 3, pageWidth - 28, 70);
      } catch (e) {
        console.error("Failed to add annual chart:", e);
      }
    }
  }

  // ============ Footer on all pages ============
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      "This report is auto-generated. Please verify all data before use.",
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 20,
      pageHeight - 8,
      { align: "right" }
    );
  }

  // Save
  const sanitizedName = driverName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Driver_Earnings_${sanitizedName}_${year}.pdf`);
}

/**
 * Capture chart element as base64 image using html2canvas
 */
export async function captureChartAsImage(chartElementId: string): Promise<string | null> {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const element = document.getElementById(chartElementId);
    if (!element) {
      console.error(`Element with id "${chartElementId}" not found`);
      return null;
    }
    
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
    });
    
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to capture chart:", error);
    return null;
  }
}

/**
 * Capture multiple charts and return as object
 */
export async function captureAllCharts(chartIds: {
  earningsChart?: string;
  yearOverYearChart?: string;
  cumulativeChart?: string;
  pieChart?: string;
  annualChart?: string;
}): Promise<DriverEarningsExportData["chartImages"]> {
  const images: DriverEarningsExportData["chartImages"] = {};
  
  if (chartIds.earningsChart) {
    images.earningsChart = await captureChartAsImage(chartIds.earningsChart) || undefined;
  }
  if (chartIds.yearOverYearChart) {
    images.yearOverYearChart = await captureChartAsImage(chartIds.yearOverYearChart) || undefined;
  }
  if (chartIds.cumulativeChart) {
    images.cumulativeChart = await captureChartAsImage(chartIds.cumulativeChart) || undefined;
  }
  if (chartIds.pieChart) {
    images.pieChart = await captureChartAsImage(chartIds.pieChart) || undefined;
  }
  if (chartIds.annualChart) {
    images.annualChart = await captureChartAsImage(chartIds.annualChart) || undefined;
  }
  
  return images;
}

