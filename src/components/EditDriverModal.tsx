import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import type { Driver, DriverUpdate } from "../types/database";

interface EditDriverModalProps {
  driver: Driver;
  onClose: () => void;
}

export default function EditDriverModal({
  driver,
  onClose,
}: EditDriverModalProps) {
  const { showToast } = useStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<DriverUpdate>({
    employee_id: driver.employee_id,
    first_name: driver.first_name,
    last_name: driver.last_name,
    email: driver.email || "",
    phone: driver.phone || "",
    date_of_birth: driver.date_of_birth || "",
    hire_date: driver.hire_date,
    license_number: driver.license_number,
    license_expiry: driver.license_expiry || "",
    license_class: driver.license_class || "",
    passport_number: driver.passport_number || "",
    passport_expiry: driver.passport_expiry || "",
    driver_type: driver.driver_type,
    status: driver.status,
    usd_base_salary: driver.usd_base_salary || 0,
    zig_base_salary: driver.zig_base_salary || 0,
    base_salary: driver.base_salary,
    address: driver.address || "",
    emergency_contact_name: driver.emergency_contact_name || "",
    emergency_contact_phone: driver.emergency_contact_phone || "",
    notes: driver.notes || "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update(formData)
        .eq("id", driver.id);
      if (error) throw error;
      showToast("Driver updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating driver:", error);
      showToast("Error updating driver");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-surface-100 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900">
              Edit Driver
            </h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-surface-900 mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Employee ID</label>
                <input
                  type="text"
                  name="employee_id"
                  className="form-input"
                  value={formData.employee_id ?? ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Driver Type</label>
                <select
                  name="driver_type"
                  className="form-select"
                  value={formData.driver_type ?? "local"}
                  onChange={handleChange}
                >
                  <option value="local">Local</option>
                  <option value="export">Export</option>
                </select>
              </div>
              <div>
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  className="form-input"
                  value={formData.first_name ?? ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  className="form-input"
                  value={formData.last_name ?? ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  value={formData.phone ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  className="form-input"
                  value={formData.date_of_birth ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="form-label">Hire Date</label>
                <input
                  type="date"
                  name="hire_date"
                  className="form-input"
                  value={formData.hire_date ?? ""}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* License & Documents */}
          <div>
            <h3 className="text-sm font-medium text-surface-900 mb-4">
              License & Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">License Number</label>
                <input
                  type="text"
                  name="license_number"
                  className="form-input"
                  value={formData.license_number ?? ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">License Class</label>
                <input
                  type="text"
                  name="license_class"
                  className="form-input"
                  value={formData.license_class ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="form-label">License Expiry</label>
                <input
                  type="date"
                  name="license_expiry"
                  className="form-input"
                  value={formData.license_expiry ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="form-label">Passport Number</label>
                <input
                  type="text"
                  name="passport_number"
                  className="form-input"
                  value={formData.passport_number ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="form-label">Passport Expiry</label>
                <input
                  type="date"
                  name="passport_expiry"
                  className="form-input"
                  value={formData.passport_expiry ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Employment */}
          <div>
            <h3 className="text-sm font-medium text-surface-900 mb-4">
              Employment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Status</label>
                <select
                  name="status"
                  className="form-select"
                  value={formData.status ?? "active"}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-sm text-blue-700 font-medium">💡 Salary Management</p>
                <p className="text-xs text-blue-600 mt-1">
                  Manage salary records in the Earnings tab of the driver profile for monthly USD and ZIG tracking.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-medium text-surface-900 mb-4">
              Contact & Emergency
            </h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Address</label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  value={formData.address ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Emergency Contact Name</label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    className="form-input"
                    value={formData.emergency_contact_name ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="form-label">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    name="emergency_contact_phone"
                    className="form-input"
                    value={formData.emergency_contact_phone ?? ""}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea
              name="notes"
              className="form-input"
              rows={3}
              value={formData.notes ?? ""}
              onChange={handleChange}
            />
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
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
