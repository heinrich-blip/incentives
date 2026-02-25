import { FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import
  {
    Area,
    AreaChart,
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
  } from "recharts";
import AddMonthlySalaryModal from "../components/AddMonthlySalaryModal";
import AddPerformanceModal from "../components/AddPerformanceModal";
import AddRecordModal from "../components/AddRecordModal";
import EditDriverModal from "../components/EditDriverModal";
import { useDriverRecords } from "../hooks/useRealtimeData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import
  {
    captureAllCharts,
    DriverEarningsExportData,
    exportDriverEarningsToPDF,
  } from "../utils/exportUtils";
import
  {
    calculateAchievementPercentage,
    formatCurrency,
    formatDate,
    formatNumber,
    formatPercentage,
    generateInitials,
    getAchievementColor,
    getDisciplinaryTypeLabel,
    getIncidentTypeLabel,
    getLeaveTypeLabel,
    getMonthName,
    getSeverityColor,
    getStatusColor,
  } from "../utils/formatters";

type TabId = "overview" | "performance" | "records" | "incentives" | "earnings";

export default function DriverProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    drivers,
    driverPerformance,
    incentiveCalculations,
    monthlyBudgets,
    kilometerRates,
    zigUsdConversionRates,
    driverSalaryHistory,
    incentiveSettings,
    showToast,
  } = useStore();
  const {
    accidents,
    incidents,
    disciplinaryRecords,
    leaveRecords,
    loading: recordsLoading,
  } = useDriverRecords(id);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState<string | null>(
    null,
  );
  const [showAddPerformanceModal, setShowAddPerformanceModal] = useState(false);
  const [showMonthlySalaryModal, setShowMonthlySalaryModal] = useState(false);
  const [editingSalaryEntry, setEditingSalaryEntry] = useState<{
    id: string;
    year: number;
    month: number;
    usd_base_salary: number;
    zig_base_salary: number;
    notes: string | null;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedEarningsYear, setSelectedEarningsYear] = useState<number>(new Date().getFullYear());
  const [selectedIncentivesYear, setSelectedIncentivesYear] = useState<number>(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);

  const driver = drivers.find((d) => d.id === id);
  const performance = driverPerformance
    .filter((p) => p.driver_id === id)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  const calculations = incentiveCalculations
    .filter((c) => c.driver_id === id)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

  // Get current month's ZIG-USD conversion rate
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Fuel bonus configuration
  interface FuelEfficiencyTier {
    min_efficiency: number;
    max_efficiency: number;
    bonus_amount: number;
  }

  interface FuelBonusConfig {
    enabled: boolean;
    tiers: FuelEfficiencyTier[];
  }

  const DEFAULT_LOCAL_FUEL_TIERS: FuelBonusConfig = {
    enabled: true,
    tiers: [
      { min_efficiency: 2.5, max_efficiency: 3.0, bonus_amount: 50 },
      { min_efficiency: 3.0, max_efficiency: 3.5, bonus_amount: 75 },
      { min_efficiency: 3.5, max_efficiency: 100, bonus_amount: 100 },
    ],
  };

  const DEFAULT_EXPORT_FUEL_TIERS: FuelBonusConfig = {
    enabled: true,
    tiers: [
      { min_efficiency: 2.0, max_efficiency: 2.5, bonus_amount: 50 },
      { min_efficiency: 2.5, max_efficiency: 3.0, bonus_amount: 75 },
      { min_efficiency: 3.0, max_efficiency: 100, bonus_amount: 100 },
    ],
  };

  const localFuelConfig = useMemo(() => {
    const setting = incentiveSettings.find(
      (s) => s.setting_key === "fuel_efficiency_bonus_local"
    );
    if (!setting?.setting_value) return DEFAULT_LOCAL_FUEL_TIERS;
    try {
      const config = JSON.parse(setting.setting_value as string) as FuelBonusConfig;
      if (!config.tiers || !Array.isArray(config.tiers)) {
        return DEFAULT_LOCAL_FUEL_TIERS;
      }
      return config;
    } catch {
      return DEFAULT_LOCAL_FUEL_TIERS;
    }
  }, [incentiveSettings]);

  const exportFuelConfig = useMemo(() => {
    const setting = incentiveSettings.find(
      (s) => s.setting_key === "fuel_efficiency_bonus_export"
    );
    if (!setting?.setting_value) return DEFAULT_EXPORT_FUEL_TIERS;
    try {
      const config = JSON.parse(setting.setting_value as string) as FuelBonusConfig;
      if (!config.tiers || !Array.isArray(config.tiers)) {
        return DEFAULT_EXPORT_FUEL_TIERS;
      }
      return config;
    } catch {
      return DEFAULT_EXPORT_FUEL_TIERS;
    }
  }, [incentiveSettings]);
  
  const currentConversionRateObj = useMemo(() => {
    return zigUsdConversionRates.find(
      (r) => r.year === currentYear && r.month === currentMonth
    ) || null;
  }, [zigUsdConversionRates, currentYear, currentMonth]);

  const currentConversionRate = currentConversionRateObj?.rate || 1;

  // Get the latest salary entry for this driver from salary history
  const latestSalaryEntry = useMemo(() => {
    if (!driver) return null;
    const driverSalaries = driverSalaryHistory
      .filter(s => s.driver_id === driver.id)
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });
    return driverSalaries.length > 0 ? driverSalaries[0] : null;
  }, [driverSalaryHistory, driver]);

  // Calculate ZIG to USD conversion using latest salary entry
  const zigInUsd = useMemo(() => {
    const zigSalary = latestSalaryEntry?.zig_base_salary || 0;
    if (!zigSalary || currentConversionRate <= 0) return 0;
    return zigSalary / currentConversionRate;
  }, [latestSalaryEntry, currentConversionRate]);

  // Calculate total USD salary using latest salary entry
  const totalUsdSalary = (latestSalaryEntry?.usd_base_salary || 0) + zigInUsd;

  // Helper to calculate fuel bonus
  const calculateFuelBonus = (fuelEfficiency: number | null, driverType: string): number => {
    if (!fuelEfficiency) return 0;
    const config = driverType === "export" ? exportFuelConfig : localFuelConfig;
    if (!config.enabled) return 0;
    const matchingTier = config.tiers.find(
      (tier: FuelEfficiencyTier) => fuelEfficiency >= tier.min_efficiency && fuelEfficiency < tier.max_efficiency
    );
    return matchingTier?.bonus_amount || 0;
  };

  // Get available years from salary history, performance, and calculations
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    
    // Add current year always
    yearsSet.add(currentYear);
    
    // From salary history
    driverSalaryHistory
      .filter(s => s.driver_id === id)
      .forEach(s => yearsSet.add(s.year));
    
    // From performance
    driverPerformance
      .filter(p => p.driver_id === id)
      .forEach(p => yearsSet.add(p.year));
    
    // From calculations
    incentiveCalculations
      .filter(c => c.driver_id === id)
      .forEach(c => yearsSet.add(c.year));
    
    return Array.from(yearsSet).sort((a, b) => b - a); // Descending order
  }, [driverSalaryHistory, driverPerformance, incentiveCalculations, id, currentYear]);

  // Monthly earnings for selected year (all 12 months)
  const monthlyEarnings = useMemo(() => {
    if (!driver) return [];
    
    const earnings: Array<{
      year: number;
      month: number;
      usdBaseSalary: number;
      zigBaseSalary: number;
      conversionRate: number;
      zigInUsd: number;
      totalBaseSalary: number;
      kmIncentive: number;
      fuelBonus: number;
      performanceBonus: number;
      safetyBonus: number;
      deductions: number;
      totalIncentive: number;
      totalEarnings: number;
      actualKm: number;
      fuelEfficiency: number | null;
      hasCalculation: boolean;
    }> = [];

    // Get all 12 months for the selected year
    for (let month = 1; month <= 12; month++) {
      const year = selectedEarningsYear;

      // Get conversion rate for this month
      const rateRecord = zigUsdConversionRates.find(
        (r) => r.year === year && r.month === month
      );
      const convRate = rateRecord?.rate || 1;

      // Get salary history for this month (or fall back to current)
      const salaryRecord = driverSalaryHistory.find(
        (s) => s.driver_id === driver.id && s.year === year && s.month === month
      );
      
      // If no exact match, find most recent salary before this month
      let usdSalary = driver.usd_base_salary || 0;
      let zigSalary = driver.zig_base_salary || 0;
      
      if (salaryRecord) {
        usdSalary = salaryRecord.usd_base_salary;
        zigSalary = salaryRecord.zig_base_salary;
      } else {
        const previousSalaries = driverSalaryHistory
          .filter(
            (s) =>
              s.driver_id === driver.id &&
              (s.year < year || (s.year === year && s.month < month))
          )
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          });
        if (previousSalaries.length > 0) {
          usdSalary = previousSalaries[0].usd_base_salary;
          zigSalary = previousSalaries[0].zig_base_salary;
        }
      }

      const zigConverted = convRate > 0 ? zigSalary / convRate : 0;
      const totalBase = usdSalary + zigConverted;

      // Get calculation for this month
      const calc = calculations.find(
        (c) => c.year === year && c.month === month
      );

      // Get performance for this month
      const perf = performance.find(
        (p) => p.year === year && p.month === month
      );

      // Calculate incentives (always in USD)
      const kmIncentive = calc?.km_incentive || 0;
      const fuelBonus = calculateFuelBonus(perf?.fuel_efficiency || null, driver.driver_type);
      const performanceBonus = calc?.performance_bonus || 0;
      const safetyBonus = calc?.safety_bonus || 0;
      const deductions = calc?.deductions || 0;
      
      // Total = Base Salary + All Incentives (including fuel) - Deductions
      const totalEarnings = totalBase + kmIncentive + fuelBonus + performanceBonus + safetyBonus - deductions;

      earnings.push({
        year,
        month,
        usdBaseSalary: usdSalary,
        zigBaseSalary: zigSalary,
        conversionRate: convRate,
        zigInUsd: zigConverted,
        totalBaseSalary: totalBase,
        kmIncentive,
        fuelBonus,
        performanceBonus,
        safetyBonus,
        deductions,
        totalIncentive: kmIncentive + fuelBonus + performanceBonus + safetyBonus,
        totalEarnings,
        actualKm: perf?.actual_kilometers || 0,
        fuelEfficiency: perf?.fuel_efficiency || null,
        hasCalculation: !!calc,
      });
    }

    return earnings;
  }, [
    driver,
    calculations,
    performance,
    zigUsdConversionRates,
    driverSalaryHistory,
    selectedEarningsYear,
    localFuelConfig,
    exportFuelConfig,
  ]);

  // Filter incentive calculations by selected year
  const filteredCalculations = useMemo(() => {
    return calculations.filter(c => c.year === selectedIncentivesYear)
      .sort((a, b) => a.month - b.month);
  }, [calculations, selectedIncentivesYear]);

  // Year-over-year comparison data (compare selected year with previous year)
  const yearOverYearData = useMemo(() => {
    if (!driver) return [];
    
    const currentYearData = monthlyEarnings;
    const previousYear = selectedEarningsYear - 1;
    
    // Calculate previous year's earnings
    const prevYearEarnings: typeof monthlyEarnings = [];
    for (let month = 1; month <= 12; month++) {
      const rateRecord = zigUsdConversionRates.find(
        (r) => r.year === previousYear && r.month === month
      );
      const convRate = rateRecord?.rate || 1;
      
      const salaryRecord = driverSalaryHistory.find(
        (s) => s.driver_id === driver.id && s.year === previousYear && s.month === month
      );
      
      let usdSalary = driver.usd_base_salary || 0;
      let zigSalary = driver.zig_base_salary || 0;
      
      if (salaryRecord) {
        usdSalary = salaryRecord.usd_base_salary;
        zigSalary = salaryRecord.zig_base_salary;
      }
      
      const zigConverted = convRate > 0 ? zigSalary / convRate : 0;
      const totalBase = usdSalary + zigConverted;
      
      const calc = calculations.find(
        (c) => c.year === previousYear && c.month === month
      );
      const perf = performance.find(
        (p) => p.year === previousYear && p.month === month
      );
      
      const kmIncentive = calc?.km_incentive || 0;
      const fuelBonus = calculateFuelBonus(perf?.fuel_efficiency || null, driver.driver_type);
      const performanceBonus = calc?.performance_bonus || 0;
      const safetyBonus = calc?.safety_bonus || 0;
      const deductions = calc?.deductions || 0;
      
      const totalEarnings = totalBase + kmIncentive + fuelBonus + performanceBonus + safetyBonus - deductions;
      
      prevYearEarnings.push({
        year: previousYear,
        month,
        usdBaseSalary: usdSalary,
        zigBaseSalary: zigSalary,
        conversionRate: convRate,
        zigInUsd: zigConverted,
        totalBaseSalary: totalBase,
        kmIncentive,
        fuelBonus,
        performanceBonus,
        safetyBonus,
        deductions,
        totalIncentive: kmIncentive + fuelBonus + performanceBonus + safetyBonus,
        totalEarnings,
        actualKm: perf?.actual_kilometers || 0,
        fuelEfficiency: perf?.fuel_efficiency || null,
        hasCalculation: !!calc,
      });
    }
    
    // Combine into comparison data
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const current = currentYearData.find(e => e.month === month);
      const previous = prevYearEarnings.find(e => e.month === month);
      
      const currentTotal = current?.totalEarnings || 0;
      const previousTotal = previous?.totalEarnings || 0;
      const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
      
      return {
        month: getMonthName(month).substring(0, 3),
        currentYear: currentTotal,
        previousYear: previousTotal,
        growth: growth,
        currentIncentives: current?.totalIncentive || 0,
        previousIncentives: previous?.totalIncentive || 0,
      };
    });
  }, [driver, monthlyEarnings, selectedEarningsYear, zigUsdConversionRates, driverSalaryHistory, calculations, performance, localFuelConfig, exportFuelConfig]);

  // Cumulative earnings growth over time
  const cumulativeGrowthData = useMemo(() => {
    let cumulativeBase = 0;
    let cumulativeIncentives = 0;
    let cumulativeTotal = 0;
    
    return monthlyEarnings.map((e) => {
      cumulativeBase += e.totalBaseSalary;
      cumulativeIncentives += e.totalIncentive;
      cumulativeTotal += e.totalEarnings;
      
      const incentivePercentage = cumulativeTotal > 0 
        ? (cumulativeIncentives / cumulativeTotal) * 100 
        : 0;
      
      return {
        month: getMonthName(e.month).substring(0, 3),
        cumulativeBase,
        cumulativeIncentives,
        cumulativeTotal,
        incentivePercentage: Math.round(incentivePercentage * 10) / 10,
        monthlyBase: e.totalBaseSalary,
        monthlyIncentives: e.totalIncentive,
        monthlyTotal: e.totalEarnings,
      };
    });
  }, [monthlyEarnings]);

  // Incentive breakdown pie chart data
  const incentiveBreakdownData = useMemo(() => {
    const totals = monthlyEarnings.reduce(
      (acc, e) => ({
        kmIncentive: acc.kmIncentive + e.kmIncentive,
        fuelBonus: acc.fuelBonus + e.fuelBonus,
        performanceBonus: acc.performanceBonus + e.performanceBonus,
        safetyBonus: acc.safetyBonus + e.safetyBonus,
      }),
      { kmIncentive: 0, fuelBonus: 0, performanceBonus: 0, safetyBonus: 0 }
    );
    
    return [
      { name: 'KM Incentive', value: totals.kmIncentive, color: '#22c55e' },
      { name: 'Diesel Bonus', value: totals.fuelBonus, color: '#f97316' },
      { name: 'Performance', value: totals.performanceBonus, color: '#8b5cf6' },
      { name: 'Safety Bonus', value: totals.safetyBonus, color: '#06b6d4' },
    ].filter(item => item.value > 0);
  }, [monthlyEarnings]);

  // Annual summary data for all available years
  const annualSummaryData = useMemo(() => {
    if (!driver) return [];
    
    return availableYears.map((year) => {
      let totalBase = 0;
      let totalIncentives = 0;
      let totalEarnings = 0;
      
      for (let month = 1; month <= 12; month++) {
        const rateRecord = zigUsdConversionRates.find(
          (r) => r.year === year && r.month === month
        );
        const convRate = rateRecord?.rate || 1;
        
        const salaryRecord = driverSalaryHistory.find(
          (s) => s.driver_id === driver.id && s.year === year && s.month === month
        );
        
        let usdSalary = salaryRecord?.usd_base_salary || driver.usd_base_salary || 0;
        let zigSalary = salaryRecord?.zig_base_salary || driver.zig_base_salary || 0;
        
        const zigConverted = convRate > 0 ? zigSalary / convRate : 0;
        const base = usdSalary + zigConverted;
        
        const calc = calculations.find(
          (c) => c.year === year && c.month === month
        );
        const perf = performance.find(
          (p) => p.year === year && p.month === month
        );
        
        const kmIncentive = calc?.km_incentive || 0;
        const fuelBonus = calculateFuelBonus(perf?.fuel_efficiency || null, driver.driver_type);
        const performanceBonus = calc?.performance_bonus || 0;
        const safetyBonus = calc?.safety_bonus || 0;
        const deductions = calc?.deductions || 0;
        
        totalBase += base;
        totalIncentives += kmIncentive + fuelBonus + performanceBonus + safetyBonus;
        totalEarnings += base + kmIncentive + fuelBonus + performanceBonus + safetyBonus - deductions;
      }
      
      const incentivePercent = totalEarnings > 0 ? (totalIncentives / totalEarnings) * 100 : 0;
      
      return {
        year: year.toString(),
        baseSalary: totalBase,
        incentives: totalIncentives,
        totalEarnings,
        incentivePercent: Math.round(incentivePercent * 10) / 10,
      };
    }).sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [driver, availableYears, zigUsdConversionRates, driverSalaryHistory, calculations, performance, localFuelConfig, exportFuelConfig]);

  // Early return AFTER all hooks have been called
  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-lg bg-surface-100 flex items-center justify-center mb-3">
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-surface-900">
          Driver Not Found
        </h2>
        <p className="text-sm text-surface-500 mt-0.5">
          The driver you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/drivers" className="btn btn-primary mt-4">
          Back to Drivers
        </Link>
      </div>
    );
  }

  const currentRate = kilometerRates.find(
    (r) => r.driver_type === driver.driver_type && r.is_active,
  );

  // Calculate summary stats
  const totalKilometers = performance.reduce(
    (sum, p) => sum + p.actual_kilometers,
    0,
  );
  const totalTrips = performance.reduce((sum, p) => sum + p.trips_completed, 0);
  const totalIncentives = calculations.reduce(
    (sum, c) => sum + c.total_incentive,
    0,
  );
  const totalLeaveDays = leaveRecords
    .filter((l) => l.status === "approved")
    .reduce((sum, l) => sum + l.total_days, 0);

  // Export earnings report as PDF
  const handleExportEarnings = async (includeCharts: boolean = true) => {
    if (!driver) return;
    
    setIsExporting(true);
    showToast("Generating PDF report...");
    
    try {
      let chartImages: DriverEarningsExportData["chartImages"] = undefined;
      
      if (includeCharts) {
        // Capture charts if we're on the earnings tab
        chartImages = await captureAllCharts({
          earningsChart: "earnings-breakdown-chart",
          yearOverYearChart: "yoy-comparison-chart",
          cumulativeChart: "cumulative-growth-chart",
          pieChart: "incentive-pie-chart",
          annualChart: "annual-trend-chart",
        });
      }
      
      const exportData: DriverEarningsExportData = {
        driver,
        year: selectedEarningsYear,
        companyName: "Driver Incentives System",
        monthlyEarnings: monthlyEarnings.map(e => ({
          month: e.month,
          usdBaseSalary: e.usdBaseSalary,
          zigBaseSalary: e.zigBaseSalary,
          conversionRate: e.conversionRate,
          zigInUsd: e.zigInUsd,
          totalBaseSalary: e.totalBaseSalary,
          kmIncentive: e.kmIncentive,
          fuelBonus: e.fuelBonus,
          performanceBonus: e.performanceBonus,
          safetyBonus: e.safetyBonus,
          deductions: e.deductions,
          totalIncentive: e.totalIncentive,
          totalEarnings: e.totalEarnings,
        })),
        yearOverYearData: yearOverYearData.map(d => ({
          month: d.month,
          currentYear: d.currentYear,
          previousYear: d.previousYear,
          growth: d.growth,
        })),
        annualSummary: annualSummaryData.map(s => ({
          year: s.year,
          baseSalary: s.baseSalary,
          incentives: s.incentives,
          totalEarnings: s.totalEarnings,
          incentivePercent: s.incentivePercent,
        })),
        chartImages,
      };
      
      exportDriverEarningsToPDF(exportData);
      showToast("PDF report generated successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Failed to generate PDF report");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this driver? This action cannot be undone.",
      )
    )
      return;

    if (!isSupabaseConfigured()) {
      showToast("Cannot delete in demo mode");
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
      showToast("Driver deleted successfully");
      navigate("/drivers");
    } catch (error) {
      console.error("Error deleting driver:", error);
      showToast("Error deleting driver");
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "earnings", label: "Earnings" },
    { id: "performance", label: "Performance" },
    { id: "records", label: "Records" },
    { id: "incentives", label: "Incentives" },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-surface-500">
        <Link to="/drivers" className="hover:text-surface-700">
          Drivers
        </Link>
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-surface-900 font-medium">
          {driver.first_name} {driver.last_name}
        </span>
      </nav>

      {/* Profile Header */}
      <div className="bg-white rounded-lg border border-surface-200 p-4">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Avatar & Basic Info */}
          <div className="flex items-start gap-3 flex-1">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-lg font-semibold text-white">
              {generateInitials(driver.first_name, driver.last_name)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-surface-900">
                {driver.first_name} {driver.last_name}
              </h1>
              <p className="text-xs text-surface-500 font-mono mt-0.5">{driver.employee_id}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge ${getStatusColor(driver.status)}`}>
                  {driver.status.charAt(0).toUpperCase() +
                    driver.status.slice(1)}
                </span>
                <span
                  className={`badge ${driver.driver_type === "local" ? "badge-info" : "badge-warning"}`}
                >
                  {driver.driver_type === "local"
                    ? "Local Driver"
                    : "Export Driver"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEditModal(true)}
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn btn-danger"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-surface-100">
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Kilometers</p>
            <p className="text-lg font-semibold text-surface-900 mt-0.5">
              {formatNumber(totalKilometers)}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Trips</p>
            <p className="text-lg font-semibold text-surface-900 mt-0.5">
              {formatNumber(totalTrips)}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Incentives</p>
            <p className="text-lg font-semibold text-green-600 mt-0.5">
              {formatCurrency(totalIncentives)}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Leave Days Used</p>
            <p className="text-lg font-semibold text-surface-900 mt-0.5">
              {totalLeaveDays}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-list inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Personal Information */}
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-3">
                Personal Information
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-medium text-surface-900 mt-0.5">
                      {driver.email || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-medium text-surface-900 mt-0.5">
                      {driver.phone || "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-surface-500">Date of Birth</p>
                    <p className="font-medium text-surface-900">
                      {formatDate(driver.date_of_birth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Hire Date</p>
                    <p className="font-medium text-surface-900">
                      {formatDate(driver.hire_date)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Address</p>
                  <p className="font-medium text-surface-900">
                    {driver.address || "-"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-surface-500">
                      Emergency Contact
                    </p>
                    <p className="font-medium text-surface-900">
                      {driver.emergency_contact_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Emergency Phone</p>
                    <p className="font-medium text-surface-900">
                      {driver.emergency_contact_phone || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* License & Documents */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <h2 className="font-semibold text-surface-900 mb-4">
                License & Documents
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-surface-500">License Number</p>
                      <p className="font-mono font-medium text-surface-900">
                        {driver.license_number}
                      </p>
                    </div>
                    <span className="badge badge-info">
                      {driver.license_class || "N/A"}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-surface-200">
                    <p className="text-sm text-surface-500">Expires</p>
                    <p className="font-medium text-surface-900">
                      {formatDate(driver.license_expiry)}
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-100">
                  <div>
                    <p className="text-sm text-surface-500">Passport Number</p>
                    <p className="font-mono font-medium text-surface-900">
                      {driver.passport_number || "-"}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-surface-200">
                    <p className="text-sm text-surface-500">Expires</p>
                    <p className="font-medium text-surface-900">
                      {formatDate(driver.passport_expiry)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Information */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-surface-900">
                  Salary Information
                </h2>
                <button
                  onClick={() => setActiveTab("earnings")}
                  className="btn btn-secondary btn-sm"
                >
                  Manage Salary
                </button>
              </div>
              <div className="space-y-4">
                {!latestSalaryEntry ? (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 text-center">
                    <p className="text-sm text-amber-700 font-medium">No salary records found</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Go to the Earnings tab to add monthly salary records.
                    </p>
                    <button
                      onClick={() => setActiveTab("earnings")}
                      className="btn btn-primary btn-sm mt-3"
                    >
                      Add Salary Record
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Latest Salary Entry Info */}
                    <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                      <p className="text-xs text-surface-500">
                        Latest salary record: {getMonthName(latestSalaryEntry.month)} {latestSalaryEntry.year}
                      </p>
                    </div>
                    {/* Current Month Conversion Rate */}
                    {currentConversionRateObj && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-blue-700">
                            Current ZIG→USD Rate ({currentConversionRateObj.month}/{currentConversionRateObj.year})
                          </p>
                          <p className="font-semibold text-blue-800">
                            1 USD = {formatNumber(currentConversionRateObj.rate, 2)} ZIG
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-surface-500">USD Base Salary</p>
                        <p className="text-xl font-semibold text-green-600">
                          ${formatNumber(latestSalaryEntry.usd_base_salary || 0, 2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-surface-500">ZIG Base Salary</p>
                        <p className="text-xl font-semibold text-amber-600">
                          ZIG {formatNumber(latestSalaryEntry.zig_base_salary || 0, 2)}
                        </p>
                        {zigInUsd > 0 && (
                          <p className="text-sm text-surface-500 mt-1">
                            ≈ ${formatNumber(zigInUsd, 2)} USD
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-surface-200">
                      <p className="text-sm text-surface-500">Total Base Salary (USD Equivalent)</p>
                      <p className="text-2xl font-semibold text-surface-900">
                        ${formatNumber(totalUsdSalary, 2)}
                      </p>
                      <p className="text-xs text-surface-400 mt-1">
                        USD Base (${formatNumber(latestSalaryEntry.usd_base_salary || 0, 2)}) + ZIG converted (${formatNumber(zigInUsd, 2)})
                      </p>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-surface-500">Driver Type</p>
                    <p className="font-medium text-surface-900">
                      {driver.driver_type === "local" ? "Local" : "Export"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Rate per KM</p>
                    <p className="font-medium text-surface-900">
                      {formatCurrency(currentRate?.rate_per_km || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Earnings Summary */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-surface-900">
                  Monthly Earnings Summary
                </h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-surface-600">Year:</label>
                  <select
                    value={selectedEarningsYear}
                    onChange={(e) => setSelectedEarningsYear(Number(e.target.value))}
                    className="input py-1 px-2 text-sm w-24"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              {monthlyEarnings.length === 0 ? (
                <p className="text-surface-500 text-sm">No earnings data available for {selectedEarningsYear}. Add performance records to see monthly earnings.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="text-left py-2 px-3 font-medium text-surface-600">Period</th>
                        <th className="text-right py-2 px-3 font-medium text-surface-600">Base USD</th>
                        <th className="text-right py-2 px-3 font-medium text-surface-600">ZIG→USD</th>
                        <th className="text-right py-2 px-3 font-medium text-surface-600">KM Incentive</th>
                        <th className="text-right py-2 px-3 font-medium text-surface-600">Diesel Bonus</th>
                        <th className="text-right py-2 px-3 font-medium text-surface-600">Performance</th>
                        <th className="text-right py-2 px-3 font-medium text-surface-600 text-green-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyEarnings.map((earning, index: number) => (
                        <tr key={index} className="border-b border-surface-100 hover:bg-surface-50">
                          <td className="py-2 px-3 font-medium">{getMonthName(earning.month)}</td>
                          <td className="py-2 px-3 text-right">${formatNumber(earning.usdBaseSalary, 2)}</td>
                          <td className="py-2 px-3 text-right text-amber-600">${formatNumber(earning.zigInUsd, 2)}</td>
                          <td className="py-2 px-3 text-right text-blue-600">${formatNumber(earning.kmIncentive, 2)}</td>
                          <td className="py-2 px-3 text-right text-orange-600">${formatNumber(earning.fuelBonus, 2)}</td>
                          <td className="py-2 px-3 text-right text-purple-600">${formatNumber(earning.performanceBonus, 2)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-green-700">${formatNumber(earning.totalEarnings, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-50 font-semibold">
                        <td className="py-2 px-3">Total ({selectedEarningsYear})</td>
                        <td className="py-2 px-3 text-right">${formatNumber(monthlyEarnings.reduce((sum: number, e) => sum + e.usdBaseSalary, 0), 2)}</td>
                        <td className="py-2 px-3 text-right text-amber-600">${formatNumber(monthlyEarnings.reduce((sum: number, e) => sum + e.zigInUsd, 0), 2)}</td>
                        <td className="py-2 px-3 text-right text-blue-600">${formatNumber(monthlyEarnings.reduce((sum: number, e) => sum + e.kmIncentive, 0), 2)}</td>
                        <td className="py-2 px-3 text-right text-orange-600">${formatNumber(monthlyEarnings.reduce((sum: number, e) => sum + e.fuelBonus, 0), 2)}</td>
                        <td className="py-2 px-3 text-right text-purple-600">${formatNumber(monthlyEarnings.reduce((sum: number, e) => sum + e.performanceBonus, 0), 2)}</td>
                        <td className="py-2 px-3 text-right text-green-700">${formatNumber(monthlyEarnings.reduce((sum: number, e) => sum + e.totalEarnings, 0), 2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <h2 className="font-semibold text-surface-900 mb-4">Notes</h2>
              <p className="text-surface-600">
                {driver.notes || "No notes available for this driver."}
              </p>
            </div>
          </div>
        )}

        {activeTab === "performance" && (
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="font-semibold text-surface-900">
                Monthly Performance
              </h2>
              <button
                onClick={() => setShowAddPerformanceModal(true)}
                className="btn btn-primary text-sm"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
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
                Add Performance
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Actual KM</th>
                    <th>Target KM</th>
                    <th>Achievement</th>
                    <th>Trips</th>
                    <th>Fuel Efficiency</th>
                    <th>On-Time Rate</th>
                    <th>Safety Score</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.length > 0 ? (
                    performance.map((p) => {
                      const budget = monthlyBudgets.find(
                        (b) =>
                          b.year === p.year &&
                          b.month === p.month &&
                          b.driver_type === driver.driver_type,
                      );
                      // Divide budgeted KM by truck count to get target per driver
                      const truckCount = budget?.truck_count || 1;
                      const target = budget?.budgeted_kilometers 
                        ? Math.round(budget.budgeted_kilometers / truckCount)
                        : 0;
                      const achievement = calculateAchievementPercentage(
                        p.actual_kilometers,
                        target,
                      );

                      return (
                        <tr key={p.id}>
                          <td className="font-medium">
                            {getMonthName(p.month)} {p.year}
                          </td>
                          <td>{formatNumber(p.actual_kilometers)}</td>
                          <td>{formatNumber(target)}</td>
                          <td>
                            <span
                              className={`font-medium ${getAchievementColor(achievement)}`}
                            >
                              {formatPercentage(achievement)}
                            </span>
                          </td>
                          <td>{p.trips_completed}</td>
                          <td>
                            {p.fuel_efficiency
                              ? `${p.fuel_efficiency} km/l`
                              : "-"}
                          </td>
                          <td>
                            {p.on_time_delivery_rate
                              ? formatPercentage(p.on_time_delivery_rate)
                              : "-"}
                          </td>
                          <td>
                            {p.safety_score
                              ? formatPercentage(p.safety_score)
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-surface-500"
                      >
                        No performance data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "records" && (
          <div className="space-y-6">
            {/* Accidents */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">Accidents</h2>
                  <p className="text-sm text-surface-500">
                    {accidents.length} records
                  </p>
                </div>
                <button
                  onClick={() => setShowAddRecordModal("accident")}
                  className="btn btn-secondary text-sm"
                >
                  Add Record
                </button>
              </div>
              {recordsLoading ? (
                <div className="p-6 space-y-3">
                  <div className="skeleton h-12 w-full" />
                  <div className="skeleton h-12 w-full" />
                </div>
              ) : accidents.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {accidents.map((accident) => (
                    <div key={accident.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`badge ${getSeverityColor(accident.incident_type)}`}
                            >
                              {accident.incident_type.charAt(0).toUpperCase() +
                                accident.incident_type.slice(1)}
                            </span>
                            {accident.at_fault && (
                              <span className="badge badge-danger">
                                At Fault
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-surface-900">
                            {accident.description}
                          </p>
                          <p className="mt-1 text-sm text-surface-500">
                            {accident.location && `${accident.location} · `}
                            {formatDate(accident.incident_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-surface-900">
                            {formatCurrency(
                              accident.vehicle_damage_cost +
                                accident.third_party_cost,
                            )}
                          </p>
                          <p className="text-sm text-surface-500">Total Cost</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-surface-500">
                  No accident records
                </div>
              )}
            </div>

            {/* Incidents */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">Incidents</h2>
                  <p className="text-sm text-surface-500">
                    {incidents.length} records
                  </p>
                </div>
                <button
                  onClick={() => setShowAddRecordModal("incident")}
                  className="btn btn-secondary text-sm"
                >
                  Add Record
                </button>
              </div>
              {recordsLoading ? (
                <div className="p-6 space-y-3">
                  <div className="skeleton h-12 w-full" />
                  <div className="skeleton h-12 w-full" />
                </div>
              ) : incidents.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`badge ${getSeverityColor(incident.severity)}`}
                            >
                              {incident.severity.charAt(0).toUpperCase() +
                                incident.severity.slice(1)}
                            </span>
                            <span className="badge badge-neutral">
                              {getIncidentTypeLabel(incident.incident_type)}
                            </span>
                          </div>
                          <p className="mt-2 text-surface-900">
                            {incident.description}
                          </p>
                          <p className="mt-1 text-sm text-surface-500">
                            {formatDate(incident.incident_date)}
                          </p>
                        </div>
                        {incident.fine_amount > 0 && (
                          <div className="text-right">
                            <p className="font-medium text-red-600">
                              {formatCurrency(incident.fine_amount)}
                            </p>
                            <p className="text-sm text-surface-500">Fine</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-surface-500">
                  No incident records
                </div>
              )}
            </div>

            {/* Disciplinary Records */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">
                    Disciplinary Records
                  </h2>
                  <p className="text-sm text-surface-500">
                    {disciplinaryRecords.length} records
                  </p>
                </div>
                <button
                  onClick={() => setShowAddRecordModal("disciplinary")}
                  className="btn btn-secondary text-sm"
                >
                  Add Record
                </button>
              </div>
              {recordsLoading ? (
                <div className="p-6 space-y-3">
                  <div className="skeleton h-12 w-full" />
                </div>
              ) : disciplinaryRecords.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {disciplinaryRecords.map((record) => (
                    <div key={record.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={`badge ${
                              record.record_type === "verbal_warning"
                                ? "badge-info"
                                : record.record_type === "written_warning"
                                  ? "badge-warning"
                                  : "badge-danger"
                            }`}
                          >
                            {getDisciplinaryTypeLabel(record.record_type)}
                          </span>
                          <p className="mt-2 text-surface-900">
                            {record.reason}
                          </p>
                          {record.description && (
                            <p className="mt-1 text-sm text-surface-600">
                              {record.description}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-surface-500">
                            {formatDate(record.record_date)}
                            {record.issued_by &&
                              ` · Issued by ${record.issued_by}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-surface-500">
                  No disciplinary records
                </div>
              )}
            </div>

            {/* Leave Records */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">
                    Leave Records
                  </h2>
                  <p className="text-sm text-surface-500">
                    {leaveRecords.length} records
                  </p>
                </div>
                <button
                  onClick={() => setShowAddRecordModal("leave")}
                  className="btn btn-secondary text-sm"
                >
                  Add Record
                </button>
              </div>
              {recordsLoading ? (
                <div className="p-6 space-y-3">
                  <div className="skeleton h-12 w-full" />
                </div>
              ) : leaveRecords.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {leaveRecords.map((leave) => (
                    <div key={leave.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="badge badge-info">
                              {getLeaveTypeLabel(leave.leave_type)}
                            </span>
                            <span
                              className={`badge ${getStatusColor(leave.status)}`}
                            >
                              {leave.status.charAt(0).toUpperCase() +
                                leave.status.slice(1)}
                            </span>
                          </div>
                          <p className="mt-2 text-surface-900">
                            {formatDate(leave.start_date)} -{" "}
                            {formatDate(leave.end_date)}
                          </p>
                          {leave.reason && (
                            <p className="mt-1 text-sm text-surface-600">
                              {leave.reason}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-surface-900">
                            {leave.total_days} days
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-surface-500">
                  No leave records
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "incentives" && (
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-surface-900">
                  Incentive History
                </h2>
                <p className="text-sm text-surface-500 mt-0.5">
                  View incentive calculations by year
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-surface-600">Year:</label>
                <select
                  value={selectedIncentivesYear}
                  onChange={(e) => setSelectedIncentivesYear(Number(e.target.value))}
                  className="input py-1.5 px-3 text-sm w-28"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Base Salary</th>
                    <th>KM Incentive</th>
                    <th>Performance Bonus</th>
                    <th>Safety Bonus</th>
                    <th>Deductions</th>
                    <th>Total Incentive</th>
                    <th>Total Earnings</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalculations.length > 0 ? (
                    filteredCalculations.map((calc) => (
                      <tr key={calc.id}>
                        <td className="font-medium">
                          {getMonthName(calc.month)} {calc.year}
                        </td>
                        <td>{formatCurrency(calc.base_salary)}</td>
                        <td className="text-green-600">
                          {formatCurrency(calc.km_incentive)}
                        </td>
                        <td className="text-green-600">
                          {formatCurrency(calc.performance_bonus)}
                        </td>
                        <td className="text-green-600">
                          {formatCurrency(calc.safety_bonus)}
                        </td>
                        <td className="text-red-600">
                          -{formatCurrency(calc.deductions)}
                        </td>
                        <td className="font-medium text-primary-600">
                          {formatCurrency(calc.total_incentive)}
                        </td>
                        <td className="font-semibold">
                          {formatCurrency(calc.total_earnings)}
                        </td>
                        <td>
                          <span
                            className={`badge ${getStatusColor(calc.status)}`}
                          >
                            {calc.status
                              .replace("_", " ")
                              .charAt(0)
                              .toUpperCase() +
                              calc.status.replace("_", " ").slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-12 text-surface-500"
                      >
                        No incentive calculations for {selectedIncentivesYear}
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredCalculations.length > 0 && (
                  <tfoot>
                    <tr className="bg-surface-50 font-semibold">
                      <td className="py-2 px-3">Total ({selectedIncentivesYear})</td>
                      <td className="py-2 px-3">{formatCurrency(filteredCalculations.reduce((sum, c) => sum + c.base_salary, 0))}</td>
                      <td className="py-2 px-3 text-green-600">{formatCurrency(filteredCalculations.reduce((sum, c) => sum + c.km_incentive, 0))}</td>
                      <td className="py-2 px-3 text-green-600">{formatCurrency(filteredCalculations.reduce((sum, c) => sum + c.performance_bonus, 0))}</td>
                      <td className="py-2 px-3 text-green-600">{formatCurrency(filteredCalculations.reduce((sum, c) => sum + c.safety_bonus, 0))}</td>
                      <td className="py-2 px-3 text-red-600">-{formatCurrency(filteredCalculations.reduce((sum, c) => sum + c.deductions, 0))}</td>
                      <td className="py-2 px-3 text-primary-600">{formatCurrency(filteredCalculations.reduce((sum, c) => sum + c.total_incentive, 0))}</td>
                      <td className="py-2 px-3">{formatCurrency(filteredCalculations.reduce((sum, c) => sum + c.total_earnings, 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {activeTab === "earnings" && (
          <div className="space-y-6">
            {/* Year Selector */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-surface-900">
                  Earnings Analytics for {selectedEarningsYear}
                </h2>
                <p className="text-sm text-surface-500 mt-0.5">
                  Comprehensive view of salary growth, incentives impact, and year-over-year trends
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-surface-600">Year:</label>
                  <select
                    value={selectedEarningsYear}
                    onChange={(e) => setSelectedEarningsYear(Number(e.target.value))}
                    className="input py-1.5 px-3 text-sm w-28"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleExportEarnings(true)}
                  disabled={isExporting}
                  className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-sm disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-surface-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Export PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-surface-200 p-4">
                <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Annual Base Salary</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  ${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.totalBaseSalary, 0), 2)}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-4">
                <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Incentives</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.totalIncentive, 0), 2)}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-4">
                <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Earnings</p>
                <p className="text-2xl font-bold text-surface-900 mt-1">
                  ${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.totalEarnings, 0), 2)}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-4">
                <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Incentive Impact</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {(() => {
                    const total = monthlyEarnings.reduce((sum, e) => sum + e.totalEarnings, 0);
                    const incentives = monthlyEarnings.reduce((sum, e) => sum + e.totalIncentive, 0);
                    return total > 0 ? formatNumber((incentives / total) * 100, 1) : 0;
                  })()}%
                </p>
                <p className="text-xs text-surface-400 mt-0.5">of total earnings</p>
              </div>
            </div>

            {/* Monthly Earnings Breakdown Chart */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-surface-900">
                  Monthly Earnings Breakdown
                </h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  Stacked view showing base salary and incentive components
                </p>
              </div>
              
              {monthlyEarnings.length > 0 ? (
                <div id="earnings-breakdown-chart" className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={monthlyEarnings.map(e => ({
                        period: getMonthName(e.month).substring(0, 3),
                        baseSalary: e.totalBaseSalary,
                        kmIncentive: e.kmIncentive,
                        fuelBonus: e.fuelBonus,
                        performanceBonus: e.performanceBonus,
                        safetyBonus: e.safetyBonus,
                        totalEarnings: e.totalEarnings,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(value) => `$${formatNumber(value)}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value, name) => [
                          `$${formatNumber(value as number, 2)}`,
                          name === 'baseSalary' ? 'Base Salary' :
                          name === 'kmIncentive' ? 'KM Incentive' :
                          name === 'fuelBonus' ? 'Diesel Bonus' :
                          name === 'performanceBonus' ? 'Performance' :
                          name === 'safetyBonus' ? 'Safety Bonus' :
                          'Total Earnings'
                        ]}
                      />
                      <Legend 
                        formatter={(value) => 
                          value === 'baseSalary' ? 'Base Salary' :
                          value === 'kmIncentive' ? 'KM Incentive' :
                          value === 'fuelBonus' ? 'Diesel Bonus' :
                          value === 'performanceBonus' ? 'Performance' :
                          value === 'safetyBonus' ? 'Safety Bonus' :
                          'Total Earnings'
                        }
                      />
                      <Bar dataKey="baseSalary" stackId="a" fill="#3b82f6" name="baseSalary" />
                      <Bar dataKey="kmIncentive" stackId="a" fill="#22c55e" name="kmIncentive" />
                      <Bar dataKey="fuelBonus" stackId="a" fill="#f97316" name="fuelBonus" />
                      <Bar dataKey="performanceBonus" stackId="a" fill="#8b5cf6" name="performanceBonus" />
                      <Bar dataKey="safetyBonus" stackId="a" fill="#06b6d4" name="safetyBonus" />
                      <Line 
                        type="monotone" 
                        dataKey="totalEarnings" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        name="totalEarnings"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-surface-500">
                  No earnings data to display
                </div>
              )}
            </div>

            {/* Year-over-Year Comparison */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-surface-900">
                  Year-over-Year Comparison
                </h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  Compare {selectedEarningsYear} earnings with {selectedEarningsYear - 1}
                </p>
              </div>
              
              {yearOverYearData.length > 0 ? (
                <div id="yoy-comparison-chart" className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={yearOverYearData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(value) => `$${formatNumber(value)}`}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(value) => `${value}%`}
                        domain={[-50, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value, name) => {
                          if (name === 'growth') return [`${formatNumber(value as number, 1)}%`, 'Growth'];
                          return [`$${formatNumber(value as number, 2)}`, name === 'currentYear' ? selectedEarningsYear : selectedEarningsYear - 1];
                        }}
                      />
                      <Legend />
                      <ReferenceLine yAxisId="right" y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                      <Bar yAxisId="left" dataKey="previousYear" fill="#94a3b8" name={`${selectedEarningsYear - 1}`} />
                      <Bar yAxisId="left" dataKey="currentYear" fill="#3b82f6" name={`${selectedEarningsYear}`} />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="growth" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                        name="growth"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-surface-500">
                  No comparison data available
                </div>
              )}

              {/* YoY Summary */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-surface-100">
                <div className="text-center">
                  <p className="text-xs text-surface-500">{selectedEarningsYear - 1} Total</p>
                  <p className="font-semibold text-surface-600">${formatNumber(yearOverYearData.reduce((sum, d) => sum + d.previousYear, 0), 2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-surface-500">{selectedEarningsYear} Total</p>
                  <p className="font-semibold text-blue-600">${formatNumber(yearOverYearData.reduce((sum, d) => sum + d.currentYear, 0), 2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-surface-500">Overall Change</p>
                  {(() => {
                    const prev = yearOverYearData.reduce((sum, d) => sum + d.previousYear, 0);
                    const curr = yearOverYearData.reduce((sum, d) => sum + d.currentYear, 0);
                    const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
                    return (
                      <p className={`font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change >= 0 ? '+' : ''}{formatNumber(change, 1)}%
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Cumulative Earnings Growth */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-surface-900">
                  Cumulative Earnings Growth
                </h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  Track how total earnings accumulate throughout the year
                </p>
              </div>
              
              {cumulativeGrowthData.length > 0 ? (
                <div id="cumulative-growth-chart" className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={cumulativeGrowthData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(value) => `$${formatNumber(value)}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value, name) => [
                          `$${formatNumber(value as number, 2)}`,
                          name === 'cumulativeBase' ? 'Cumulative Base Salary' :
                          name === 'cumulativeIncentives' ? 'Cumulative Incentives' :
                          'Cumulative Total'
                        ]}
                      />
                      <Legend 
                        formatter={(value) => 
                          value === 'cumulativeBase' ? 'Base Salary' :
                          value === 'cumulativeIncentives' ? 'Incentives' :
                          'Total Earnings'
                        }
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulativeBase" 
                        stackId="1"
                        stroke="#3b82f6" 
                        fill="#93c5fd"
                        name="cumulativeBase"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulativeIncentives" 
                        stackId="1"
                        stroke="#22c55e" 
                        fill="#86efac"
                        name="cumulativeIncentives"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeTotal" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        name="cumulativeTotal"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-surface-500">
                  No growth data to display
                </div>
              )}
            </div>

            {/* Incentive Breakdown & Annual Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Incentive Breakdown Pie Chart */}
              <div className="bg-white rounded-2xl border border-surface-200 p-6">
                <div className="mb-6">
                  <h3 className="font-semibold text-surface-900">
                    Incentive Breakdown
                  </h3>
                  <p className="text-sm text-surface-500 mt-0.5">
                    Distribution of incentive types for {selectedEarningsYear}
                  </p>
                </div>
                
                {incentiveBreakdownData.length > 0 ? (
                  <div id="incentive-pie-chart" className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incentiveBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={(props) => {
                            const name = props.name ?? '';
                            const percent = (props.percent ?? 0) as number;
                            return `${name}: ${(percent * 100).toFixed(0)}%`;
                          }}
                          labelLine={false}
                        >
                          {incentiveBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`$${formatNumber(value as number, 2)}`, 'Amount']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-surface-500">
                    No incentive data available
                  </div>
                )}

                {/* Incentive Legend */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {incentiveBreakdownData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs text-surface-600">{item.name}</span>
                      <span className="text-xs font-semibold ml-auto">${formatNumber(item.value, 2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Annual Comparison Chart */}
              <div className="bg-white rounded-2xl border border-surface-200 p-6">
                <div className="mb-6">
                  <h3 className="font-semibold text-surface-900">
                    Annual Earnings Trend
                  </h3>
                  <p className="text-sm text-surface-500 mt-0.5">
                    Total earnings by year showing incentive impact
                  </p>
                </div>
                
                {annualSummaryData.length > 0 ? (
                  <div id="annual-trend-chart" className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={annualSummaryData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="year" 
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickFormatter={(value) => `$${formatNumber(value / 1000)}k`}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 50]}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          formatter={(value, name) => {
                            if (name === 'incentivePercent') return [`${value}%`, 'Incentive %'];
                            return [`$${formatNumber(value as number, 2)}`, 
                              name === 'baseSalary' ? 'Base Salary' :
                              name === 'incentives' ? 'Incentives' : 'Total'
                            ];
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="baseSalary" stackId="a" fill="#3b82f6" name="baseSalary" />
                        <Bar yAxisId="left" dataKey="incentives" stackId="a" fill="#22c55e" name="incentives" />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="incentivePercent" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                          name="incentivePercent"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-surface-500">
                    No annual data available
                  </div>
                )}

                {/* Annual Summary Table */}
                <div className="mt-4 pt-4 border-t border-surface-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-surface-500">
                        <th className="text-left py-1">Year</th>
                        <th className="text-right py-1">Base</th>
                        <th className="text-right py-1">Incentives</th>
                        <th className="text-right py-1">Total</th>
                        <th className="text-right py-1">Inc %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {annualSummaryData.map((row) => (
                        <tr key={row.year} className={row.year === selectedEarningsYear.toString() ? 'bg-blue-50 font-semibold' : ''}>
                          <td className="py-1">{row.year}</td>
                          <td className="text-right py-1">${formatNumber(row.baseSalary, 0)}</td>
                          <td className="text-right py-1 text-green-600">${formatNumber(row.incentives, 0)}</td>
                          <td className="text-right py-1">${formatNumber(row.totalEarnings, 0)}</td>
                          <td className="text-right py-1 text-purple-600">{row.incentivePercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Monthly Salary Input Section */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">
                    Monthly Salary Records
                  </h2>
                  <p className="text-sm text-surface-500 mt-0.5">
                    Track USD and ZIG salary by month with conversion rates
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingSalaryEntry(null);
                    setShowMonthlySalaryModal(true);
                  }}
                  className="btn btn-primary text-sm"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
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
                  Add Monthly Salary
                </button>
              </div>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>USD Salary</th>
                      <th>ZIG Salary</th>
                      <th>Rate</th>
                      <th>ZIG→USD</th>
                      <th>Total Base</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverSalaryHistory
                      .filter(s => s.driver_id === driver.id)
                      .sort((a, b) => {
                        if (b.year !== a.year) return b.year - a.year;
                        return b.month - a.month;
                      })
                      .map((salary) => {
                        const rate = zigUsdConversionRates.find(
                          r => r.year === salary.year && r.month === salary.month
                        )?.rate || 1;
                        const zigInUsdValue = rate > 0 ? salary.zig_base_salary / rate : 0;
                        const totalBase = salary.usd_base_salary + zigInUsdValue;
                        
                        return (
                          <tr key={salary.id}>
                            <td className="font-medium">
                              {getMonthName(salary.month)} {salary.year}
                            </td>
                            <td className="text-green-600">
                              ${formatNumber(salary.usd_base_salary, 2)}
                            </td>
                            <td className="text-amber-600">
                              ZIG {formatNumber(salary.zig_base_salary, 2)}
                            </td>
                            <td className="text-surface-500 text-sm">
                              {formatNumber(rate, 2)}
                            </td>
                            <td className="text-amber-600">
                              ${formatNumber(zigInUsdValue, 2)}
                            </td>
                            <td className="font-semibold">
                              ${formatNumber(totalBase, 2)}
                            </td>
                            <td className="text-surface-500 text-sm max-w-32 truncate">
                              {salary.notes || "-"}
                            </td>
                            <td>
                              <button
                                onClick={() => {
                                  setEditingSalaryEntry({
                                    id: salary.id,
                                    year: salary.year,
                                    month: salary.month,
                                    usd_base_salary: salary.usd_base_salary,
                                    zig_base_salary: salary.zig_base_salary,
                                    notes: salary.notes,
                                  });
                                  setShowMonthlySalaryModal(true);
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {driverSalaryHistory.filter(s => s.driver_id === driver.id).length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-surface-500">
                          No monthly salary records. Click "Add Monthly Salary" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly Earnings with Incentives */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100">
                <h2 className="font-semibold text-surface-900">
                  Monthly Earnings ({selectedEarningsYear}) - Salary + Incentives
                </h2>
                <p className="text-sm text-surface-500 mt-0.5">
                  Complete breakdown of earnings including all incentives for {selectedEarningsYear}
                </p>
              </div>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Base USD</th>
                      <th>ZIG→USD</th>
                      <th>Total Base</th>
                      <th>KM Incentive</th>
                      <th>Diesel Bonus</th>
                      <th>Performance</th>
                      <th>Safety</th>
                      <th>Deductions</th>
                      <th className="text-green-700">Total Earnings</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyEarnings.map((earning, index) => {
                      // Find existing salary record for this month
                      const existingSalary = driverSalaryHistory.find(
                        s => s.driver_id === driver.id && s.year === earning.year && s.month === earning.month
                      );
                      
                      return (
                        <tr key={index}>
                          <td className="font-medium">
                            {getMonthName(earning.month)}
                          </td>
                          <td>${formatNumber(earning.usdBaseSalary, 2)}</td>
                          <td className="text-amber-600">${formatNumber(earning.zigInUsd, 2)}</td>
                          <td className="font-medium">${formatNumber(earning.totalBaseSalary, 2)}</td>
                          <td className="text-blue-600">${formatNumber(earning.kmIncentive, 2)}</td>
                          <td className="text-orange-600">${formatNumber(earning.fuelBonus, 2)}</td>
                          <td className="text-purple-600">${formatNumber(earning.performanceBonus, 2)}</td>
                          <td className="text-green-600">${formatNumber(earning.safetyBonus, 2)}</td>
                          <td className="text-red-600">-${formatNumber(earning.deductions, 2)}</td>
                          <td className="font-semibold text-green-700">${formatNumber(earning.totalEarnings, 2)}</td>
                          <td>
                            <button
                              onClick={() => {
                                if (existingSalary) {
                                  setEditingSalaryEntry({
                                    id: existingSalary.id,
                                    year: existingSalary.year,
                                    month: existingSalary.month,
                                    usd_base_salary: existingSalary.usd_base_salary,
                                    zig_base_salary: existingSalary.zig_base_salary,
                                    notes: existingSalary.notes,
                                  });
                                } else {
                                  setEditingSalaryEntry({
                                    id: "",
                                    year: earning.year,
                                    month: earning.month,
                                    usd_base_salary: 0,
                                    zig_base_salary: 0,
                                    notes: null,
                                  });
                                }
                                setShowMonthlySalaryModal(true);
                              }}
                              className={`btn btn-sm ${existingSalary ? 'btn-secondary' : 'btn-primary'}`}
                              title={existingSalary ? 'Edit salary for this month' : 'Add salary for this month'}
                            >
                              {existingSalary ? 'Edit' : 'Add'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {monthlyEarnings.length === 0 && (
                      <tr>
                        <td colSpan={11} className="text-center py-12 text-surface-500">
                          No earnings data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {monthlyEarnings.length > 0 && (
                    <tfoot>
                      <tr className="bg-surface-50 font-semibold">
                        <td>12-Month Total</td>
                        <td>${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.usdBaseSalary, 0), 2)}</td>
                        <td className="text-amber-600">${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.zigInUsd, 0), 2)}</td>
                        <td>${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.totalBaseSalary, 0), 2)}</td>
                        <td className="text-blue-600">${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.kmIncentive, 0), 2)}</td>
                        <td className="text-orange-600">${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.fuelBonus, 0), 2)}</td>
                        <td className="text-purple-600">${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.performanceBonus, 0), 2)}</td>
                        <td className="text-green-600">${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.safetyBonus, 0), 2)}</td>
                        <td className="text-red-600">-${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.deductions, 0), 2)}</td>
                        <td className="text-green-700">${formatNumber(monthlyEarnings.reduce((sum, e) => sum + e.totalEarnings, 0), 2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditDriverModal
          driver={driver}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showAddRecordModal && (
        <AddRecordModal
          driverId={driver.id}
          recordType={showAddRecordModal}
          onClose={() => setShowAddRecordModal(null)}
        />
      )}

      {showAddPerformanceModal && (
        <AddPerformanceModal
          driver={driver}
          onClose={() => setShowAddPerformanceModal(false)}
        />
      )}

      {showMonthlySalaryModal && (
        <AddMonthlySalaryModal
          isOpen={showMonthlySalaryModal}
          onClose={() => {
            setShowMonthlySalaryModal(false);
            setEditingSalaryEntry(null);
          }}
          driverId={driver.id}
          driverName={`${driver.first_name} ${driver.last_name}`}
          existingEntry={editingSalaryEntry}
        />
      )}
    </div>
  );
}
