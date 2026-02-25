/**
 * Smart Calculation Engine
 * Phase 2.1: Automated Calculation Features
 */

import type {
    CustomFormula,
    Driver,
    DriverPerformance,
    FuelEfficiencyBonusConfig,
    IncentiveCalculation,
    IncentiveSetting,
    MonthlyBudget,
} from "../types/database";

// ============================================
// TYPES
// ============================================

export interface CalculationInput {
  driver: Driver;
  performance: DriverPerformance;
  budget: MonthlyBudget | null;
  divisor: number;
  formulas: CustomFormula[];
  fuelEfficiencyConfig?: FuelEfficiencyBonusConfig;
}

export interface CalculationResult {
  driverId: string;
  driverName: string;
  year: number;
  month: number;
  baseSalary: number;
  actualKm: number;
  targetKm: number;
  targetKmPerTruck: number;
  ratePerKm: number;
  kmIncentive: number;
  performanceBonus: number;
  safetyBonus: number;
  deductions: number;
  deductionReason: string | null;
  totalIncentive: number;
  totalEarnings: number;
  achievement: number;
  calculationDetails: CalculationDetails;
}

export interface CalculationDetails {
  budget_km: number;
  truck_count: number;
  target_km_per_truck: number;
  divisor: number;
  rate_per_km: number;
  actual_km: number;
  formula_applied?: string;
  bonus_breakdown?: BonusBreakdown;
}

export interface BonusBreakdown {
  safety_score?: number;
  safety_bonus_rate?: number;
  safety_bonus?: number;
  on_time_rate?: number;
  on_time_bonus?: number;
  customer_rating?: number;
  customer_bonus?: number;
  fuel_efficiency?: number;
  fuel_efficiency_bonus?: number;
  fuel_efficiency_tier?: string;
}

export interface WhatIfScenario {
  scenarioName: string;
  additionalKm: number;
  projectedKm: number;
  projectedIncentive: number;
  projectedEarnings: number;
  projectedAchievement: number;
  difference: {
    km: number;
    incentive: number;
    earnings: number;
    achievement: number;
  };
}

export interface BatchCalculationResult {
  success: CalculationResult[];
  failed: { driverId: string; driverName: string; reason: string }[];
  summary: {
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    totalIncentives: number;
    totalEarnings: number;
  };
}

export interface AuditEntry {
  id?: string;
  tableName: string;
  recordId: string;
  action: "insert" | "update" | "delete" | "batch_calculate" | "approve" | "rollback";
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedBy: string;
  changedAt: Date;
  metadata?: {
    reason?: string;
    batchId?: string;
    scenarioName?: string;
  };
}

export interface CalculationSnapshot {
  id: string;
  calculationId: string;
  snapshotData: IncentiveCalculation;
  createdAt: Date;
  createdBy: string;
  reason: string;
}

// ============================================
// CORE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate incentive for a single driver
 */
export function calculateDriverIncentive(input: CalculationInput): CalculationResult {
  const { driver, performance, budget, divisor, formulas, fuelEfficiencyConfig } = input;

  const budgetKm = budget?.budgeted_kilometers || 0;
  const truckCount = budget?.truck_count || 1;
  const targetKmPerTruck = truckCount > 0 ? budgetKm / truckCount : 0;
  const actualKm = performance.actual_kilometers;

  // Calculate rate per KM: Divisor ÷ Target KM per Truck
  const ratePerKm = targetKmPerTruck > 0 && divisor > 0 ? divisor / targetKmPerTruck : 0;

  // Calculate KM incentive
  const kmIncentive = actualKm * ratePerKm;

  // Calculate achievement percentage
  const achievement = budgetKm > 0 ? (actualKm / budgetKm) * 100 : 0;

  // Calculate bonuses based on performance metrics (including fuel efficiency)
  const bonusBreakdown = calculateBonuses(performance, formulas, fuelEfficiencyConfig);
  const performanceBonus = (bonusBreakdown.on_time_bonus || 0) + (bonusBreakdown.customer_bonus || 0);
  const safetyBonus = bonusBreakdown.safety_bonus || 0;
  const fuelEfficiencyBonus = bonusBreakdown.fuel_efficiency_bonus || 0;

  // Total incentive (KM + bonuses + fuel efficiency bonus - deductions)
  const totalIncentive = kmIncentive + performanceBonus + safetyBonus + fuelEfficiencyBonus;
  const totalEarnings = driver.base_salary + totalIncentive;

  return {
    driverId: driver.id,
    driverName: `${driver.first_name} ${driver.last_name}`,
    year: performance.year,
    month: performance.month,
    baseSalary: driver.base_salary,
    actualKm,
    targetKm: budgetKm,
    targetKmPerTruck,
    ratePerKm,
    kmIncentive,
    performanceBonus,
    safetyBonus,
    deductions: 0,
    deductionReason: null,
    totalIncentive,
    totalEarnings,
    achievement,
    calculationDetails: {
      budget_km: budgetKm,
      truck_count: truckCount,
      target_km_per_truck: targetKmPerTruck,
      divisor,
      rate_per_km: ratePerKm,
      actual_km: actualKm,
      bonus_breakdown: bonusBreakdown,
    },
  };
}

