/**
 * Settings Page
 * Configure system settings including fuel efficiency bonuses
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import type { FuelEfficiencyBonusConfig, FuelEfficiencyTier, ZigUsdConversionRate } from "../types/database";
import
  {
    DEFAULT_EXPORT_FUEL_TIERS,
    DEFAULT_LOCAL_FUEL_TIERS,
  } from "../utils/calculations";
import { formatCurrency, getMonthName } from "../utils/formatters";

export default function SettingsPage() {
  const { incentiveSettings, setIncentiveSettings, zigUsdConversionRates, setZigUsdConversionRates, showToast } = useStore();
  const supabaseConfigured = isSupabaseConfigured();

  // Local state for fuel efficiency settings
  const [localFuelConfig, setLocalFuelConfig] = useState<FuelEfficiencyBonusConfig>(
    DEFAULT_LOCAL_FUEL_TIERS
  );
  const [exportFuelConfig, setExportFuelConfig] = useState<FuelEfficiencyBonusConfig>(
    DEFAULT_EXPORT_FUEL_TIERS
  );
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"local" | "export">("local");

  // State for ZIG-USD conversion rates
  const [rateYear, setRateYear] = useState(new Date().getFullYear());
  const [editingRate, setEditingRate] = useState<ZigUsdConversionRate | null>(null);
  const [isSavingRate, setIsSavingRate] = useState(false);

  // Load existing settings
  useEffect(() => {
    const localSetting = incentiveSettings.find(
      (s) => s.setting_key === "fuel_efficiency_bonus_local"
    );
    const exportSetting = incentiveSettings.find(
      (s) => s.setting_key === "fuel_efficiency_bonus_export"
    );

    if (localSetting && typeof localSetting.setting_value === "object") {
      setLocalFuelConfig(localSetting.setting_value as unknown as FuelEfficiencyBonusConfig);
    }
    if (exportSetting && typeof exportSetting.setting_value === "object") {
      setExportFuelConfig(exportSetting.setting_value as unknown as FuelEfficiencyBonusConfig);
    }
  }, [incentiveSettings]);

  // Get current config based on active tab
  const currentConfig = activeTab === "local" ? localFuelConfig : exportFuelConfig;
  const setCurrentConfig = activeTab === "local" ? setLocalFuelConfig : setExportFuelConfig;

  // Toggle enabled
  const toggleEnabled = useCallback(() => {
    setCurrentConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, [setCurrentConfig]);

  // Add new tier
  const addTier = useCallback(() => {
    const lastTier = currentConfig.tiers[currentConfig.tiers.length - 1];
    const newTier: FuelEfficiencyTier = {
      id: Date.now().toString(),
      min_efficiency: lastTier ? lastTier.max_efficiency : 1.95,
      max_efficiency: lastTier ? lastTier.max_efficiency + 0.1 : 2.05,
      bonus_amount: lastTier ? lastTier.bonus_amount + 20 : 20,
    };
    setCurrentConfig((prev) => ({
      ...prev,
      tiers: [...prev.tiers, newTier],
    }));
  }, [currentConfig.tiers, setCurrentConfig]);

  // Remove tier
  const removeTier = useCallback(
    (tierId: string) => {
      setCurrentConfig((prev) => ({
        ...prev,
        tiers: prev.tiers.filter((t) => t.id !== tierId),
      }));
    },
    [setCurrentConfig]
  );

  // Update tier
  const updateTier = useCallback(
    (tierId: string, field: keyof FuelEfficiencyTier, value: number) => {
      setCurrentConfig((prev) => ({
        ...prev,
        tiers: prev.tiers.map((t) =>
          t.id === tierId ? { ...t, [field]: value } : t
        ),
      }));
    },
    [setCurrentConfig]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    if (activeTab === "local") {
      setLocalFuelConfig(DEFAULT_LOCAL_FUEL_TIERS);
    } else {
      setExportFuelConfig(DEFAULT_EXPORT_FUEL_TIERS);
    }
    showToast("Reset to default tiers");
  }, [activeTab, showToast]);

  // Save settings
  const saveSettings = useCallback(async () => {
    if (!supabaseConfigured) {
      showToast("Cannot save in demo mode");
      return;
    }

    setIsSaving(true);
    try {
      // Save local config
      const localKey = "fuel_efficiency_bonus_local";
      const existingLocal = incentiveSettings.find((s) => s.setting_key === localKey);

      if (existingLocal) {
        await supabase
          .from("incentive_settings")
          .update({
            setting_value: localFuelConfig as unknown as Record<string, unknown>,
            is_active: true,
          })
          .eq("id", existingLocal.id);
      } else {
        await supabase.from("incentive_settings").insert({
          setting_key: localKey,
          setting_value: localFuelConfig as unknown as Record<string, unknown>,
          description: "Fuel efficiency bonus tiers for Local drivers (km/L ranges and USD bonuses)",
          is_active: true,
        });
      }

      // Save export config
      const exportKey = "fuel_efficiency_bonus_export";
      const existingExport = incentiveSettings.find((s) => s.setting_key === exportKey);

      if (existingExport) {
        await supabase
          .from("incentive_settings")
          .update({
            setting_value: exportFuelConfig as unknown as Record<string, unknown>,
            is_active: true,
          })
          .eq("id", existingExport.id);
      } else {
        await supabase.from("incentive_settings").insert({
          setting_key: exportKey,
          setting_value: exportFuelConfig as unknown as Record<string, unknown>,
          description: "Fuel efficiency bonus tiers for Export drivers (km/L ranges and USD bonuses)",
          is_active: true,
        });
      }

      // Refresh settings
      const { data } = await supabase.from("incentive_settings").select("*");
      if (data) {
        setIncentiveSettings(data);
      }

      showToast("Fuel efficiency settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  }, [
    supabaseConfigured,
    incentiveSettings,
    localFuelConfig,
    exportFuelConfig,
    setIncentiveSettings,
    showToast,
  ]);

  // Calculate preview for a sample efficiency
  const previewBonus = useMemo(() => {
    const sampleEfficiency = 2.1;
    const tier = currentConfig.tiers.find(
      (t) => sampleEfficiency >= t.min_efficiency && sampleEfficiency < t.max_efficiency
    );
    return tier?.bonus_amount || 0;
  }, [currentConfig.tiers]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-surface-900">Settings</h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Configure system settings and preferences
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg border border-surface-200 p-4">
        <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-3">
          Database Connection
        </h2>
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${supabaseConfigured ? "bg-green-500" : "bg-yellow-500"}`}
          />
          <div>
            <p className="text-sm font-medium text-surface-900">
              {supabaseConfigured ? "Connected to Supabase" : "Demo Mode"}
            </p>
            <p className="text-xs text-surface-500">
              {supabaseConfigured
                ? "Real-time sync enabled"
                : "Configure Supabase credentials to enable data persistence"}
            </p>
          </div>
        </div>
      </div>

      {/* Fuel Efficiency Bonus Configuration */}
      <div className="bg-white rounded-lg border border-surface-200">
        <div className="px-4 py-3 border-b border-surface-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">
                Fuel Efficiency Bonus (Diesel)
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Configure bonus tiers based on diesel efficiency (km/L) - added to driver incentives
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetToDefaults}
                className="btn btn-secondary text-xs py-1.5"
              >
                Reset Defaults
              </button>
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="btn btn-primary text-xs py-1.5"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab("local")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "local"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-surface-500 hover:text-surface-700"
              }`}
            >
              Local Drivers
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "export"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-surface-500 hover:text-surface-700"
              }`}
            >
              Export Drivers
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-surface-50">
            <div>
              <p className="text-sm font-medium text-surface-900">
                Enable Fuel Efficiency Bonus for {activeTab === "local" ? "Local" : "Export"} Drivers
              </p>
              <p className="text-xs text-surface-500">
                When enabled, drivers will receive bonuses based on their fuel efficiency
              </p>
            </div>
            <button
              onClick={toggleEnabled}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                currentConfig.enabled ? "bg-primary-500" : "bg-surface-300"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  currentConfig.enabled ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {/* Tiers Table */}
          <div className="border border-surface-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Min (km/L)
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Max (km/L)
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Bonus (USD)
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-600 uppercase tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentConfig.tiers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                      No tiers configured. Click "Add Tier" to create one.
                    </td>
                  </tr>
                ) : (
                  currentConfig.tiers.map((tier) => (
                    <tr key={tier.id} className="border-t border-surface-100">
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          className="form-input text-sm w-28 text-center font-mono"
                          value={tier.min_efficiency}
                          onChange={(e) =>
                            updateTier(tier.id, "min_efficiency", parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          className="form-input text-sm w-28 text-center font-mono"
                          value={tier.max_efficiency}
                          onChange={(e) =>
                            updateTier(tier.id, "max_efficiency", parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-surface-500">$</span>
                          <input
                            type="number"
                            step="1"
                            className="form-input text-sm w-24 text-center font-mono"
                            value={tier.bonus_amount}
                            onChange={(e) =>
                              updateTier(tier.id, "bonus_amount", parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeTier(tier.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Remove tier"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Tier Button */}
          <div className="mt-3">
            <button onClick={addTier} className="btn btn-secondary text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Tier
            </button>
          </div>

          {/* Preview */}
          {currentConfig.enabled && currentConfig.tiers.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-primary-50 border border-primary-100">
              <h4 className="text-sm font-semibold text-primary-900 mb-2">
                Preview Example
              </h4>
              <p className="text-sm text-primary-700">
                A driver with <strong>2.10 km/L</strong> fuel efficiency would receive a{" "}
                <strong>{formatCurrency(previewBonus)}</strong> bonus added to their incentive.
              </p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {currentConfig.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="p-2 rounded bg-white border border-primary-200"
                  >
                    <p className="text-xs text-surface-500">
                      {tier.min_efficiency} - {tier.max_efficiency} km/L
                    </p>
                    <p className="text-sm font-semibold text-primary-600">
                      {formatCurrency(tier.bonus_amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Other Incentive Settings */}
      <div className="bg-white rounded-lg border border-surface-200 p-4">
        <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-3">
          Other Incentive Settings
        </h2>
        {incentiveSettings.filter(s => !s.setting_key.includes("fuel_efficiency")).length > 0 ? (
          <div className="space-y-2">
            {incentiveSettings
              .filter(s => !s.setting_key.includes("fuel_efficiency"))
              .map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-surface-50"
                >
                  <div>
                    <p className="text-sm font-medium text-surface-900">
                      {setting.setting_key
                        .split("_")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {setting.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-surface-900">
                      {JSON.stringify(setting.setting_value)}
                    </p>
                    <p className={`text-xs ${setting.is_active ? "text-green-600" : "text-surface-400"}`}>
                      {setting.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-surface-500">No other incentive settings configured</p>
        )}
      </div>

      {/* ZIG-USD Conversion Rates */}
      <div className="bg-white rounded-lg border border-surface-200">
        <div className="px-4 py-3 border-b border-surface-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">
                ZIG to USD Conversion Rates
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Monthly conversion rates for ZIG salaries to USD
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={rateYear}
                onChange={(e) => setRateYear(parseInt(e.target.value))}
                className="form-select text-xs py-1.5"
              >
                {[2024, 2025, 2026, 2027].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Rates Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-surface-500 uppercase">Month</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-surface-500 uppercase">Rate (ZIG/USD)</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-surface-500 uppercase">Notes</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const rate = zigUsdConversionRates.find(
                    (r) => r.year === rateYear && r.month === month
                  );
                  return (
                    <tr key={month} className="border-b border-surface-50 hover:bg-surface-50">
                      <td className="py-2 px-3 font-medium">{getMonthName(month)}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {rate ? rate.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "-"}
                      </td>
                      <td className="py-2 px-3 text-surface-500 text-xs">{rate?.notes || "-"}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => {
                            if (rate) {
                              setEditingRate(rate);
                            } else {
                              setEditingRate({ 
                                id: "new", 
                                year: rateYear, 
                                month, 
                                rate: 0, 
                                effective_date: `${rateYear}-${month.toString().padStart(2, "0")}-01`,
                                notes: null,
                                created_at: "",
                                updated_at: ""
                              });
                            }
                          }}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          {rate ? "Edit" : "Set Rate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Edit Rate Modal */}
          {editingRate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-surface-900 mb-4">
                  {editingRate.id === "new" ? "Add" : "Edit"} Conversion Rate - {getMonthName(editingRate.month)} {editingRate.year}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      ZIG per 1 USD
                    </label>
                    <input
                      type="number"
                      value={editingRate.rate || ""}
                      onChange={(e) => setEditingRate({ ...editingRate, rate: parseFloat(e.target.value) || 0 })}
                      className="form-input"
                      step="0.0001"
                      min="0"
                      placeholder="e.g., 25.00"
                    />
                    <p className="text-xs text-surface-500 mt-1">
                      Enter how many ZIG equals 1 USD (e.g., 25 means 25 ZIG = 1 USD)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={editingRate.notes || ""}
                      onChange={(e) => setEditingRate({ ...editingRate, notes: e.target.value || null })}
                      className="form-input"
                      placeholder="e.g., Official rate from RBZ"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setEditingRate(null)}
                    className="btn btn-secondary"
                    disabled={isSavingRate}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!supabaseConfigured) {
                        showToast("Cannot save in demo mode");
                        return;
                      }
                      if (!editingRate.rate || editingRate.rate <= 0) {
                        showToast("Please enter a valid rate");
                        return;
                      }
                      setIsSavingRate(true);
                      try {
                        if (editingRate.id === "new") {
                          await supabase.from("zig_usd_conversion_rates").insert({
                            year: editingRate.year,
                            month: editingRate.month,
                            rate: editingRate.rate,
                            effective_date: editingRate.effective_date,
                            notes: editingRate.notes,
                          });
                        } else {
                          await supabase
                            .from("zig_usd_conversion_rates")
                            .update({
                              rate: editingRate.rate,
                              notes: editingRate.notes,
                            })
                            .eq("id", editingRate.id);
                        }
                        // Refresh rates
                        const { data } = await supabase
                          .from("zig_usd_conversion_rates")
                          .select("*")
                          .order("year", { ascending: false });
                        if (data) setZigUsdConversionRates(data);
                        showToast("Conversion rate saved successfully");
                        setEditingRate(null);
                      } catch (error) {
                        console.error("Error saving rate:", error);
                        showToast("Error saving conversion rate");
                      } finally {
                        setIsSavingRate(false);
                      }
                    }}
                    className="btn btn-primary"
                    disabled={isSavingRate}
                  >
                    {isSavingRate ? "Saving..." : "Save Rate"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> These rates are used to convert ZIG base salaries to USD equivalents for driver compensation calculations.
              Make sure to update rates monthly for accurate salary calculations.
            </p>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-lg border border-surface-200 p-4">
        <h2 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-3">
          Application Info
        </h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-surface-500 uppercase tracking-wider">Version</p>
            <p className="text-sm font-medium text-surface-900 mt-0.5">1.1.0</p>
          </div>
          <div>
            <p className="text-surface-500 uppercase tracking-wider">Environment</p>
            <p className="text-sm font-medium text-surface-900 mt-0.5">
              {import.meta.env.MODE === "production" ? "Production" : "Development"}
            </p>
          </div>
          <div>
            <p className="text-surface-500 uppercase tracking-wider">Framework</p>
            <p className="text-sm font-medium text-surface-900 mt-0.5">React + Vite</p>
          </div>
          <div>
            <p className="text-surface-500 uppercase tracking-wider">Database</p>
            <p className="text-sm font-medium text-surface-900 mt-0.5">
              Supabase (PostgreSQL)
            </p>
          </div>
        </div>
      </div>

      {/* Setup Instructions (when not connected) */}
      {!supabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
          <h4 className="text-xs font-medium text-yellow-800 uppercase tracking-wider mb-2">
            Setup Instructions
          </h4>
          <p className="text-xs text-yellow-700 mb-2">
            To connect to Supabase and enable real-time data sync:
          </p>
          <ol className="text-xs text-yellow-700 space-y-1.5 list-decimal list-inside">
            <li>
              Create a Supabase project at{" "}
              <code className="bg-yellow-100 px-1 rounded font-mono">supabase.com</code>
            </li>
            <li>
              Run the migration files in{" "}
              <code className="bg-yellow-100 px-1 rounded font-mono">
                supabase/migrations/
              </code>
            </li>
            <li>
              Create a{" "}
              <code className="bg-yellow-100 px-1 rounded font-mono">.env</code> file
              with your credentials
            </li>
            <li>Restart the development server</li>
          </ol>
          <div className="mt-2 p-2 rounded bg-yellow-100 font-mono text-xs text-yellow-800">
            VITE_SUPABASE_URL=your-project-url
            <br />
            VITE_SUPABASE_ANON_KEY=your-anon-key
          </div>
        </div>
      )}
    </div>
  );
}
