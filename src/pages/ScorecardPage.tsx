import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ScorecardSubnav from "../components/ScorecardSubnav";
import { useScorecardStore } from "../store/useScorecardStore";
import type { RoleWithKRAs } from "../types/scorecard";
import {
  calculateAchievementPercentage,
  getFinalRating,
  getRatingColor,
  getScoreFromAchievement,
} from "../types/scorecard";
import { exportScorecardToPDF } from "../utils/exportUtils";
import { formatPercentage, getMonthName } from "../utils/formatters";

export default function ScorecardPage() {
  const [searchParams] = useSearchParams();
  const urlMonth = parseInt(searchParams.get("month") || "") || new Date().getMonth() + 1;

  const {
    roles,
    employees,
    scoringRules,
    targets,
    fetchRoles,
    fetchEmployees,
    fetchScoringRules,
    fetchRoleWithKRAs,
    fetchEntries,
    fetchTargets,
    saveEntries,
    saveSummary,
  } = useScorecardStore();

  // Selection state
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Current month from URL
  const currentMonth = urlMonth;
  
  // Scorecard editor state
  const [roleData, setRoleData] = useState<RoleWithKRAs | null>(null);
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchRoles();
    fetchEmployees();
    fetchScoringRules();
  }, [fetchRoles, fetchEmployees, fetchScoringRules]);

  // Auto-select first employee
  useEffect(() => {
    if (!selectedEmployee && employees.length > 0) {
      setSelectedEmployee(employees[0].id);
    }
  }, [employees, selectedEmployee]);

  // Get selected employee record
  const selectedEmployeeRecord = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployee);
  }, [employees, selectedEmployee]);

  // Get role for selected employee
  const employeeRole = useMemo(() => {
    if (!selectedEmployeeRecord) return null;
    return roles.find((r) => r.id === selectedEmployeeRecord.role_id) || null;
  }, [selectedEmployeeRecord, roles]);

  // Load role/targets/entries when month or employee changes
  useEffect(() => {
    if (currentMonth && selectedEmployeeRecord) {
      setIsLoading(true);
      // Load role data
      fetchRoleWithKRAs(selectedEmployeeRecord.role_id).then((data) => {
        setRoleData(data);
      });
      // Load targets
      fetchTargets(selectedYear, currentMonth);
      // Load entries (or copy from previous month if none exist)
      fetchEntries(selectedEmployee, selectedYear, currentMonth).then(async (data) => {
        if (data.length > 0) {
          const entryMap: Record<string, number> = {};
          data.forEach((entry) => {
            entryMap[entry.kpi_id] = entry.actual_value;
          });
          setEntries(entryMap);
        } else {
          // Try to copy from previous month
          let prevMonth = currentMonth - 1;
          let prevYear = selectedYear;
          if (prevMonth < 1) {
            prevMonth = 12;
            prevYear -= 1;
          }
          const prevEntries = await fetchEntries(selectedEmployee, prevYear, prevMonth);
          if (prevEntries.length > 0) {
            const entryMap: Record<string, number> = {};
            prevEntries.forEach((entry) => {
              entryMap[entry.kpi_id] = entry.actual_value;
            });
            setEntries(entryMap);
          } else {
            setEntries({});
          }
        }
        setIsLoading(false);
      });
    } else {
      setRoleData(null);
      setEntries({});
    }
  }, [currentMonth, selectedEmployee, selectedEmployeeRecord, selectedYear, fetchRoleWithKRAs, fetchTargets, fetchEntries]);

  // Get target for a KPI
  const getTarget = (kpiId: string, kpi?: { default_target: number | null }): number => {
    const target = targets.find(
      (t) => t.kpi_id === kpiId && t.year === selectedYear && t.month === currentMonth
    );
    if (target?.target_value !== undefined && target?.target_value !== null) {
      return target.target_value;
    }
    if (kpi?.default_target !== undefined && kpi?.default_target !== null) {
      return kpi.default_target;
    }
    return 0;
  };

  // Calculate scores
  const calculateScores = useMemo(() => {
    if (!roleData || !currentMonth) return null;

    let totalWeightedScore = 0;
    const kraScores = roleData.kras.map((kra) => {
      let kraWeightedScore = 0;

      const kpiScores = kra.kpis.map((kpi) => {
        const actual = entries[kpi.id] || 0;
        const target = getTarget(kpi.id, kpi);
        const achievementPercent = calculateAchievementPercentage(
          actual,
          target,
          kpi.target_direction
        );
        const { score } = getScoreFromAchievement(achievementPercent, scoringRules);
        const kpiWeighting = kpi.weighting / 100;
        const weightedScore = score * kpiWeighting;

        return {
          kpi,
          target,
          actual,
          achievementPercent,
          score,
          weightedScore,
        };
      });

      kraWeightedScore = kpiScores.reduce((sum, kpi) => sum + kpi.weightedScore, 0);
      const kraWeighting = kra.weighting / 100;
      const finalKraScore = kraWeightedScore * kraWeighting;
      totalWeightedScore += finalKraScore;

      return {
        kra,
        kpiScores,
        kraWeightedScore,
        finalKraScore,
      };
    });

    return {
      kraScores,
      totalWeightedScore,
      rating: getFinalRating(totalWeightedScore),
    };
  }, [roleData, entries, targets, selectedYear, currentMonth, scoringRules]);

  // Handle entry change
  const handleEntryChange = (kpiId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEntries((prev) => ({ ...prev, [kpiId]: numValue }));
  };

  // Save scorecard
  const handleSave = async () => {
    if (!selectedEmployee || !roleData || !calculateScores || !currentMonth) return;

    setIsSaving(true);
    try {
      const entriesToSave = roleData.kras.flatMap((kra) =>
        kra.kpis.map((kpi) => {
          const actual = entries[kpi.id] || 0;
          const target = getTarget(kpi.id, kpi);
          const achievementPercent = calculateAchievementPercentage(
            actual,
            target,
            kpi.target_direction
          );
          const { score } = getScoreFromAchievement(achievementPercent, scoringRules);
          const kpiWeighting = kpi.weighting / 100;
          const kraWeighting = kra.weighting / 100;
          const weightedScore = score * kpiWeighting * kraWeighting;

          return {
            employee_id: selectedEmployee,
            kpi_id: kpi.id,
            year: selectedYear,
            month: currentMonth,
            actual_value: actual,
            target_value: target,
            achievement_percentage: achievementPercent,
            score,
            weighted_score: weightedScore,
            notes: null,
            entered_by: null,
            approved_by: null,
            approved_at: null,
            status: "submitted" as const,
          };
        })
      );

      await saveEntries(entriesToSave);

      await saveSummary({
        employee_id: selectedEmployee,
        year: selectedYear,
        month: currentMonth,
        total_weighted_score: calculateScores.totalWeightedScore,
        final_rating: calculateScores.rating,
        safety_incidents: 0,
        bonus_eligible: calculateScores.totalWeightedScore >= 70,
        bonus_amount: null,
        basic_salary: null,
        zig_base_salary: null,
        comments: null,
        reviewed_by: null,
        reviewed_at: null,
        status: "pending",
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving scorecard:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!calculateScores || !roleData || !selectedEmployee || !currentMonth) return;

    const employee = employees.find((e) => e.id === selectedEmployee);
    if (!employee) return;

    exportScorecardToPDF({
      employeeName: `${employee.first_name} ${employee.last_name}`,
      employeeId: employee.employee_id,
      roleName: roleData.role_name,
      year: selectedYear,
      month: currentMonth,
      monthName: getMonthName(currentMonth),
      companyName: "Performance Scorecard",
      kraScores: calculateScores.kraScores.map((kraScore) => ({
        kraName: kraScore.kra.kra_name,
        kraWeighting: kraScore.kra.weighting,
        kpiScores: kraScore.kpiScores.map((kpiScore) => ({
          kpiName: kpiScore.kpi.kpi_name,
          target: kpiScore.target,
          actual: kpiScore.actual,
          unit: kpiScore.kpi.unit,
          achievementPercent: kpiScore.achievementPercent,
          score: kpiScore.score,
          kpiWeighting: kpiScore.kpi.weighting,
          weightedScore: kpiScore.weightedScore,
        })),
        kraWeightedScore: kraScore.kraWeightedScore,
        finalKraScore: kraScore.finalKraScore,
      })),
      totalWeightedScore: calculateScores.totalWeightedScore,
      rating: calculateScores.rating,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Scorecards</h1>
          <p className="text-gray-600 mt-1">
            Create and manage monthly scorecards for employees
          </p>
          <ScorecardSubnav className="mt-4" />
        </div>
      </div>

      {/* Employee & Year Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

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

          {employeeRole && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700 border border-gray-200">
                {employeeRole.role_name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700">Scorecard saved successfully!</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && selectedEmployee && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading scorecard...</p>
        </div>
      )}

      {/* No employee selected */}
      {!selectedEmployee && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Employee</h3>
          <p className="text-gray-500">
            Choose an employee from the dropdown above to view and create their scorecards.
          </p>
        </div>
      )}

      {/* Scorecard Editor */}
      {!isLoading && selectedEmployee && roleData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {roleData.role_name} Scorecard — {getMonthName(currentMonth)} {selectedYear}
            </h2>
            {calculateScores && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Total Score: <strong className="text-lg">{calculateScores.totalWeightedScore.toFixed(1)}%</strong>
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(calculateScores.rating)}`}>
                  {calculateScores.rating}
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KRA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deliverable/KPI</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Target</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">Actual</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Achieve %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-20">Score</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-20">KPI Wt</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Weighted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calculateScores?.kraScores.map((kraScore) => (
                  <React.Fragment key={kraScore.kra.id}>
                    {kraScore.kpiScores.map((kpiScore, kpiIndex) => (
                      <tr key={kpiScore.kpi.id} className={kpiIndex === 0 ? "bg-blue-50/30" : ""}>
                        {kpiIndex === 0 && (
                          <td
                            rowSpan={kraScore.kpiScores.length}
                            className="px-4 py-3 text-sm font-semibold text-blue-600 bg-blue-50/50 border-r border-blue-100"
                          >
                            {kraScore.kra.weighting}%
                          </td>
                        )}
                        {kpiIndex === 0 && (
                          <td
                            rowSpan={kraScore.kpiScores.length}
                            className="px-4 py-3 text-sm font-semibold text-gray-900 bg-blue-50/50 border-r border-blue-100"
                          >
                            {kraScore.kra.kra_name}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-700">{kpiScore.kpi.kpi_name}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {kpiScore.target} {kpiScore.kpi.unit}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={entries[kpiScore.kpi.id] || ""}
                            onChange={(e) => handleEntryChange(kpiScore.kpi.id, e.target.value)}
                            className="w-full px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          kpiScore.achievementPercent >= 100 ? "text-green-600" :
                          kpiScore.achievementPercent >= 80 ? "text-blue-600" :
                          kpiScore.achievementPercent >= 60 ? "text-yellow-600" :
                          "text-red-600"
                        }`}>
                          {formatPercentage(kpiScore.achievementPercent)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {kpiScore.score.toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-500">
                          {kpiScore.kpi.weighting}%
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-700">
                          {kpiScore.weightedScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {/* KRA Subtotal */}
                    <tr className="bg-gray-100">
                      <td colSpan={7} className="px-4 py-2 text-sm font-semibold text-gray-700 text-right">
                        {kraScore.kra.kra_name} Sub Total
                      </td>
                      <td className="px-4 py-2 text-sm font-semibold text-right">100%</td>
                      <td className="px-4 py-2 text-sm font-semibold text-right text-blue-600">
                        {kraScore.finalKraScore.toFixed(2)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                {/* Grand Total */}
                {calculateScores && (
                  <tr className="bg-blue-600 text-white">
                    <td colSpan={7} className="px-4 py-3 text-sm font-bold text-right">
                      TOTAL SCORE
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-right">100%</td>
                    <td className="px-4 py-3 text-lg font-bold text-right">
                      {calculateScores.totalWeightedScore.toFixed(1)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={handleExportPDF}
              disabled={!calculateScores}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
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
                  Save Scorecard
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      {selectedEmployee && roleData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Scoring Legend</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Excellent (90-100%)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Very Good (80-90%)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
              Good (70-80%)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              Satisfactory (60-70%)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              Needs Improvement (50-60%)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              Unsatisfactory (&lt;50%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
