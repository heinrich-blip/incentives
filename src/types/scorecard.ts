// Scorecard Types
// ============================================

export interface ScorecardRole {
  id: string;
  role_name: string;
  role_code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScorecardKRA {
  id: string;
  role_id: string;
  kra_name: string;
  weighting: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  kpis?: ScorecardKPI[];
}

export interface ScorecardKPI {
  id: string;
  kra_id: string;
  kpi_name: string;
  description: string | null;
  measurement_type: 'percentage' | 'number' | 'currency' | 'ratio' | 'count' | 'yes_no';
  target_direction: 'higher_better' | 'lower_better' | 'exact';
  weighting: number;
  unit: string | null;
  default_target: number | null;
  min_value: number | null;
  max_value: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScorecardTarget {
  id: string;
  kpi_id: string;
  year: number;
  month: number;
  target_value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScorecardEmployee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  role_id: string;
  department: string | null;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  status: 'active' | 'inactive' | 'terminated';
  created_at: string;
  updated_at: string;
  role?: ScorecardRole;
}

export interface ScorecardEntry {
  id: string;
  employee_id: string;
  kpi_id: string;
  year: number;
  month: number;
  actual_value: number;
  target_value: number | null;
  achievement_percentage: number | null;
  score: number | null;
  weighted_score: number | null;
  notes: string | null;
  entered_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ScorecardSummary {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  total_weighted_score: number | null;
  final_rating: string | null;
  safety_incidents: number;
  bonus_eligible: boolean;
  bonus_amount: number | null;
  comments: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  status: 'pending' | 'reviewed' | 'finalized';
  created_at: string;
  updated_at: string;
}

export interface ScorecardScoringRule {
  id: string;
  role_id: string | null;
  min_achievement: number;
  max_achievement: number;
  score: number;
  label: string | null;
  created_at: string;
}

// Extended types for UI
export interface KRAWithKPIs extends ScorecardKRA {
  kpis: ScorecardKPI[];
}

export interface RoleWithKRAs extends ScorecardRole {
  kras: KRAWithKPIs[];
}

export interface EmployeeScorecard {
  employee: ScorecardEmployee;
  year: number;
  month: number;
  kraScores: KRAScore[];
  totalScore: number;
  rating: string;
}

export interface KRAScore {
  kra: ScorecardKRA;
  kpiScores: KPIScore[];
  kraWeightedScore: number;
}

export interface KPIScore {
  kpi: ScorecardKPI;
  target: number;
  actual: number;
  achievementPercent: number;
  score: number;
  weightedScore: number;
}

// Form types
export interface ScorecardEntryForm {
  employee_id: string;
  year: number;
  month: number;
  entries: {
    kpi_id: string;
    actual_value: number;
    notes?: string;
  }[];
}

export interface EmployeeForm {
  employee_id: string;
  first_name: string;
  last_name: string;
  role_id: string;
  department?: string;
  email?: string;
  phone?: string;
  hire_date?: string;
}

// Create types (without auto-generated fields)
export type CreateScorecardEmployee = Omit<ScorecardEmployee, 'id' | 'created_at' | 'updated_at' | 'role'>;
export type CreateScorecardTarget = Omit<ScorecardTarget, 'id' | 'created_at' | 'updated_at'>;
export type CreateScorecardEntry = Omit<ScorecardEntry, 'id' | 'created_at' | 'updated_at'>;

// Calculation helpers
export function calculateAchievementPercentage(
  actual: number,
  target: number,
  direction: 'higher_better' | 'lower_better' | 'exact'
): number {
  if (target === 0) return actual === 0 ? 100 : 0;
  
  if (direction === 'higher_better') {
    return (actual / target) * 100;
  } else if (direction === 'lower_better') {
    // For lower_better, if actual is 0 and target is 0, return 100%
    // If actual exceeds target (bad), return lower percentage
    if (actual === 0) return 100;
    return Math.max(0, (target / actual) * 100);
  } else {
    // Exact match - closer to target = higher percentage
    const diff = Math.abs(actual - target);
    return Math.max(0, 100 - (diff / target) * 100);
  }
}

export function getScoreFromAchievement(
  achievement: number,
  rules: ScorecardScoringRule[]
): { score: number; label: string } {
  const sortedRules = [...rules].sort((a, b) => a.min_achievement - b.min_achievement);
  
  for (const rule of sortedRules) {
    if (achievement >= rule.min_achievement && achievement < rule.max_achievement) {
      return { score: rule.score, label: rule.label || '' };
    }
  }
  
  // Default if no rule matches
  if (achievement >= 100) return { score: 100, label: 'Excellent' };
  if (achievement >= 90) return { score: 90, label: 'Very Good' };
  if (achievement >= 80) return { score: 80, label: 'Good' };
  if (achievement >= 70) return { score: 70, label: 'Satisfactory' };
  if (achievement >= 60) return { score: 60, label: 'Below Average' };
  return { score: 50, label: 'Poor' };
}

export function getFinalRating(totalScore: number): string {
  if (totalScore >= 90) return 'Excellent';
  if (totalScore >= 80) return 'Very Good';
  if (totalScore >= 70) return 'Good';
  if (totalScore >= 60) return 'Satisfactory';
  if (totalScore >= 50) return 'Needs Improvement';
  return 'Unsatisfactory';
}

export function getRatingColor(rating: string): string {
  switch (rating) {
    case 'Excellent': return 'text-green-600 bg-green-100';
    case 'Very Good': return 'text-blue-600 bg-blue-100';
    case 'Good': return 'text-cyan-600 bg-cyan-100';
    case 'Satisfactory': return 'text-yellow-600 bg-yellow-100';
    case 'Needs Improvement': return 'text-orange-600 bg-orange-100';
    case 'Unsatisfactory': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}
