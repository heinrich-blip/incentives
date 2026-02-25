import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import type { DriverInsert } from "../types/database";

interface AddDriverModalProps {
  onClose: () => void;
}

export default function AddDriverModal({ onClose }: AddDriverModalProps) {
  const { showToast } = useStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<DriverInsert>>({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    hire_date: new Date().toISOString().split("T")[0],
    license_number: "",
    license_expiry: "",
    license_class: "",
    passport_number: "",
    passport_expiry: "",
    driver_type: "local",
    status: "active",
    usd_base_salary: 0,
    zig_base_salary: 0,
    base_salary: 0,
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
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

    if (
      !formData.employee_id ||
      !formData.first_name ||
      !formData.last_name ||
      !formData.license_number ||
      !formData.hire_date
    ) {
      showToast("Please fill in all required fields");
      return;
    }

    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode. Configure Supabase to add drivers.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .insert(formData as DriverInsert);
      if (error) throw error;
      showToast("Driver added successfully");
      onClose();
    } catch (error: unknown) {
      console.error("Error adding driver:", error);
      const message =
        error instanceof Error ? error.message : "Error adding driver";
      showToast(message);
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
              Add New Driver
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
                <label className="form-label">Employee ID *</label>
                <input
                  type="text"
                  name="employee_id"
                  className="form-input"
                  value={formData.employee_id}
                  onChange={handleChange}
                  placeholder="DRV-001"
                  required
                />
              </div>
              <div>
                <label className="form-label">Driver Type *</label>
                <select
                  name="driver_type"
                  className="form-select"
                  value={formData.driver_type}
                  onChange={handleChange}
                  required
                >
                  <option value="local">Local</option>
                  <option value="export">Export</option>
                </select>
              </div>
              <div>
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  className="form-input"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  className="form-input"
                  value={formData.last_name}
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
                <label className="form-label">Hire Date *</label>
                <input
                  type="date"
                  name="hire_date"
                  className="form-input"
                  value={formData.hire_date}
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
                <label className="form-label">License Number *</label>
                <input
                  type="text"
                  name="license_number"
                  className="form-input"
                  value={formData.license_number}
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
                  placeholder="e.g., C1, EC"
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
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-sm text-blue-700 font-medium">💡 Salary Setup</p>
                <p className="text-xs text-blue-600 mt-1">
                  After creating the driver, go to the Earnings tab in their profile to set up monthly salary records with USD and ZIG amounts.
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
              {isSaving ? "Saving..." : "Add Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
