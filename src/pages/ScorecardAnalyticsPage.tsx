import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ScorecardSubnav from "../components/ScorecardSubnav";
import { useScorecardStore } from "../store/useScorecardStore";
import { formatCurrency, formatNumber, getMonthName } from "../utils/formatters";

const months = Array.from({ length: 12 }, (_, i) => i + 1);

interface MonthRowDraft {
  basicSalaryUsd: number;
  zigAmount: number;
  incentiveUsd: number;
  conversionRate: number;
}

export default function ScorecardAnalyticsPage() {
  const {
    summaries,
    employees,
    roles,
    conversionRates,
    fetchSummaries,
    fetchEmployees,
    fetchRoles,
    fetchConversionRates,
    updateSummary,
    upsertConversionRate,
  } = useScorecardStore();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [draft, setDraft] = useState<MonthRowDraft | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, [fetchEmployees, fetchRoles]);

  useEffect(() => {
    fetchSummaries(selectedYear);
    fetchConversionRates(selectedYear);
  }, [selectedYear, fetchSummaries, fetchConversionRates]);

  const filteredEmployees = useMemo(() => {
    if (selectedRole === "all") {
      return employees;
    }

    return employees.filter((employee) => employee.role_id === selectedRole);
  }, [employees, selectedRole]);

  useEffect(() => {
    if (!filteredEmployees.length) {
      setSelectedEmployee("");
      return;
    }

    const exists = filteredEmployees.some((employee) => employee.id === selectedEmployee);
    if (!selectedEmployee || !exists) {
      setSelectedEmployee(filteredEmployees[0].id);
    }
  }, [filteredEmployees, selectedEmployee]);

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const selectedEmployeeRecord = selectedEmployee ? employeeMap.get(selectedEmployee) : undefined;

  const selectedEmployeeSummaries = useMemo(() => {
    if (!selectedEmployee) {
      return [];
    }

    return summaries
      .filter((summary) => summary.employee_id === selectedEmployee)
      .sort((a, b) => a.month - b.month);
  }, [summaries, selectedEmployee]);

  const summaryByMonth = useMemo(
    () => new Map(selectedEmployeeSummaries.map((summary) => [summary.month, summary])),
    [selectedEmployeeSummaries]
  );

  const conversionRateByMonth = useMemo(
    () => new Map(conversionRates.map((rate) => [rate.month, rate.rate])),
    [conversionRates]
  );

  const monthlyRows = useMemo(() => {
    return months.map((month) => {
      const summary = summaryByMonth.get(month);
      const previousSummary = month > 1 ? summaryByMonth.get(month - 1) : undefined;
      const conversionRate = conversionRateByMonth.get(month) ?? 0;
      const basicSalaryUsd = summary?.basic_salary ?? 0;
      const zigAmount = summary?.zig_base_salary ?? 0;
      const zigUsdEquivalent = conversionRate > 0 ? zigAmount / conversionRate : 0;
      const incentiveUsd = summary?.bonus_amount ?? 0;
      const totalPayUsd = basicSalaryUsd + zigUsdEquivalent + incentiveUsd;
      const score = summary?.total_weighted_score ?? null;
      const previousScore = previousSummary?.total_weighted_score ?? null;
      const scoreDelta =
        score !== null && previousScore !== null
          ? Number((score - previousScore).toFixed(2))
          : null;

      return {
        month,
        summary,
        conversionRate,
        score,
        previousScore,
        scoreDelta,
        basicSalaryUsd,
        zigAmount,
        zigUsdEquivalent,
        incentiveUsd,
        totalPayUsd,
      };
    });
  }, [summaryByMonth, conversionRateByMonth]);

  const trendData = useMemo(
    () =>
      monthlyRows.map((row) => ({
        month: getMonthName(row.month),
        score: row.score ?? 0,
      })),
    [monthlyRows]
  );

  const startEdit = (month: number) => {
    const row = monthlyRows.find((item) => item.month === month);
    if (!row || !row.summary) {
      return;
    }

    setEditingMonth(month);
    setDraft({
      basicSalaryUsd: row.basicSalaryUsd,
      zigAmount: row.zigAmount,
      incentiveUsd: row.incentiveUsd,
      conversionRate: row.conversionRate,
    });
  };

  const cancelEdit = () => {
    setEditingMonth(null);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!draft || editingMonth === null) {
      return;
    }

    const summary = summaryByMonth.get(editingMonth);
    if (!summary) {
      return;
    }

    const rateToSave = draft.conversionRate;
    if (rateToSave > 0) {
      const rateSaved = await upsertConversionRate(selectedYear, editingMonth, rateToSave);
      if (!rateSaved) {
        return;
      }
    }

    const saved = await updateSummary(summary.id, {
      basic_salary: draft.basicSalaryUsd,
      zig_base_salary: draft.zigAmount,
      bonus_amount: draft.incentiveUsd,
    });

    if (!saved) {
      return;
    }

    await Promise.all([fetchSummaries(selectedYear), fetchConversionRates(selectedYear)]);
    cancelEdit();
  };

  const roleName = useMemo(() => {
    if (!selectedEmployeeRecord) {
      return "-";
    }

    const role = roles.find((item) => item.id === selectedEmployeeRecord.role_id);
    return role?.role_name ?? "-";
  }, [roles, selectedEmployeeRecord]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scorecard Employee Analytics</h1>
          <p className="text-sm text-gray-500">
            View each employee month-on-month scores and manage USD + ZIG salary inputs.
          </p>
          <ScorecardSubnav className="mt-4" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-lg border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.role_name}
              </option>
            ))}
          </select>

          <select
            value={selectedEmployee}
            onChange={(e) => {
              setSelectedEmployee(e.target.value);
              cancelEdit();
            }}
            className="min-w-[220px] rounded-lg border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            {filteredEmployees.length === 0 ? (
              <option value="">No employees</option>
            ) : (
              filteredEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Employee</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {selectedEmployeeRecord
              ? `${selectedEmployeeRecord.first_name} ${selectedEmployeeRecord.last_name}`
              : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Role</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{roleName}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Year</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{selectedYear}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Month-on-Month Score Trend</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => `${formatNumber(Number(value))}%`} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Monthly Scorecards & Salary Inputs</h2>
          <p className="text-sm text-gray-500">
            Basic USD + (ZIG / rate) + incentive = total monthly USD pay.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Prev Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">MoM Delta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Basic USD</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ZIG Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Rate (ZIG / 1 USD)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ZIG in USD</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Incentive USD</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Total USD</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {monthlyRows.map((row) => {
                const isEditing = editingMonth === row.month;
                const rateForDisplay = isEditing ? draft?.conversionRate ?? row.conversionRate : row.conversionRate;
                const zigForDisplay = isEditing ? draft?.zigAmount ?? row.zigAmount : row.zigAmount;
                const basicForDisplay = isEditing ? draft?.basicSalaryUsd ?? row.basicSalaryUsd : row.basicSalaryUsd;
                const incentiveForDisplay = isEditing ? draft?.incentiveUsd ?? row.incentiveUsd : row.incentiveUsd;
                const zigUsdForDisplay = rateForDisplay > 0 ? zigForDisplay / rateForDisplay : 0;
                const totalForDisplay = basicForDisplay + incentiveForDisplay + zigUsdForDisplay;

                return (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {getMonthName(row.month)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                      {row.score === null ? "-" : `${formatNumber(row.score)}%`}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                      {row.previousScore === null ? "-" : `${formatNumber(row.previousScore)}%`}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {row.scoreDelta === null ? (
                        <span className="text-gray-400">-</span>
                      ) : row.scoreDelta > 0 ? (
                        <span className="font-medium text-green-700">+{formatNumber(row.scoreDelta)}%</span>
                      ) : row.scoreDelta < 0 ? (
                        <span className="font-medium text-red-700">{formatNumber(row.scoreDelta)}%</span>
                      ) : (
                        <span className="font-medium text-gray-700">0.00%</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                      {isEditing ? (
                        <input
                          type="number"
                          value={draft?.basicSalaryUsd ?? 0}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? { ...prev, basicSalaryUsd: Number(e.target.value) || 0 }
                                : prev
                            )
                          }
                          className="w-28 rounded border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      ) : (
                        formatCurrency(row.basicSalaryUsd)
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                      {isEditing ? (
                        <input
                          type="number"
                          value={draft?.zigAmount ?? 0}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev ? { ...prev, zigAmount: Number(e.target.value) || 0 } : prev
                            )
                          }
                          className="w-28 rounded border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      ) : (
                        formatNumber(row.zigAmount)
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.0001"
                          value={draft?.conversionRate ?? 0}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? { ...prev, conversionRate: Number(e.target.value) || 0 }
                                : prev
                            )
                          }
                          className="w-32 rounded border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      ) : rateForDisplay > 0 ? (
                        formatNumber(rateForDisplay)
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                      {rateForDisplay > 0 ? formatCurrency(zigUsdForDisplay) : "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                      {isEditing ? (
                        <input
                          type="number"
                          value={draft?.incentiveUsd ?? 0}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? { ...prev, incentiveUsd: Number(e.target.value) || 0 }
                                : prev
                            )
                          }
                          className="w-28 rounded border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      ) : (
                        formatCurrency(row.incentiveUsd)
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(totalForDisplay)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                      {!row.summary ? (
                        <span className="text-gray-400">No scorecard</span>
                      ) : isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={saveEdit}
                            className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(row.month)}
                          className="rounded border border-primary-500 px-3 py-1 text-primary-600 hover:bg-primary-50"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