/**
 * Calculate bonuses based on performance metrics
 */
function calculateBonuses(
  performance: DriverPerformance,
  formulas: CustomFormula[],
  fuelEfficiencyConfig?: FuelEfficiencyBonusConfig
): BonusBreakdown {
  const breakdown: BonusBreakdown = {};

  // Safety bonus calculation
  if (performance.safety_score !== null && performance.safety_score !== undefined) {
    breakdown.safety_score = performance.safety_score;
    // Apply safety formula if exists, otherwise use default
    const safetyFormula = formulas.find(
      (f) => f.formula_key === "safety_bonus" && f.is_active
    );
    if (safetyFormula) {
      try {
        // Simple evaluation - in production use a proper formula parser
        const safetyBonus = performance.safety_score >= 95 ? 500 : performance.safety_score >= 90 ? 300 : 0;
        breakdown.safety_bonus_rate = safetyBonus;
        breakdown.safety_bonus = safetyBonus;
      } catch {
        breakdown.safety_bonus_rate = 0;
        breakdown.safety_bonus = 0;
      }
    } else {
      // Default safety bonus calculation
      const safetyBonus = performance.safety_score >= 95 ? 500 : performance.safety_score >= 90 ? 300 : 0;
      breakdown.safety_bonus = safetyBonus;
    }
  }

  // On-time delivery bonus
  if (performance.on_time_delivery_rate !== null && performance.on_time_delivery_rate !== undefined) {
    breakdown.on_time_rate = performance.on_time_delivery_rate;
    const onTimeBonus = performance.on_time_delivery_rate >= 98 ? 300 : 
                        performance.on_time_delivery_rate >= 95 ? 200 : 0;
    breakdown.on_time_bonus = onTimeBonus;
  }

  // Customer rating bonus
  if (performance.customer_rating !== null && performance.customer_rating !== undefined) {
    breakdown.customer_rating = performance.customer_rating;
    const customerBonus = performance.customer_rating >= 4.8 ? 200 : 
                          performance.customer_rating >= 4.5 ? 100 : 0;
    breakdown.customer_bonus = customerBonus;
  }

  // Fuel efficiency bonus calculation
  if (performance.fuel_efficiency !== null && performance.fuel_efficiency !== undefined) {
    breakdown.fuel_efficiency = performance.fuel_efficiency;
    
    if (fuelEfficiencyConfig?.enabled && fuelEfficiencyConfig.tiers.length > 0) {
      // Find matching tier based on fuel efficiency (km/L)
      const matchingTier = fuelEfficiencyConfig.tiers.find(
        tier => performance.fuel_efficiency! >= tier.min_efficiency && 
                performance.fuel_efficiency! < tier.max_efficiency
      );
      
      if (matchingTier) {
        breakdown.fuel_efficiency_bonus = matchingTier.bonus_amount;
        breakdown.fuel_efficiency_tier = `${matchingTier.min_efficiency}-${matchingTier.max_efficiency} km/L`;
      } else {
        breakdown.fuel_efficiency_bonus = 0;
      }
    }
  }

  return breakdown;
}

// ============================================
// BATCH CALCULATION
// ============================================

/**
 * Batch calculate incentives for all drivers in a period
 */
