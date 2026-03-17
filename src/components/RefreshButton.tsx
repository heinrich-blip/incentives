import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";

interface RefreshButtonProps {
  className?: string;
  showStatus?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RefreshButton({
  className = "",
  showStatus = true,
  size = "md"
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking">("checking");

  const {
    setDrivers,
    setKilometerRates,
    setMonthlyBudgets,
    setZigUsdConversionRates,
    setDriverSalaryHistory,
    setIncentiveSettings,
    setCustomFormulas,
    setDriverPerformance,
    setIncentiveCalculations,
    showToast,
  } = useStore();

  // Check connection status on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setConnectionStatus("disconnected");
      return;
    }

    // Try to fetch a simple query to check connection
    supabase.from("drivers").select("id").limit(1)
      .then(() => setConnectionStatus("connected"))
      .catch(() => setConnectionStatus("disconnected"));
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      showToast("Supabase not configured - demo mode");
      return;
    }

    setIsRefreshing(true);
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
        supabase.from("kilometer_rates").select("*").order("effective_from", { ascending: false }),
        supabase.from("monthly_budgets").select("*").order("year", { ascending: false }),
        supabase.from("zig_usd_conversion_rates").select("*").order("year", { ascending: false }),
        supabase.from("driver_salary_history").select("*").order("year", { ascending: false }),
        supabase.from("incentive_settings").select("*"),
        supabase.from("custom_formulas").select("*").order("priority"),
        supabase.from("driver_performance").select("*").order("year", { ascending: false }),
        supabase.from("incentive_calculations").select("*").order("year", { ascending: false }),
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

      setLastRefreshed(new Date());
      showToast("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      showToast("Error refreshing data");
    } finally {
      setIsRefreshing(false);
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
    showToast,
  ]);

  const sizeClasses = {
    sm: "p-1.5 text-xs",
    md: "p-2 text-sm",
    lg: "p-3 text-base",
  };

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg font-medium
          bg-primary-600 hover:bg-primary-700 text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${sizeClasses[size]}
        `}
        title="Refresh all data"
      >
        <RefreshCw
          size={iconSize[size]}
          className={isRefreshing ? "animate-spin" : ""}
        />
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>

      {showStatus && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {connectionStatus === "connected" ? (
            <>
              <Wifi size={14} className="text-green-500" />
              <span className="text-green-600">Live</span>
            </>
          ) : connectionStatus === "disconnected" ? (
            <>
              <WifiOff size={14} className="text-red-500" />
              <span className="text-red-600">Offline</span>
            </>
          ) : (
            <>
              <RefreshCw size={14} className="animate-spin text-gray-400" />
              <span className="text-gray-400">Connecting...</span>
            </>
          )}

          {lastRefreshed && !isRefreshing && (
            <span className="text-gray-400 ml-1">
              • Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for use in headers/toolbars
export function RefreshIndicator({ className = "" }: { className?: string }) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Check connection status
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsConnected(false);
      return;
    }

    const channel = supabase
      .channel("connection-check")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () => {
        setIsConnected(true);
      })
      .subscribe((status: string) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${isConnected === true
            ? "bg-green-500 animate-pulse"
            : isConnected === false
              ? "bg-red-500"
              : "bg-yellow-500 animate-pulse"
          }`}
        title={isConnected ? "Real-time updates active" : "Connecting..."}
      />
      <span className="text-xs text-gray-500">
        {isConnected ? "Live" : isConnected === false ? "Offline" : "..."}
      </span>
    </div>
  );
}
