import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";

interface AddRecordModalProps {
  driverId: string;
  recordType: string;
  onClose: () => void;
}

export default function AddRecordModal({
  driverId,
  recordType,
  onClose,
}: AddRecordModalProps) {
  const { showToast } = useStore();
  const [isSaving, setIsSaving] = useState(false);

  // Accident form state
  const [accidentData, setAccidentData] = useState({
    incident_date: new Date().toISOString().split("T")[0],
    incident_type: "minor",
    description: "",
    location: "",
    vehicle_damage_cost: 0,
    third_party_cost: 0,
    at_fault: false,
    insurance_claim_number: "",
    police_report_number: "",
  });

  // Incident form state
  const [incidentData, setIncidentData] = useState({
    incident_date: new Date().toISOString().split("T")[0],
    incident_type: "traffic_violation",
    severity: "low",
    description: "",
    action_taken: "",
    fine_amount: 0,
  });

  // Disciplinary form state
  const [disciplinaryData, setDisciplinaryData] = useState({
    record_date: new Date().toISOString().split("T")[0],
    record_type: "verbal_warning",
    reason: "",
    description: "",
    issued_by: "",
    duration_days: 0,
  });

  // Leave form state
  const [leaveData, setLeaveData] = useState({
    leave_type: "annual",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    total_days: 1,
    reason: "",
    status: "pending",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    setIsSaving(true);
    try {
      let error;
      switch (recordType) {
        case "accident":
          ({ error } = await supabase.from("accidents").insert({
            driver_id: driverId,
            ...accidentData,
          }));
          break;
        case "incident":
          ({ error } = await supabase.from("incidents").insert({
            driver_id: driverId,
            ...incidentData,
          }));
          break;
        case "disciplinary":
          ({ error } = await supabase.from("disciplinary_records").insert({
            driver_id: driverId,
            ...disciplinaryData,
          }));
          break;
        case "leave":
          ({ error } = await supabase.from("leave_records").insert({
            driver_id: driverId,
            ...leaveData,
          }));
          break;
      }

      if (error) throw error;
      showToast("Record added successfully");
      onClose();
    } catch (error) {
      console.error("Error adding record:", error);
      showToast("Error adding record");
    } finally {
      setIsSaving(false);
    }
  };

  const getTitle = () => {
    switch (recordType) {
      case "accident":
        return "Add Accident Record";
      case "incident":
        return "Add Incident Record";
      case "disciplinary":
        return "Add Disciplinary Record";
      case "leave":
        return "Add Leave Record";
      default:
        return "Add Record";
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-surface-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-900">
              {getTitle()}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Accident Form */}
          {recordType === "accident" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={accidentData.incident_date}
                    onChange={(e) =>
                      setAccidentData((prev) => ({
                        ...prev,
                        incident_date: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Severity</label>
                  <select
                    className="form-select"
                    value={accidentData.incident_type}
                    onChange={(e) =>
                      setAccidentData((prev) => ({
                        ...prev,
                        incident_type: e.target.value,
                      }))
                    }
                  >
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="fatal">Fatal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={accidentData.description}
                  onChange={(e) =>
                    setAccidentData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={accidentData.location}
                  onChange={(e) =>
                    setAccidentData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Vehicle Damage Cost (R)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={accidentData.vehicle_damage_cost}
                    onChange={(e) =>
                      setAccidentData((prev) => ({
                        ...prev,
                        vehicle_damage_cost: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min="0"
                  />
                </div>
                <div>
                  <label className="form-label">Third Party Cost (R)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={accidentData.third_party_cost}
                    onChange={(e) =>
                      setAccidentData((prev) => ({
                        ...prev,
                        third_party_cost: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="at_fault"
                  checked={accidentData.at_fault}
                  onChange={(e) =>
                    setAccidentData((prev) => ({
                      ...prev,
                      at_fault: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="at_fault" className="text-sm text-surface-700">
                  Driver was at fault
                </label>
              </div>
            </>
          )}

          {/* Incident Form */}
          {recordType === "incident" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={incidentData.incident_date}
                    onChange={(e) =>
                      setIncidentData((prev) => ({
                        ...prev,
                        incident_date: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={incidentData.incident_type}
                    onChange={(e) =>
                      setIncidentData((prev) => ({
                        ...prev,
                        incident_type: e.target.value,
                      }))
                    }
                  >
                    <option value="traffic_violation">Traffic Violation</option>
                    <option value="customer_complaint">
                      Customer Complaint
                    </option>
                    <option value="vehicle_misuse">Vehicle Misuse</option>
                    <option value="safety_violation">Safety Violation</option>
                    <option value="policy_violation">Policy Violation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Severity</label>
                <select
                  className="form-select"
                  value={incidentData.severity}
                  onChange={(e) =>
                    setIncidentData((prev) => ({
                      ...prev,
                      severity: e.target.value,
                    }))
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={incidentData.description}
                  onChange={(e) =>
                    setIncidentData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="form-label">Action Taken</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={incidentData.action_taken}
                  onChange={(e) =>
                    setIncidentData((prev) => ({
                      ...prev,
                      action_taken: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="form-label">Fine Amount (R)</label>
                <input
                  type="number"
                  className="form-input"
                  value={incidentData.fine_amount}
                  onChange={(e) =>
                    setIncidentData((prev) => ({
                      ...prev,
                      fine_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  min="0"
                />
              </div>
            </>
          )}

          {/* Disciplinary Form */}
          {recordType === "disciplinary" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={disciplinaryData.record_date}
                    onChange={(e) =>
                      setDisciplinaryData((prev) => ({
                        ...prev,
                        record_date: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={disciplinaryData.record_type}
                    onChange={(e) =>
                      setDisciplinaryData((prev) => ({
                        ...prev,
                        record_type: e.target.value,
                      }))
                    }
                  >
                    <option value="verbal_warning">Verbal Warning</option>
                    <option value="written_warning">Written Warning</option>
                    <option value="final_warning">Final Warning</option>
                    <option value="suspension">Suspension</option>
                    <option value="termination">Termination</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Reason</label>
                <input
                  type="text"
                  className="form-input"
                  value={disciplinaryData.reason}
                  onChange={(e) =>
                    setDisciplinaryData((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={disciplinaryData.description}
                  onChange={(e) =>
                    setDisciplinaryData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Issued By</label>
                  <input
                    type="text"
                    className="form-input"
                    value={disciplinaryData.issued_by}
                    onChange={(e) =>
                      setDisciplinaryData((prev) => ({
                        ...prev,
                        issued_by: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="form-label">Duration (days)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={disciplinaryData.duration_days}
                    onChange={(e) =>
                      setDisciplinaryData((prev) => ({
                        ...prev,
                        duration_days: parseInt(e.target.value) || 0,
                      }))
                    }
                    min="0"
                  />
                </div>
              </div>
            </>
          )}

          {/* Leave Form */}
          {recordType === "leave" && (
            <>
              <div>
                <label className="form-label">Leave Type</label>
                <select
                  className="form-select"
                  value={leaveData.leave_type}
                  onChange={(e) =>
                    setLeaveData((prev) => ({
                      ...prev,
                      leave_type: e.target.value,
                    }))
                  }
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="compassionate">Compassionate Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={leaveData.start_date}
                    onChange={(e) =>
                      setLeaveData((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={leaveData.end_date}
                    onChange={(e) =>
                      setLeaveData((prev) => ({
                        ...prev,
                        end_date: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Total Days</label>
                <input
                  type="number"
                  className="form-input"
                  value={leaveData.total_days}
                  onChange={(e) =>
                    setLeaveData((prev) => ({
                      ...prev,
                      total_days: parseInt(e.target.value) || 1,
                    }))
                  }
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="form-label">Reason</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={leaveData.reason}
                  onChange={(e) =>
                    setLeaveData((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={leaveData.status}
                  onChange={(e) =>
                    setLeaveData((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </>
          )}

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
              {isSaving ? "Saving..." : "Add Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
