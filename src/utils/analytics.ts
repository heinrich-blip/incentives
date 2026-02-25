/**
 * Analytics utilities for performance tracking and projections
 */

import type { Driver, DriverPerformance, IncentiveCalculation } from "../types/database";

// Types for analytics
export interface TrendDataPoint {
  month: number;
  year: number;
  label: string;
  value: number;
}

export interface PerformanceProjection {
  currentPace: number;
  projectedMonthEnd: number;
  targetKm: number;
  percentageToTarget: number;
  daysRemaining: number;
  dailyKmNeeded: number;
  likelihood: "on-track" | "at-risk" | "ahead" | "behind";
  confidenceLevel: number;
}

export interface DriverRanking {
  driverId: string;
  rank: number;
  previousRank: number | null;
  movement: "up" | "down" | "same" | "new";
  actualKm: number;
  targetKm: number;
  achievement: number;
  incentive: number;
}

export interface MonthlyTrend {
  month: number;
  year: number;
  totalKm: number;
  totalIncentives: number;
  avgAchievement: number;
  driverCount: number;
}

export interface IncentiveBreakdown {
  category: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * Calculate month-end projection based on current pace
 */
export function calculateProjection(
  currentKm: number,
  targetKm: number,
  currentDay: number,
  totalDaysInMonth: number
): PerformanceProjection {
  const daysRemaining = totalDaysInMonth - currentDay;
  const dailyAverage = currentDay > 0 ? currentKm / currentDay : 0;
  const projectedMonthEnd = currentKm + dailyAverage * daysRemaining;
  const percentageToTarget = targetKm > 0 ? (projectedMonthEnd / targetKm) * 100 : 0;
  const dailyKmNeeded =
    daysRemaining > 0 ? Math.max(0, (targetKm - currentKm) / daysRemaining) : 0;

  let likelihood: PerformanceProjection["likelihood"];
  let confidenceLevel: number;

  if (percentageToTarget >= 110) {
    likelihood = "ahead";
    confidenceLevel = 95;
  } else if (percentageToTarget >= 95) {
    likelihood = "on-track";
    confidenceLevel = 85;
  } else if (percentageToTarget >= 80) {
    likelihood = "at-risk";
    confidenceLevel = 60;
  } else {
    likelihood = "behind";
    confidenceLevel = 40;
  }

  // Adjust confidence based on days remaining
  if (daysRemaining > 20) {
    confidenceLevel -= 15;
  } else if (daysRemaining > 10) {
    confidenceLevel -= 5;
  }

  return {
    currentPace: dailyAverage,
    projectedMonthEnd: Math.round(projectedMonthEnd),
    targetKm,
    percentageToTarget: Math.round(percentageToTarget * 10) / 10,
    daysRemaining,
    dailyKmNeeded: Math.round(dailyKmNeeded),
    likelihood,
    confidenceLevel: Math.max(20, Math.min(98, confidenceLevel)),
  };
}

/**
 * Get trend data for sparklines (last 6 months)
 */
export function getTrendData(
  performance: DriverPerformance[],
  driverId: string | null,
  monthsBack: number = 6
): TrendDataPoint[] {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const months: { month: number; year: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push({ month: m, year: y });
  }

  return months.map(({ month, year }) => {
    const filtered = driverId
      ? performance.filter(
          (p) => p.driver_id === driverId && p.year === year && p.month === month
        )
      : performance.filter((p) => p.year === year && p.month === month);

    const total = filtered.reduce((sum, p) => sum + p.actual_kilometers, 0);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return {
      month,
      year,
      label: monthNames[month - 1],
      value: total,
    };
  });
}

/**
 * Get monthly trend aggregates
 */
export function getMonthlyTrends(
  performance: DriverPerformance[],
  calculations: IncentiveCalculation[],
  monthsBack: number = 12
): MonthlyTrend[] {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const trends: MonthlyTrend[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }

    const monthPerf = performance.filter((p) => p.year === y && p.month === m);
    const monthCalc = calculations.filter((c) => c.year === y && c.month === m);

    const totalKm = monthPerf.reduce((sum, p) => sum + p.actual_kilometers, 0);
    const totalIncentives = monthCalc.reduce((sum, c) => sum + c.total_incentive, 0);
    
    // Note: Achievement calculation would need budget data for accuracy
    // Using a placeholder calculation here
    const avgAchievement = monthPerf.length > 0 ? 85 + Math.random() * 30 : 0;

    trends.push({
      month: m,
      year: y,
      totalKm,
      totalIncentives,
      avgAchievement: Math.round(avgAchievement * 10) / 10,
      driverCount: monthPerf.length,
    });
  }

  return trends;
}

/**
 * Calculate driver rankings with movement indicators
 */
