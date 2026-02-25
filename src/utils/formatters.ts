import { format, parseISO } from "date-fns";

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy, HH:mm");
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "$",
): string {
  if (amount === null || amount === undefined) return `${currency}0.00`;
  return `${currency}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(
  num: number | null | undefined,
  decimals = 0,
): string {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0%";
  return `${value.toFixed(1)}%`;
}

export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1] || "";
}

export function getMonthShortName(month: number): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[month - 1] || "";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-neutral",
    suspended: "badge-warning",
    terminated: "badge-danger",
    pending: "badge-warning",
    approved: "badge-success",
    rejected: "badge-danger",
    paid: "badge-success",
    draft: "badge-neutral",
    pending_approval: "badge-warning",
    settled: "badge-info",
    cancelled: "badge-neutral",
  };
  return colors[status] || "badge-neutral";
}

export function getDriverTypeLabel(type: "local" | "export"): string {
  return type === "local" ? "Local" : "Export";
}

export function calculateAchievementPercentage(
  actual: number,
  target: number,
): number {
  if (target <= 0) return 0;
  return (actual / target) * 100;
}

export function getAchievementColor(percentage: number): string {
  if (percentage >= 120) return "text-green-600";
  if (percentage >= 100) return "text-green-500";
  if (percentage >= 80) return "text-yellow-600";
  return "text-red-500";
}

export function generateInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: "badge-info",
    medium: "badge-warning",
    high: "badge-danger",
    critical: "badge-danger",
    minor: "badge-info",
    moderate: "badge-warning",
    severe: "badge-danger",
    fatal: "badge-danger",
  };
  return colors[severity] || "badge-neutral";
}

export function getIncidentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    traffic_violation: "Traffic Violation",
    customer_complaint: "Customer Complaint",
    vehicle_misuse: "Vehicle Misuse",
    safety_violation: "Safety Violation",
    policy_violation: "Policy Violation",
    other: "Other",
  };
  return labels[type] || type;
}

export function getLeaveTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    annual: "Annual Leave",
    sick: "Sick Leave",
    unpaid: "Unpaid Leave",
    maternity: "Maternity Leave",
    paternity: "Paternity Leave",
    compassionate: "Compassionate Leave",
    other: "Other",
  };
  return labels[type] || type;
}

export function getDisciplinaryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    verbal_warning: "Verbal Warning",
    written_warning: "Written Warning",
    final_warning: "Final Warning",
    suspension: "Suspension",
    termination: "Termination",
    other: "Other",
  };
  return labels[type] || type;
}

/**
 * Convert ZIG amount to USD using the conversion rate
 * @param zigAmount - Amount in ZIG currency
 * @param conversionRate - ZIG amount per 1 USD (e.g., 25 means 25 ZIG = 1 USD)
 * @returns Amount in USD
 */
export function convertZigToUsd(zigAmount: number, conversionRate: number): number {
  if (!conversionRate || conversionRate <= 0) return 0;
  return zigAmount / conversionRate;
}

/**
 * Calculate total base salary in USD from USD and ZIG components
 * @param usdBaseSalary - Base salary in USD
 * @param zigBaseSalary - Base salary in ZIG
 * @param conversionRate - ZIG amount per 1 USD
 * @returns Total salary in USD
 */
export function calculateTotalBaseSalaryUsd(
  usdBaseSalary: number,
  zigBaseSalary: number,
  conversionRate: number
): number {
  const zigInUsd = convertZigToUsd(zigBaseSalary, conversionRate);
  return (usdBaseSalary || 0) + zigInUsd;
}

/**
 * Format ZIG currency
 */
export function formatZigCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "ZIG 0.00";
  return `ZIG ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get driver salary for a specific period from salary history
 * Falls back to driver's current salary if no history exists
 */
export function getDriverSalaryForPeriod(
  driverId: string,
  year: number,
  month: number,
  salaryHistory: { driver_id: string; year: number; month: number; usd_base_salary: number; zig_base_salary: number }[],
  driver?: { usd_base_salary?: number; zig_base_salary?: number; base_salary?: number }
): { usdBaseSalary: number; zigBaseSalary: number; fromHistory: boolean } {
  // First, try to find exact match in history
  const exactMatch = salaryHistory.find(
    (s) => s.driver_id === driverId && s.year === year && s.month === month
  );
  
  if (exactMatch) {
    return {
      usdBaseSalary: exactMatch.usd_base_salary,
      zigBaseSalary: exactMatch.zig_base_salary,
      fromHistory: true,
    };
  }
  
  // Try to find the most recent salary before this period
  const previousSalaries = salaryHistory
    .filter(
      (s) =>
        s.driver_id === driverId &&
        (s.year < year || (s.year === year && s.month < month))
    )
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  
  if (previousSalaries.length > 0) {
    return {
      usdBaseSalary: previousSalaries[0].usd_base_salary,
      zigBaseSalary: previousSalaries[0].zig_base_salary,
      fromHistory: true,
    };
  }
  
  // Fall back to driver's current salary
  return {
    usdBaseSalary: driver?.usd_base_salary || 0,
    zigBaseSalary: driver?.zig_base_salary || 0,
    fromHistory: false,
  };
}

/**
 * Calculate total base salary in USD for a specific period
 * Uses salary history and conversion rates
 */
export function calculatePeriodBaseSalaryUsd(
  driverId: string,
  year: number,
  month: number,
  salaryHistory: { driver_id: string; year: number; month: number; usd_base_salary: number; zig_base_salary: number }[],
  conversionRates: { year: number; month: number; rate: number }[],
  driver?: { usd_base_salary?: number; zig_base_salary?: number; base_salary?: number }
): number {
  const { usdBaseSalary, zigBaseSalary } = getDriverSalaryForPeriod(
    driverId,
    year,
    month,
    salaryHistory,
    driver
  );
  
  // Get conversion rate for the period
  const rateRecord = conversionRates.find(
    (r) => r.year === year && r.month === month
  );
  const conversionRate = rateRecord?.rate || 1;
  
  // Calculate ZIG to USD
  const zigInUsd = zigBaseSalary / conversionRate;
  
  return usdBaseSalary + zigInUsd;
}
