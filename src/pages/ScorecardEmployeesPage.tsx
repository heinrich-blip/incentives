import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useScorecardStore } from "../store/useScorecardStore";
import type { ScorecardEmployee } from "../types/scorecard";

export default function ScorecardEmployeesPage() {
  const { roles, employees, fetchRoles, fetchEmployees, createEmployee, updateEmployee, deleteEmployee } =
    useScorecardStore();

  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ScorecardEmployee | null>(null);
  const [formData, setFormData] = useState({
    role_id: "",
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    department: null as string | null,
    phone: null as string | null,
    hire_date: null as string | null,
    status: "active" as "active" | "inactive" | "terminated",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchEmployees();
  }, [fetchRoles, fetchEmployees]);

  const filteredEmployees = useMemo(() => {
    if (!selectedRole) return employees;
    return employees.filter((e) => e.role_id === selectedRole);
  }, [employees, selectedRole]);

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.role_name || "Unknown";
  };

  const handleOpenModal = (employee?: ScorecardEmployee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        role_id: employee.role_id,
        employee_id: employee.employee_id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email || "",
        department: employee.department,
        phone: employee.phone,
        hire_date: employee.hire_date,
        status: employee.status,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        role_id: selectedRole || "",
        employee_id: "",
        first_name: "",
        last_name: "",
        email: "",
        department: null,
        phone: null,
        hire_date: null,
        status: "active",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData({
      role_id: "",
      employee_id: "",
      first_name: "",
      last_name: "",
      email: "",
      department: null,
      phone: null,
      hire_date: null,
      status: "active",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData);
      } else {
        await createEmployee(formData);
      }
      handleCloseModal();
      fetchEmployees();
    } catch (error) {
      console.error("Error saving employee:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      await deleteEmployee(id);
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-gray-100 text-gray-700",
      terminated: "bg-red-100 text-red-700",
    };
    return styles[status] || styles.inactive;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scorecard Employees</h1>
          <p className="text-gray-600 mt-1">
            Manage employees for the scorecard system
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/scorecards"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            ← Back to Scorecards
          </Link>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Role:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.role_name}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            Showing {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No employees found. Add an employee to get started.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{employee.employee_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {employee.first_name} {employee.last_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getRoleName(employee.role_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employee.email || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(employee.status)}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenModal(employee)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingEmployee ? "Edit Employee" : "Add Employee"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                  placeholder="e.g., EMP001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" | "terminated" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingEmployee ? "Update Employee" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
