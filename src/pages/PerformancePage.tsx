import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AddPerformanceModal from "../components/AddPerformanceModal";
import BulkPerformanceModal from "../components/BulkPerformanceModal";
import { useStore } from "../store/useStore";
import type { DriverPerformance, FuelEfficiencyTier } from "../types/database";
import
  {
    DEFAULT_EXPORT_FUEL_TIERS,
    DEFAULT_LOCAL_FUEL_TIERS,
    getFuelEfficiencyConfig,
  } from "../utils/calculations";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import
  {
    calculateAchievementPercentage,
    formatCurrency,
    formatNumber,
    formatPercentage,
    generateInitials,
    getAchievementColor,
    getMonthName,
  } from "../utils/formatters";

export default function PerformancePage() {
  const {
    drivers,
    driverPerformance,
    monthlyBudgets,
    incentiveSettings,
    incentiveCalculations,
    selectedYear,
    setSelectedPeriod,
    removeDriverPerformance,
  } = useStore();

  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [sortBy, setSortBy] = useState<"km" | "achievement" | "name">("km");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState<"all" | "local" | "export">(
    "all",
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingPerformance, setEditingPerformance] =
    useState<DriverPerformance | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportYear, setExportYear] = useState<number>(selectedYear);
  const [exportMonth, setExportMonth] = useState<number | "all">("all");

  // Export handlers
  const handleExportPDF = () => {
    exportToPDF({
      year: exportYear,
      month: exportMonth,
      drivers,
      performance: driverPerformance,
      calculations: incentiveCalculations,
      companyName: "Driver Incentives",
      typeFilter,
    });
    setShowExportMenu(false);
  };

  const handleExportExcel = () => {
    exportToExcel({
      year: exportYear,
      month: exportMonth,
      drivers,
      performance: driverPerformance,
      calculations: incentiveCalculations,
      companyName: "Driver Incentives",
      typeFilter,
    });
    setShowExportMenu(false);
  };

  // Get the incentive divisor settings for each driver type
  const localDivisor = useMemo(() => {
    const setting = incentiveSettings.find(
      (s) => s.setting_key === "incentive_divisor_local" && s.is_active,
    );
    return setting ? (setting.setting_value as number) : 1;
  }, [incentiveSettings]);

  const exportDivisor = useMemo(() => {
    const setting = incentiveSettings.find(
      (s) => s.setting_key === "incentive_divisor_export" && s.is_active,
    );
    return setting ? (setting.setting_value as number) : 1;
  }, [incentiveSettings]);

  // Get fuel efficiency bonus configs (use defaults if not configured)
  const localFuelConfig = useMemo(() => {
    const config = getFuelEfficiencyConfig(incentiveSettings, "local");
    if (!config.enabled || config.tiers.length === 0) {
      return DEFAULT_LOCAL_FUEL_TIERS;
    }
    return config;
  }, [incentiveSettings]);

  const exportFuelConfig = useMemo(() => {
    const config = getFuelEfficiencyConfig(incentiveSettings, "export");
    if (!config.enabled || config.tiers.length === 0) {
      return DEFAULT_EXPORT_FUEL_TIERS;
    }
    return config;
  }, [incentiveSettings]);

  // Helper to calculate fuel bonus
  const calculateFuelBonus = (fuelEfficiency: number | null, driverType: "local" | "export"): number => {
    if (!fuelEfficiency) return 0;
    const config = driverType === "export" ? exportFuelConfig : localFuelConfig;
    if (!config.enabled) return 0;
    const matchingTier = config.tiers.find(
      (tier: FuelEfficiencyTier) => fuelEfficiency >= tier.min_efficiency && fuelEfficiency < tier.max_efficiency
    );
    return matchingTier?.bonus_amount || 0;
  };

  // Get all performance data for the selected year
  const yearPerformance = useMemo(() => {
    return driverPerformance
      .filter((p) => p.year === selectedYear)
      .map((p) => {
        const driver = drivers.find((d) => d.id === p.driver_id);
        const budget = monthlyBudgets.find(
          (b) =>
            b.year === p.year &&
            b.month === p.month &&
            b.driver_type === driver?.driver_type,
        );
        const totalBudget = budget?.budgeted_kilometers || 0;
        const truckCount = budget?.truck_count || 1;
        const targetPerTruck = truckCount > 0 ? totalBudget / truckCount : 0;
        // Use target per truck for achievement calculation (individual driver target)
        const achievement = calculateAchievementPercentage(
          p.actual_kilometers,
          targetPerTruck,
        );
        const divisor =
          driver?.driver_type === "export" ? exportDivisor : localDivisor;
        const ratePerKm =
          targetPerTruck > 0 && divisor > 0 ? divisor / targetPerTruck : 0;
        const kmIncentive = p.actual_kilometers * ratePerKm;
        const fuelBonus = calculateFuelBonus(p.fuel_efficiency, driver?.driver_type || "local");
        const incentiveTotal = kmIncentive + fuelBonus;

        return {
          ...p,
          driver,
          target: targetPerTruck, // Use per-truck target for display
          totalBudget, // Keep total budget for reference
          truckCount,
          achievement,
          kmIncentive,
          fuelBonus,
          incentiveTotal,
        };
      })
      .filter(
        (p) =>
          p.driver &&
          (typeFilter === "all" || p.driver.driver_type === typeFilter),
      );
  }, [
    driverPerformance,
    drivers,
    monthlyBudgets,
    localDivisor,
    exportDivisor,
    localFuelConfig,
    exportFuelConfig,
    selectedYear,
    typeFilter,
  ]);

  // Get available months that have data
  const availableMonths = useMemo(() => {
    const months = new Set(yearPerformance.map((p) => p.month));
    return Array.from(months).sort((a, b) => a - b);
  }, [yearPerformance]);

  // Filter by selected month
  const filteredPerformance = useMemo(() => {
    const data = selectedMonth === "all" 
      ? yearPerformance 
      : yearPerformance.filter((p) => p.month === selectedMonth);
    
    return data.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "km":
          comparison = a.actual_kilometers - b.actual_kilometers;
          break;
        case "achievement":
          comparison = a.achievement - b.achievement;
          break;
        case "name":
          comparison =
            `${a.driver?.first_name} ${a.driver?.last_name}`.localeCompare(
              `${b.driver?.first_name} ${b.driver?.last_name}`,
            );
          break;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });
  }, [yearPerformance, selectedMonth, sortBy, sortOrder]);

  // Group performance by month for table display
  const performanceByMonth = useMemo(() => {
    const grouped: Record<number, typeof filteredPerformance> = {};
    
    if (selectedMonth === "all") {
      availableMonths.forEach((month) => {
        grouped[month] = filteredPerformance.filter((p) => p.month === month);
      });
    } else {
      grouped[selectedMonth] = filteredPerformance;
    }
    
    return grouped;
  }, [filteredPerformance, selectedMonth, availableMonths]);

  const stats = useMemo(() => {
    const data = filteredPerformance;
    const total = data.reduce((sum, p) => sum + p.actual_kilometers, 0);
    const totalTarget = data.reduce((sum, p) => sum + p.target, 0);
    const totalIncentives = data.reduce((sum, p) => sum + p.incentiveTotal, 0);
    const totalFuelBonus = data.reduce((sum, p) => sum + p.fuelBonus, 0);
    const avgAchievement =
      data.length > 0
        ? data.reduce((sum, p) => sum + p.achievement, 0) / data.length
        : 0;
    const aboveTarget = data.filter((p) => p.achievement >= 100).length;
    
    // Calculate average fuel efficiency (only for entries with fuel data)
    const dataWithFuel = data.filter((p) => p.fuel_efficiency !== null && p.fuel_efficiency > 0);
    const avgFuelEfficiency = dataWithFuel.length > 0
      ? dataWithFuel.reduce((sum, p) => sum + (p.fuel_efficiency || 0), 0) / dataWithFuel.length
      : null;
    const fuelDataCount = dataWithFuel.length;

    return { total, totalTarget, totalIncentives, totalFuelBonus, avgAchievement, aboveTarget, count: data.length, avgFuelEfficiency, fuelDataCount };
  }, [filteredPerformance]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">
            Monthly Performance Overview
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Performance data organized by month for {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) =>
              setSelectedPeriod(parseInt(e.target.value), 1)
            }
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn btn-secondary"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Bulk Entry
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Record
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn btn-secondary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-surface-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-surface-100">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                      Select Period
                    </p>
                    <div className="flex gap-2">
                      <select
                        className="form-select text-sm py-1.5 flex-1"
                        value={exportYear}
                        onChange={(e) => setExportYear(parseInt(e.target.value))}
                      >
                        {[2024, 2025, 2026].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <select
                        className="form-select text-sm py-1.5 flex-1"
                        value={exportMonth}
                        onChange={(e) => setExportMonth(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                      >
                        <option value="all">Full Year</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {getMonthName(i + 1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <button
                      onClick={handleExportPDF}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Export to PDF
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export to Excel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Records</p>
          <p className="text-xl font-semibold text-surface-900 mt-1">
            {stats.count}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total KM</p>
          <p className="text-xl font-semibold text-surface-900 mt-1">
            {formatNumber(stats.total)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Avg Target/Truck</p>
          <p className="text-xl font-semibold text-surface-900 mt-1">
            {formatNumber(stats.count > 0 ? stats.totalTarget / stats.count : 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Avg Achievement</p>
          <p
            className={`text-xl font-semibold mt-1 ${getAchievementColor(stats.avgAchievement)}`}
          >
            {formatPercentage(stats.avgAchievement)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Avg Fuel Eff.</p>
          <p className="text-xl font-semibold text-blue-600 mt-1">
            {stats.avgFuelEfficiency !== null ? `${stats.avgFuelEfficiency.toFixed(2)}` : "N/A"}
          </p>
          {stats.fuelDataCount > 0 && (
            <p className="text-xs text-surface-500 mt-0.5">
              {stats.fuelDataCount} of {stats.count} records
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Above Target</p>
          <p className="text-xl font-semibold text-green-600 mt-1">
            {stats.aboveTarget}/{stats.count}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-3">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Incentive Total</p>
          <p className="text-xl font-semibold text-primary-600 mt-1">
            {formatCurrency(stats.totalIncentives)}
          </p>
          {stats.totalFuelBonus > 0 && (
            <p className="text-xs text-green-600 mt-0.5">
              incl. {formatCurrency(stats.totalFuelBonus)} fuel
            </p>
          )}
        </div>
      </div>

      {/* Month Tabs & Filters */}
      <div className="bg-white rounded-lg border border-surface-200 p-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Month Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setSelectedMonth("all")}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                selectedMonth === "all"
                  ? "bg-surface-900 text-white"
                  : "bg-surface-100 text-surface-600 hover:bg-surface-200"
              }`}
            >
              All Months
            </button>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const hasData = availableMonths.includes(month);
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  disabled={!hasData}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedMonth === month
                      ? "bg-surface-900 text-white"
                      : hasData
                        ? "bg-surface-100 text-surface-600 hover:bg-surface-200"
                        : "bg-surface-50 text-surface-300 cursor-not-allowed"
                  }`}
                >
                  {getMonthName(month).slice(0, 3)}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              className="form-select text-xs py-1.5"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            >
              <option value="all">All Types</option>
              <option value="local">Local</option>
              <option value="export">Export</option>
            </select>
          </div>
        </div>
      </div>

      {/* Monthly Performance Tables */}
      {Object.keys(performanceByMonth).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(performanceByMonth)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([month, data]) => (
              <div key={month} className="bg-white rounded-lg border border-surface-200 overflow-hidden">
                {/* Month Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-surface-50 to-white border-b border-surface-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-md bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
                      {month.toString().padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-surface-900">
                        {getMonthName(parseInt(month))} {selectedYear}
                      </h3>
                      <p className="text-xs text-surface-500">
                        {data.length} driver{data.length !== 1 ? 's' : ''} · {formatNumber(data.reduce((sum, p) => sum + p.actual_kilometers, 0))} total KM
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <p className="text-surface-500 uppercase tracking-wider">Avg Achievement</p>
                      <p className={`font-semibold ${getAchievementColor(data.length > 0 ? data.reduce((sum, p) => sum + p.achievement, 0) / data.length : 0)}`}>
                        {formatPercentage(data.length > 0 ? data.reduce((sum, p) => sum + p.achievement, 0) / data.length : 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-surface-500 uppercase tracking-wider">Avg Fuel Eff.</p>
                      <p className="font-semibold text-blue-600">
                        {(() => {
                          const driversWithFuel = data.filter((p) => p.fuel_efficiency !== null && p.fuel_efficiency > 0);
                          if (driversWithFuel.length === 0) return "N/A";
                          const avgFuel = driversWithFuel.reduce((sum, p) => sum + (p.fuel_efficiency || 0), 0) / driversWithFuel.length;
                          return `${avgFuel.toFixed(2)} km/L`;
                        })()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-surface-500 uppercase tracking-wider">Incentive Total</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(data.reduce((sum, p) => sum + p.incentiveTotal, 0))}
                      </p>
                      {data.reduce((sum, p) => sum + p.fuelBonus, 0) > 0 && (
                        <p className="text-xs text-green-500">
                          incl. {formatCurrency(data.reduce((sum, p) => sum + p.fuelBonus, 0))} fuel
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-100">
                        <th 
                          className="text-left px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider cursor-pointer hover:text-surface-900"
                          onClick={() => handleSort("name")}
                        >
                          Driver {sortBy === "name" && (sortOrder === "desc" ? "↓" : "↑")}
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                          Type
                        </th>
                        <th 
                          className="text-right px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider cursor-pointer hover:text-surface-900"
                          onClick={() => handleSort("km")}
                        >
                          Actual KM {sortBy === "km" && (sortOrder === "desc" ? "↓" : "↑")}
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                          Target/Truck
                        </th>
                        <th 
                          className="text-right px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider cursor-pointer hover:text-surface-900"
                          onClick={() => handleSort("achievement")}
                        >
                          Achievement {sortBy === "achievement" && (sortOrder === "desc" ? "↓" : "↑")}
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                          Trips
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                          Fuel Eff.
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                          On-Time
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                          Incentive Total
                        </th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {data.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <Link
                              to={`/drivers/${item.driver_id}`}
                              className="flex items-center gap-2 group"
                            >
                              <span className="w-7 h-7 rounded bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700 group-hover:bg-primary-200 transition-colors">
                                {generateInitials(
                                  item.driver?.first_name || "",
                                  item.driver?.last_name || "",
                                )}
                              </span>
                              <span className="text-sm font-medium text-surface-900 group-hover:text-primary-600">
                                {item.driver?.first_name} {item.driver?.last_name}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.driver?.driver_type === "export"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-primary-100 text-primary-700"
                            }`}>
                              {item.driver?.driver_type === "local" ? "Local" : "Export"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-sm font-semibold text-surface-900 font-mono">
                              {formatNumber(item.actual_kilometers)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-sm text-surface-600 font-mono">
                              {formatNumber(item.target)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    item.achievement >= 100
                                      ? "bg-green-500"
                                      : item.achievement >= 80
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min(item.achievement, 100)}%` }}
                                />
                              </div>
                              <span className={`text-sm font-semibold ${getAchievementColor(item.achievement)}`}>
                                {formatPercentage(item.achievement)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-sm text-surface-700">
                              {item.trips_completed}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-sm text-surface-600">
                              {item.fuel_efficiency ? `${item.fuel_efficiency} km/l` : "-"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-sm text-surface-600">
                              {item.on_time_delivery_rate ? formatPercentage(item.on_time_delivery_rate) : "-"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div>
                              <span className="text-sm font-semibold text-green-600">
                                {formatCurrency(item.incentiveTotal)}
                              </span>
                              {item.fuelBonus > 0 && (
                                <p className="text-xs text-green-500">
                                  {formatCurrency(item.kmIncentive)} + {formatCurrency(item.fuelBonus)} fuel
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => setEditingPerformance(item)}
                              className="p-1.5 hover:bg-surface-100 rounded transition-colors text-surface-400 hover:text-surface-700"
                              title="Edit performance"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Table Footer with Totals */}
                    <tfoot>
                      <tr className="bg-surface-50 border-t border-surface-200">
                        <td className="px-4 py-2.5 text-xs font-semibold text-surface-700 uppercase tracking-wider" colSpan={2}>
                          Monthly Total
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-sm font-bold text-surface-900 font-mono">
                            {formatNumber(data.reduce((sum, p) => sum + p.actual_kilometers, 0))}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-sm font-semibold text-surface-600 font-mono">
                            {formatNumber(data.reduce((sum, p) => sum + p.target, 0))}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-sm font-bold ${getAchievementColor(data.length > 0 ? data.reduce((sum, p) => sum + p.achievement, 0) / data.length : 0)}`}>
                            {formatPercentage(data.length > 0 ? data.reduce((sum, p) => sum + p.achievement, 0) / data.length : 0)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-sm font-semibold text-surface-700">
                            {data.reduce((sum, p) => sum + p.trips_completed, 0)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-sm font-semibold text-blue-600">
                            {(() => {
                              const driversWithFuel = data.filter((p) => p.fuel_efficiency !== null && p.fuel_efficiency > 0);
                              if (driversWithFuel.length === 0) return "-";
                              const avgFuel = driversWithFuel.reduce((sum, p) => sum + (p.fuel_efficiency || 0), 0) / driversWithFuel.length;
                              return `${avgFuel.toFixed(2)} km/l`;
                            })()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5"></td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(data.reduce((sum, p) => sum + p.incentiveTotal, 0))}
                          </span>
                        </td>
                        <td className="px-4 py-2.5"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-surface-200 p-8 text-center">
          <div className="w-12 h-12 rounded-lg bg-surface-100 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-surface-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-surface-900">
            No Performance Data
          </h3>
          <p className="text-xs text-surface-500 mt-1">
            No performance records found for {selectedYear}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary mt-3"
          >
            Add First Record
          </button>
        </div>
      )}

      {/* Add Performance Modal */}
      {showAddModal && (
        <AddPerformanceModal onClose={() => setShowAddModal(false)} />
      )}

      {/* Bulk Performance Entry Modal */}
      {showBulkModal && (
        <BulkPerformanceModal onClose={() => setShowBulkModal(false)} />
      )}

      {/* Edit Performance Modal */}
      {editingPerformance && (
        <AddPerformanceModal
          existingPerformance={editingPerformance}
          onClose={() => setEditingPerformance(null)}
          onDelete={() => {
            removeDriverPerformance(editingPerformance.id);
            setEditingPerformance(null);
          }}
        />
      )}
    </div>
  );
}
