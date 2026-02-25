// Database types generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Driver types
export interface DriverRow {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  hire_date: string;
  license_number: string;
  license_expiry: string | null;
  license_class: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  driver_type: "local" | "export";
  status: "active" | "inactive" | "suspended" | "terminated";
  usd_base_salary: number;
  zig_base_salary: number;
  base_salary: number; // Computed: usd_base_salary + (zig_base_salary / conversion_rate)
  profile_image_url: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type DriverInsert = Omit<DriverRow, "id" | "created_at" | "updated_at">;
export type DriverUpdate = Partial<DriverInsert>;

// Accident types
export interface AccidentRow {
  id: string;
  driver_id: string;
  incident_date: string;
  incident_type: "minor" | "moderate" | "severe" | "fatal";
  description: string;
  location: string | null;
  vehicle_damage_cost: number;
  third_party_cost: number;
  insurance_claim_number: string | null;
  insurance_status: "pending" | "approved" | "rejected" | "settled";
  at_fault: boolean;
  police_report_number: string | null;
  witnesses: string | null;
  resolution: string | null;
  resolved_date: string | null;
  created_at: string;
  updated_at: string;
}
export type AccidentInsert = Omit<
  AccidentRow,
  "id" | "created_at" | "updated_at"
>;
export type AccidentUpdate = Partial<AccidentInsert>;

// Incident types
export interface IncidentRow {
  id: string;
  driver_id: string;
  incident_date: string;
  incident_type:
    | "traffic_violation"
    | "customer_complaint"
    | "vehicle_misuse"
    | "safety_violation"
    | "policy_violation"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  action_taken: string | null;
  fine_amount: number;
  resolved: boolean;
  resolved_date: string | null;
  created_at: string;
  updated_at: string;
}
export type IncidentInsert = Omit<
  IncidentRow,
  "id" | "created_at" | "updated_at"
>;
export type IncidentUpdate = Partial<IncidentInsert>;

// Disciplinary record types
export interface DisciplinaryRecordRow {
  id: string;
  driver_id: string;
  record_date: string;
  record_type:
    | "verbal_warning"
    | "written_warning"
    | "final_warning"
    | "suspension"
    | "termination"
    | "other";
  reason: string;
  description: string | null;
  issued_by: string | null;
  duration_days: number | null;
  start_date: string | null;
  end_date: string | null;
  appeal_status: "none" | "pending" | "approved" | "rejected" | null;
  documents: string[] | null;
  created_at: string;
  updated_at: string;
}
export type DisciplinaryRecordInsert = Omit<
  DisciplinaryRecordRow,
  "id" | "created_at" | "updated_at"
>;
export type DisciplinaryRecordUpdate = Partial<DisciplinaryRecordInsert>;

// Leave record types
export interface LeaveRecordRow {
  id: string;
  driver_id: string;
  leave_type:
    | "annual"
    | "sick"
    | "unpaid"
    | "maternity"
    | "paternity"
    | "compassionate"
    | "other";
  start_date: string;
  end_date: string;
  total_days: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string | null;
  approved_by: string | null;
  approved_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type LeaveRecordInsert = Omit<
  LeaveRecordRow,
  "id" | "created_at" | "updated_at"
>;
export type LeaveRecordUpdate = Partial<LeaveRecordInsert>;

// Incentive settings types
export interface IncentiveSettingRow {
  id: string;
  setting_key: string;
  setting_value: Json;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type IncentiveSettingInsert = Omit<
  IncentiveSettingRow,
  "id" | "created_at" | "updated_at"
>;
export type IncentiveSettingUpdate = Partial<IncentiveSettingInsert>;

// Kilometer rate types
export interface KilometerRateRow {
  id: string;
  driver_type: "local" | "export";
  rate_per_km: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type KilometerRateInsert = Omit<
  KilometerRateRow,
  "id" | "created_at" | "updated_at"
>;
export type KilometerRateUpdate = Partial<KilometerRateInsert>;

// Monthly budget types
export interface MonthlyBudgetRow {
  id: string;
  year: number;
  month: number;
  driver_type: "local" | "export";
  budgeted_kilometers: number;
  truck_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type MonthlyBudgetInsert = Omit<
  MonthlyBudgetRow,
  "id" | "created_at" | "updated_at"
>;
export type MonthlyBudgetUpdate = Partial<MonthlyBudgetInsert>;

// ZIG to USD Conversion Rate types (month-on-month)
export interface ZigUsdConversionRateRow {
  id: string;
  year: number;
  month: number;
  rate: number; // ZIG amount per 1 USD
  effective_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type ZigUsdConversionRateInsert = Omit<
  ZigUsdConversionRateRow,
  "id" | "created_at" | "updated_at"
>;
export type ZigUsdConversionRateUpdate = Partial<ZigUsdConversionRateInsert>;
export type ZigUsdConversionRate = ZigUsdConversionRateRow;

// Driver Salary History types (month-on-month salary tracking)
export interface DriverSalaryHistoryRow {
  id: string;
  driver_id: string;
  year: number;
  month: number;
  usd_base_salary: number;
  zig_base_salary: number;
  effective_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type DriverSalaryHistoryInsert = Omit<
  DriverSalaryHistoryRow,
  "id" | "created_at" | "updated_at"
>;
export type DriverSalaryHistoryUpdate = Partial<DriverSalaryHistoryInsert>;
export type DriverSalaryHistory = DriverSalaryHistoryRow;

// Driver performance types
export interface DriverPerformanceRow {
  id: string;
  driver_id: string;
  year: number;
  month: number;
  actual_kilometers: number;
  trips_completed: number;
  fuel_efficiency: number | null;
  on_time_delivery_rate: number | null;
  customer_rating: number | null;
  safety_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type DriverPerformanceInsert = Omit<
  DriverPerformanceRow,
  "id" | "created_at" | "updated_at"
>;
export type DriverPerformanceUpdate = Partial<DriverPerformanceInsert>;

// Incentive calculation types
export interface IncentiveCalculationRow {
  id: string;
  driver_id: string;
  year: number;
  month: number;
  base_salary: number;
  km_incentive: number;
  performance_bonus: number;
  safety_bonus: number;
  deductions: number;
  deduction_reason: string | null;
  total_incentive: number;
  total_earnings: number;
  calculation_details: Json | null;
  status: "draft" | "pending_approval" | "approved" | "paid";
  approved_by: string | null;
  approved_date: string | null;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
}
export type IncentiveCalculationInsert = Omit<
  IncentiveCalculationRow,
  "id" | "created_at" | "updated_at"
>;
export type IncentiveCalculationUpdate = Partial<IncentiveCalculationInsert>;

// Custom formula types
export interface CustomFormulaRow {
  id: string;
  formula_name: string;
  formula_key: string;
  formula_expression: string;
  description: string | null;
  applies_to: "all" | "local" | "export" | null;
  is_active: boolean;
  priority: number;
  variables: Json | null;
  created_at: string;
  updated_at: string;
}
export type CustomFormulaInsert = Omit<
  CustomFormulaRow,
  "id" | "created_at" | "updated_at"
>;
export type CustomFormulaUpdate = Partial<CustomFormulaInsert>;

// Database interface for Supabase client
export interface Database {
  public: {
    Tables: {
      drivers: {
        Row: DriverRow;
        Insert: DriverInsert;
        Update: DriverUpdate;
      };
      accidents: {
        Row: AccidentRow;
        Insert: AccidentInsert;
        Update: AccidentUpdate;
      };
      incidents: {
        Row: IncidentRow;
        Insert: IncidentInsert;
        Update: IncidentUpdate;
      };
      disciplinary_records: {
        Row: DisciplinaryRecordRow;
        Insert: DisciplinaryRecordInsert;
        Update: DisciplinaryRecordUpdate;
      };
      leave_records: {
        Row: LeaveRecordRow;
        Insert: LeaveRecordInsert;
        Update: LeaveRecordUpdate;
      };
      incentive_settings: {
        Row: IncentiveSettingRow;
        Insert: IncentiveSettingInsert;
        Update: IncentiveSettingUpdate;
      };
      kilometer_rates: {
        Row: KilometerRateRow;
        Insert: KilometerRateInsert;
        Update: KilometerRateUpdate;
      };
      monthly_budgets: {
        Row: MonthlyBudgetRow;
        Insert: MonthlyBudgetInsert;
        Update: MonthlyBudgetUpdate;
      };
      driver_performance: {
        Row: DriverPerformanceRow;
        Insert: DriverPerformanceInsert;
        Update: DriverPerformanceUpdate;
      };
      incentive_calculations: {
        Row: IncentiveCalculationRow;
        Insert: IncentiveCalculationInsert;
        Update: IncentiveCalculationUpdate;
      };
      custom_formulas: {
        Row: CustomFormulaRow;
        Insert: CustomFormulaInsert;
        Update: CustomFormulaUpdate;
      };
    };
  };
}

// Convenience type aliases for backwards compatibility
export type Driver = DriverRow;
export type Accident = AccidentRow;
export type Incident = IncidentRow;
export type DisciplinaryRecord = DisciplinaryRecordRow;
export type LeaveRecord = LeaveRecordRow;
export type IncentiveSetting = IncentiveSettingRow;
export type KilometerRate = KilometerRateRow;
export type MonthlyBudget = MonthlyBudgetRow;
export type DriverPerformance = DriverPerformanceRow;
export type IncentiveCalculation = IncentiveCalculationRow;
export type CustomFormula = CustomFormulaRow;

// Extended types with relations
export interface DriverWithRelations extends Driver {
  accidents?: Accident[];
  incidents?: Incident[];
  disciplinary_records?: DisciplinaryRecord[];
  leave_records?: LeaveRecord[];
  performance?: DriverPerformance[];
  incentive_calculations?: IncentiveCalculation[];
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export interface AuditLogRow {
  id: string;
  table_name: string;
  record_id: string;
  action: "insert" | "update" | "delete" | "batch_calculate" | "approve" | "rollback";
  old_values: Json | null;
  new_values: Json | null;
  changed_by: string | null;
  changed_at: string;
  metadata?: Json;
}

export type AuditLog = AuditLogRow;

export type AuditLogInsert = Omit<AuditLogRow, "id" | "changed_at">;

// ============================================
// CALCULATION SNAPSHOT TYPES (for undo/rollback)
// ============================================

export interface CalculationSnapshotRow {
  id: string;
  calculation_id: string;
  driver_id: string;
  year: number;
  month: number;
  snapshot_data: Json;
  created_at: string;
  created_by: string | null;
  reason: string | null;
}

export type CalculationSnapshot = CalculationSnapshotRow;

export type CalculationSnapshotInsert = Omit<CalculationSnapshotRow, "id" | "created_at">;

// ============================================
// FUEL EFFICIENCY BONUS TYPES
// ============================================

export interface FuelEfficiencyTier {
  id: string;
  min_efficiency: number;  // km/L (lower bound, inclusive)
  max_efficiency: number;  // km/L (upper bound, exclusive)
  bonus_amount: number;    // USD bonus
}

export interface FuelEfficiencyBonusConfig {
  enabled: boolean;
  tiers: FuelEfficiencyTier[];
}

// ============================================
// BATCH CALCULATION TYPES
// ============================================

export interface BatchCalculationJobRow {
  id: string;
  year: number;
  month: number;
  status: "pending" | "processing" | "completed" | "failed";
  total_drivers: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  total_incentives: number;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  error_log: Json | null;
}

export type BatchCalculationJob = BatchCalculationJobRow;
