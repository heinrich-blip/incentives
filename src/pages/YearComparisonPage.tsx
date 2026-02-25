import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import
    {
        Bar,
        BarChart,
        CartesianGrid,
        Legend,
        Line,
        LineChart,
        ResponsiveContainer,
        Tooltip,
        XAxis,
        YAxis,
    } from 'recharts';
import { useStore } from "../store/useStore";
import type { Driver, DriverPerformance } from "../types/database";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import
    {
        formatCurrency,
        formatNumber,
        formatPercentage,
        generateInitials,
        getMonthName,
        getMonthShortName,
    } from "../utils/formatters";

interface DriverYearData {
  driver: Driver;
  year2025: {
    totalKm: number;
    totalIncentive: number;
    avgAchievement: number;
    monthlyData: (DriverPerformance | null)[];
  };
  year2026: {
    totalKm: number;
    totalIncentive: number;
    avgAchievement: number;
    monthlyData: (DriverPerformance | null)[];
  };
  kmChange: number;
  kmChangePercent: number;
}

export default function YearComparisonPage() {
  const {
    drivers,
    driverPerformance,
    monthlyBudgets,
    incentiveCalculations,
  } = useStore();

  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "local" | "export">("all");
  const [sortBy, setSortBy] = useState<keyof Pick<DriverYearData, 'kmChange' | 'kmChangePercent'> | 'totalKm2025' | 'totalKm2026' | 'avgAchievement2025' | 'avgAchievement2026'>('kmChange');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [exportYear, setExportYear] = useState<number>(2026);

  // Export handlers
  const handleExportPDF = (year: number) => {
    exportToPDF({
      year,
      drivers,
      performance: driverPerformance,
      calculations: incentiveCalculations,
      companyName: "Driver Incentives",
      typeFilter,
    });
  };

  const handleExportExcel = (year: number) => {
    exportToExcel({
      year,
      drivers,
      performance: driverPerformance,
      calculations: incentiveCalculations,
      companyName: "Driver Incentives",
      typeFilter,
    });
  };

  const activeDrivers = useMemo(() => {
    return drivers.filter(
      (d) =>
        d.status === "active" &&
        (typeFilter === "all" || d.driver_type === typeFilter)
    );
  }, [drivers, typeFilter]);

  const comparisonData = useMemo(() => {
    return activeDrivers.map((driver): DriverYearData => {
      // Get 2025 data
      const perf2025 = driverPerformance.filter(
        (p) => p.driver_id === driver.id && p.year === 2025
      );
      const calc2025 = incentiveCalculations.filter(
        (c) => c.driver_id === driver.id && c.year === 2025
      );

      // Get 2026 data
      const perf2026 = driverPerformance.filter(
        (p) => p.driver_id === driver.id && p.year === 2026
      );
      const calc2026 = incentiveCalculations.filter(
        (c) => c.driver_id === driver.id && c.year === 2026
      );

      // Build monthly data arrays (null for missing months)
      const monthly2025: (DriverPerformance | null)[] = Array(12)
        .fill(null)
        .map((_, i) => perf2025.find((p) => p.month === i + 1) || null);

      const monthly2026: (DriverPerformance | null)[] = Array(12)
        .fill(null)
        .map((_, i) => perf2026.find((p) => p.month === i + 1) || null);

      // Calculate totals for selected period
      const getFilteredData = (perf: DriverPerformance[], calc: typeof calc2025) => {
        const filteredPerf =
          selectedMonth === "all"
            ? perf
            : perf.filter((p) => p.month === selectedMonth);
        const filteredCalc =
          selectedMonth === "all"
            ? calc
            : calc.filter((c) => c.month === selectedMonth);

        const totalKm = filteredPerf.reduce((sum, p) => sum + p.actual_kilometers, 0);
        const totalIncentive = filteredCalc.reduce((sum, c) => sum + c.total_incentive, 0);

        // Calculate average achievement against budget
        let avgAchievement = 0;
        if (filteredPerf.length > 0) {
          const achievements = filteredPerf.map((p) => {
            const budget = monthlyBudgets.find(
              (b) =>
                b.year === p.year &&
                b.month === p.month &&
                b.driver_type === driver.driver_type
            );
            const target = budget?.budgeted_kilometers || 0;
            const truckCount = budget?.truck_count || 1;
            const targetPerDriver = target / truckCount;
            return targetPerDriver > 0
              ? (p.actual_kilometers / targetPerDriver) * 100
              : 0;
          });
          avgAchievement =
            achievements.reduce((a, b) => a + b, 0) / achievements.length;
        }

        return { totalKm, totalIncentive, avgAchievement };
      };

      const data2025 = getFilteredData(perf2025, calc2025);
      const data2026 = getFilteredData(perf2026, calc2026);

      const kmChange = data2026.totalKm - data2025.totalKm;
      const kmChangePercent =
        data2025.totalKm > 0 ? (kmChange / data2025.totalKm) * 100 : 0;

      return {
        driver,
        year2025: {
          ...data2025,
          monthlyData: monthly2025,
        },
        year2026: {
          ...data2026,
          monthlyData: monthly2026,
        },
        kmChange,
        kmChangePercent,
      };
    });
  }, [
    activeDrivers,
    driverPerformance,
    incentiveCalculations,
    monthlyBudgets,
    selectedMonth,
  ]);

  // Calculate totals
  const totals = useMemo(() => {
    const total2025Km = comparisonData.reduce(
      (sum, d) => sum + d.year2025.totalKm,
      0
    );
    const total2026Km = comparisonData.reduce(
      (sum, d) => sum + d.year2026.totalKm,
      0
    );
    const total2025Incentive = comparisonData.reduce(
      (sum, d) => sum + d.year2025.totalIncentive,
      0
    );
    const total2026Incentive = comparisonData.reduce(
      (sum, d) => sum + d.year2026.totalIncentive,
      0
    );

    const kmChange = total2026Km - total2025Km;
    const kmChangePercent =
      total2025Km > 0 ? (kmChange / total2025Km) * 100 : 0;

    return {
      total2025Km,
      total2026Km,
      total2025Incentive,
      total2026Incentive,
      kmChange,
      kmChangePercent,
    };
  }, [comparisonData]);

  // Monthly aggregates for chart
  const monthlyAggregates = useMemo(() => {
    if (selectedMonth !== 'all') return [];
    const months = Array(12).fill(0).map((_, i) => i + 1);
    return months.map(month => {
      let km2025 = 0;
      let km2026 = 0;
      comparisonData.forEach(d => {
        const m2025 = d.year2025.monthlyData[month - 1];
        const m2026 = d.year2026.monthlyData[month - 1];
        if (m2025) km2025 += m2025.actual_kilometers;
        if (m2026) km2026 += m2026.actual_kilometers;
      });
      return {
        month: getMonthShortName(month),
        '2025': km2025,
        '2026': km2026,
      };
    });
  }, [comparisonData, selectedMonth]);

  // Year totals for bar chart
  const yearTotalsData = useMemo(() => [
    { year: '2025', km: totals.total2025Km },
    { year: '2026', km: totals.total2026Km },
  ], [totals]);

  // Sorted data for table
  const sortedData = useMemo(() => {
    return [...comparisonData].sort((a, b) => {
      let valA: number, valB: number;
      switch (sortBy) {
        case 'totalKm2025':
          valA = a.year2025.totalKm;
          valB = b.year2025.totalKm;
          break;
        case 'totalKm2026':
          valA = a.year2026.totalKm;
          valB = b.year2026.totalKm;
          break;
        case 'kmChange':
          valA = a.kmChange;
          valB = b.kmChange;
          break;
        case 'kmChangePercent':
          valA = a.kmChangePercent;
          valB = b.kmChangePercent;
          break;
        case 'avgAchievement2025':
          valA = a.year2025.avgAchievement;
          valB = b.year2025.avgAchievement;
          break;
        case 'avgAchievement2026':
          valA = a.year2026.avgAchievement;
          valB = b.year2026.avgAchievement;
          break;
        default:
          valA = a.kmChange;
          valB = b.kmChange;
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [comparisonData, sortBy, sortDir]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return null;
    return sortDir === 'asc' ? '↑' : '↓';
  };

  const toggleExpand = (id: string) => {
    setExpandedDrivers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getDriverMonthlyData = (data: DriverYearData) => {
    return Array(12)
      .fill(0)
      .map((_, i) => {
        const m2025 = data.year2025.monthlyData[i]?.actual_kilometers || 0;
        const m2026 = data.year2026.monthlyData[i]?.actual_kilometers || 0;
        return {
          month: getMonthShortName(i + 1),
          '2025': m2025,
          '2026': m2026,
        };
      });
  };

  const isAllMonths = selectedMonth === 'all';
  const tableColSpan = isAllMonths ? 10 : 9;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Year-over-Year Comparison
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyze driver performance trends between 2025 and 2026
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-8"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(
                  e.target.value === "all" ? "all" : parseInt(e.target.value)
                )
              }
            >
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-8"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "all" | "local" | "export")
              }
            >
              <option value="all">All Types</option>
              <option value="local">Local</option>
              <option value="export">Export</option>
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">Select Year</p>
              </div>
              <div className="p-2 border-b border-gray-100">
                <select 
                  className="w-full form-select text-sm py-1.5" 
                  value={exportYear}
                  onChange={(e) => setExportYear(parseInt(e.target.value))}
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => handleExportPDF(exportYear)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                    <path d="M8.5 13h1.25v2.5h-.75v-1.75h-.5v-.75zm3.75.875c0-.345-.17-.625-.5-.625-.33 0-.5.28-.5.625s.17.625.5.625c.33 0 .5-.28.5-.625zm.75 0c0 .69-.56 1.375-1.25 1.375S10.5 14.565 10.5 13.875s.56-1.375 1.25-1.375 1.25.685 1.25 1.375zm1.25-.375h.5v-.75h-.5v.75zm1.25-.75v2.5h-.75v-2.5h-.25v-.75h.25v-.5h.75v.5h.25v.75h-.25z"/>
                  </svg>
                  Export to PDF
                </button>
                <button
                  onClick={() => handleExportExcel(exportYear)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                    <path d="M8 13l1.5 2.25L11 13h1l-2 3 2 3h-1l-1.5-2.25L8 19H7l2-3-2-3h1z"/>
                  </svg>
                  Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">2025 Total KM</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totals.total2025Km)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-600">25</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {formatCurrency(totals.total2025Incentive)} in incentives
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">2026 Total KM</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totals.total2026Km)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-600">26</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {formatCurrency(totals.total2026Incentive)} in incentives
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">KM Change</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  totals.kmChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {totals.kmChange >= 0 ? "+" : ""}
                {formatNumber(totals.kmChange)}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-full ${
                totals.kmChange >= 0 ? "bg-green-50" : "bg-red-50"
              } flex items-center justify-center`}
            >
              <svg
                className={`w-5 h-5 ${
                  totals.kmChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    totals.kmChange >= 0
                      ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  }
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {totals.kmChangePercent >= 0 ? "+" : ""}
            {formatPercentage(totals.kmChangePercent)} year-over-year
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Drivers Compared</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{comparisonData.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {selectedMonth === "all" ? "Full year" : getMonthName(selectedMonth)}
          </p>
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
            Total KM Comparison
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearTotalsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="km" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {selectedMonth === 'all' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Monthly KM Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyAggregates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="2025" stroke="#6b7280" />
                <Line type="monotone" dataKey="2026" stroke="#3b82f6" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Driver Performance Comparison
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('totalKm2025')}
                >
                  2025 KM {getSortIcon('totalKm2025')}
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('totalKm2026')}
                >
                  2026 KM {getSortIcon('totalKm2026')}
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('kmChange')}
                >
                  Change {getSortIcon('kmChange')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">2025 Incentive</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">2026 Incentive</th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('avgAchievement2025')}
                >
                  2025 Avg % {getSortIcon('avgAchievement2025')}
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('avgAchievement2026')}
                >
                  2026 Avg % {getSortIcon('avgAchievement2026')}
                </th>
                {isAllMonths && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((data) => (
                <>
                  <tr key={data.driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/drivers/${data.driver.id}`}
                        className="flex items-center gap-3 text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-medium">
                          {generateInitials(
                            data.driver.first_name,
                            data.driver.last_name
                          )}
                        </div>
                        {data.driver.first_name} {data.driver.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          data.driver.driver_type === "export"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {data.driver.driver_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-900">
                      {formatNumber(data.year2025.totalKm)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-900">
                      {formatNumber(data.year2026.totalKm)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-mono text-sm ${
                          data.kmChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {data.kmChange >= 0 ? "+" : ""}
                        {formatNumber(data.kmChange)}
                        <span className="text-xs ml-1 text-gray-500">
                          ({data.kmChangePercent >= 0 ? "+" : ""}
                          {data.kmChangePercent.toFixed(1)}%)
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-900">
                      {formatCurrency(data.year2025.totalIncentive)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-900">
                      {formatCurrency(data.year2026.totalIncentive)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          data.year2025.avgAchievement >= 100
                            ? "bg-green-100 text-green-800"
                            : data.year2025.avgAchievement >= 90
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formatPercentage(data.year2025.avgAchievement)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          data.year2026.avgAchievement >= 100
                            ? "bg-green-100 text-green-800"
                            : data.year2026.avgAchievement >= 90
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formatPercentage(data.year2026.avgAchievement)}
                      </span>
                    </td>
                    {isAllMonths && (
                      <td className="px-6 py-4 text-center">
                        <button
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          onClick={() => toggleExpand(data.driver.id.toString())}
                        >
                          {expandedDrivers.has(data.driver.id.toString()) ? 'Hide Chart' : 'Show Chart'}
                        </button>
                      </td>
                    )}
                  </tr>
                  {isAllMonths && expandedDrivers.has(data.driver.id.toString()) && (
                    <tr>
                      <td colSpan={tableColSpan} className="p-4 bg-gray-50">
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={getDriverMonthlyData(data)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="2025" stroke="#6b7280" />
                            <Line type="monotone" dataKey="2026" stroke="#3b82f6" activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm text-gray-900">
                  {formatNumber(totals.total2025Km)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm text-gray-900">
                  {formatNumber(totals.total2026Km)}
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`font-mono text-sm ${
                      totals.kmChange >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {totals.kmChange >= 0 ? "+" : ""}
                    {formatNumber(totals.kmChange)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm text-gray-900">
                  {formatCurrency(totals.total2025Incentive)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm text-gray-900">
                  {formatCurrency(totals.total2026Incentive)}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-500">-</td>
                <td className="px-6 py-4 text-center text-sm text-gray-500">-</td>
                {isAllMonths && (
                  <td className="px-6 py-4"></td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {selectedMonth === "all" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Monthly KM Breakdown by Driver
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              2025 values shown in parentheses for comparison
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 z-10">
                    Driver
                  </th>
                  {Array.from({ length: 12 }, (_, i) => (
                    <th
                      key={i}
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {getMonthShortName(i + 1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedData.map((data) => (
                  <tr key={data.driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 px-6 py-4 bg-white z-10 text-sm font-medium text-gray-900">
                      {data.driver.first_name} {data.driver.last_name[0]}.
                    </td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const perf2025 = data.year2025.monthlyData[i];
                      const perf2026 = data.year2026.monthlyData[i];
                      return (
                        <td
                          key={i}
                          className="px-6 py-4 text-center font-mono text-sm"
                        >
                          <div className="text-gray-900">
                            {perf2026
                              ? formatNumber(perf2026.actual_kilometers)
                              : "-"}
                          </div>
                          <div className="text-gray-400 text-xs">
                            ({perf2025
                              ? formatNumber(perf2025.actual_kilometers)
                              : "-"})
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}