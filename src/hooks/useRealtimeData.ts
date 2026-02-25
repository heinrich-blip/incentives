import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import type { Driver } from "../types/database";

export function useRealtimeData() {
  const {
    setDrivers,
    addDriver,
    updateDriver,
    removeDriver,
    setKilometerRates,
    setMonthlyBudgets,
    setZigUsdConversionRates,
    setDriverSalaryHistory,
    setIncentiveSettings,
    setCustomFormulas,
    setDriverPerformance,
    setIncentiveCalculations,
    setIsLoading,
    showToast,
  } = useStore();

  // Fetch all initial data
  const fetchInitialData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, using demo mode");
      return;
    }

    setIsLoading(true);
    try {
      const [
        driversRes,
        ratesRes,
        budgetsRes,
        zigUsdRatesRes,
        salaryHistoryRes,
        settingsRes,
        formulasRes,
        performanceRes,
        calculationsRes,
      ] = await Promise.all([
        supabase.from("drivers").select("*").order("first_name"),
        supabase
          .from("kilometer_rates")
          .select("*")
          .order("effective_from", { ascending: false }),
        supabase
          .from("monthly_budgets")
          .select("*")
          .order("year", { ascending: false }),
        supabase
          .from("zig_usd_conversion_rates")
          .select("*")
          .order("year", { ascending: false }),
        supabase
          .from("driver_salary_history")
          .select("*")
          .order("year", { ascending: false }),
        supabase.from("incentive_settings").select("*"),
        supabase.from("custom_formulas").select("*").order("priority"),
        supabase
          .from("driver_performance")
          .select("*")
          .order("year", { ascending: false }),
        supabase
          .from("incentive_calculations")
          .select("*")
          .order("year", { ascending: false }),
      ]);

      if (driversRes.data) setDrivers(driversRes.data);
      if (ratesRes.data) setKilometerRates(ratesRes.data);
      if (budgetsRes.data) setMonthlyBudgets(budgetsRes.data);
      if (zigUsdRatesRes.data) setZigUsdConversionRates(zigUsdRatesRes.data);
      if (salaryHistoryRes.data) setDriverSalaryHistory(salaryHistoryRes.data);
      if (settingsRes.data) setIncentiveSettings(settingsRes.data);
      if (formulasRes.data) setCustomFormulas(formulasRes.data);
      if (performanceRes.data) setDriverPerformance(performanceRes.data);
      if (calculationsRes.data) setIncentiveCalculations(calculationsRes.data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      showToast("Error loading data");
    } finally {
      setIsLoading(false);
    }
  }, [
    setDrivers,
    setKilometerRates,
    setMonthlyBudgets,
    setZigUsdConversionRates,
    setDriverSalaryHistory,
    setIncentiveSettings,
    setCustomFormulas,
    setDriverPerformance,
    setIncentiveCalculations,
    setIsLoading,
    showToast,
  ]);

  // Handle realtime driver changes
  const handleDriverChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Driver>) => {
      if (payload.eventType === "INSERT" && payload.new) {
        addDriver(payload.new as Driver);
        showToast("New driver added");
      } else if (payload.eventType === "UPDATE" && payload.new) {
        updateDriver(payload.new as Driver);
      } else if (payload.eventType === "DELETE" && payload.old) {
        removeDriver((payload.old as Driver).id);
        showToast("Driver removed");
      }
    },
    [addDriver, updateDriver, removeDriver, showToast],
  );

  // Handle realtime rate changes
  const handleRateChange = useCallback(async () => {
    const { data } = await supabase
      .from("kilometer_rates")
      .select("*")
      .order("effective_from", { ascending: false });
    if (data) setKilometerRates(data);
  }, [setKilometerRates]);

  // Handle realtime budget changes
  const handleBudgetChange = useCallback(async () => {
    const { data } = await supabase
      .from("monthly_budgets")
      .select("*")
      .order("year", { ascending: false });
    if (data) setMonthlyBudgets(data);
  }, [setMonthlyBudgets]);

  // Handle realtime ZIG-USD conversion rate changes
  const handleZigUsdRateChange = useCallback(async () => {
    const { data } = await supabase
      .from("zig_usd_conversion_rates")
      .select("*")
      .order("year", { ascending: false });
    if (data) setZigUsdConversionRates(data);
  }, [setZigUsdConversionRates]);

  // Handle realtime driver salary history changes
  const handleSalaryHistoryChange = useCallback(async () => {
    const { data } = await supabase
      .from("driver_salary_history")
      .select("*")
      .order("year", { ascending: false });
    if (data) setDriverSalaryHistory(data);
  }, [setDriverSalaryHistory]);

  // Handle realtime settings changes
  const handleSettingsChange = useCallback(async () => {
    const { data } = await supabase.from("incentive_settings").select("*");
    if (data) setIncentiveSettings(data);
  }, [setIncentiveSettings]);

  // Handle realtime formula changes
  const handleFormulaChange = useCallback(async () => {
    const { data } = await supabase
      .from("custom_formulas")
      .select("*")
      .order("priority");
    if (data) setCustomFormulas(data);
  }, [setCustomFormulas]);

  // Handle realtime performance changes
  const handlePerformanceChange = useCallback(async () => {
    const { data } = await supabase
      .from("driver_performance")
      .select("*")
      .order("year", { ascending: false });
    if (data) setDriverPerformance(data);
  }, [setDriverPerformance]);

  // Handle realtime calculation changes
  const handleCalculationChange = useCallback(async () => {
    const { data } = await supabase
      .from("incentive_calculations")
      .select("*")
      .order("year", { ascending: false });
    if (data) setIncentiveCalculations(data);
  }, [setIncentiveCalculations]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Fetch initial data when the hook is mounted
    fetchInitialData();

    // Create realtime subscriptions
    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        handleDriverChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kilometer_rates" },
        handleRateChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monthly_budgets" },
        handleBudgetChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "zig_usd_conversion_rates" },
        handleZigUsdRateChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_salary_history" },
        handleSalaryHistoryChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incentive_settings" },
        handleSettingsChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "custom_formulas" },
        handleFormulaChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_performance" },
        handlePerformanceChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incentive_calculations" },
        handleCalculationChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    fetchInitialData,
    handleDriverChange,
    handleRateChange,
    handleBudgetChange,
    handleZigUsdRateChange,
    handleSalaryHistoryChange,
    handleSettingsChange,
    handleFormulaChange,
    handlePerformanceChange,
    handleCalculationChange,
  ]);

  return { refetch: fetchInitialData };
}

