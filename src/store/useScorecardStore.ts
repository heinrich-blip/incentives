import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type {
    RoleWithKRAs,
    ScorecardEmployee,
    ScorecardEntry,
    ScorecardKPI,
    ScorecardKRA,
    ScorecardRole,
    ScorecardScoringRule,
    ScorecardSummary,
    ScorecardTarget,
} from "../types/scorecard";

interface ScorecardState {
  // Data
  roles: ScorecardRole[];
  kras: ScorecardKRA[];
  kpis: ScorecardKPI[];
  targets: ScorecardTarget[];
  employees: ScorecardEmployee[];
  entries: ScorecardEntry[];
  summaries: ScorecardSummary[];
  scoringRules: ScorecardScoringRule[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchRoles: () => Promise<void>;
  fetchKRAsForRole: (roleId: string) => Promise<ScorecardKRA[]>;
  fetchKPIsForKRA: (kraId: string) => Promise<ScorecardKPI[]>;
  fetchRoleWithKRAs: (roleId: string) => Promise<RoleWithKRAs | null>;
  fetchAllRolesWithKRAs: () => Promise<RoleWithKRAs[]>;
  fetchEmployees: () => Promise<void>;
  fetchEmployeesByRole: (roleId: string) => Promise<ScorecardEmployee[]>;
  fetchTargets: (year: number, month?: number) => Promise<ScorecardTarget[]>;
  fetchEntries: (employeeId: string, year: number, month: number) => Promise<ScorecardEntry[]>;
  fetchSummary: (employeeId: string, year: number, month: number) => Promise<ScorecardSummary | null>;
  fetchScoringRules: () => Promise<void>;
  
  // Employee CRUD
  addEmployee: (employee: Omit<ScorecardEmployee, 'id' | 'created_at' | 'updated_at'>) => Promise<ScorecardEmployee | null>;
  createEmployee: (employee: Omit<ScorecardEmployee, 'id' | 'created_at' | 'updated_at'>) => Promise<ScorecardEmployee | null>;
  updateEmployee: (id: string, data: Partial<ScorecardEmployee>) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
  
  // Target CRUD
  setTarget: (kpiId: string, year: number, month: number, targetValue: number, notes?: string) => Promise<boolean>;
  createTarget: (target: Omit<ScorecardTarget, 'id' | 'created_at' | 'updated_at'>) => Promise<ScorecardTarget | null>;
  updateTarget: (id: string, data: Partial<ScorecardTarget>) => Promise<boolean>;
  deleteTarget: (id: string) => Promise<boolean>;
  
  // Entry operations
  saveEntry: (entry: Omit<ScorecardEntry, 'id' | 'created_at' | 'updated_at'>) => Promise<ScorecardEntry | null>;
  saveEntries: (entries: Omit<ScorecardEntry, 'id' | 'created_at' | 'updated_at'>[]) => Promise<boolean>;
  
  saveSummary: (summary: Omit<ScorecardSummary, 'id' | 'created_at' | 'updated_at'>) => Promise<ScorecardSummary | null>;
  
  // KRA CRUD
  createKRA: (kra: Omit<ScorecardKRA, 'id' | 'created_at' | 'updated_at' | 'kpis'>) => Promise<ScorecardKRA | null>;
  updateKRA: (id: string, data: Partial<ScorecardKRA>) => Promise<boolean>;
  deleteKRA: (id: string) => Promise<boolean>;
  
  // KPI CRUD
  createKPI: (kpi: Omit<ScorecardKPI, 'id' | 'created_at' | 'updated_at'>) => Promise<ScorecardKPI | null>;
  updateKPI: (id: string, data: Partial<ScorecardKPI>) => Promise<boolean>;
  deleteKPI: (id: string) => Promise<boolean>;
}

export const useScorecardStore = create<ScorecardState>((set, get) => ({
  // Initial state
  roles: [],
  kras: [],
  kpis: [],
  targets: [],
  employees: [],
  entries: [],
  summaries: [],
  scoringRules: [],
  isLoading: false,
  error: null,

  // Fetch roles
  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("scorecard_roles")
        .select("*")
        .eq("is_active", true)
        .order("role_name");

      if (error) throw error;
      set({ roles: data || [], isLoading: false });
    } catch (error) {
      console.error("Error fetching roles:", error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Fetch KRAs for a role
  fetchKRAsForRole: async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_kras")
        .select("*")
        .eq("role_id", roleId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching KRAs:", error);
      return [];
    }
  },

  // Fetch KPIs for a KRA
  fetchKPIsForKRA: async (kraId: string) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_kpis")
        .select("*")
        .eq("kra_id", kraId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      return [];
    }
  },

  // Fetch role with all KRAs and KPIs
  fetchRoleWithKRAs: async (roleId: string) => {
    try {
      const { data: role, error: roleError } = await supabase
        .from("scorecard_roles")
        .select("*")
        .eq("id", roleId)
        .single();

      if (roleError) throw roleError;

      const { data: kras, error: kraError } = await supabase
        .from("scorecard_kras")
        .select("*")
        .eq("role_id", roleId)
        .eq("is_active", true)
        .order("sort_order");

      if (kraError) throw kraError;

      const krasWithKPIs = await Promise.all(
        (kras || []).map(async (kra: ScorecardKRA) => {
          const { data: kpis } = await supabase
            .from("scorecard_kpis")
            .select("*")
            .eq("kra_id", kra.id)
            .eq("is_active", true)
            .order("sort_order");

          return { ...kra, kpis: kpis || [] };
        })
      );

      return { ...role, kras: krasWithKPIs };
    } catch (error) {
      console.error("Error fetching role with KRAs:", error);
      return null;
    }
  },

  // Fetch all roles with KRAs
  fetchAllRolesWithKRAs: async () => {
    try {
      const { data: roles, error } = await supabase
        .from("scorecard_roles")
        .select("*")
        .eq("is_active", true)
        .order("role_name");

      if (error) throw error;

      const rolesWithKRAs = await Promise.all(
        (roles || []).map(async (role: ScorecardRole) => {
          const result = await get().fetchRoleWithKRAs(role.id);
          return result!;
        })
      );

      return rolesWithKRAs.filter(Boolean);
    } catch (error) {
      console.error("Error fetching all roles:", error);
      return [];
    }
  },

  // Fetch employees
  fetchEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("scorecard_employees")
        .select(`
          *,
          role:scorecard_roles(*)
        `)
        .order("last_name");

      if (error) throw error;
      set({ employees: data || [], isLoading: false });
    } catch (error) {
      console.error("Error fetching employees:", error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Fetch employees by role
  fetchEmployeesByRole: async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_employees")
        .select(`
          *,
          role:scorecard_roles(*)
        `)
        .eq("role_id", roleId)
        .eq("status", "active")
        .order("last_name");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching employees by role:", error);
      return [];
    }
  },

  // Fetch targets
  fetchTargets: async (year: number, month?: number) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from("scorecard_targets")
        .select("*")
        .eq("year", year);

      if (month) {
        query = query.eq("month", month);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ targets: data || [], isLoading: false });
      return data || [];
    } catch (error) {
      console.error("Error fetching targets:", error);
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },

  // Fetch entries for an employee
  fetchEntries: async (employeeId: string, year: number, month: number) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_entries")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("year", year)
        .eq("month", month);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching entries:", error);
      return [];
    }
  },

  // Fetch summary
  fetchSummary: async (employeeId: string, year: number, month: number) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_summaries")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("year", year)
        .eq("month", month)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (error) {
      console.error("Error fetching summary:", error);
      return null;
    }
  },

  // Fetch scoring rules
  fetchScoringRules: async () => {
    try {
      const { data, error } = await supabase
        .from("scorecard_scoring_rules")
        .select("*")
        .order("min_achievement");

      if (error) throw error;
      set({ scoringRules: data || [] });
    } catch (error) {
      console.error("Error fetching scoring rules:", error);
    }
  },

  // Add employee
  addEmployee: async (employee) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_employees")
        .insert(employee)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh employees list
      await get().fetchEmployees();
      return data;
    } catch (error) {
      console.error("Error adding employee:", error);
      return null;
    }
  },

  // Create employee (alias for addEmployee)
  createEmployee: async (employee) => {
    return get().addEmployee(employee);
  },

  // Update employee
  updateEmployee: async (id, data) => {
    try {
      const { error } = await supabase
        .from("scorecard_employees")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      
      await get().fetchEmployees();
      return true;
    } catch (error) {
      console.error("Error updating employee:", error);
      return false;
    }
  },

  // Delete employee
  deleteEmployee: async (id) => {
    try {
      const { error } = await supabase
        .from("scorecard_employees")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      await get().fetchEmployees();
      return true;
    } catch (error) {
      console.error("Error deleting employee:", error);
      return false;
    }
  },

  // Set target
  setTarget: async (kpiId, year, month, targetValue, notes) => {
    try {
      const { error } = await supabase
        .from("scorecard_targets")
        .upsert({
          kpi_id: kpiId,
          year,
          month,
          target_value: targetValue,
          notes,
        }, {
          onConflict: "kpi_id,year,month",
        });

      if (error) throw error;
      
      await get().fetchTargets(year, month);
      return true;
    } catch (error) {
      console.error("Error setting target:", error);
      return false;
    }
  },

  // Create target
  createTarget: async (target) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_targets")
        .insert(target)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating target:", error);
      return null;
    }
  },

  // Update target
  updateTarget: async (id, data) => {
    try {
      const { error } = await supabase
        .from("scorecard_targets")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating target:", error);
      return false;
    }
  },

  // Delete target
  deleteTarget: async (id) => {
    try {
      const { error } = await supabase
        .from("scorecard_targets")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting target:", error);
      return false;
    }
  },

  // Save entry
  saveEntry: async (entry) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_entries")
        .upsert(entry, {
          onConflict: "employee_id,kpi_id,year,month",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error saving entry:", error);
      return null;
    }
  },

  // Save multiple entries
  saveEntries: async (entries) => {
    try {
      const { error } = await supabase
        .from("scorecard_entries")
        .upsert(entries, {
          onConflict: "employee_id,kpi_id,year,month",
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error saving entries:", error);
      return false;
    }
  },

  // Save summary
  saveSummary: async (summary) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_summaries")
        .upsert(summary, {
          onConflict: "employee_id,year,month",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error saving summary:", error);
      return null;
    }
  },

  // Create KRA
  createKRA: async (kra) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_kras")
        .insert(kra)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating KRA:", error);
      return null;
    }
  },

  // Update KRA
  updateKRA: async (id, data) => {
    try {
      const { error } = await supabase
        .from("scorecard_kras")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating KRA:", error);
      return false;
    }
  },

  // Delete KRA
  deleteKRA: async (id) => {
    try {
      const { error } = await supabase
        .from("scorecard_kras")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting KRA:", error);
      return false;
    }
  },

  // Create KPI
  createKPI: async (kpi) => {
    try {
      const { data, error } = await supabase
        .from("scorecard_kpis")
        .insert(kpi)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating KPI:", error);
      return null;
    }
  },

  // Update KPI
  updateKPI: async (id, data) => {
    try {
      const { error } = await supabase
        .from("scorecard_kpis")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating KPI:", error);
      return false;
    }
  },

  // Delete KPI
  deleteKPI: async (id) => {
    try {
      const { error } = await supabase
        .from("scorecard_kpis")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting KPI:", error);
      return false;
    }
  },
}));
