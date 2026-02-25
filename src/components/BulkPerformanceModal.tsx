/**
 * Bulk Performance Entry Modal
 * Allows updating all drivers' performance at once
 */

import { useCallback, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import type { Driver, FuelEfficiencyTier } from "../types/database";
import
    {
        calculateDriverIncentive,
        DEFAULT_EXPORT_FUEL_TIERS,
        DEFAULT_LOCAL_FUEL_TIERS,
        getFuelEfficiencyConfig,
        resultToIncentiveCalculation
    } from "../utils/calculations";
import
    {
        formatCurrency,
        formatNumber,
        generateInitials,
        getMonthName,
    } from "../utils/formatters";

interface BulkPerformanceModalProps {
  onClose: () => void;
}

interface DriverEntry {
  driver: Driver;
  actual_kilometers: number;
  trips_completed: number;
  fuel_efficiency: string;
  on_time_delivery_rate: string;
  safety_score: string;
  notes: string;
  hasExisting: boolean;
  existingId?: string;
  estimatedIncentive: number;
  fuelBonus: number;
  ratePerKm: number;
}

export default function BulkPerformanceModal({ onClose }: BulkPerformanceModalProps) {
  const {
    drivers,
    monthlyBudgets,
    driverPerformance,
    incentiveSettings,
    customFormulas,
    showToast,
    setDriverPerformance,
    setIncentiveCalculations,
  } = useStore();

  const [isSaving, setIsSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [typeFilter, setTypeFilter] = useState<"all" | "local" | "export">("all");
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(false);
  const [entries, setEntries] = useState<Record<string, DriverEntry>>({});

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

  // Get fuel efficiency bonus configs (use defaults if not configured)
  const localFuelConfig = useMemo(() => {
    const config = getFuelEfficiencyConfig(incentiveSettings, "local");
    // If no config or not enabled, use defaults
    if (!config.enabled || config.tiers.length === 0) {
      return DEFAULT_LOCAL_FUEL_TIERS;
    }
    return config;
  }, [incentiveSettings]);

  const exportFuelConfig = useMemo(() => {
    const config = getFuelEfficiencyConfig(incentiveSettings, "export");
    // If no config or not enabled, use defaults
    if (!config.enabled || config.tiers.length === 0) {
      return DEFAULT_EXPORT_FUEL_TIERS;
    }
    return config;
  }, [incentiveSettings]);

  // Helper function to calculate fuel efficiency bonus
  const calculateFuelBonus = useCallback((fuelEfficiency: string, driverType: "local" | "export"): number => {
    if (!fuelEfficiency) return 0;
    const efficiency = parseFloat(fuelEfficiency);
    if (isNaN(efficiency)) return 0;
    
    const config = driverType === "export" ? exportFuelConfig : localFuelConfig;
    if (!config.enabled) return 0;
    
    const matchingTier = config.tiers.find(
      (tier: FuelEfficiencyTier) => efficiency >= tier.min_efficiency && efficiency < tier.max_efficiency
    );
    
    return matchingTier?.bonus_amount || 0;
  }, [localFuelConfig, exportFuelConfig]);

  // Initialize entries for all active drivers
  const activeDrivers = useMemo(() => {
    return drivers
      .filter((d) => d.status === "active")
      .filter((d) => typeFilter === "all" || d.driver_type === typeFilter)
      .sort((a, b) => {
        // Sort by type first, then by name
        if (a.driver_type !== b.driver_type) {
          return a.driver_type === "local" ? -1 : 1;
        }
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      });
  }, [drivers, typeFilter]);

  // Initialize or update entries when drivers/period changes
  useMemo(() => {
    const newEntries: Record<string, DriverEntry> = {};
    
    activeDrivers.forEach((driver) => {
      // Check for existing performance
      const existing = driverPerformance.find(
        (p) => p.driver_id === driver.id && p.year === year && p.month === month
      );

      // Get budget for this driver type
      const budget = monthlyBudgets.find(
        (b) => b.year === year && b.month === month && b.driver_type === driver.driver_type
      );
      const divisor = driver.driver_type === "export" ? exportDivisor : localDivisor;
      const truckCount = budget?.truck_count || 1;
      const targetKmPerTruck = budget ? budget.budgeted_kilometers / truckCount : 0;
      const ratePerKm = targetKmPerTruck > 0 ? divisor / targetKmPerTruck : 0;

      const km = existing?.actual_kilometers || entries[driver.id]?.actual_kilometers || 0;
      const fuelEff = existing?.fuel_efficiency?.toString() || entries[driver.id]?.fuel_efficiency || "";
      const fuelBonus = calculateFuelBonus(fuelEff, driver.driver_type);
      const kmIncentive = km * ratePerKm;

      newEntries[driver.id] = {
        driver,
        actual_kilometers: km,
        trips_completed: existing?.trips_completed || entries[driver.id]?.trips_completed || 0,
        fuel_efficiency: fuelEff,
        on_time_delivery_rate: existing?.on_time_delivery_rate?.toString() || entries[driver.id]?.on_time_delivery_rate || "",
        safety_score: existing?.safety_score?.toString() || entries[driver.id]?.safety_score || "",
        notes: existing?.notes || entries[driver.id]?.notes || "",
        hasExisting: !!existing,
        existingId: existing?.id,
        estimatedIncentive: kmIncentive + fuelBonus,
        fuelBonus,
        ratePerKm,
      };
    });

    setEntries(newEntries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDrivers, year, month, driverPerformance, monthlyBudgets, localDivisor, exportDivisor, calculateFuelBonus]);

  // Filter entries
  const filteredDrivers = useMemo(() => {
    if (!showOnlyEmpty) return activeDrivers;
    return activeDrivers.filter((d) => !entries[d.id]?.hasExisting);
  }, [activeDrivers, showOnlyEmpty, entries]);

  // Update a single entry
  const updateEntry = useCallback((driverId: string, field: keyof DriverEntry, value: string | number) => {
    setEntries((prev) => {
      const entry = prev[driverId];
      if (!entry) return prev;

      const updated = { ...entry, [field]: value };

      // Recalculate incentive if KM or fuel efficiency changed
      if (field === "actual_kilometers") {
        const kmIncentive = (value as number) * entry.ratePerKm;
        updated.estimatedIncentive = kmIncentive + entry.fuelBonus;
      } else if (field === "fuel_efficiency") {
        const newFuelBonus = calculateFuelBonus(value as string, entry.driver.driver_type);
        updated.fuelBonus = newFuelBonus;
        const kmIncentive = entry.actual_kilometers * entry.ratePerKm;
        updated.estimatedIncentive = kmIncentive + newFuelBonus;
      }

      return { ...prev, [driverId]: updated };
    });
  }, [calculateFuelBonus]);

  // Calculate totals
  const totals = useMemo(() => {
    const entriesList = Object.values(entries);
    const withKm = entriesList.filter((e) => e.actual_kilometers > 0);
    return {
      totalDrivers: entriesList.length,
      driversWithKm: withKm.length,
      totalKm: withKm.reduce((sum, e) => sum + e.actual_kilometers, 0),
      totalIncentives: withKm.reduce((sum, e) => sum + e.estimatedIncentive, 0),
      totalFuelBonus: withKm.reduce((sum, e) => sum + e.fuelBonus, 0),
      newRecords: entriesList.filter((e) => !e.hasExisting && e.actual_kilometers > 0).length,
      updates: entriesList.filter((e) => e.hasExisting && e.actual_kilometers > 0).length,
    };
  }, [entries]);

  // Save all entries
  const handleSaveAll = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    const entriesToSave = Object.values(entries).filter((e) => e.actual_kilometers > 0);
    
    if (entriesToSave.length === 0) {
      showToast("No entries with kilometers to save");
      return;
    }

    setIsSaving(true);
    let savedCount = 0;
    let errorCount = 0;

    try {
      for (const entry of entriesToSave) {
        const performanceData = {
          driver_id: entry.driver.id,
          year,
          month,
          actual_kilometers: entry.actual_kilometers,
          trips_completed: entry.trips_completed,
          fuel_efficiency: entry.fuel_efficiency ? parseFloat(entry.fuel_efficiency) : null,
          on_time_delivery_rate: entry.on_time_delivery_rate ? parseFloat(entry.on_time_delivery_rate) : null,
          safety_score: entry.safety_score ? parseFloat(entry.safety_score) : null,
          notes: entry.notes || null,
        };

        try {
          let error;
          if (entry.hasExisting && entry.existingId) {
            // Update existing
            ({ error } = await supabase
              .from("driver_performance")
              .update(performanceData)
              .eq("id", entry.existingId));
          } else {
            // Insert new
            ({ error } = await supabase
              .from("driver_performance")
              .insert(performanceData));
          }

          if (error) throw error;

          // Calculate and save incentive
          const budget = monthlyBudgets.find(
            (b) => b.year === year && b.month === month && b.driver_type === entry.driver.driver_type
          );
          const divisor = entry.driver.driver_type === "export" ? exportDivisor : localDivisor;
          const fuelConfig = entry.driver.driver_type === "export" ? exportFuelConfig : localFuelConfig;

          const calcResult = calculateDriverIncentive({
            driver: entry.driver,
            performance: {
              id: entry.existingId || "",
              driver_id: entry.driver.id,
              year,
              month,
              actual_kilometers: entry.actual_kilometers,
              trips_completed: entry.trips_completed,
              fuel_efficiency: entry.fuel_efficiency ? parseFloat(entry.fuel_efficiency) : null,
              on_time_delivery_rate: entry.on_time_delivery_rate ? parseFloat(entry.on_time_delivery_rate) : null,
              safety_score: entry.safety_score ? parseFloat(entry.safety_score) : null,
              customer_rating: null,
              notes: entry.notes || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            budget: budget || null,
            divisor,
            formulas: customFormulas,
            fuelEfficiencyConfig: fuelConfig,
          });

          const incentiveData = resultToIncentiveCalculation(calcResult, "draft");

          // Check for existing incentive calculation
          const { data: existingCalc } = await supabase
            .from("incentive_calculations")
            .select("id")
            .eq("driver_id", entry.driver.id)
            .eq("year", year)
            .eq("month", month)
            .single();

          if (existingCalc) {
            await supabase
              .from("incentive_calculations")
              .update(incentiveData)
              .eq("id", existingCalc.id);
          } else {
            await supabase.from("incentive_calculations").insert(incentiveData);
          }

          savedCount++;
        } catch (err) {
          console.error(`Error saving ${entry.driver.first_name}:`, err);
          errorCount++;
        }
      }

      // Refresh data
      const { data: perfData } = await supabase.from("driver_performance").select("*");
      if (perfData) setDriverPerformance(perfData);

      const { data: calcData } = await supabase.from("incentive_calculations").select("*");
      if (calcData) setIncentiveCalculations(calcData);

      showToast(`Saved ${savedCount} records${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
      
      if (errorCount === 0) {
        onClose();
      }
    } catch (error) {
      console.error("Bulk save error:", error);
      showToast("Error saving performance data");
    } finally {
      setIsSaving(false);
    }
  }, [
    entries,
    year,
    month,
    monthlyBudgets,
    localDivisor,
    exportDivisor,
    localFuelConfig,
    exportFuelConfig,
    customFormulas,
    showToast,
    setDriverPerformance,
    setIncentiveCalculations,
    onClose,
  ]);

  // Copy KM from previous month
  const copyFromPreviousMonth = useCallback(() => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const newEntries = { ...entries };
    let copiedCount = 0;

    Object.keys(newEntries).forEach((driverId) => {
      const prevPerf = driverPerformance.find(
        (p) => p.driver_id === driverId && p.year === prevYear && p.month === prevMonth
      );
      if (prevPerf && !newEntries[driverId].hasExisting) {
        newEntries[driverId] = {
          ...newEntries[driverId],
          actual_kilometers: prevPerf.actual_kilometers,
          trips_completed: prevPerf.trips_completed,
          fuel_efficiency: prevPerf.fuel_efficiency?.toString() || "",
          on_time_delivery_rate: prevPerf.on_time_delivery_rate?.toString() || "",
          safety_score: prevPerf.safety_score?.toString() || "",
          estimatedIncentive: prevPerf.actual_kilometers * newEntries[driverId].ratePerKm,
        };
        copiedCount++;
      }
    });

    setEntries(newEntries);
    showToast(`Copied data from ${getMonthName(prevMonth)} ${prevYear} for ${copiedCount} drivers`);
  }, [entries, month, year, driverPerformance, showToast]);

  // Clear all entries
  const clearAll = useCallback(() => {
    const newEntries = { ...entries };
    Object.keys(newEntries).forEach((driverId) => {
      if (!newEntries[driverId].hasExisting) {
        newEntries[driverId] = {
          ...newEntries[driverId],
          actual_kilometers: 0,
          trips_completed: 0,
          fuel_efficiency: "",
          on_time_delivery_rate: "",
          safety_score: "",
          notes: "",
          estimatedIncentive: 0,
        };
      }
    });
    setEntries(newEntries);
    showToast("Cleared all new entries");
  }, [entries, showToast]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-[100vw] h-[100vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-3 border-b border-surface-100 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">
                Bulk Performance Entry
              </h2>
              <p className="text-sm text-surface-500 mt-0.5">
                Enter performance data for all drivers at once
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-3 border-b border-surface-100 bg-surface-50 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            {/* Period Selection */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-surface-600">Period:</label>
              <select
                className="form-select text-sm py-1.5"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                className="form-select text-sm py-1.5"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-surface-600">Type:</label>
              <select
                className="form-select text-sm py-1.5"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | "local" | "export")}
              >
                <option value="all">All Drivers</option>
                <option value="local">Local Only</option>
                <option value="export">Export Only</option>
              </select>
            </div>

            {/* Show Only Empty */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyEmpty}
                onChange={(e) => setShowOnlyEmpty(e.target.checked)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-surface-600">Show only without data</span>
            </label>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={copyFromPreviousMonth}
                className="btn btn-secondary text-xs py-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy from Previous
              </button>
              <button
                onClick={clearAll}
                className="btn btn-secondary text-xs py-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear New
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="px-6 py-3 border-b border-surface-100 bg-primary-50 flex-shrink-0">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-primary-600">Drivers:</span>{" "}
              <strong>{totals.driversWithKm}</strong> / {totals.totalDrivers}
            </div>
            <div>
              <span className="text-primary-600">Total KM:</span>{" "}
              <strong>{formatNumber(totals.totalKm)}</strong>
            </div>
            <div>
              <span className="text-primary-600">Incentive Total:</span>{" "}
              <strong>{formatCurrency(totals.totalIncentives)}</strong>
              {totals.totalFuelBonus > 0 && (
                <span className="ml-1 text-green-600 text-xs">(incl. {formatCurrency(totals.totalFuelBonus)} fuel)</span>
              )}
            </div>
            <div>
              <span className="text-green-600">New:</span>{" "}
              <strong>{totals.newRecords}</strong>
            </div>
            <div>
              <span className="text-amber-600">Updates:</span>{" "}
              <strong>{totals.updates}</strong>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 bg-surface-50 z-10">
              <tr className="border-b border-surface-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-surface-600 uppercase tracking-wider" style={{width: '18%'}}>
                  Driver
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-surface-600 uppercase tracking-wider" style={{width: '8%'}}>
                  Type
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-surface-600 uppercase tracking-wider" style={{width: '12%'}}>
                  Actual KM
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-surface-600 uppercase tracking-wider" style={{width: '10%'}}>
                  Trips
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-surface-600 uppercase tracking-wider" style={{width: '12%'}}>
                  km/L
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-surface-600 uppercase tracking-wider" style={{width: '12%'}}>
                  On-Time %
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-surface-600 uppercase tracking-wider" style={{width: '12%'}}>
                  Safety
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-surface-600 uppercase tracking-wider" style={{width: '10%'}}>
                  Incentive Total
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-surface-600 uppercase tracking-wider" style={{width: '6%'}}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-surface-500">
                    No drivers found matching the filters
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const entry = entries[driver.id];
                  if (!entry) return null;

                  return (
                    <tr
                      key={driver.id}
                      className={`border-b border-surface-100 hover:bg-surface-50 ${
                        entry.hasExisting ? "bg-amber-50/30" : ""
                      }`}
                    >
                      {/* Driver Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-semibold flex-shrink-0">
                            {generateInitials(driver.first_name, driver.last_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-surface-900 text-base truncate">
                              {driver.first_name} {driver.last_name}
                            </p>
                            <p className="text-sm text-surface-500">{driver.employee_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                            driver.driver_type === "export"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {driver.driver_type === "export" ? "Export" : "Local"}
                        </span>
                      </td>

                      {/* Actual KM */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          className="form-input text-base py-2.5 px-3 w-full text-right font-mono"
                          value={entry.actual_kilometers || ""}
                          onChange={(e) =>
                            updateEntry(driver.id, "actual_kilometers", parseInt(e.target.value) || 0)
                          }
                          placeholder="0"
                        />
                      </td>

                      {/* Trips */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          className="form-input text-base py-2.5 px-3 w-full text-right font-mono"
                          value={entry.trips_completed || ""}
                          onChange={(e) =>
                            updateEntry(driver.id, "trips_completed", parseInt(e.target.value) || 0)
                          }
                          placeholder="0"
                        />
                      </td>

                      {/* Fuel Efficiency */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.01"
                          className="form-input text-base py-2.5 px-3 w-full text-right font-mono"
                          value={entry.fuel_efficiency}
                          onChange={(e) => updateEntry(driver.id, "fuel_efficiency", e.target.value)}
                          placeholder="km/L"
                        />
                      </td>

                      {/* On-Time Rate */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.1"
                          max="100"
                          className="form-input text-base py-2.5 px-3 w-full text-right font-mono"
                          value={entry.on_time_delivery_rate}
                          onChange={(e) =>
                            updateEntry(driver.id, "on_time_delivery_rate", e.target.value)
                          }
                          placeholder="%"
                        />
                      </td>

                      {/* Safety Score */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.1"
                          max="100"
                          className="form-input text-base py-2.5 px-3 w-full text-right font-mono"
                          value={entry.safety_score}
                          onChange={(e) => updateEntry(driver.id, "safety_score", e.target.value)}
                          placeholder="%"
                        />
                      </td>

                      {/* Incentive Total */}
                      <td className="py-3 px-4 text-right">
                        <div>
                          <span className="font-mono text-base font-semibold text-primary-600">
                            {entry.actual_kilometers > 0
                              ? formatCurrency(entry.estimatedIncentive)
                              : "-"}
                          </span>
                          {entry.actual_kilometers > 0 && entry.fuelBonus > 0 && (
                            <div className="text-xs text-surface-500">
                              {formatCurrency(entry.estimatedIncentive - entry.fuelBonus)} km + {formatCurrency(entry.fuelBonus)} fuel
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {entry.hasExisting ? (
                          <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-amber-100 text-amber-700">
                            Exists
                          </span>
                        ) : entry.actual_kilometers > 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-700">
                            New
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-surface-100 text-surface-500">
                            Empty
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-100 bg-surface-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-600">
              {totals.newRecords + totals.updates > 0 ? (
                <>
                  Ready to save <strong>{totals.newRecords}</strong> new and{" "}
                  <strong>{totals.updates}</strong> updated records
                </>
              ) : (
                "Enter kilometers to enable saving"
              )}
            </p>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving || (totals.newRecords + totals.updates === 0)}
                className="btn btn-primary"
              >
                {isSaving ? (
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
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save All ({totals.newRecords + totals.updates})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
