import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useScorecardStore } from "../store/useScorecardStore";
import type { RoleWithKRAs, ScorecardTarget } from "../types/scorecard";
import { getMonthName } from "../utils/formatters";

export default function ScorecardTargetsPage() {
  const {
    roles,
    targets,
    fetchRoles,
    fetchTargets,
    fetchRoleWithKRAs,
    createTarget,
    updateTarget,
  } = useScorecardStore();

  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [roleData, setRoleData] = useState<RoleWithKRAs | null>(null);
  const [targetValues, setTargetValues] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Load role data when role changes
  useEffect(() => {
    if (selectedRole) {
      fetchRoleWithKRAs(selectedRole).then((data) => {
        setRoleData(data);
      });
    } else {
      setRoleData(null);
    }
  }, [selectedRole, fetchRoleWithKRAs]);

  // Load targets when selection changes
  useEffect(() => {
    fetchTargets(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchTargets]);

  // Pre-fill target values when data changes
  useEffect(() => {
    if (roleData) {
      const values: Record<string, number> = {};
      roleData.kras.forEach((kra) => {
        kra.kpis.forEach((kpi) => {
          const existingTarget = targets.find(
            (t) => t.kpi_id === kpi.id && t.year === selectedYear && t.month === selectedMonth
          );
          values[kpi.id] = existingTarget?.target_value || kpi.default_target || 0;
        });
      });
      setTargetValues(values);
    }
  }, [roleData, targets, selectedYear, selectedMonth]);

  const handleTargetChange = (kpiId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTargetValues((prev) => ({ ...prev, [kpiId]: numValue }));
  };

  const handleSave = async () => {
    if (!roleData) return;

    setIsSaving(true);
    try {
      const promises = roleData.kras.flatMap((kra) =>
        kra.kpis.map(async (kpi) => {
          const existingTarget = targets.find(
            (t) => t.kpi_id === kpi.id && t.year === selectedYear && t.month === selectedMonth
          );

          const targetValue = targetValues[kpi.id] || 0;

          if (existingTarget) {
            // Only update target_value for existing records
            await updateTarget(existingTarget.id, { target_value: targetValue });
          } else {
            // Create new target with all fields
            await createTarget({
              kpi_id: kpi.id,
              year: selectedYear,
              month: selectedMonth,
              target_value: targetValue,
              notes: null,
            });
          }
        })
      );

      await Promise.all(promises);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchTargets(selectedYear, selectedMonth);
    } catch (error) {
      console.error("Error saving targets:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const copyFromPreviousMonth = async () => {
    if (!roleData) return;

    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const prevTargets = await fetchTargets(prevYear, prevMonth);
    const values: Record<string, number> = {};

    roleData.kras.forEach((kra) => {
      kra.kpis.forEach((kpi) => {
        const prevTarget = prevTargets.find((t: ScorecardTarget) => t.kpi_id === kpi.id);
        values[kpi.id] = prevTarget?.target_value || targetValues[kpi.id] || 0;
      });
    });

    setTargetValues(values);
    fetchTargets(selectedYear, selectedMonth); // Restore current month targets query
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scorecard Targets</h1>
          <p className="text-gray-600 mt-1">
            Set monthly KPI targets for each role
          </p>
        </div>
        <Link
          to="/scorecards"
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          ← Back to Scorecards
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {getMonthName(month)}
                </option>
              ))}
            </select>
          </div>

          {/* Copy button */}
          <div className="flex items-end">
            <button
              onClick={copyFromPreviousMonth}
              disabled={!selectedRole}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Copy from Previous Month
            </button>
          </div>
        </div>
      </div>

      {/* Success message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700">Targets saved successfully!</span>
        </div>
      )}

      {/* Targets Table */}
      {selectedRole && roleData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              {roleData.role_name} Targets - {getMonthName(selectedMonth)} {selectedYear}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KRA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KPI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Direction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Default</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Target Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {roleData.kras.map((kra) =>
                  kra.kpis.map((kpi, kpiIndex) => (
                    <tr key={kpi.id} className={kpiIndex === 0 ? "bg-blue-50/30" : ""}>
                      {kpiIndex === 0 && (
                        <td
                          rowSpan={kra.kpis.length}
                          className="px-4 py-3 text-sm font-semibold text-blue-600 bg-blue-50/50 border-r border-blue-100"
                        >
                          {kra.weighting}%
                        </td>
                      )}
                      {kpiIndex === 0 && (
                        <td
                          rowSpan={kra.kpis.length}
                          className="px-4 py-3 text-sm font-semibold text-gray-900 bg-blue-50/50 border-r border-blue-100"
                        >
                          {kra.kra_name}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-700">{kpi.kpi_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{kpi.unit}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            kpi.target_direction === "higher_better"
                              ? "bg-green-100 text-green-700"
                              : kpi.target_direction === "lower_better"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {kpi.target_direction === "higher_better"
                            ? "Higher is Better"
                            : kpi.target_direction === "lower_better"
                            ? "Lower is Better"
                            : "Exact Match"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {kpi.default_target || 0} {kpi.unit}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={targetValues[kpi.id] || ""}
                          onChange={(e) => handleTargetChange(kpi.id, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Targets
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* No selection message */}
      {!selectedRole && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Role</h3>
          <p className="text-gray-500">
            Choose a role from the dropdown to set or edit KPI targets for that role.
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">About Target Direction</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            <strong>Higher is Better:</strong> Achievement % increases as actual exceeds target (e.g., KMs driven, revenue)
          </li>
          <li>
            <strong>Lower is Better:</strong> Achievement % increases as actual is below target (e.g., accidents, delays)
          </li>
          <li>
            <strong>Exact Match:</strong> 100% achievement when actual equals target exactly
          </li>
        </ul>
      </div>
    </div>
  );
}
