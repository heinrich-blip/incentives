/**
 * Analytics Dashboard - Advanced data visualization and insights
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import
    {
        ComparisonBarChart,
        DonutChart,
        LineComparisonChart,
        PerformanceGauge,
        StatCardWithSparkline,
        TrendChart
    } from "../components/charts";
import { useStore } from "../store/useStore";
import
    {
        calculateDriverRankings,
        calculateProjection,
        formatCompactNumber,
        getCurrentDayOfMonth,
        getDaysInMonth,
        getIncentiveBreakdown,
        getMonthlyTrends,
        getTrendData,
        getYearOverYearComparison,
    } from "../utils/analytics";
import
    {
        formatCurrency,
        formatNumber,
        formatPercentage,
        generateInitials,
        getMonthName,
    } from "../utils/formatters";

export default function AnalyticsPage() {
  const {
    drivers,
    driverPerformance,
    incentiveCalculations,
    monthlyBudgets,
    selectedYear,
    selectedMonth,
    setSelectedPeriod,
  } = useStore();

  const [viewMode, setViewMode] = useState<"overview" | "trends" | "comparison">("overview");

  // Current month data
  const currentMonthPerf = useMemo(
    () => driverPerformance.filter((p) => p.year === selectedYear && p.month === selectedMonth),
    [driverPerformance, selectedYear, selectedMonth]
  );

  const currentMonthCalc = useMemo(
    () => incentiveCalculations.filter((c) => c.year === selectedYear && c.month === selectedMonth),
    [incentiveCalculations, selectedYear, selectedMonth]
  );

  // Previous month data for comparison
  const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

  const previousMonthPerf = useMemo(
    () => driverPerformance.filter((p) => p.year === previousYear && p.month === previousMonth),
    [driverPerformance, previousYear, previousMonth]
  );

  // Aggregate stats
  const stats = useMemo(() => {
    const totalKm = currentMonthPerf.reduce((sum, p) => sum + p.actual_kilometers, 0);
    const totalTarget = monthlyBudgets
      .filter((b) => b.year === selectedYear && b.month === selectedMonth)
      .reduce((sum, b) => sum + b.budgeted_kilometers, 0);
    const totalIncentives = currentMonthCalc.reduce((sum, c) => sum + c.total_incentive, 0);
    const avgAchievement = totalTarget > 0 ? (totalKm / totalTarget) * 100 : 0;
    const driversAboveTarget = currentMonthPerf.filter((p) => {
      const driver = drivers.find((d) => d.id === p.driver_id);
      const budget = monthlyBudgets.find(
        (b) =>
          b.year === selectedYear &&
          b.month === selectedMonth &&
          b.driver_type === driver?.driver_type
      );
      return budget && p.actual_kilometers >= budget.budgeted_kilometers / (budget.truck_count || 1);
    }).length;

    // Previous month stats for comparison
    const prevTotalKm = previousMonthPerf.reduce((sum, p) => sum + p.actual_kilometers, 0);
    const kmChange = prevTotalKm > 0 ? ((totalKm - prevTotalKm) / prevTotalKm) * 100 : 0;

    return {
      totalKm,
      totalTarget,
      totalIncentives,
      avgAchievement,
      driversAboveTarget,
      totalDrivers: currentMonthPerf.length,
      kmChange,
    };
  }, [currentMonthPerf, currentMonthCalc, monthlyBudgets, previousMonthPerf, drivers, selectedYear, selectedMonth]);

  // Month-end projection
  const projection = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const currentDay = selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() + 1
      ? getCurrentDayOfMonth()
      : daysInMonth;

    return calculateProjection(stats.totalKm, stats.totalTarget, currentDay, daysInMonth);
  }, [stats.totalKm, stats.totalTarget, selectedYear, selectedMonth]);

  // Trend data for sparklines
  const kmTrend = useMemo(() => getTrendData(driverPerformance, null, 6), [driverPerformance]);

  // Monthly trends for charts
  const monthlyTrends = useMemo(
    () => getMonthlyTrends(driverPerformance, incentiveCalculations, 12),
    [driverPerformance, incentiveCalculations]
  );

  // Driver rankings
  const targetKmByDriver = useMemo(() => {
    const targets: Record<string, number> = {};
    currentMonthPerf.forEach((p) => {
      const driver = drivers.find((d) => d.id === p.driver_id);
      const budget = monthlyBudgets.find(
        (b) =>
          b.year === selectedYear &&
          b.month === selectedMonth &&
          b.driver_type === driver?.driver_type
      );
      if (budget) {
        targets[p.driver_id] = budget.budgeted_kilometers / (budget.truck_count || 1);
      }
    });
    return targets;
  }, [currentMonthPerf, monthlyBudgets, drivers, selectedYear, selectedMonth]);

  const rankings = useMemo(
    () =>
      calculateDriverRankings(
        currentMonthPerf,
        previousMonthPerf,
        currentMonthCalc,
        drivers,
        targetKmByDriver
      ),
    [currentMonthPerf, previousMonthPerf, currentMonthCalc, drivers, targetKmByDriver]
  );

  // Incentive breakdown for donut chart
  const incentiveBreakdown = useMemo(
    () => getIncentiveBreakdown(currentMonthCalc),
    [currentMonthCalc]
  );

  // Year over year comparison
  const currentYearPerf = useMemo(
    () => driverPerformance.filter((p) => p.year === selectedYear),
    [driverPerformance, selectedYear]
  );
  const previousYearPerf = useMemo(
    () => driverPerformance.filter((p) => p.year === selectedYear - 1),
    [driverPerformance, selectedYear]
  );
  const currentYearCalc = useMemo(
    () => incentiveCalculations.filter((c) => c.year === selectedYear),
    [incentiveCalculations, selectedYear]
  );
  const previousYearCalc = useMemo(
    () => incentiveCalculations.filter((c) => c.year === selectedYear - 1),
    [incentiveCalculations, selectedYear]
  );

  const yoyComparison = useMemo(
    () => getYearOverYearComparison(currentYearPerf, previousYearPerf, currentYearCalc, previousYearCalc),
    [currentYearPerf, previousYearPerf, currentYearCalc, previousYearCalc]
  );

  // Chart data for monthly comparison
  const monthlyComparisonData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthNames.map((label, index) => {
      const month = index + 1;
      const current = currentYearPerf
        .filter((p) => p.month === month)
        .reduce((sum, p) => sum + p.actual_kilometers, 0);
      const previous = previousYearPerf
        .filter((p) => p.month === month)
        .reduce((sum, p) => sum + p.actual_kilometers, 0);
      return { label, current, previous };
    });
  }, [currentYearPerf, previousYearPerf]);

  // Actual vs Target chart data
  const actualVsTargetData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthNames.map((label, index) => {
      const month = index + 1;
      const actual = driverPerformance
        .filter((p) => p.year === selectedYear && p.month === month)
        .reduce((sum, p) => sum + p.actual_kilometers, 0);
      const target = monthlyBudgets
        .filter((b) => b.year === selectedYear && b.month === month)
        .reduce((sum, b) => sum + b.budgeted_kilometers, 0);
      return { label, actual, target };
    });
  }, [driverPerformance, monthlyBudgets, selectedYear]);

  // Driver type breakdown
  const driverTypeStats = useMemo(() => {
    const localPerf = currentMonthPerf.filter((p) => {
      const driver = drivers.find((d) => d.id === p.driver_id);
      return driver?.driver_type === "local";
    });
    const exportPerf = currentMonthPerf.filter((p) => {
      const driver = drivers.find((d) => d.id === p.driver_id);
      return driver?.driver_type === "export";
    });

    return {
      local: {
        count: localPerf.length,
        totalKm: localPerf.reduce((sum, p) => sum + p.actual_kilometers, 0),
      },
      export: {
        count: exportPerf.length,
        totalKm: exportPerf.reduce((sum, p) => sum + p.actual_kilometers, 0),
      },
    };
  }, [currentMonthPerf, drivers]);

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case "ahead": return "text-green-600 bg-green-50";
      case "on-track": return "text-blue-600 bg-blue-50";
      case "at-risk": return "text-amber-600 bg-amber-50";
      case "behind": return "text-red-600 bg-red-50";
      default: return "text-surface-600 bg-surface-50";
    }
  };

  const getMovementIcon = (movement: string) => {
    switch (movement) {
      case "up": return <span className="text-green-500">↑</span>;
      case "down": return <span className="text-red-500">↓</span>;
      case "new": return <span className="text-blue-500">★</span>;
      default: return <span className="text-surface-400">—</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Analytics</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Performance insights and data visualization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Tabs */}
          <div className="flex items-center bg-surface-100 rounded-lg p-0.5">
            {(["overview", "trends", "comparison"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-white text-surface-900 shadow-sm"
                    : "text-surface-600 hover:text-surface-900"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => setSelectedPeriod(selectedYear, parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {getMonthName(i + 1)}
              </option>
            ))}
          </select>
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
        </div>
      </div>

      {/* Overview View */}
      {viewMode === "overview" && (
        <>
          {/* Key Metrics with Sparklines */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCardWithSparkline
              title="Total Kilometers"
              value={formatCompactNumber(stats.totalKm)}
              change={stats.kmChange}
              sparklineData={kmTrend}
              sparklineColor="#3b82f6"
            />
            <StatCardWithSparkline
              title="Total Incentives"
              value={formatCurrency(stats.totalIncentives)}
              sparklineData={monthlyTrends.slice(-6).map((t) => ({ label: "", value: t.totalIncentives }))}
              sparklineColor="#22c55e"
            />
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Achievement</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-2xl font-bold text-surface-900">
                  {formatPercentage(stats.avgAchievement)}
                </p>
                <PerformanceGauge
                  value={stats.avgAchievement}
                  max={100}
                  label=""
                  color={stats.avgAchievement >= 100 ? "success" : stats.avgAchievement >= 80 ? "warning" : "danger"}
                  size="sm"
                />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Drivers Above Target</p>
              <p className="text-2xl font-bold text-surface-900 mt-1">
                {stats.driversAboveTarget}/{stats.totalDrivers}
              </p>
              <div className="mt-2 h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${stats.totalDrivers > 0 ? (stats.driversAboveTarget / stats.totalDrivers) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Projection & Rankings Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Month-End Projection */}
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">
                  Month-End Projection
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLikelihoodColor(projection.likelihood)}`}>
                  {projection.likelihood.replace("-", " ").toUpperCase()}
                </span>
              </div>

              <div className="text-center py-4">
                <p className="text-4xl font-bold text-surface-900">
                  {formatCompactNumber(projection.projectedMonthEnd)}
                </p>
                <p className="text-sm text-surface-500 mt-1">Projected KM</p>
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-surface-500">Target</span>
                  <span className="font-medium text-surface-900">{formatNumber(projection.targetKm)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-surface-500">Current Pace</span>
                  <span className="font-medium text-surface-900">{formatNumber(Math.round(projection.currentPace))} km/day</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-surface-500">Days Remaining</span>
                  <span className="font-medium text-surface-900">{projection.daysRemaining}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-surface-500">Needed Daily</span>
                  <span className="font-medium text-surface-900">{formatNumber(projection.dailyKmNeeded)} km/day</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-surface-100">
                  <span className="text-surface-500">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${projection.confidenceLevel}%` }}
                      />
                    </div>
                    <span className="font-medium text-surface-900">{projection.confidenceLevel}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-4">
                Top Performers
              </h3>
              <div className="space-y-2">
                {rankings.slice(0, 5).map((item) => {
                  const driver = drivers.find((d) => d.id === item.driverId);
                  return (
                    <Link
                      key={item.driverId}
                      to={`/drivers/${item.driverId}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded bg-surface-100 text-xs font-bold text-surface-700">
                        {item.rank}
                      </div>
                      <div className="w-8 h-8 rounded bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">
                        {generateInitials(driver?.first_name || "", driver?.last_name || "")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 truncate">
                          {driver?.first_name} {driver?.last_name}
                        </p>
                        <p className="text-xs text-surface-500">
                          {formatNumber(item.actualKm)} km · {formatPercentage(item.achievement)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {getMovementIcon(item.movement)}
                        {item.previousRank && item.movement !== "same" && (
                          <span className="text-surface-400">
                            {Math.abs(item.previousRank - item.rank)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Incentive Breakdown */}
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-4">
                Incentive Breakdown
              </h3>
              {incentiveBreakdown.length > 0 ? (
                <DonutChart
                  data={incentiveBreakdown}
                  height={180}
                  centerValue={formatCurrency(stats.totalIncentives)}
                  centerLabel="Total"
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
                  No incentive data available
                </div>
              )}
            </div>
          </div>

          {/* Driver Type Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">Local Drivers</h3>
                  <p className="text-xs text-surface-500">{driverTypeStats.local.count} active drivers</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wider">Total KM</p>
                  <p className="text-lg font-bold text-surface-900">{formatNumber(driverTypeStats.local.totalKm)}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wider">Avg per Driver</p>
                  <p className="text-lg font-bold text-surface-900">
                    {driverTypeStats.local.count > 0
                      ? formatNumber(Math.round(driverTypeStats.local.totalKm / driverTypeStats.local.count))
                      : "0"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">Export Drivers</h3>
                  <p className="text-xs text-surface-500">{driverTypeStats.export.count} active drivers</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wider">Total KM</p>
                  <p className="text-lg font-bold text-surface-900">{formatNumber(driverTypeStats.export.totalKm)}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wider">Avg per Driver</p>
                  <p className="text-lg font-bold text-surface-900">
                    {driverTypeStats.export.count > 0
                      ? formatNumber(Math.round(driverTypeStats.export.totalKm / driverTypeStats.export.count))
                      : "0"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Trends View */}
      {viewMode === "trends" && (
        <>
          {/* Actual vs Target Chart */}
          <div className="bg-white rounded-lg border border-surface-200 p-4">
            <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-4">
              Actual vs Target KM ({selectedYear})
            </h3>
            <LineComparisonChart data={actualVsTargetData} height={300} />
          </div>

          {/* Monthly KM Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-4">
                Monthly Kilometers Trend
              </h3>
              <TrendChart
                data={monthlyTrends.map((t) => ({
                  label: getMonthName(t.month).slice(0, 3),
                  value: t.totalKm,
                }))}
                height={250}
              />
            </div>

            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-4">
                Monthly Incentives Trend
              </h3>
              <TrendChart
                data={monthlyTrends.map((t) => ({
                  label: getMonthName(t.month).slice(0, 3),
                  value: t.totalIncentives,
                }))}
                height={250}
                valueFormatter={(v) => formatCurrency(v)}
              />
            </div>
          </div>

          {/* Performance Heatmap (simplified as a table) */}
          <div className="bg-white rounded-lg border border-surface-200 p-4">
            <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-4">
              Monthly Performance Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">Month</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">Drivers</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">Total KM</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">Incentives</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {monthlyTrends.map((trend, index) => {
                    const prevTrend = monthlyTrends[index - 1];
                    const kmChange = prevTrend ? ((trend.totalKm - prevTrend.totalKm) / (prevTrend.totalKm || 1)) * 100 : 0;
                    return (
                      <tr key={`${trend.year}-${trend.month}`} className="hover:bg-surface-50">
                        <td className="px-3 py-2.5 text-sm font-medium text-surface-900">
                          {getMonthName(trend.month)} {trend.year}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-right text-surface-700">
                          {trend.driverCount}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-right font-mono text-surface-900">
                          {formatNumber(trend.totalKm)}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-right font-mono text-green-600">
                          {formatCurrency(trend.totalIncentives)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {index > 0 && (
                            <span className={`text-xs font-medium ${kmChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {kmChange >= 0 ? "+" : ""}{kmChange.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Comparison View */}
      {viewMode === "comparison" && (
        <>
          {/* YoY Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">YoY KM Change</p>
              <p className={`text-2xl font-bold mt-1 ${yoyComparison.kmChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                {yoyComparison.kmChangePercent >= 0 ? "+" : ""}{yoyComparison.kmChangePercent.toFixed(1)}%
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {formatCompactNumber(Math.abs(yoyComparison.kmChange))} km {yoyComparison.kmChange >= 0 ? "increase" : "decrease"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">YoY Incentive Change</p>
              <p className={`text-2xl font-bold mt-1 ${yoyComparison.incentiveChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                {yoyComparison.incentiveChangePercent >= 0 ? "+" : ""}{yoyComparison.incentiveChangePercent.toFixed(1)}%
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {formatCurrency(Math.abs(yoyComparison.incentiveChange))} {yoyComparison.incentiveChange >= 0 ? "increase" : "decrease"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Current Year Total</p>
              <p className="text-2xl font-bold text-surface-900 mt-1">
                {formatCompactNumber(currentYearPerf.reduce((sum, p) => sum + p.actual_kilometers, 0))}
              </p>
              <p className="text-xs text-surface-500 mt-1">kilometers in {selectedYear}</p>
            </div>
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Previous Year Total</p>
              <p className="text-2xl font-bold text-surface-900 mt-1">
                {formatCompactNumber(previousYearPerf.reduce((sum, p) => sum + p.actual_kilometers, 0))}
              </p>
              <p className="text-xs text-surface-500 mt-1">kilometers in {selectedYear - 1}</p>
            </div>
          </div>

          {/* Year Comparison Chart */}
          <div className="bg-white rounded-lg border border-surface-200 p-4">
            <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-4">
              {selectedYear} vs {selectedYear - 1} Monthly Comparison
            </h3>
            <ComparisonBarChart data={monthlyComparisonData} height={300} />
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-white rounded-lg border border-surface-200 p-4">
            <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-4">
              Month-by-Month Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">Month</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">{selectedYear - 1}</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">{selectedYear}</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">Change</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {monthlyComparisonData.map((item) => {
                    const change = item.current - item.previous;
                    const changePercent = item.previous > 0 ? (change / item.previous) * 100 : 0;
                    return (
                      <tr key={item.label} className="hover:bg-surface-50">
                        <td className="px-3 py-2.5 text-sm font-medium text-surface-900">{item.label}</td>
                        <td className="px-3 py-2.5 text-sm text-right font-mono text-surface-600">
                          {formatNumber(item.previous)}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-right font-mono text-surface-900">
                          {formatNumber(item.current)}
                        </td>
                        <td className={`px-3 py-2.5 text-sm text-right font-mono ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {change >= 0 ? "+" : ""}{formatNumber(change)}
                        </td>
                        <td className={`px-3 py-2.5 text-sm text-right font-medium ${changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {item.previous > 0 ? `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-50 border-t border-surface-200">
                    <td className="px-3 py-2.5 text-sm font-semibold text-surface-900">Total</td>
                    <td className="px-3 py-2.5 text-sm text-right font-mono font-semibold text-surface-600">
                      {formatNumber(monthlyComparisonData.reduce((sum, d) => sum + d.previous, 0))}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right font-mono font-semibold text-surface-900">
                      {formatNumber(monthlyComparisonData.reduce((sum, d) => sum + d.current, 0))}
                    </td>
                    <td className={`px-3 py-2.5 text-sm text-right font-mono font-semibold ${yoyComparison.kmChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {yoyComparison.kmChange >= 0 ? "+" : ""}{formatNumber(yoyComparison.kmChange)}
                    </td>
                    <td className={`px-3 py-2.5 text-sm text-right font-semibold ${yoyComparison.kmChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {yoyComparison.kmChangePercent >= 0 ? "+" : ""}{yoyComparison.kmChangePercent.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
