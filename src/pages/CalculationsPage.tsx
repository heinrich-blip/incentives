/**
 * Calculations Management Page
 * Phase 2.1: Smart Calculation Features
 * 
 * Features:
 * - Auto-calculate on performance entry
 * - Batch processing for month-end
 * - Draft → Approval → Payment workflow
 * - Audit trail for all changes
 * - Undo/rollback capability
 * - What-if scenario calculator
 */

import { useCallback, useMemo, useState } from "react";
import BulkPerformanceModal from "../components/BulkPerformanceModal";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import type { AuditLog, CalculationSnapshot, IncentiveCalculation } from "../types/database";
import
    {
        batchCalculateIncentives,
        calculateDriverIncentive,
        calculateWhatIfScenarios,
        generateDefaultScenarios,
        getAvailableTransitions,
        getStatusColor,
        getStatusLabel,
        resultToIncentiveCalculation,
        type BatchCalculationResult,
        type WhatIfScenario,
        type WorkflowStatus
    } from "../utils/calculations";
import
    {
        formatCurrency,
        formatNumber,
        formatPercentage,
        generateInitials,
        getAchievementColor,
        getMonthName,
    } from "../utils/formatters";

type ViewMode = "overview" | "batch" | "workflow" | "whatif" | "audit";

export default function CalculationsPage() {
  const {
    drivers,
    driverPerformance,
    monthlyBudgets,
    incentiveSettings,
    incentiveCalculations,
    customFormulas,
    selectedYear,
    selectedMonth,
    setSelectedPeriod,
    showToast,
    setIncentiveCalculations,
  } = useStore();

  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchCalculationResult | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [whatIfScenarios, setWhatIfScenarios] = useState<WhatIfScenario[]>([]);
  const [customScenario, setCustomScenario] = useState({ name: "", km: "" });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [snapshots, setSnapshots] = useState<CalculationSnapshot[]>([]);
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");

  // Get calculations for the selected period
  const periodCalculations = useMemo(() => {
    return incentiveCalculations
      .filter((c) => c.year === selectedYear && c.month === selectedMonth)
      .map((calc) => {
        const driver = drivers.find((d) => d.id === calc.driver_id);
        return { ...calc, driver };
      })
      .filter((c) => statusFilter === "all" || c.status === statusFilter);
  }, [incentiveCalculations, selectedYear, selectedMonth, drivers, statusFilter]);

  // Get stats for the period
  const stats = useMemo(() => {
    const all = periodCalculations;
    return {
      total: all.length,
      draft: all.filter((c) => c.status === "draft").length,
      pending: all.filter((c) => c.status === "pending_approval").length,
      approved: all.filter((c) => c.status === "approved").length,
      paid: all.filter((c) => c.status === "paid").length,
      totalIncentives: all.reduce((sum, c) => sum + c.total_incentive, 0),
      totalEarnings: all.reduce((sum, c) => sum + c.total_earnings, 0),
    };
  }, [periodCalculations]);

  // Get drivers without calculations for this period
  const driversWithoutCalc = useMemo(() => {
    const calcDriverIds = new Set(periodCalculations.map((c) => c.driver_id));
    return drivers
      .filter((d) => d.status === "active" && !calcDriverIds.has(d.id))
      .map((d) => {
        const perf = driverPerformance.find(
          (p) => p.driver_id === d.id && p.year === selectedYear && p.month === selectedMonth
        );
        return { driver: d, hasPerformance: !!perf };
      });
  }, [drivers, periodCalculations, driverPerformance, selectedYear, selectedMonth]);

  // Get divisors
  const localDivisor = useMemo(() => {
    const setting = incentiveSettings.find(
      (s) => s.setting_key === "incentive_divisor_local" && s.is_active
    );
    return setting ? (setting.setting_value as number) : 1;
  }, [incentiveSettings]);

  const exportDivisor = useMemo(() => {
    const setting = incentiveSettings.find(
      (s) => s.setting_key === "incentive_divisor_export" && s.is_active
    );
    return setting ? (setting.setting_value as number) : 1;
  }, [incentiveSettings]);

  // ============================================
  // BATCH CALCULATION
  // ============================================

  const handleBatchCalculate = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      showToast("Cannot calculate in demo mode");
      return;
    }

    setIsProcessing(true);
    try {
      const result = batchCalculateIncentives(
        drivers,
        driverPerformance,
        monthlyBudgets,
        incentiveSettings,
        customFormulas,
        selectedYear,
        selectedMonth
      );

      setBatchResult(result);

      // Save all successful calculations to database
      for (const calcResult of result.success) {
        const calcData = resultToIncentiveCalculation(calcResult, "draft");

        // Check for existing calculation
        const { data: existing } = await supabase
          .from("incentive_calculations")
          .select("id")
          .eq("driver_id", calcResult.driverId)
          .eq("year", calcResult.year)
          .eq("month", calcResult.month)
          .single();

        if (existing) {
          await supabase
            .from("incentive_calculations")
            .update(calcData)
            .eq("id", existing.id);
        } else {
          await supabase.from("incentive_calculations").insert(calcData);
        }
      }

      // Log the batch operation
      await supabase.from("audit_log").insert({
        table_name: "incentive_calculations",
        record_id: "batch",
        action: "batch_calculate",
        new_values: {
          year: selectedYear,
          month: selectedMonth,
          success_count: result.summary.successCount,
          failed_count: result.summary.failedCount,
          total_incentives: result.summary.totalIncentives,
        },
        changed_by: "system",
      });

      // Refresh calculations
      const { data } = await supabase.from("incentive_calculations").select("*");
      if (data) {
        setIncentiveCalculations(data);
      }

      showToast(
        `Calculated ${result.summary.successCount} drivers. ${result.summary.failedCount} failed.`
      );
    } catch (error) {
      console.error("Batch calculation error:", error);
      showToast("Error during batch calculation");
    } finally {
      setIsProcessing(false);
    }
  }, [
    drivers,
    driverPerformance,
    monthlyBudgets,
    incentiveSettings,
    customFormulas,
    selectedYear,
    selectedMonth,
    showToast,
    setIncentiveCalculations,
  ]);

  // ============================================
  // WORKFLOW STATUS MANAGEMENT
  // ============================================

  const handleStatusChange = useCallback(
    async (calculationId: string, newStatus: WorkflowStatus) => {
      if (!isSupabaseConfigured()) {
        showToast("Cannot update in demo mode");
        return;
      }

      try {
        const calc = incentiveCalculations.find((c) => c.id === calculationId);
        if (!calc) return;

        // Create snapshot before status change (for rollback)
        await supabase.from("calculation_snapshots").insert({
          calculation_id: calculationId,
          driver_id: calc.driver_id,
          year: calc.year,
          month: calc.month,
          snapshot_data: calc,
          created_by: "system",
          reason: `Status change from ${calc.status} to ${newStatus}`,
        });

        const updateData: Partial<IncentiveCalculation> = {
          status: newStatus,
        };

        if (newStatus === "approved") {
          updateData.approved_by = "admin"; // TODO: Use actual user
          updateData.approved_date = new Date().toISOString();
        } else if (newStatus === "paid") {
          updateData.paid_date = new Date().toISOString();
        }

        await supabase.from("incentive_calculations").update(updateData).eq("id", calculationId);

        // Log the change
        await supabase.from("audit_log").insert({
          table_name: "incentive_calculations",
          record_id: calculationId,
          action: newStatus === "approved" ? "approve" : "update",
          old_values: { status: calc.status },
          new_values: { status: newStatus },
          changed_by: "system",
        });

        // Refresh
        const { data } = await supabase.from("incentive_calculations").select("*");
        if (data) {
          setIncentiveCalculations(data);
        }

        showToast(`Status updated to ${getStatusLabel(newStatus)}`);
      } catch (error) {
        console.error("Status update error:", error);
        showToast("Error updating status");
      }
    },
    [incentiveCalculations, showToast, setIncentiveCalculations]
  );

  // Bulk status update
  const handleBulkStatusChange = useCallback(
    async (fromStatus: WorkflowStatus, toStatus: WorkflowStatus) => {
      if (!isSupabaseConfigured()) {
        showToast("Cannot update in demo mode");
        return;
      }

      setIsProcessing(true);
      try {
        const toUpdate = periodCalculations.filter((c) => c.status === fromStatus);

        for (const calc of toUpdate) {
          await handleStatusChange(calc.id, toStatus);
        }

        showToast(`Updated ${toUpdate.length} calculations to ${getStatusLabel(toStatus)}`);
      } catch (error) {
        console.error("Bulk status update error:", error);
        showToast("Error during bulk update");
      } finally {
        setIsProcessing(false);
      }
    },
    [periodCalculations, handleStatusChange, showToast]
  );

  // ============================================
  // WHAT-IF SCENARIO
  // ============================================

  const handleCalculateWhatIf = useCallback(() => {
    if (!selectedDriverId) {
      showToast("Please select a driver");
      return;
    }

    const driver = drivers.find((d) => d.id === selectedDriverId);
    const performance = driverPerformance.find(
      (p) => p.driver_id === selectedDriverId && p.year === selectedYear && p.month === selectedMonth
    );

    if (!driver || !performance) {
      showToast("No performance data for this driver/period");
      return;
    }

    const budget = monthlyBudgets.find(
      (b) => b.year === selectedYear && b.month === selectedMonth && b.driver_type === driver.driver_type
    );

    const divisor = driver.driver_type === "export" ? exportDivisor : localDivisor;

    const currentResult = calculateDriverIncentive({
      driver,
      performance,
      budget: budget || null,
      divisor,
      formulas: customFormulas,
    });

    const scenarios = generateDefaultScenarios(
      currentResult.actualKm,
      currentResult.targetKm
    );

    // Add custom scenario if provided
    if (customScenario.name && customScenario.km) {
      scenarios.push({
        name: customScenario.name,
        additionalKm: parseInt(customScenario.km),
      });
    }

    const whatIf = calculateWhatIfScenarios(currentResult, scenarios);
    setWhatIfScenarios(whatIf);
  }, [
    selectedDriverId,
    drivers,
    driverPerformance,
    monthlyBudgets,
    customFormulas,
    selectedYear,
    selectedMonth,
    localDivisor,
    exportDivisor,
    customScenario,
    showToast,
  ]);

  // ============================================
  // ROLLBACK
  // ============================================

  const handleRollback = useCallback(
    async (calculationId: string) => {
      if (!isSupabaseConfigured()) {
        showToast("Cannot rollback in demo mode");
        return;
      }

      try {
        // Get the most recent snapshot
        const { data: snapshot } = await supabase
          .from("calculation_snapshots")
          .select("*")
          .eq("calculation_id", calculationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!snapshot) {
          showToast("No snapshot available for rollback");
          return;
        }

        // Restore the snapshot
        const restoreData = snapshot.snapshot_data as unknown as IncentiveCalculation;
        await supabase
          .from("incentive_calculations")
          .update({
            status: restoreData.status,
            km_incentive: restoreData.km_incentive,
            performance_bonus: restoreData.performance_bonus,
            safety_bonus: restoreData.safety_bonus,
            deductions: restoreData.deductions,
            total_incentive: restoreData.total_incentive,
            total_earnings: restoreData.total_earnings,
            approved_by: restoreData.approved_by,
            approved_date: restoreData.approved_date,
            paid_date: restoreData.paid_date,
          })
          .eq("id", calculationId);

        // Log the rollback
        await supabase.from("audit_log").insert({
          table_name: "incentive_calculations",
          record_id: calculationId,
          action: "rollback",
          old_values: null,
          new_values: { restored_from_snapshot: snapshot.id },
          changed_by: "system",
        });

        // Refresh
        const { data } = await supabase.from("incentive_calculations").select("*");
        if (data) {
          setIncentiveCalculations(data);
        }

        showToast("Calculation rolled back successfully");
      } catch (error) {
        console.error("Rollback error:", error);
        showToast("Error during rollback");
      }
    },
    [showToast, setIncentiveCalculations]
  );

  // ============================================
  // AUDIT LOG
  // ============================================

  const loadAuditLogs = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .eq("table_name", "incentive_calculations")
        .order("changed_at", { ascending: false })
        .limit(50);

      if (data) {
        setAuditLogs(data as AuditLog[]);
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
    }
  }, []);

  const loadSnapshots = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data } = await supabase
        .from("calculation_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setSnapshots(data as CalculationSnapshot[]);
      }
    } catch (error) {
      console.error("Error loading snapshots:", error);
    }
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Calculations Engine</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Batch processing, workflow management, and scenario planning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn btn-primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Bulk Entry
          </button>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedPeriod(parseInt(e.target.value), selectedMonth)}
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => setSelectedPeriod(selectedYear, parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total</p>
          <p className="text-xl font-semibold text-surface-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Draft</p>
          <p className="text-xl font-semibold text-surface-600 mt-1">{stats.draft}</p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Pending</p>
          <p className="text-xl font-semibold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Approved</p>
          <p className="text-xl font-semibold text-green-600 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Paid</p>
          <p className="text-xl font-semibold text-blue-600 mt-1">{stats.paid}</p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Incentives</p>
          <p className="text-xl font-semibold text-primary-600 mt-1">
            {formatCurrency(stats.totalIncentives)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Earnings</p>
          <p className="text-xl font-semibold text-surface-900 mt-1">
            {formatCurrency(stats.totalEarnings)}
          </p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg border border-surface-200">
        <div className="flex border-b border-surface-200 overflow-x-auto">
          {(
            [
              { id: "overview", label: "Overview", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
              { id: "batch", label: "Batch Calculate", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
              { id: "workflow", label: "Workflow", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
              { id: "whatif", label: "What-If Calculator", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { id: "audit", label: "Audit Trail", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setViewMode(tab.id);
                if (tab.id === "audit") {
                  loadAuditLogs();
                  loadSnapshots();
                }
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                viewMode === tab.id
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-surface-600 hover:text-surface-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* OVERVIEW VIEW */}
          {viewMode === "overview" && (
            <div className="space-y-4">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-surface-600">Filter by status:</span>
                {(["all", "draft", "pending_approval", "approved", "paid"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      statusFilter === status
                        ? "bg-surface-900 text-white"
                        : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                    }`}
                  >
                    {status === "all" ? "All" : getStatusLabel(status)}
                  </button>
                ))}
              </div>

              {/* Calculations Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-surface-200">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                        Actual KM
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                        KM Incentive
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                        Bonuses
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodCalculations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-surface-500">
                          No calculations for this period. Use Batch Calculate to generate.
                        </td>
                      </tr>
                    ) : (
                      periodCalculations.map((calc) => (
                        <tr key={calc.id} className="border-b border-surface-100 hover:bg-surface-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold">
                                {calc.driver
                                  ? generateInitials(calc.driver.first_name, calc.driver.last_name)
                                  : "??"}
                              </div>
                              <div>
                                <p className="font-medium text-surface-900">
                                  {calc.driver
                                    ? `${calc.driver.first_name} ${calc.driver.last_name}`
                                    : "Unknown"}
                                </p>
                                <p className="text-xs text-surface-500">
                                  {calc.driver?.driver_type === "export" ? "Export" : "Local"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {formatNumber(
                              (calc.calculation_details as { actual_km?: number })?.actual_km || 0
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {formatCurrency(calc.km_incentive)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {formatCurrency(calc.performance_bonus + calc.safety_bonus)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm font-semibold text-primary-600">
                            {formatCurrency(calc.total_incentive)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                calc.status as WorkflowStatus
                              )}`}
                            >
                              {getStatusLabel(calc.status as WorkflowStatus)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {getAvailableTransitions(calc.status as WorkflowStatus).map((t) => (
                                <button
                                  key={t.to}
                                  onClick={() => handleStatusChange(calc.id, t.to)}
                                  className="p-1.5 text-surface-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                  title={t.label}
                                >
                                  {t.to === "pending_approval" && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  )}
                                  {t.to === "approved" && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  {t.to === "paid" && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                  {t.to === "draft" && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  )}
                                </button>
                              ))}
                              <button
                                onClick={() => handleRollback(calc.id)}
                                className="p-1.5 text-surface-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                title="Rollback to previous state"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BATCH CALCULATE VIEW */}
          {viewMode === "batch" && (
            <div className="space-y-6">
              {/* Batch Info */}
              <div className="bg-surface-50 rounded-lg p-4">
                <h3 className="font-semibold text-surface-900 mb-2">Batch Calculation</h3>
                <p className="text-sm text-surface-600 mb-4">
                  Calculate incentives for all active drivers with performance records for{" "}
                  <strong>
                    {getMonthName(selectedMonth)} {selectedYear}
                  </strong>
                  .
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-surface-500 uppercase">Active Drivers</p>
                    <p className="text-lg font-semibold text-surface-900">
                      {drivers.filter((d) => d.status === "active").length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase">With Performance</p>
                    <p className="text-lg font-semibold text-green-600">
                      {
                        driverPerformance.filter(
                          (p) => p.year === selectedYear && p.month === selectedMonth
                        ).length
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase">Without Calc</p>
                    <p className="text-lg font-semibold text-amber-600">
                      {driversWithoutCalc.filter((d) => d.hasPerformance).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase">Existing Calcs</p>
                    <p className="text-lg font-semibold text-surface-600">{stats.total}</p>
                  </div>
                </div>
                <button
                  onClick={handleBatchCalculate}
                  disabled={isProcessing}
                  className="btn btn-primary"
                >
                  {isProcessing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      Calculate All Drivers
                    </>
                  )}
                </button>
              </div>

              {/* Batch Result */}
              {batchResult && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Calculation Complete</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-green-600">Processed</p>
                        <p className="font-semibold text-green-900">
                          {batchResult.summary.totalProcessed}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-600">Successful</p>
                        <p className="font-semibold text-green-900">
                          {batchResult.summary.successCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-red-600">Failed</p>
                        <p className="font-semibold text-red-900">
                          {batchResult.summary.failedCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-600">Total Incentives</p>
                        <p className="font-semibold text-green-900">
                          {formatCurrency(batchResult.summary.totalIncentives)}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-600">Total Earnings</p>
                        <p className="font-semibold text-green-900">
                          {formatCurrency(batchResult.summary.totalEarnings)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Failed List */}
                  {batchResult.failed.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-800 mb-2">Failed Calculations</h4>
                      <ul className="text-sm space-y-1">
                        {batchResult.failed.map((f) => (
                          <li key={f.driverId} className="text-red-700">
                            {f.driverName}: {f.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Success List */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-surface-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                            Driver
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                            Actual KM
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                            Achievement
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                            Rate/KM
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                            Incentive
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                            Total Earnings
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResult.success.map((r) => (
                          <tr key={r.driverId} className="border-b border-surface-100">
                            <td className="py-2 px-3 font-medium">{r.driverName}</td>
                            <td className="py-2 px-3 text-right font-mono text-sm">
                              {formatNumber(r.actualKm)}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono text-sm ${getAchievementColor(
                                r.achievement
                              )}`}
                            >
                              {formatPercentage(r.achievement)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-sm">
                              {formatCurrency(r.ratePerKm)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-sm font-semibold text-primary-600">
                              {formatCurrency(r.totalIncentive)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-sm">
                              {formatCurrency(r.totalEarnings)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WORKFLOW VIEW */}
          {viewMode === "workflow" && (
            <div className="space-y-6">
              {/* Workflow Actions */}
              <div className="bg-surface-50 rounded-lg p-4">
                <h3 className="font-semibold text-surface-900 mb-4">Bulk Workflow Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleBulkStatusChange("draft", "pending_approval")}
                    disabled={isProcessing || stats.draft === 0}
                    className="btn btn-secondary"
                  >
                    Submit All Drafts ({stats.draft})
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange("pending_approval", "approved")}
                    disabled={isProcessing || stats.pending === 0}
                    className="btn btn-secondary"
                  >
                    Approve All Pending ({stats.pending})
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange("approved", "paid")}
                    disabled={isProcessing || stats.approved === 0}
                    className="btn btn-secondary"
                  >
                    Mark All as Paid ({stats.approved})
                  </button>
                </div>
              </div>

              {/* Workflow Pipeline */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(["draft", "pending_approval", "approved", "paid"] as const).map((status) => {
                  const calcs = periodCalculations.filter((c) => c.status === status);
                  return (
                    <div key={status} className="bg-white border border-surface-200 rounded-lg">
                      <div
                        className={`px-4 py-2 border-b border-surface-200 ${getStatusColor(status)}`}
                      >
                        <h4 className="font-semibold">{getStatusLabel(status)}</h4>
                        <p className="text-xs opacity-75">{calcs.length} calculations</p>
                      </div>
                      <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
                        {calcs.length === 0 ? (
                          <p className="text-center text-surface-400 text-sm py-4">None</p>
                        ) : (
                          calcs.map((calc) => (
                            <div
                              key={calc.id}
                              className="p-2 bg-surface-50 rounded border border-surface-100"
                            >
                              <p className="font-medium text-sm text-surface-900">
                                {calc.driver
                                  ? `${calc.driver.first_name} ${calc.driver.last_name}`
                                  : "Unknown"}
                              </p>
                              <p className="text-xs text-surface-600">
                                {formatCurrency(calc.total_incentive)}
                              </p>
                              <div className="flex gap-1 mt-2">
                                {getAvailableTransitions(status).map((t) => (
                                  <button
                                    key={t.to}
                                    onClick={() => handleStatusChange(calc.id, t.to)}
                                    className="text-xs px-2 py-0.5 bg-white border border-surface-200 rounded hover:bg-surface-100"
                                  >
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WHAT-IF VIEW */}
          {viewMode === "whatif" && (
            <div className="space-y-6">
              {/* Driver Selection */}
              <div className="bg-surface-50 rounded-lg p-4">
                <h3 className="font-semibold text-surface-900 mb-4">What-If Scenario Calculator</h3>
                <p className="text-sm text-surface-600 mb-4">
                  Explore how additional kilometers would affect a driver's incentive.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Select Driver</label>
                    <select
                      className="form-select"
                      value={selectedDriverId}
                      onChange={(e) => {
                        setSelectedDriverId(e.target.value);
                        setWhatIfScenarios([]);
                      }}
                    >
                      <option value="">Choose a driver</option>
                      {drivers
                        .filter((d) => d.status === "active")
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.first_name} {d.last_name} ({d.driver_type})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Custom Scenario Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Overtime Weekend"
                      value={customScenario.name}
                      onChange={(e) =>
                        setCustomScenario((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label">Additional KM</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g., 500"
                      value={customScenario.km}
                      onChange={(e) =>
                        setCustomScenario((prev) => ({ ...prev, km: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={handleCalculateWhatIf}
                  disabled={!selectedDriverId}
                  className="btn btn-primary mt-4"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  Calculate Scenarios
                </button>
              </div>

              {/* Scenarios Results */}
              {whatIfScenarios.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="text-left py-3 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Scenario
                        </th>
                        <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Additional KM
                        </th>
                        <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Projected KM
                        </th>
                        <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Achievement
                        </th>
                        <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Projected Incentive
                        </th>
                        <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase">
                          + Incentive
                        </th>
                        <th className="text-right py-3 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Total Earnings
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {whatIfScenarios.map((s, i) => (
                        <tr key={i} className="border-b border-surface-100 hover:bg-surface-50">
                          <td className="py-3 px-3 font-medium">{s.scenarioName}</td>
                          <td className="py-3 px-3 text-right font-mono text-sm text-green-600">
                            +{formatNumber(s.additionalKm)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {formatNumber(s.projectedKm)}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono text-sm ${getAchievementColor(
                              s.projectedAchievement
                            )}`}
                          >
                            {formatPercentage(s.projectedAchievement)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm font-semibold text-primary-600">
                            {formatCurrency(s.projectedIncentive)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm text-green-600">
                            +{formatCurrency(s.difference.incentive)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {formatCurrency(s.projectedEarnings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* AUDIT VIEW */}
          {viewMode === "audit" && (
            <div className="space-y-6">
              {/* Audit Logs */}
              <div>
                <h3 className="font-semibold text-surface-900 mb-4">Recent Activity</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Action
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Table
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Changed By
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Date
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-surface-500">
                            No audit logs found
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="border-b border-surface-100">
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  log.action === "insert"
                                    ? "bg-green-100 text-green-700"
                                    : log.action === "delete"
                                      ? "bg-red-100 text-red-700"
                                      : log.action === "approve"
                                        ? "bg-blue-100 text-blue-700"
                                        : log.action === "rollback"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-surface-100 text-surface-700"
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-sm">{log.table_name}</td>
                            <td className="py-2 px-3 text-sm">{log.changed_by || "System"}</td>
                            <td className="py-2 px-3 text-sm text-surface-600">
                              {new Date(log.changed_at).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-xs text-surface-500 font-mono max-w-xs truncate">
                              {log.new_values ? JSON.stringify(log.new_values).slice(0, 50) : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Snapshots */}
              <div>
                <h3 className="font-semibold text-surface-900 mb-4">Calculation Snapshots (Rollback Points)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Driver
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Period
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Reason
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-surface-600 uppercase">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-surface-500">
                            No snapshots found
                          </td>
                        </tr>
                      ) : (
                        snapshots.map((snap) => {
                          const driver = drivers.find((d) => d.id === snap.driver_id);
                          return (
                            <tr key={snap.id} className="border-b border-surface-100">
                              <td className="py-2 px-3 text-sm">
                                {driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"}
                              </td>
                              <td className="py-2 px-3 text-sm">
                                {getMonthName(snap.month)} {snap.year}
                              </td>
                              <td className="py-2 px-3 text-sm text-surface-600">
                                {snap.reason || "-"}
                              </td>
                              <td className="py-2 px-3 text-sm text-surface-600">
                                {new Date(snap.created_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Performance Entry Modal */}
      {showBulkModal && <BulkPerformanceModal onClose={() => setShowBulkModal(false)} />}
    </div>
  );
}
