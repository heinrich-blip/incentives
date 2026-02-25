import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import
  {
    formatCurrency,
    formatNumber,
    getMonthShortName
  } from "../utils/formatters";

type TabId = "rates" | "budgets" | "incentive-settings" | "formulas";

export default function MasterSheet() {
  const {
    kilometerRates,
    monthlyBudgets,
    customFormulas,
    incentiveSettings,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabId>("rates");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isEditing, setIsEditing] = useState(false);
  const [editingRates, setEditingRates] = useState<{
    local: string;
    export: string;
  }>({ local: "", export: "" });
  const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>(
    {},
  );
  const [editingTruckCounts, setEditingTruckCounts] = useState<
    Record<string, string>
  >({});
  const [editingDivisors, setEditingDivisors] = useState<{
    local: string;
    export: string;
  }>({ local: "", export: "" });
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const localRate = kilometerRates.find(
    (r) => r.driver_type === "local" && r.is_active,
  );
  const exportRate = kilometerRates.find(
    (r) => r.driver_type === "export" && r.is_active,
  );

  const yearBudgets = monthlyBudgets.filter((b) => b.year === selectedYear);

  // Get incentive divisor settings for each driver type
  const localDivisorSetting = incentiveSettings.find(
    (s) => s.setting_key === "incentive_divisor_local",
  );
  const exportDivisorSetting = incentiveSettings.find(
    (s) => s.setting_key === "incentive_divisor_export",
  );
  const localDivisor = localDivisorSetting
    ? (localDivisorSetting.setting_value as number)
    : 1;
  const exportDivisor = exportDivisorSetting
    ? (exportDivisorSetting.setting_value as number)
    : 1;

  const tabs: { id: TabId; label: string }[] = [
    { id: "rates", label: "Kilometer Rates" },
    { id: "budgets", label: "Monthly Budgets" },
    { id: "incentive-settings", label: "Incentive Settings" },
    { id: "formulas", label: "Custom Formulas" },
  ];

  const handleStartEditRates = () => {
    setEditingRates({
      local: localRate?.rate_per_km.toString() || "",
      export: exportRate?.rate_per_km.toString() || "",
    });
    setIsEditing(true);
  };

  const handleSaveRates = async () => {
    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    try {
      const localValue = parseFloat(editingRates.local);
      const exportValue = parseFloat(editingRates.export);

      if (isNaN(localValue) || isNaN(exportValue)) {
        showToast("Please enter valid numbers");
        return;
      }

      // Update local rate
      if (localRate) {
        await supabase
          .from("kilometer_rates")
          .update({ rate_per_km: localValue })
          .eq("id", localRate.id);
      }

      // Update export rate
      if (exportRate) {
        await supabase
          .from("kilometer_rates")
          .update({ rate_per_km: exportValue })
          .eq("id", exportRate.id);
      }

      showToast("Rates updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving rates:", error);
      showToast("Error saving rates");
    }
  };

  const handleStartEditBudgets = () => {
    const budgetMap: Record<string, string> = {};
    const truckCountMap: Record<string, string> = {};
    yearBudgets.forEach((b) => {
      budgetMap[`${b.driver_type}_${b.month}`] =
        b.budgeted_kilometers.toString();
      truckCountMap[`${b.driver_type}_${b.month}`] = (
        b.truck_count || 1
      ).toString();
    });
    setEditingBudgets(budgetMap);
    setEditingTruckCounts(truckCountMap);
    setIsEditing(true);
  };

  const handleSaveBudgets = async () => {
    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    try {
      for (const [key, value] of Object.entries(editingBudgets)) {
        const [driverType, monthStr] = key.split("_");
        const month = parseInt(monthStr);
        const km = parseFloat(value);
        const truckCount = parseInt(editingTruckCounts[key] || "1") || 1;

        if (isNaN(km)) continue;

        const existing = yearBudgets.find(
          (b) => b.driver_type === driverType && b.month === month,
        );

        if (existing) {
          await supabase
            .from("monthly_budgets")
            .update({ budgeted_kilometers: km, truck_count: truckCount })
            .eq("id", existing.id);
        } else {
          await supabase.from("monthly_budgets").insert({
            year: selectedYear,
            month,
            driver_type: driverType as "local" | "export",
            budgeted_kilometers: km,
            truck_count: truckCount,
          });
        }
      }

      showToast("Budgets updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving budgets:", error);
      showToast("Error saving budgets");
    }
  };

  const handleStartEditDivisors = () => {
    setEditingDivisors({
      local: localDivisor.toString(),
      export: exportDivisor.toString(),
    });
    setIsEditing(true);
  };

  const handleSaveDivisors = async () => {
    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    try {
      const localValue = parseFloat(editingDivisors.local);
      const exportValue = parseFloat(editingDivisors.export);

      if (
        isNaN(localValue) ||
        localValue <= 0 ||
        isNaN(exportValue) ||
        exportValue <= 0
      ) {
        showToast("Please enter valid positive numbers for both divisors");
        return;
      }

      // Update or create local divisor setting
      if (localDivisorSetting) {
        await supabase
          .from("incentive_settings")
          .update({ setting_value: localValue })
          .eq("id", localDivisorSetting.id);
      } else {
        await supabase.from("incentive_settings").insert({
          setting_key: "incentive_divisor_local",
          setting_value: localValue,
          description:
            "Divisor for Local drivers - used to calculate rate per kilometer",
          is_active: true,
        });
      }

      // Update or create export divisor setting
      if (exportDivisorSetting) {
        await supabase
          .from("incentive_settings")
          .update({ setting_value: exportValue })
          .eq("id", exportDivisorSetting.id);
      } else {
        await supabase.from("incentive_settings").insert({
          setting_key: "incentive_divisor_export",
          setting_value: exportValue,
          description:
            "Divisor for Export drivers - used to calculate rate per kilometer",
          is_active: true,
        });
      }

      showToast("Incentive divisors updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving incentive divisors:", error);
      showToast("Error saving incentive divisors");
    }
  };

  const handleToggleFormula = async (formulaId: string, isActive: boolean) => {
    if (!isSupabaseConfigured()) {
      showToast("Cannot update in demo mode");
      return;
    }

    try {
      await supabase
        .from("custom_formulas")
        .update({ is_active: !isActive })
        .eq("id", formulaId);
      showToast("Formula updated");
    } catch (error) {
      console.error("Error updating formula:", error);
      showToast("Error updating formula");
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-surface-900">
          Master Sheet
        </h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Configure kilometer rates, monthly budgets, and incentive formulas
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-list inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setIsEditing(false);
            }}
            className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "rates" && (
          <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">
                  Kilometer Rates
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Set the per-kilometer rate for each driver type
                </p>
              </div>
              {!isEditing ? (
                <button
                  onClick={handleStartEditRates}
                  className="btn btn-primary"
                >
                  Edit Rates
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button onClick={handleSaveRates} className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Local Rate */}
                <div className="p-6 rounded-xl bg-primary-50 border border-primary-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900">
                        Local Drivers
                      </h3>
                      <p className="text-sm text-surface-500">
                        City and regional deliveries
                      </p>
                    </div>
                  </div>
                  {isEditing ? (
                    <div>
                      <label className="form-label">
                        Rate per Kilometer (R)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={editingRates.local}
                        onChange={(e) =>
                          setEditingRates((prev) => ({
                            ...prev,
                            local: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl font-bold text-surface-900">
                        {formatCurrency(localRate?.rate_per_km || 0)}
                      </p>
                      <p className="text-sm text-surface-500 mt-1">
                        per kilometer
                      </p>
                    </div>
                  )}
                </div>

                {/* Export Rate */}
                <div className="p-6 rounded-xl bg-yellow-50 border border-yellow-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-yellow-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900">
                        Export Drivers
                      </h3>
                      <p className="text-sm text-surface-500">
                        Cross-border and long-haul
                      </p>
                    </div>
                  </div>
                  {isEditing ? (
                    <div>
                      <label className="form-label">
                        Rate per Kilometer (R)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={editingRates.export}
                        onChange={(e) =>
                          setEditingRates((prev) => ({
                            ...prev,
                            export: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl font-bold text-surface-900">
                        {formatCurrency(exportRate?.rate_per_km || 0)}
                      </p>
                      <p className="text-sm text-surface-500 mt-1">
                        per kilometer
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rate Comparison */}
              <div className="mt-6 p-4 rounded-xl bg-surface-50 border border-surface-100">
                <h4 className="font-medium text-surface-900 mb-3">
                  Rate Comparison
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-surface-600">Local</span>
                      <span className="font-medium">
                        {formatCurrency(localRate?.rate_per_km || 0)}
                      </span>
                    </div>
                    <div className="h-3 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{
                          width: `${((localRate?.rate_per_km || 0) / Math.max(localRate?.rate_per_km || 1, exportRate?.rate_per_km || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-surface-600">Export</span>
                      <span className="font-medium">
                        {formatCurrency(exportRate?.rate_per_km || 0)}
                      </span>
                    </div>
                    <div className="h-3 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: `${((exportRate?.rate_per_km || 0) / Math.max(localRate?.rate_per_km || 1, exportRate?.rate_per_km || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "budgets" && (
          <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">
                    Monthly Budgets
                  </h2>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Set target kilometers for each month
                  </p>
                </div>
                <select
                  className="form-select w-24"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              {!isEditing ? (
                <button
                  onClick={handleStartEditBudgets}
                  className="btn btn-primary"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBudgets}
                    className="btn btn-primary"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="table-container overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th rowSpan={2}>Month</th>
                      <th
                        colSpan={3}
                        className="text-center border-b border-surface-200"
                      >
                        Local
                      </th>
                      <th
                        colSpan={3}
                        className="text-center border-b border-surface-200"
                      >
                        Export
                      </th>
                      <th rowSpan={2}>Total Budget</th>
                    </tr>
                    <tr>
                      <th>Budget (km)</th>
                      <th>Trucks</th>
                      <th>Target/Truck</th>
                      <th>Budget (km)</th>
                      <th>Trucks</th>
                      <th>Target/Truck</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => {
                        const localBudget = yearBudgets.find(
                          (b) => b.month === month && b.driver_type === "local",
                        );
                        const exportBudget = yearBudgets.find(
                          (b) =>
                            b.month === month && b.driver_type === "export",
                        );
                        const localKm = localBudget?.budgeted_kilometers || 0;
                        const exportKm = exportBudget?.budgeted_kilometers || 0;
                        const localTrucks = localBudget?.truck_count || 1;
                        const exportTrucks = exportBudget?.truck_count || 1;
                        const localTargetPerTruck =
                          localTrucks > 0
                            ? Math.round(localKm / localTrucks)
                            : 0;
                        const exportTargetPerTruck =
                          exportTrucks > 0
                            ? Math.round(exportKm / exportTrucks)
                            : 0;

                        return (
                          <tr key={month}>
                            <td className="font-medium text-xs">
                              {getMonthShortName(month)}
                            </td>
                            {/* Local columns */}
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-input w-28"
                                  value={editingBudgets[`local_${month}`] || ""}
                                  onChange={(e) =>
                                    setEditingBudgets((prev) => ({
                                      ...prev,
                                      [`local_${month}`]: e.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                />
                              ) : (
                                formatNumber(localKm)
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-input w-20"
                                  min="1"
                                  value={
                                    editingTruckCounts[`local_${month}`] || ""
                                  }
                                  onChange={(e) =>
                                    setEditingTruckCounts((prev) => ({
                                      ...prev,
                                      [`local_${month}`]: e.target.value,
                                    }))
                                  }
                                  placeholder="1"
                                />
                              ) : (
                                localTrucks
                              )}
                            </td>
                            <td className="text-surface-600">
                              {formatNumber(localTargetPerTruck)}
                            </td>
                            {/* Export columns */}
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-input w-28"
                                  value={
                                    editingBudgets[`export_${month}`] || ""
                                  }
                                  onChange={(e) =>
                                    setEditingBudgets((prev) => ({
                                      ...prev,
                                      [`export_${month}`]: e.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                />
                              ) : (
                                formatNumber(exportKm)
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-input w-20"
                                  min="1"
                                  value={
                                    editingTruckCounts[`export_${month}`] || ""
                                  }
                                  onChange={(e) =>
                                    setEditingTruckCounts((prev) => ({
                                      ...prev,
                                      [`export_${month}`]: e.target.value,
                                    }))
                                  }
                                  placeholder="1"
                                />
                              ) : (
                                exportTrucks
                              )}
                            </td>
                            <td className="text-surface-600">
                              {formatNumber(exportTargetPerTruck)}
                            </td>
                            <td className="font-medium">
                              {formatNumber(localKm + exportKm)}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-50 font-semibold">
                      <td>Annual Total</td>
                      <td>
                        {formatNumber(
                          yearBudgets
                            .filter((b) => b.driver_type === "local")
                            .reduce((sum, b) => sum + b.budgeted_kilometers, 0),
                        )}
                      </td>
                      <td>-</td>
                      <td>-</td>
                      <td>
                        {formatNumber(
                          yearBudgets
                            .filter((b) => b.driver_type === "export")
                            .reduce((sum, b) => sum + b.budgeted_kilometers, 0),
                        )}
                      </td>
                      <td>-</td>
                      <td>-</td>
                      <td>
                        {formatNumber(
                          yearBudgets.reduce(
                            (sum, b) => sum + b.budgeted_kilometers,
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Budget Chart */}
              <div className="mt-6 p-4 rounded-xl bg-surface-50 border border-surface-100">
                <h4 className="font-medium text-surface-900 mb-4">
                  Budget Distribution
                </h4>
                <div className="flex items-end gap-2 h-40">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const localBudget = yearBudgets.find(
                      (b) => b.month === month && b.driver_type === "local",
                    );
                    const exportBudget = yearBudgets.find(
                      (b) => b.month === month && b.driver_type === "export",
                    );
                    const total =
                      (localBudget?.budgeted_kilometers || 0) +
                      (exportBudget?.budgeted_kilometers || 0);
                    const maxTotal = Math.max(
                      ...Array.from({ length: 12 }, (_, i) => {
                        const l = yearBudgets.find(
                          (b) => b.month === i + 1 && b.driver_type === "local",
                        );
                        const e = yearBudgets.find(
                          (b) =>
                            b.month === i + 1 && b.driver_type === "export",
                        );
                        return (
                          (l?.budgeted_kilometers || 0) +
                          (e?.budgeted_kilometers || 0)
                        );
                      }),
                    );
                    const height = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

                    return (
                      <div
                        key={month}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t transition-all"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-surface-500 mt-2">
                          {getMonthShortName(month)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "incentive-settings" && (
          <div className="space-y-4">
            {/* Incentive Divisor Settings */}
            <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">
                    Incentive Calculation Settings
                  </h2>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Configure divisor values for each driver type to calculate
                    incentives
                  </p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={handleStartEditDivisors}
                    className="btn btn-primary"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDivisors}
                      className="btn btn-primary"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Local Driver Divisor */}
                  <div className="p-4 rounded-lg bg-primary-50 border border-primary-100">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-primary-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-surface-900">
                          Local Driver Divisor
                        </h3>
                        <p className="text-xs text-surface-500">
                          City and regional deliveries
                        </p>
                      </div>
                    </div>
                    {isEditing ? (
                      <div>
                        <label className="form-label">Divisor Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-input text-lg font-semibold"
                          value={editingDivisors.local}
                          onChange={(e) =>
                            setEditingDivisors((prev) => ({
                              ...prev,
                              local: e.target.value,
                            }))
                          }
                          placeholder="Enter local divisor"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold text-surface-900">
                          {formatNumber(localDivisor)}
                        </p>
                        <p className="text-xs text-surface-500 mt-0.5">
                          divisor value
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Export Driver Divisor */}
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-100">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-yellow-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-surface-900">
                          Export Driver Divisor
                        </h3>
                        <p className="text-xs text-surface-500">
                          Cross-border and long-haul
                        </p>
                      </div>
                    </div>
                    {isEditing ? (
                      <div>
                        <label className="form-label">Divisor Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-input text-lg font-semibold"
                          value={editingDivisors.export}
                          onChange={(e) =>
                            setEditingDivisors((prev) => ({
                              ...prev,
                              export: e.target.value,
                            }))
                          }
                          placeholder="Enter export divisor"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold text-surface-900">
                          {formatNumber(exportDivisor)}
                        </p>
                        <p className="text-xs text-surface-500 mt-0.5">
                          divisor value
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Formula Explanation */}
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-surface-50 to-surface-100/50 border border-surface-200">
                  <h4 className="text-xs font-semibold text-surface-800 uppercase tracking-wide mb-3">
                    How Incentives Are Calculated
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-primary-500 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                        1
                      </span>
                      <div className="flex-1 text-sm text-surface-700">
                        <span className="font-semibold text-surface-900">Rate per KM</span>
                        <span className="mx-1.5 text-surface-400">=</span>
                        <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-surface-200">Budget KM</span>
                        <span className="mx-1.5 text-surface-400">÷</span>
                        <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-surface-200">Divisor</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-primary-500 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                        2
                      </span>
                      <div className="flex-1 text-sm text-surface-700">
                        <span className="font-semibold text-surface-900">Incentive</span>
                        <span className="mx-1.5 text-surface-400">=</span>
                        <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-surface-200">Rate per KM</span>
                        <span className="mx-1.5 text-surface-400">×</span>
                        <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-surface-200">Actual KM</span>
                      </div>
                    </div>
                  </div>

                  {/* Example Calculations */}
                  <div className="mt-4 pt-4 border-t border-surface-200/60">
                    <h5 className="text-xs font-semibold text-surface-800 uppercase tracking-wide mb-3">
                      Example Calculations
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Local Example */}
                      <div className="bg-white rounded-lg p-3 border border-primary-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                          <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Local Driver</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-surface-500">Budget KM</span>
                            <span className="font-mono font-medium text-surface-700">60,000</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-surface-500">Divisor</span>
                            <span className="font-mono font-medium text-surface-700">{formatNumber(localDivisor)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-surface-100">
                            <span className="text-surface-600 font-medium">Rate/KM</span>
                            <span className="font-mono font-semibold text-surface-800">{formatCurrency(60000 / localDivisor)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-surface-500">Actual KM</span>
                            <span className="font-mono font-medium text-surface-700">3,200</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-surface-100 bg-green-50 -mx-3 px-3 py-1.5 rounded-b-lg -mb-3">
                            <span className="text-green-700 font-semibold">Incentive</span>
                            <span className="font-mono font-bold text-green-700">{formatCurrency((60000 / localDivisor) * 3200)}</span>
                          </div>
                        </div>
                      </div>
                      {/* Export Example */}
                      <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Export Driver</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-surface-500">Budget KM</span>
                            <span className="font-mono font-medium text-surface-700">25,000</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-surface-500">Divisor</span>
                            <span className="font-mono font-medium text-surface-700">{formatNumber(exportDivisor)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-surface-100">
                            <span className="text-surface-600 font-medium">Rate/KM</span>
                            <span className="font-mono font-semibold text-surface-800">{formatCurrency(25000 / exportDivisor)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-surface-500">Actual KM</span>
                            <span className="font-mono font-medium text-surface-700">5,800</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-surface-100 bg-green-50 -mx-3 px-3 py-1.5 rounded-b-lg -mb-3">
                            <span className="text-green-700 font-semibold">Incentive</span>
                            <span className="font-mono font-bold text-green-700">{formatCurrency((25000 / exportDivisor) * 5800)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "formulas" && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">
                    Custom Formulas
                  </h2>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Configure incentive calculation formulas
                  </p>
                </div>
                <button
                  onClick={() => setShowFormulaModal(true)}
                  className="btn btn-primary"
                >
                  Add
                </button>
              </div>
              <div className="divide-y divide-surface-100">
                {customFormulas.length > 0 ? (
                  customFormulas.map((formula) => (
                    <div key={formula.id} className="px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-surface-900">
                              {formula.formula_name}
                            </h3>
                            <span
                              className={`badge ${
                                formula.applies_to === "all"
                                  ? "badge-neutral"
                                  : formula.applies_to === "local"
                                    ? "badge-info"
                                    : "badge-warning"
                              }`}
                            >
                              {formula.applies_to === "all"
                                ? "All"
                                : formula.applies_to === "local"
                                  ? "Local"
                                  : "Export"}
                            </span>
                            <span
                              className={`badge ${formula.is_active ? "badge-success" : "badge-neutral"}`}
                            >
                              {formula.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-surface-500 mt-1">
                            {formula.description}
                          </p>
                          <div className="mt-2 px-3 py-2 rounded-md bg-surface-900 text-surface-100 font-mono text-xs">
                            {formula.formula_expression}
                          </div>
                          {formula.variables && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1.5">
                                Variables
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(
                                  formula.variables as Record<string, string>,
                                ).map(([key, desc]) => (
                                  <span
                                    key={key}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-100 border border-surface-200 text-xs"
                                  >
                                    <code className="font-mono text-primary-600 font-medium">{key}</code>
                                    <span className="text-surface-400">·</span>
                                    <span className="text-surface-600">{desc}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() =>
                              handleToggleFormula(formula.id, formula.is_active)
                            }
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              formula.is_active
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                          >
                            {formula.is_active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-xs text-surface-500">
                    No custom formulas configured
                  </div>
                )}
              </div>
            </div>

            {/* Formula Help */}
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-3">
                How Formulas Work
              </h3>
              <p className="text-xs text-surface-600 mb-4">
                Formulas are evaluated in order of priority (lowest first).
                Each formula can use variables from the driver's performance
                data and previous formula results.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-surface-50 to-surface-100/50 border border-surface-200">
                  <h4 className="text-xs font-semibold text-surface-800 uppercase tracking-wide mb-2">
                    Available Variables
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-primary-600 font-medium bg-white px-1.5 py-0.5 rounded border border-surface-200">actual_km</code>
                      <span className="text-surface-500">Kilometers driven</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-primary-600 font-medium bg-white px-1.5 py-0.5 rounded border border-surface-200">target_km</code>
                      <span className="text-surface-500">Monthly target</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-primary-600 font-medium bg-white px-1.5 py-0.5 rounded border border-surface-200">rate_per_km</code>
                      <span className="text-surface-500">Per-km rate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-primary-600 font-medium bg-white px-1.5 py-0.5 rounded border border-surface-200">base_salary</code>
                      <span className="text-surface-500">Driver's base salary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-primary-600 font-medium bg-white px-1.5 py-0.5 rounded border border-surface-200">accident_count</code>
                      <span className="text-surface-500">Monthly accidents</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-surface-50 to-surface-100/50 border border-surface-200">
                  <h4 className="text-xs font-semibold text-surface-800 uppercase tracking-wide mb-2">
                    Example Formulas
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-xs bg-surface-900 text-surface-100 px-2 py-1 rounded">actual_km * rate_per_km</code>
                      <span className="text-xs text-surface-500">Base incentive</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-xs bg-surface-900 text-surface-100 px-2 py-1 rounded">base_salary * 0.05</code>
                      <span className="text-xs text-surface-500">5% safety bonus</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-xs bg-surface-900 text-surface-100 px-2 py-1 rounded">accident_count * -500</code>
                      <span className="text-xs text-surface-500">Accident penalty</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Formula Modal */}
      {showFormulaModal && (
        <AddFormulaModal onClose={() => setShowFormulaModal(false)} />
      )}
    </div>
  );
}

function AddFormulaModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useStore();
  const [formData, setFormData] = useState({
    formula_name: "",
    formula_key: "",
    formula_expression: "",
    description: "",
    applies_to: "all" as "all" | "local" | "export",
    priority: 10,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("custom_formulas").insert({
        ...formData,
        is_active: true,
      });

      if (error) throw error;
      showToast("Formula added successfully");
      onClose();
    } catch (error) {
      console.error("Error adding formula:", error);
      showToast("Error adding formula");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900">
            Add Custom Formula
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Formula Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.formula_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  formula_name: e.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <label className="form-label">
              Formula Key (unique identifier)
            </label>
            <input
              type="text"
              className="form-input font-mono"
              value={formData.formula_key}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  formula_key: e.target.value.toLowerCase().replace(/\s/g, "_"),
                }))
              }
              required
            />
          </div>
          <div>
            <label className="form-label">Expression</label>
            <textarea
              className="form-input font-mono"
              rows={3}
              value={formData.formula_expression}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  formula_expression: e.target.value,
                }))
              }
              placeholder="actual_km * rate_per_km"
              required
            />
          </div>
          <div>
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Applies To</label>
              <select
                className="form-select"
                value={formData.applies_to}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    applies_to: e.target.value as "all" | "local" | "export",
                  }))
                }
              >
                <option value="all">All Drivers</option>
                <option value="local">Local Only</option>
                <option value="export">Export Only</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <input
                type="number"
                className="form-input"
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: parseInt(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Add Formula"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
