import { useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import type { Driver, DriverPerformance } from "../types/database";
import
    {
        formatCurrency,
        formatNumber,
        getMonthName,
    } from "../utils/formatters";

interface AddPerformanceModalProps {
  driver?: Driver;
  existingPerformance?: DriverPerformance;
  onClose: () => void;
  onDelete?: () => void;
}

export default function AddPerformanceModal({
  driver,
  existingPerformance,
  onClose,
  onDelete,
}: AddPerformanceModalProps) {
  const {
    drivers,
    monthlyBudgets,
    driverPerformance,
    incentiveSettings,
    showToast,
  } = useStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(
    existingPerformance?.driver_id || driver?.id || "",
  );
  const [formData, setFormData] = useState({
    year: existingPerformance?.year || new Date().getFullYear(),
    month: existingPerformance?.month || new Date().getMonth() + 1,
    actual_kilometers: existingPerformance?.actual_kilometers || 0,
    trips_completed: existingPerformance?.trips_completed || 0,
    fuel_efficiency: existingPerformance?.fuel_efficiency?.toString() || "",
    on_time_delivery_rate:
      existingPerformance?.on_time_delivery_rate?.toString() || "",
    safety_score: existingPerformance?.safety_score?.toString() || "",
    notes: existingPerformance?.notes || "",
  });

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === selectedDriverId),
    [drivers, selectedDriverId],
  );

  // Get the budget for the selected driver type and period
  const budget = useMemo(() => {
    if (!selectedDriver) return null;
    return monthlyBudgets.find(
      (b) =>
        b.year === formData.year &&
        b.month === formData.month &&
        b.driver_type === selectedDriver.driver_type,
    );
  }, [monthlyBudgets, formData.year, formData.month, selectedDriver]);

  // Get the incentive divisor based on driver type
  const incentiveDivisor = useMemo(() => {
    if (!selectedDriver) return 1;
    const settingKey =
      selectedDriver.driver_type === "local"
        ? "incentive_divisor_local"
        : "incentive_divisor_export";
    const setting = incentiveSettings.find(
      (s) => s.setting_key === settingKey && s.is_active,
    );
    return setting ? (setting.setting_value as number) : 1;
  }, [incentiveSettings, selectedDriver]);

  // Calculate target KM per truck
  const targetKmPerTruck = useMemo(() => {
    if (!budget) return 0;
    const truckCount = budget.truck_count || 1;
    return truckCount > 0 ? budget.budgeted_kilometers / truckCount : 0;
  }, [budget]);

  // Calculate the rate per kilometer and estimated incentive
  // Formula: Rate per KM = Divisor ÷ Target KM per Truck
  // Incentive = Rate per KM × Driver's Actual KM
  const calculatedIncentive = useMemo(() => {
    if (!budget || targetKmPerTruck <= 0) {
      return { ratePerKm: 0, incentive: 0 };
    }
    const ratePerKm = incentiveDivisor / targetKmPerTruck;
    const incentive = ratePerKm * formData.actual_kilometers;
    return { ratePerKm, incentive };
  }, [budget, incentiveDivisor, targetKmPerTruck, formData.actual_kilometers]);

  // Check if a performance record already exists for this period (for new entries)
  // or use the existing performance passed in (for editing)
  const existingRecord = useMemo(() => {
    if (existingPerformance) return existingPerformance;
    if (!selectedDriverId) return null;
    return driverPerformance.find(
      (p) =>
        p.driver_id === selectedDriverId &&
        p.year === formData.year &&
        p.month === formData.month,
    );
  }, [
    driverPerformance,
    selectedDriverId,
    formData.year,
    formData.month,
    existingPerformance,
  ]);

  const isEditMode = !!existingPerformance;

  const handleDelete = async () => {
    if (!existingPerformance || !isSupabaseConfigured()) {
      showToast("Cannot delete in demo mode");
      return;
    }

    setIsDeleting(true);
    try {
      // Delete the performance record
      const { error: perfError } = await supabase
        .from("driver_performance")
        .delete()
        .eq("id", existingPerformance.id);

      if (perfError) throw perfError;

      // Also delete associated incentive calculation if exists
      const { error: incError } = await supabase
        .from("incentive_calculations")
        .delete()
        .eq("driver_id", existingPerformance.driver_id)
        .eq("year", existingPerformance.year)
        .eq("month", existingPerformance.month);

      if (incError)
        console.error("Error deleting incentive calculation:", incError);

      showToast("Performance record deleted successfully");
      onDelete?.();
      onClose();
    } catch (error) {
      console.error("Error deleting performance:", error);
      showToast("Error deleting performance record");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    if (!selectedDriverId) {
      showToast("Please select a driver");
      return;
    }

    if (formData.actual_kilometers <= 0) {
      showToast("Please enter kilometers achieved");
      return;
    }

    setIsSaving(true);
    try {
      const performanceData = {
        driver_id: selectedDriverId,
        year: formData.year,
        month: formData.month,
        actual_kilometers: formData.actual_kilometers,
        trips_completed: formData.trips_completed,
        fuel_efficiency: formData.fuel_efficiency
          ? parseFloat(formData.fuel_efficiency)
          : null,
        on_time_delivery_rate: formData.on_time_delivery_rate
          ? parseFloat(formData.on_time_delivery_rate)
          : null,
        safety_score: formData.safety_score
          ? parseFloat(formData.safety_score)
          : null,
        notes: formData.notes || null,
      };

      let error;
      if (existingRecord) {
        // Update existing record
        ({ error } = await supabase
          .from("driver_performance")
          .update(performanceData)
          .eq("id", existingRecord.id));
      } else {
        // Insert new record
        ({ error } = await supabase
          .from("driver_performance")
          .insert(performanceData));
      }

      if (error) throw error;

      // Also create/update incentive calculation
      const incentiveData = {
        driver_id: selectedDriverId,
        year: formData.year,
        month: formData.month,
        base_salary: selectedDriver?.base_salary || 0,
        km_incentive: calculatedIncentive.incentive,
        performance_bonus: 0,
        safety_bonus: 0,
        deductions: 0,
        total_incentive: calculatedIncentive.incentive,
        total_earnings:
          (selectedDriver?.base_salary || 0) + calculatedIncentive.incentive,
        calculation_details: {
          budget_km: budget?.budgeted_kilometers || 0,
          truck_count: budget?.truck_count || 1,
          target_km_per_truck: targetKmPerTruck,
          divisor: incentiveDivisor,
          rate_per_km: calculatedIncentive.ratePerKm,
          actual_km: formData.actual_kilometers,
        },
        status: "draft" as const,
      };

      // Check for existing incentive calculation
      const { data: existingCalc } = await supabase
        .from("incentive_calculations")
        .select("id")
        .eq("driver_id", selectedDriverId)
        .eq("year", formData.year)
        .eq("month", formData.month)
        .single();

      if (existingCalc) {
        ({ error } = await supabase
          .from("incentive_calculations")
          .update(incentiveData)
          .eq("id", existingCalc.id));
      } else {
        ({ error } = await supabase
          .from("incentive_calculations")
          .insert(incentiveData));
      }

      if (error) throw error;

      showToast(
        existingRecord
          ? "Performance updated successfully"
          : "Performance recorded successfully",
      );
      onClose();
    } catch (error) {
      console.error("Error saving performance:", error);
      showToast("Error saving performance");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-surface-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900">
              {isEditMode
                ? "Edit Driver Performance"
                : existingRecord
                  ? "Update Driver Performance"
                  : "Record Driver Performance"}
            </h2>
            <div className="flex items-center gap-2">
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  title="Delete record"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-surface-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Driver Selection */}
          {!driver && !isEditMode && (
            <div>
              <label className="form-label">Driver</label>
              <select
                className="form-select"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                required
                disabled={isEditMode}
              >
                <option value="">Select a driver</option>
                {drivers
                  .filter((d) => d.status === "active")
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.first_name} {d.last_name} ({d.employee_id}) -{" "}
                      {d.driver_type === "local" ? "Local" : "Export"}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Show driver info in edit mode */}
          {isEditMode && selectedDriver && (
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
              <p className="text-sm text-surface-500">Driver</p>
              <p className="font-medium text-surface-900">
                {selectedDriver.first_name} {selectedDriver.last_name} (
                {selectedDriver.employee_id})
              </p>
            </div>
          )}

          {/* Period Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Month</label>
              <select
                className="form-select"
                value={formData.month}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    month: parseInt(e.target.value),
                  }))
                }
                disabled={isEditMode}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Year</label>
              <select
                className="form-select"
                value={formData.year}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    year: parseInt(e.target.value),
                  }))
                }
                disabled={isEditMode}
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {existingRecord && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
              A record already exists for this period. Saving will update the
              existing record.
            </div>
          )}

          {/* Kilometers Entry - Main Field */}
          <div className="p-4 rounded-xl bg-primary-50 border border-primary-100">
            <label className="form-label text-primary-700">
              Kilometers Achieved *
            </label>
            <input
              type="number"
              step="0.01"
              className="form-input text-2xl font-semibold"
              value={formData.actual_kilometers || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  actual_kilometers: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="Enter kilometers driven this month"
              required
            />
            <p className="text-sm text-primary-600 mt-2">
              Enter the total kilometers the driver achieved for{" "}
              {getMonthName(formData.month)} {formData.year}
            </p>
          </div>

          {/* Incentive Calculation Preview */}
          {selectedDriverId && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-100">
              <h4 className="font-medium text-green-800 mb-3">
                Incentive Calculation Preview
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Budget KM:</span>
                  <span className="font-medium text-green-800">
                    {formatNumber(budget?.budgeted_kilometers || 0)} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Trucks:</span>
                  <span className="font-medium text-green-800">
                    {budget?.truck_count || 1}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Target KM/Truck:</span>
                  <span className="font-medium text-green-800">
                    {formatNumber(targetKmPerTruck)} km
                  </span>
                </div>
                <div className="h-px bg-green-200 my-2" />
                <div className="flex justify-between">
                  <span className="text-green-700">Divisor Amount:</span>
                  <span className="font-medium text-green-800">
                    {formatNumber(incentiveDivisor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Rate per KM:</span>
                  <span className="font-medium text-green-800">
                    {formatCurrency(calculatedIncentive.ratePerKm)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Driver's KM:</span>
                  <span className="font-medium text-green-800">
                    {formatNumber(formData.actual_kilometers)} km
                  </span>
                </div>
                <div className="h-px bg-green-200 my-2" />
                <div className="flex justify-between text-base">
                  <span className="font-medium text-green-700">
                    Calculated Incentive:
                  </span>
                  <span className="font-bold text-green-800">
                    {formatCurrency(calculatedIncentive.incentive)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-3">
                Formula: Target KM/Truck = Budget ÷ Trucks → Rate = Divisor ÷
                Target → Incentive = Rate × KM
              </p>
            </div>
          )}

          {/* Additional Performance Metrics */}
          <div className="space-y-4">
            <h4 className="font-medium text-surface-700">
              Additional Metrics (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Trips Completed</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.trips_completed || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      trips_completed: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="Number of trips"
                />
              </div>
              <div>
                <label className="form-label">Fuel Efficiency (km/l)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.fuel_efficiency}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fuel_efficiency: e.target.value,
                    }))
                  }
                  placeholder="e.g., 8.5"
                />
              </div>
              <div>
                <label className="form-label">On-Time Delivery Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  max="100"
                  className="form-input"
                  value={formData.on_time_delivery_rate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      on_time_delivery_rate: e.target.value,
                    }))
                  }
                  placeholder="e.g., 95"
                />
              </div>
              <div>
                <label className="form-label">Safety Score (%)</label>
                <input
                  type="number"
                  step="0.1"
                  max="100"
                  className="form-input"
                  value={formData.safety_score}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      safety_score: e.target.value,
                    }))
                  }
                  placeholder="e.g., 98"
                />
              </div>
            </div>
            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows={2}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !selectedDriverId}
              className="btn btn-primary"
            >
              {isSaving
                ? "Saving..."
                : isEditMode
                  ? "Save Changes"
                  : existingRecord
                    ? "Update Performance"
                    : "Record Performance"}
            </button>
          </div>
        </form>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-surface-900">
                  Delete Performance Record?
                </h3>
              </div>
              <p className="text-surface-600 mb-6">
                This will permanently delete this performance record and its
                associated incentive calculation. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="btn bg-red-600 text-white hover:bg-red-700"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