// Hook for driver-specific data
export function useDriverData(driverId: string | undefined) {
  const { drivers, driverPerformance, incentiveCalculations } = useStore();

  const driver = drivers.find((d) => d.id === driverId);
  const performance = driverPerformance.filter((p) => p.driver_id === driverId);
  const calculations = incentiveCalculations.filter(
    (c) => c.driver_id === driverId,
  );

  return { driver, performance, calculations };
}

// Hook for fetching related records for a driver
export function useDriverRecords(driverId: string | undefined) {
  const [records, setRecords] = useState<{
    accidents: Accident[];
    incidents: Incident[];
    disciplinaryRecords: DisciplinaryRecord[];
    leaveRecords: LeaveRecord[];
  }>({
    accidents: [],
    incidents: [],
    disciplinaryRecords: [],
    leaveRecords: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const fetchRecords = async () => {
      setLoading(true);
      try {
        const [accidentsRes, incidentsRes, disciplinaryRes, leaveRes] =
          await Promise.all([
            supabase
              .from("accidents")
              .select("*")
              .eq("driver_id", driverId)
              .order("incident_date", { ascending: false }),
            supabase
              .from("incidents")
              .select("*")
              .eq("driver_id", driverId)
              .order("incident_date", { ascending: false }),
            supabase
              .from("disciplinary_records")
              .select("*")
              .eq("driver_id", driverId)
              .order("record_date", { ascending: false }),
            supabase
              .from("leave_records")
              .select("*")
              .eq("driver_id", driverId)
              .order("start_date", { ascending: false }),
          ]);

        setRecords({
          accidents: accidentsRes.data || [],
          incidents: incidentsRes.data || [],
          disciplinaryRecords: disciplinaryRes.data || [],
          leaveRecords: leaveRes.data || [],
        });
      } catch (error) {
        console.error("Error fetching driver records:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();

    // Subscribe to realtime changes for this driver's records
    const channel = supabase
      .channel(`driver-${driverId}-records`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accidents",
          filter: `driver_id=eq.${driverId}`,
        },
        fetchRecords,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
          filter: `driver_id=eq.${driverId}`,
        },
        fetchRecords,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "disciplinary_records",
          filter: `driver_id=eq.${driverId}`,
        },
        fetchRecords,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_records",
          filter: `driver_id=eq.${driverId}`,
        },
        fetchRecords,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return { ...records, loading };
}

import { useState } from "react";
import type {
  Accident,
  DisciplinaryRecord,
  Incident,
  LeaveRecord,
} from "../types/database";

