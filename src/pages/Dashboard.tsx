import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import
  {
    formatCurrency,
    formatNumber,
    getMonthName,
  } from "../utils/formatters";

export default function Dashboard() {
  const {
    drivers,
    incentiveCalculations,
    driverPerformance,
    kilometerRates,
    selectedYear,
    selectedMonth,
  } = useStore();

  const activeDrivers = drivers.filter((d) => d.status === "active");
  const localDrivers = activeDrivers.filter((d) => d.driver_type === "local");
  const exportDrivers = activeDrivers.filter((d) => d.driver_type === "export");

  // Get current month performance
  const currentPerformance = driverPerformance.filter(
    (p) => p.year === selectedYear && p.month === selectedMonth,
  );

  const totalKilometers = currentPerformance.reduce(
    (sum, p) => sum + p.actual_kilometers,
    0,
  );
  const totalTrips = currentPerformance.reduce(
    (sum, p) => sum + p.trips_completed,
    0,
  );

  // Get current month calculations
  const currentCalculations = incentiveCalculations.filter(
    (c) => c.year === selectedYear && c.month === selectedMonth,
  );

  const totalIncentives = currentCalculations.reduce(
    (sum, c) => sum + c.total_incentive,
    0,
  );
  const totalEarnings = currentCalculations.reduce(
    (sum, c) => sum + c.total_earnings,
    0,
  );

  // Get current rates
  const localRate = kilometerRates.find(
    (r) => r.driver_type === "local" && r.is_active,
  );
  const exportRate = kilometerRates.find(
    (r) => r.driver_type === "export" && r.is_active,
  );

  // Top performers
  const topPerformers = [...currentPerformance]
    .sort((a, b) => b.actual_kilometers - a.actual_kilometers)
    .slice(0, 5)
    .map((p) => {
      const driver = drivers.find((d) => d.id === p.driver_id);
      return { ...p, driver };
    });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Dashboard</h1>
          <p className="text-surface-500 text-sm mt-0.5">
            Overview for {getMonthName(selectedMonth)} {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-surface-200">
          <select
            className="form-select border-0 bg-transparent focus:ring-0 py-1.5 pr-8 pl-2 text-sm"
            value={selectedMonth}
            onChange={(e) =>
              useStore
                .getState()
                .setSelectedPeriod(selectedYear, parseInt(e.target.value))
            }
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {getMonthName(i + 1)}
              </option>
            ))}
          </select>
          <div className="w-px h-5 bg-surface-200" />
          <select
            className="form-select border-0 bg-transparent focus:ring-0 py-1.5 pr-8 pl-2 text-sm"
            value={selectedYear}
            onChange={(e) =>
              useStore
                .getState()
                .setSelectedPeriod(parseInt(e.target.value), selectedMonth)
            }
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-label">Active Drivers</p>
          <p className="stat-value mt-2">{activeDrivers.length}</p>
          <div className="mt-4 pt-3 border-t border-surface-100 flex items-center gap-3 text-xs text-surface-500">
            <span>{localDrivers.length} Local</span>
            <span>{exportDrivers.length} Export</span>
          </div>
        </div>

        <div className="stat-card">
          <p className="stat-label">Total Kilometers</p>
          <p className="stat-value mt-2">{formatNumber(totalKilometers)}</p>
          <div className="mt-4 pt-3 border-t border-surface-100 text-xs text-surface-500">
            {formatNumber(totalTrips)} trips this month
          </div>
        </div>

        <div className="stat-card">
          <p className="stat-label">Total Incentives</p>
          <p className="stat-value mt-2">{formatCurrency(totalIncentives)}</p>
          <div className="mt-4 pt-3 border-t border-surface-100 text-xs text-surface-500">
            {formatCurrency(totalEarnings)} total earnings
          </div>
        </div>

        <div className="stat-card">
          <p className="stat-label">Current Rates</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] text-surface-400 uppercase tracking-wider">Local</p>
              <p className="text-lg font-semibold text-surface-900">
                {formatCurrency(localRate?.rate_per_km || 0)}<span className="text-xs font-normal text-surface-400">/km</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-surface-400 uppercase tracking-wider">Export</p>
              <p className="text-lg font-semibold text-surface-900">
                {formatCurrency(exportRate?.rate_per_km || 0)}<span className="text-xs font-normal text-surface-400">/km</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Performers */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-surface-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-surface-900">Top Performers</h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Highest kilometers this month
                </p>
              </div>
              <Link
                to="/performance"
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-surface-100">
            {topPerformers.length > 0 ? (
              topPerformers.map((item, index) => (
                <Link
                  key={item.id}
                  to={`/drivers/${item.driver_id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors"
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium ${
                    index === 0 
                      ? 'bg-surface-900 text-white' 
                      : index === 1 
                      ? 'bg-surface-600 text-white' 
                      : index === 2 
                      ? 'bg-surface-400 text-white'
                      : 'bg-surface-100 text-surface-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-xs font-medium text-primary-700">
                    {item.driver?.first_name?.charAt(0)}
                    {item.driver?.last_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">
                      {item.driver?.first_name} {item.driver?.last_name}
                    </p>
                    <p className="text-xs text-surface-500">
                      {item.driver?.employee_id} · {item.driver?.driver_type === "local" ? "Local" : "Export"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-surface-900 tabular-nums">
                      {formatNumber(item.actual_kilometers)} km
                    </p>
                    <p className="text-xs text-surface-500">
                      {item.trips_completed} trips
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-surface-500">No performance data for this period</p>
                <p className="text-xs text-surface-400 mt-1">Data will appear once drivers log their kilometers</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-surface-200 p-4">
            <h2 className="text-sm font-semibold text-surface-900 mb-3">Quick Actions</h2>
            <div className="space-y-1">
              <Link
                to="/drivers"
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-surface-50 transition-colors"
              >
                <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-900">Manage Drivers</p>
                  <p className="text-xs text-surface-500">Add or edit profiles</p>
                </div>
              </Link>
              <Link
                to="/master-sheet"
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-surface-50 transition-colors"
              >
                <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-900">Master Sheet</p>
                  <p className="text-xs text-surface-500">Rates and budgets</p>
                </div>
              </Link>
              <Link
                to="/performance"
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-surface-50 transition-colors"
              >
                <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-900">Performance</p>
                  <p className="text-xs text-surface-500">Track metrics</p>
                </div>
              </Link>
              <Link
                to="/comparison"
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-surface-50 transition-colors"
              >
                <div className="w-8 h-8 rounded bg-purple-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-900">Year Comparison</p>
                  <p className="text-xs text-surface-500">Compare 2025 vs 2026</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Driver Distribution */}
          <div className="bg-white rounded-lg border border-surface-200 p-4">
            <h2 className="text-sm font-semibold text-surface-900 mb-3">Driver Distribution</h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-surface-600">Local Drivers</span>
                  <span className="font-medium text-surface-900">{localDrivers.length}</span>
                </div>
                <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${(localDrivers.length / activeDrivers.length) * 100 || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-surface-600">Export Drivers</span>
                  <span className="font-medium text-surface-900">{exportDrivers.length}</span>
                </div>
                <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(exportDrivers.length / activeDrivers.length) * 100 || 0}%` }}
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-surface-100 flex items-center justify-between">
                <span className="text-xs text-surface-500">Total Active</span>
                <span className="text-lg font-semibold text-surface-900">{activeDrivers.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