export function batchCalculateIncentives(
  drivers: Driver[],
  performances: DriverPerformance[],
  budgets: MonthlyBudget[],
  settings: IncentiveSetting[],
  formulas: CustomFormula[],
  year: number,
  month: number
): BatchCalculationResult {
  const success: CalculationResult[] = [];
  const failed: { driverId: string; driverName: string; reason: string }[] = [];

  // Get divisors
  const localDivisor = getDivisor(settings, "local");
  const exportDivisor = getDivisor(settings, "export");

  // Get fuel efficiency configs
  const localFuelConfig = getFuelEfficiencyConfig(settings, "local");
  const exportFuelConfig = getFuelEfficiencyConfig(settings, "export");

  // Filter active drivers
  const activeDrivers = drivers.filter((d) => d.status === "active");

  for (const driver of activeDrivers) {
    try {
      // Find performance record for this driver and period
      const performance = performances.find(
        (p) => p.driver_id === driver.id && p.year === year && p.month === month
      );

      if (!performance) {
        failed.push({
          driverId: driver.id,
          driverName: `${driver.first_name} ${driver.last_name}`,
          reason: "No performance record for this period",
        });
        continue;
      }

      // Find budget for driver type
      const budget = budgets.find(
        (b) => b.year === year && b.month === month && b.driver_type === driver.driver_type
      ) || null;

      const divisor = driver.driver_type === "export" ? exportDivisor : localDivisor;
      const fuelConfig = driver.driver_type === "export" ? exportFuelConfig : localFuelConfig;

      const result = calculateDriverIncentive({
        driver,
        performance,
        budget,
        divisor,
        formulas,
        fuelEfficiencyConfig: fuelConfig,
      });

      success.push(result);
    } catch (error) {
      failed.push({
        driverId: driver.id,
        driverName: `${driver.first_name} ${driver.last_name}`,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Calculate summary
  const totalIncentives = success.reduce((sum, r) => sum + r.totalIncentive, 0);
  const totalEarnings = success.reduce((sum, r) => sum + r.totalEarnings, 0);

  return {
    success,
    failed,
    summary: {
      totalProcessed: activeDrivers.length,
      successCount: success.length,
      failedCount: failed.length,
      totalIncentives,
      totalEarnings,
    },
  };
}

/**
 * Get divisor from settings
 */
function getDivisor(settings: IncentiveSetting[], type: "local" | "export"): number {
  const key = type === "local" ? "incentive_divisor_local" : "incentive_divisor_export";
  const setting = settings.find((s) => s.setting_key === key && s.is_active);
  return setting ? (setting.setting_value as number) : 1;
}

/**
 * Get fuel efficiency bonus config from settings
 */
export function getFuelEfficiencyConfig(
  settings: IncentiveSetting[], 
  type: "local" | "export"
): FuelEfficiencyBonusConfig {
  const key = type === "local" ? "fuel_efficiency_bonus_local" : "fuel_efficiency_bonus_export";
  const setting = settings.find((s) => s.setting_key === key && s.is_active);
  
  if (setting && typeof setting.setting_value === "object" && setting.setting_value !== null) {
    const config = setting.setting_value as unknown as FuelEfficiencyBonusConfig;
    return {
      enabled: config.enabled ?? false,
      tiers: config.tiers ?? [],
    };
  }
  
  return { enabled: false, tiers: [] };
}

/**
 * Default fuel efficiency tiers for Local drivers (as provided)
 */
export const DEFAULT_LOCAL_FUEL_TIERS: FuelEfficiencyBonusConfig = {
  enabled: true,
  tiers: [
    { id: "1", min_efficiency: 1.95, max_efficiency: 2.05, bonus_amount: 20 },
    { id: "2", min_efficiency: 2.05, max_efficiency: 2.15, bonus_amount: 40 },
    { id: "3", min_efficiency: 2.15, max_efficiency: 2.25, bonus_amount: 60 },
    { id: "4", min_efficiency: 2.25, max_efficiency: 2.35, bonus_amount: 80 },
  ],
};

/**
 * Default fuel efficiency tiers for Export drivers
 */
export const DEFAULT_EXPORT_FUEL_TIERS: FuelEfficiencyBonusConfig = {
  enabled: true,
  tiers: [
    { id: "1", min_efficiency: 1.95, max_efficiency: 2.05, bonus_amount: 25 },
    { id: "2", min_efficiency: 2.05, max_efficiency: 2.15, bonus_amount: 50 },
    { id: "3", min_efficiency: 2.15, max_efficiency: 2.25, bonus_amount: 75 },
    { id: "4", min_efficiency: 2.25, max_efficiency: 2.35, bonus_amount: 100 },
  ],
};

// ============================================
// WHAT-IF SCENARIO CALCULATOR
// ============================================

/**
 * Calculate what-if scenarios for a driver
 */
export function calculateWhatIfScenarios(
  currentResult: CalculationResult,
  scenarios: { name: string; additionalKm: number }[]
): WhatIfScenario[] {
  return scenarios.map((scenario) => {
    const projectedKm = currentResult.actualKm + scenario.additionalKm;
    const projectedIncentive = projectedKm * currentResult.ratePerKm + 
                               currentResult.performanceBonus + 
                               currentResult.safetyBonus;
    const projectedEarnings = currentResult.baseSalary + projectedIncentive;
    const projectedAchievement = currentResult.targetKm > 0 
      ? (projectedKm / currentResult.targetKm) * 100 
      : 0;

    return {
      scenarioName: scenario.name,
      additionalKm: scenario.additionalKm,
      projectedKm,
      projectedIncentive,
      projectedEarnings,
      projectedAchievement,
      difference: {
        km: scenario.additionalKm,
        incentive: projectedIncentive - currentResult.totalIncentive,
        earnings: projectedEarnings - currentResult.totalEarnings,
        achievement: projectedAchievement - currentResult.achievement,
      },
    };
  });
}

/**
 * Generate common what-if scenarios
 */
export function generateDefaultScenarios(
  currentKm: number,
  targetKm: number
): { name: string; additionalKm: number }[] {
  const scenarios: { name: string; additionalKm: number }[] = [];

  // Scenario: Reach 100% target
  if (currentKm < targetKm) {
    scenarios.push({
      name: "Reach 100% Target",
      additionalKm: targetKm - currentKm,
    });
  }

  // Scenario: +10% more KM
  scenarios.push({
    name: "+10% More KM",
    additionalKm: Math.round(currentKm * 0.1),
  });

  // Scenario: +500 KM
  scenarios.push({
    name: "+500 KM",
    additionalKm: 500,
  });

  // Scenario: +1000 KM
  scenarios.push({
    name: "+1,000 KM",
    additionalKm: 1000,
  });

  // Scenario: Reach 110% target
  if (currentKm < targetKm * 1.1) {
    scenarios.push({
      name: "Reach 110% Target",
      additionalKm: Math.round(targetKm * 1.1 - currentKm),
    });
  }

  return scenarios;
}

// ============================================
// WORKFLOW STATUS HELPERS
// ============================================

export type WorkflowStatus = "draft" | "pending_approval" | "approved" | "paid";

export interface WorkflowTransition {
  from: WorkflowStatus;
  to: WorkflowStatus;
  label: string;
  requiresApprover: boolean;
}

export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  { from: "draft", to: "pending_approval", label: "Submit for Approval", requiresApprover: false },
  { from: "pending_approval", to: "approved", label: "Approve", requiresApprover: true },
  { from: "pending_approval", to: "draft", label: "Return to Draft", requiresApprover: false },
  { from: "approved", to: "paid", label: "Mark as Paid", requiresApprover: false },
  { from: "approved", to: "draft", label: "Revert to Draft", requiresApprover: true },
];

export function getAvailableTransitions(currentStatus: WorkflowStatus): WorkflowTransition[] {
  return WORKFLOW_TRANSITIONS.filter((t) => t.from === currentStatus);
}

export function getStatusColor(status: WorkflowStatus): string {
  switch (status) {
    case "draft":
      return "bg-surface-100 text-surface-700";
    case "pending_approval":
      return "bg-amber-100 text-amber-700";
    case "approved":
      return "bg-green-100 text-green-700";
    case "paid":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-surface-100 text-surface-700";
  }
}

export function getStatusLabel(status: WorkflowStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_approval":
      return "Pending Approval";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    default:
      return status;
  }
}

// ============================================
// AUDIT HELPERS
// ============================================

/**
 * Create an audit entry for tracking changes
 */
export function createAuditEntry(
  tableName: string,
  recordId: string,
  action: AuditEntry["action"],
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  changedBy: string,
  metadata?: AuditEntry["metadata"]
): AuditEntry {
  return {
    tableName,
    recordId,
    action,
    oldValues,
    newValues,
    changedBy,
    changedAt: new Date(),
    metadata,
  };
}

/**
 * Format audit entry for display
 */
export function formatAuditEntry(entry: AuditEntry): string {
  const actionLabels: Record<AuditEntry["action"], string> = {
    insert: "Created",
    update: "Updated",
    delete: "Deleted",
    batch_calculate: "Batch Calculated",
    approve: "Approved",
    rollback: "Rolled Back",
  };

  return `${actionLabels[entry.action]} by ${entry.changedBy} on ${entry.changedAt.toLocaleString()}`;
}

// ============================================
// CONVERSION HELPERS
// ============================================

/**
 * Convert calculation result to database format
 */
export function resultToIncentiveCalculation(
  result: CalculationResult,
  status: WorkflowStatus = "draft"
): Omit<IncentiveCalculation, "id" | "created_at" | "updated_at"> {
  return {
    driver_id: result.driverId,
    year: result.year,
    month: result.month,
    base_salary: result.baseSalary,
    km_incentive: result.kmIncentive,
    performance_bonus: result.performanceBonus,
    safety_bonus: result.safetyBonus,
    deductions: result.deductions,
    deduction_reason: result.deductionReason,
    total_incentive: result.totalIncentive,
    total_earnings: result.totalEarnings,
    calculation_details: result.calculationDetails as unknown as IncentiveCalculation["calculation_details"],
    status,
    approved_by: null,
    approved_date: null,
    paid_date: null,
  };
}
