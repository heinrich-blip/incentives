import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import { formatNumber } from "../utils/formatters";

interface AddMonthlySalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  driverName: string;
  existingEntry?: {
    id: string;
    year: number;
    month: number;
    usd_base_salary: number;
    zig_base_salary: number;
    notes: string | null;
  } | null;
}

export default function AddMonthlySalaryModal({
  isOpen,
  onClose,
  driverId,
  driverName,
  existingEntry,
}: AddMonthlySalaryModalProps) {
  const { zigUsdConversionRates, driverSalaryHistory, setDriverSalaryHistory, showToast } = useStore();
  
  const currentDate = new Date();
  const [year, setYear] = useState(existingEntry?.year || currentDate.getFullYear());
  const [month, setMonth] = useState(existingEntry?.month || currentDate.getMonth() + 1);
  const [usdBaseSalary, setUsdBaseSalary] = useState(existingEntry?.usd_base_salary?.toString() || "");
  const [zigBaseSalary, setZigBaseSalary] = useState(existingEntry?.zig_base_salary?.toString() || "");
  const [notes, setNotes] = useState(existingEntry?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when existingEntry changes
  useEffect(() => {
    if (existingEntry) {
      setYear(existingEntry.year);
      setMonth(existingEntry.month);
      setUsdBaseSalary(existingEntry.usd_base_salary?.toString() || "");
      setZigBaseSalary(existingEntry.zig_base_salary?.toString() || "");
      setNotes(existingEntry.notes || "");
    } else {
      setYear(currentDate.getFullYear());
      setMonth(currentDate.getMonth() + 1);
      setUsdBaseSalary("");
      setZigBaseSalary("");
      setNotes("");
    }
  }, [existingEntry]);

  // Get conversion rate for selected month
  const conversionRate = useMemo(() => {
    const rate = zigUsdConversionRates.find(
      (r) => r.year === year && r.month === month
    );
    return rate?.rate || 1;
  }, [zigUsdConversionRates, year, month]);

  // Calculate ZIG to USD
  const zigInUsd = useMemo(() => {
    const zigAmount = parseFloat(zigBaseSalary) || 0;
    if (zigAmount <= 0 || conversionRate <= 0) return 0;
    return zigAmount / conversionRate;
  }, [zigBaseSalary, conversionRate]);

  // Calculate total USD
  const totalUsd = useMemo(() => {
    const usd = parseFloat(usdBaseSalary) || 0;
    return usd + zigInUsd;
  }, [usdBaseSalary, zigInUsd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const salaryData = {
      driver_id: driverId,
      year,
      month,
      usd_base_salary: parseFloat(usdBaseSalary) || 0,
      zig_base_salary: parseFloat(zigBaseSalary) || 0,
      effective_date: `${year}-${String(month).padStart(2, "0")}-01`,
      notes: notes || null,
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        if (existingEntry?.id) {
          // Update existing entry
          const { error } = await supabase
            .from("driver_salary_history")
            .update(salaryData)
            .eq("id", existingEntry.id);

          if (error) throw error;

          setDriverSalaryHistory(
            driverSalaryHistory.map((s) =>
              s.id === existingEntry.id ? { ...s, ...salaryData } : s
            )
          );
          showToast("Monthly salary updated successfully");
        } else {
          // Check for existing entry
          const existing = driverSalaryHistory.find(
            (s) => s.driver_id === driverId && s.year === year && s.month === month
          );

          if (existing) {
            // Update existing
            const { error } = await supabase
              .from("driver_salary_history")
              .update(salaryData)
              .eq("id", existing.id);

            if (error) throw error;

            setDriverSalaryHistory(
              driverSalaryHistory.map((s) =>
                s.id === existing.id ? { ...s, ...salaryData } : s
              )
            );
            showToast("Monthly salary updated successfully");
          } else {
            // Insert new
            const { data, error } = await supabase
              .from("driver_salary_history")
              .insert(salaryData)
              .select()
              .single();

            if (error) throw error;

            setDriverSalaryHistory([...driverSalaryHistory, data]);
            showToast("Monthly salary added successfully");
          }
        }
        onClose();
      } catch (error) {
        console.error("Error saving salary:", error);
        showToast("Failed to save salary");
      }
    } else {
      // Demo mode
      const newEntry = {
        id: existingEntry?.id || crypto.randomUUID(),
        ...salaryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingEntry?.id) {
        setDriverSalaryHistory(
          driverSalaryHistory.map((s) => (s.id === existingEntry.id ? newEntry : s))
        );
      } else {
        const existing = driverSalaryHistory.find(
          (s) => s.driver_id === driverId && s.year === year && s.month === month
        );
        if (existing) {
          setDriverSalaryHistory(
            driverSalaryHistory.map((s) =>
              s.id === existing.id ? { ...newEntry, id: existing.id } : s
            )
          );
        } else {
          setDriverSalaryHistory([...driverSalaryHistory, newEntry]);
        }
      }
      showToast("Monthly salary saved (demo mode)");
      onClose();
    }

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900">
            {existingEntry ? "Edit" : "Add"} Monthly Salary
          </h2>
          <p className="text-sm text-surface-500 mt-0.5">
            {driverName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Period Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="input"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="input"
              >
                {months.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversion Rate Info */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">ZIG→USD Rate ({month}/{year})</span>
              <span className="font-semibold text-blue-800">
                1 USD = {formatNumber(conversionRate, 2)} ZIG
              </span>
            </div>
            {conversionRate === 1 && (
              <p className="text-xs text-blue-600 mt-1">
                No rate set for this period. Using default rate of 1:1.
              </p>
            )}
          </div>

          {/* USD Salary */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              USD Base Salary
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={usdBaseSalary}
                onChange={(e) => setUsdBaseSalary(e.target.value)}
                className="input pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* ZIG Salary */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              ZIG Base Salary
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">ZIG</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={zigBaseSalary}
                onChange={(e) => setZigBaseSalary(e.target.value)}
                className="input pl-12"
                placeholder="0.00"
              />
            </div>
            {zigInUsd > 0 && (
              <p className="text-sm text-surface-500 mt-1">
                ≈ ${formatNumber(zigInUsd, 2)} USD
              </p>
            )}
          </div>

          {/* Total Summary */}
          <div className="p-4 rounded-xl bg-green-50 border border-green-100">
            <p className="text-sm text-green-700">Total Base Salary (USD)</p>
            <p className="text-2xl font-bold text-green-800">
              ${formatNumber(totalUsd, 2)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              USD (${formatNumber(parseFloat(usdBaseSalary) || 0, 2)}) + ZIG→USD (${formatNumber(zigInUsd, 2)})
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input resize-none"
              rows={2}
              placeholder="Any notes about this salary entry..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : existingEntry ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
