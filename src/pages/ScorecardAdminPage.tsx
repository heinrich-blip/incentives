import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useScorecardStore } from "../store/useScorecardStore";
import type { RoleWithKRAs, ScorecardKPI, ScorecardKRA } from "../types/scorecard";

interface KRAFormData {
  kra_name: string;
  weighting: number;
  sort_order: number;
  is_active: boolean;
}

interface KPIFormData {
  kpi_name: string;
  description: string;
  measurement_type: "percentage" | "number" | "currency" | "ratio" | "count" | "yes_no";
  target_direction: "higher_better" | "lower_better" | "exact";
  weighting: number;
  unit: string;
  default_target: number | null;
  min_value: number | null;
  max_value: number | null;
  sort_order: number;
  is_active: boolean;
}

const defaultKRAForm: KRAFormData = {
  kra_name: "",
  weighting: 0,
  sort_order: 0,
  is_active: true,
};

const defaultKPIForm: KPIFormData = {
  kpi_name: "",
  description: "",
  measurement_type: "percentage",
  target_direction: "higher_better",
  weighting: 100,
  unit: "%",
  default_target: null,
  min_value: null,
  max_value: null,
  sort_order: 0,
  is_active: true,
};

export default function ScorecardAdminPage() {
  const {
    roles,
    fetchRoles,
    fetchRoleWithKRAs,
    createKRA,
    updateKRA,
    deleteKRA,
    createKPI,
    updateKPI,
    deleteKPI,
  } = useScorecardStore();

  const [selectedRole, setSelectedRole] = useState<string>("");
  const [roleData, setRoleData] = useState<RoleWithKRAs | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // KRA Modal state
  const [kraModalOpen, setKraModalOpen] = useState(false);
  const [editingKRA, setEditingKRA] = useState<ScorecardKRA | null>(null);
  const [kraForm, setKraForm] = useState<KRAFormData>(defaultKRAForm);

  // KPI Modal state
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [editingKPI, setEditingKPI] = useState<ScorecardKPI | null>(null);
  const [selectedKRAId, setSelectedKRAId] = useState<string>("");
  const [kpiForm, setKpiForm] = useState<KPIFormData>(defaultKPIForm);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const loadRoleData = async () => {
    if (selectedRole) {
      setIsLoading(true);
      const data = await fetchRoleWithKRAs(selectedRole);
      setRoleData(data);
      setIsLoading(false);
    } else {
      setRoleData(null);
    }
  };

  useEffect(() => {
    loadRoleData();
  }, [selectedRole]);

  // KRA handlers
  const openKRAModal = (kra?: ScorecardKRA) => {
    if (kra) {
      setEditingKRA(kra);
      setKraForm({
        kra_name: kra.kra_name,
        weighting: kra.weighting,
        sort_order: kra.sort_order,
        is_active: kra.is_active,
      });
    } else {
      setEditingKRA(null);
      const nextSortOrder = roleData?.kras.length || 0;
      setKraForm({ ...defaultKRAForm, sort_order: nextSortOrder + 1 });
    }
    setKraModalOpen(true);
  };

  const closeKRAModal = () => {
    setKraModalOpen(false);
    setEditingKRA(null);
    setKraForm(defaultKRAForm);
  };

  const handleSaveKRA = async () => {
    if (!selectedRole) return;
    setIsSaving(true);

    try {
      if (editingKRA) {
        await updateKRA(editingKRA.id, kraForm);
      } else {
        await createKRA({
          ...kraForm,
          role_id: selectedRole,
        });
      }
      closeKRAModal();
      loadRoleData();
    } catch (error) {
      console.error("Error saving KRA:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKRA = async (id: string) => {
    if (!confirm("Are you sure? This will also delete all KPIs under this KRA.")) return;
    await deleteKRA(id);
    loadRoleData();
  };

  // KPI handlers
  const openKPIModal = (kraId: string, kpi?: ScorecardKPI) => {
    setSelectedKRAId(kraId);
    if (kpi) {
      setEditingKPI(kpi);
      setKpiForm({
        kpi_name: kpi.kpi_name,
        description: kpi.description || "",
        measurement_type: kpi.measurement_type,
        target_direction: kpi.target_direction,
        weighting: kpi.weighting,
        unit: kpi.unit || "",
        default_target: kpi.default_target,
        min_value: kpi.min_value,
        max_value: kpi.max_value,
        sort_order: kpi.sort_order,
        is_active: kpi.is_active,
      });
    } else {
      setEditingKPI(null);
      const kra = roleData?.kras.find((k) => k.id === kraId);
      const nextSortOrder = kra?.kpis?.length || 0;
      setKpiForm({ ...defaultKPIForm, sort_order: nextSortOrder + 1 });
    }
    setKpiModalOpen(true);
  };

  const closeKPIModal = () => {
    setKpiModalOpen(false);
    setEditingKPI(null);
    setSelectedKRAId("");
    setKpiForm(defaultKPIForm);
  };

  const handleSaveKPI = async () => {
    if (!selectedKRAId) return;
    setIsSaving(true);

    try {
      if (editingKPI) {
        await updateKPI(editingKPI.id, kpiForm);
      } else {
        await createKPI({
          ...kpiForm,
          kra_id: selectedKRAId,
        });
      }
      closeKPIModal();
      loadRoleData();
    } catch (error) {
      console.error("Error saving KPI:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKPI = async (id: string) => {
    if (!confirm("Are you sure you want to delete this KPI?")) return;
    await deleteKPI(id);
    loadRoleData();
  };

  // Calculate total weighting
  const totalKRAWeighting = roleData?.kras.reduce((sum, kra) => sum + kra.weighting, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scorecard Configuration</h1>
          <p className="text-gray-600 mt-1">
            Manage KRAs (Key Result Areas) and KPIs (Key Performance Indicators) for each role
          </p>
        </div>
        <Link
          to="/scorecards"
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          ← Back to Scorecards
        </Link>
      </div>

      {/* Role Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Select Role to Configure:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[250px]"
          >
            <option value="">Select Role...</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.role_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      )}

      {/* Role Configuration */}
      {selectedRole && roleData && !isLoading && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{roleData.role_name}</h2>
                <p className="text-sm text-gray-500">{roleData.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total KRA Weighting</p>
                  <p className={`text-2xl font-bold ${totalKRAWeighting === 100 ? "text-green-600" : "text-red-600"}`}>
                    {totalKRAWeighting}%
                  </p>
                </div>
                <button
                  onClick={() => openKRAModal()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add KRA
                </button>
              </div>
            </div>
            {totalKRAWeighting !== 100 && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                ⚠️ Total KRA weighting should equal 100%. Current total: {totalKRAWeighting}%
              </div>
            )}
          </div>

          {/* KRAs and KPIs */}
          {roleData.kras.map((kra) => {
            const totalKPIWeighting = kra.kpis?.reduce((sum, kpi) => sum + kpi.weighting, 0) || 0;
            return (
              <div key={kra.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* KRA Header */}
                <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
                      {kra.weighting}%
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{kra.kra_name}</h3>
                      <p className="text-sm text-gray-500">
                        {kra.kpis?.length || 0} KPI{(kra.kpis?.length || 0) !== 1 ? "s" : ""} • 
                        KPI Weighting Total: <span className={totalKPIWeighting === 100 ? "text-green-600" : "text-red-600"}>{totalKPIWeighting}%</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openKPIModal(kra.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add KPI
                    </button>
                    <button
                      onClick={() => openKRAModal(kra)}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteKRA(kra.id)}
                      className="px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* KPIs Table */}
                {kra.kpis && kra.kpis.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">KPI Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Weight</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Unit</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-28">Direction</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Default</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {kra.kpis.map((kpi) => (
                        <tr key={kpi.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{kpi.kpi_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{kpi.description || "-"}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">{kpi.weighting}%</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-500">{kpi.unit || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                kpi.target_direction === "higher_better"
                                  ? "bg-green-100 text-green-700"
                                  : kpi.target_direction === "lower_better"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {kpi.target_direction === "higher_better"
                                ? "Higher ↑"
                                : kpi.target_direction === "lower_better"
                                ? "Lower ↓"
                                : "Exact ="}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-500">
                            {kpi.default_target ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => openKPIModal(kra.id, kpi)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteKPI(kpi.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No KPIs configured. Click "Add KPI" to create one.
                  </div>
                )}
              </div>
            );
          })}

          {roleData.kras.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No KRAs Configured</h3>
              <p className="text-gray-500 mb-4">
                Start by adding Key Result Areas for this role.
              </p>
              <button
                onClick={() => openKRAModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First KRA
              </button>
            </div>
          )}
        </div>
      )}

      {/* No role selected */}
      {!selectedRole && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Role to Configure</h3>
          <p className="text-gray-500">
            Choose a role from the dropdown above to view and edit its KRAs and KPIs.
          </p>
        </div>
      )}

      {/* KRA Modal */}
      {kraModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingKRA ? "Edit KRA" : "Add KRA"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KRA Name *</label>
                <input
                  type="text"
                  value={kraForm.kra_name}
                  onChange={(e) => setKraForm({ ...kraForm, kra_name: e.target.value })}
                  placeholder="e.g., Safety, Fuel Efficiency"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weighting (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={kraForm.weighting}
                    onChange={(e) => setKraForm({ ...kraForm, weighting: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={kraForm.sort_order}
                    onChange={(e) => setKraForm({ ...kraForm, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="kra-active"
                  checked={kraForm.is_active}
                  onChange={(e) => setKraForm({ ...kraForm, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="kra-active" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeKRAModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKRA}
                  disabled={isSaving || !kraForm.kra_name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingKRA ? "Update KRA" : "Add KRA"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Modal */}
      {kpiModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingKPI ? "Edit KPI" : "Add KPI"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI Name *</label>
                <input
                  type="text"
                  value={kpiForm.kpi_name}
                  onChange={(e) => setKpiForm({ ...kpiForm, kpi_name: e.target.value })}
                  placeholder="e.g., Accidents, KM/Lt, On-Time Delivery"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={kpiForm.description}
                  onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
                  placeholder="Describe what this KPI measures..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Type *</label>
                  <select
                    value={kpiForm.measurement_type}
                    onChange={(e) => setKpiForm({ ...kpiForm, measurement_type: e.target.value as KPIFormData["measurement_type"] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="number">Number</option>
                    <option value="currency">Currency</option>
                    <option value="ratio">Ratio</option>
                    <option value="count">Count</option>
                    <option value="yes_no">Yes/No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Direction *</label>
                  <select
                    value={kpiForm.target_direction}
                    onChange={(e) => setKpiForm({ ...kpiForm, target_direction: e.target.value as KPIFormData["target_direction"] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="higher_better">Higher is Better ↑</option>
                    <option value="lower_better">Lower is Better ↓</option>
                    <option value="exact">Exact Match =</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weighting (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={kpiForm.weighting}
                    onChange={(e) => setKpiForm({ ...kpiForm, weighting: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={kpiForm.unit}
                    onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })}
                    placeholder="%, km/L, R, days"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Target</label>
                  <input
                    type="number"
                    step="0.01"
                    value={kpiForm.default_target ?? ""}
                    onChange={(e) => setKpiForm({ ...kpiForm, default_target: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={kpiForm.min_value ?? ""}
                    onChange={(e) => setKpiForm({ ...kpiForm, min_value: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={kpiForm.max_value ?? ""}
                    onChange={(e) => setKpiForm({ ...kpiForm, max_value: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={kpiForm.sort_order}
                    onChange={(e) => setKpiForm({ ...kpiForm, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="kpi-active"
                  checked={kpiForm.is_active}
                  onChange={(e) => setKpiForm({ ...kpiForm, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="kpi-active" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeKPIModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKPI}
                  disabled={isSaving || !kpiForm.kpi_name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingKPI ? "Update KPI" : "Add KPI"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