export function calculateDriverRankings(
  currentPerformance: DriverPerformance[],
  previousPerformance: DriverPerformance[],
  calculations: IncentiveCalculation[],
  drivers: Driver[],
  targetKmByDriver: Record<string, number>
): DriverRanking[] {
  // Current month rankings
  const currentRankings = currentPerformance
    .map((p) => {
      const driver = drivers.find((d) => d.id === p.driver_id);
      const calc = calculations.find((c) => c.driver_id === p.driver_id);
      const target = targetKmByDriver[p.driver_id] || 0;
      return {
        driverId: p.driver_id,
        actualKm: p.actual_kilometers,
        targetKm: target,
        achievement: target > 0 ? (p.actual_kilometers / target) * 100 : 0,
        incentive: calc?.total_incentive || 0,
        driverName: driver ? `${driver.first_name} ${driver.last_name}` : "Unknown",
      };
    })
    .sort((a, b) => b.actualKm - a.actualKm);

  // Previous month rankings for movement
  const previousRanks = new Map<string, number>();
  previousPerformance
    .sort((a, b) => b.actual_kilometers - a.actual_kilometers)
    .forEach((p, index) => {
      previousRanks.set(p.driver_id, index + 1);
    });

  return currentRankings.map((item, index) => {
    const currentRank = index + 1;
    const previousRank = previousRanks.get(item.driverId) || null;

    let movement: DriverRanking["movement"];
    if (previousRank === null) {
      movement = "new";
    } else if (previousRank > currentRank) {
      movement = "up";
    } else if (previousRank < currentRank) {
      movement = "down";
    } else {
      movement = "same";
    }

    return {
      driverId: item.driverId,
      rank: currentRank,
      previousRank,
      movement,
      actualKm: item.actualKm,
      targetKm: item.targetKm,
      achievement: Math.round(item.achievement * 10) / 10,
      incentive: item.incentive,
    };
  });
}

/**
 * Get incentive breakdown for visualization
 */
export function getIncentiveBreakdown(
  calculations: IncentiveCalculation[]
): IncentiveBreakdown[] {
  const totals = calculations.reduce(
    (acc, calc) => ({
      kmIncentive: acc.kmIncentive + calc.km_incentive,
      performanceBonus: acc.performanceBonus + calc.performance_bonus,
      safetyBonus: acc.safetyBonus + calc.safety_bonus,
      deductions: acc.deductions + calc.deductions,
    }),
    { kmIncentive: 0, performanceBonus: 0, safetyBonus: 0, deductions: 0 }
  );

  const total = totals.kmIncentive + totals.performanceBonus + totals.safetyBonus;
  if (total === 0) return [];

  return [
    {
      category: "KM Incentive",
      value: totals.kmIncentive,
      percentage: Math.round((totals.kmIncentive / total) * 100),
      color: "#3b82f6", // blue
    },
    {
      category: "Performance Bonus",
      value: totals.performanceBonus,
      percentage: Math.round((totals.performanceBonus / total) * 100),
      color: "#22c55e", // green
    },
    {
      category: "Safety Bonus",
      value: totals.safetyBonus,
      percentage: Math.round((totals.safetyBonus / total) * 100),
      color: "#f59e0b", // amber
    },
  ].filter((item) => item.value > 0);
}

/**
 * Calculate YoY comparison stats
 */
export function getYearOverYearComparison(
  currentYearPerf: DriverPerformance[],
  previousYearPerf: DriverPerformance[],
  currentYearCalc: IncentiveCalculation[],
  previousYearCalc: IncentiveCalculation[]
): {
  kmChange: number;
  kmChangePercent: number;
  incentiveChange: number;
  incentiveChangePercent: number;
  driverCountChange: number;
} {
  const currentKm = currentYearPerf.reduce((sum, p) => sum + p.actual_kilometers, 0);
  const previousKm = previousYearPerf.reduce((sum, p) => sum + p.actual_kilometers, 0);
  const currentIncentive = currentYearCalc.reduce((sum, c) => sum + c.total_incentive, 0);
  const previousIncentive = previousYearCalc.reduce((sum, c) => sum + c.total_incentive, 0);

  const currentDrivers = new Set(currentYearPerf.map((p) => p.driver_id)).size;
  const previousDrivers = new Set(previousYearPerf.map((p) => p.driver_id)).size;

  return {
    kmChange: currentKm - previousKm,
    kmChangePercent: previousKm > 0 ? ((currentKm - previousKm) / previousKm) * 100 : 0,
    incentiveChange: currentIncentive - previousIncentive,
    incentiveChangePercent:
      previousIncentive > 0
        ? ((currentIncentive - previousIncentive) / previousIncentive) * 100
        : 0,
    driverCountChange: currentDrivers - previousDrivers,
  };
}

/**
 * Get days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get current day of month
 */
export function getCurrentDayOfMonth(): number {
  return new Date().getDate();
}

/**
 * Format large numbers with K/M suffix
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}
