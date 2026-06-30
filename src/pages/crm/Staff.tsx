import React, { useState } from 'react';
import { Search, Plus, MoreVertical, Shield, Mail, Phone, X } from 'lucide-react';
import { useCRM, StaffMember } from '../../context/CRMDataContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { usePlanLimits } from '../../lib/planLimits';
import UpgradeModal from '../../components/crm/UpgradeModal';
import { sendStaffCredentials } from '../../lib/email';
import { toast } from 'sonner';

export default function Staff() {
  const { staff, addStaff, updateStaff, deleteStaff } = useCRM();
  const { tenant } = useAuth();
  const { canAdd, limitFor, currentCount, plan } = usePlanLimits();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'RECEPTION' as 'RECEPTION' | 'MANAGER' | 'HOUSEKEEPING' | 'ACCOUNTANT' | 'SUPER_ADMIN' | 'SERVER',
    status: 'Active' as 'Active' | 'Inactive',
    password: '',
  });

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendStaffWhatsAppNotification = async (staffData: {
    name: string; email: string; phone: string; password: string; role: string;
  }) => {
    try {
      if (!tenant?.id || !staffData.phone) return;

      const { data: config } = await supabase
        .from('tenants')
        .select('whatsapp_enabled, subdomain, business_name')
        .eq('id', tenant.id)
        .single();

      if (!config?.whatsapp_enabled) return;

      const loginUrl = config.subdomain
        ? `https://${config.subdomain}.triplooper.com/admin/login`
        : 'your hotel management portal';

      const roleName = staffData.role.replace(/_/g, ' ');

      const message =
        `Hello ${staffData.name}!\n\n` +
        `You have been added as a staff member at *${config.business_name || 'our hotel'}*.\n\n` +
        `*Your Login Details:*\n` +
        `Role: ${roleName}\n` +
        `Email: ${staffData.email}\n` +
        `Password: ${staffData.password}\n\n` +
        `Login here: ${loginUrl}\n\n` +
        `Please change your password after your first login.`;

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { tenant_id: tenant.id, phone: staffData.phone, message },
      });

      if (error || !data?.success) {
        toast.error('Staff created, but WhatsApp notification failed to send.');
        return;
      }
      toast.success('Login credentials sent via WhatsApp!');
    } catch (err) {
      console.warn('WhatsApp notification error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || (!editingStaffId && !formData.password)) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      if (editingStaffId) {
        await toast.promise(updateStaff(editingStaffId, formData), {
          loading: 'Updating staff...',
          success: 'Staff updated successfully',
          error: (err) => err.message || 'Failed to update staff'
        });
      } else {
        await toast.promise(addStaff(formData), {
          loading: 'Creating staff member...',
          success: 'Staff created successfully',
          error: (err) => err.message || 'Failed to create staff'
        });
        // Send WhatsApp notification with login credentials (non-blocking)
        sendStaffWhatsAppNotification({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
        });
        // Send email with login credentials (non-blocking)
        sendStaffCredentials({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          password: formData.password,
          subdomain: tenant?.subdomain || '',
          businessName: tenant?.business_name || 'Our Hotel',
        });
      }

      setIsModalOpen(false);
      setEditingStaffId(null);
      setFormData({ name: '', email: '', phone: '', role: 'RECEPTION', status: 'Active', password: '' });
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaffId(member.id);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      status: member.status,
      password: '', // Don't populate password on edit
    });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  return (
    <div className="max-w-7xl mx-auto relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 mt-1">Manage employee access, roles, and profiles.</p>
        </div>
        <button
          onClick={() => canAdd('staff') ? setIsModalOpen(true) : setShowUpgrade(true)}
          className="flex items-center gap-2 bg-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-800)] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Staff Member
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Name, Email, or Role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">Staff Info</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-ocean-50)] text-[var(--color-ocean-700)] flex items-center justify-center font-bold text-lg">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{member.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail size={14} className="text-gray-400" />
                          <span className="truncate max-w-[150px]">{member.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone size={14} className="text-gray-400" />
                          <span>{member.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold uppercase tracking-wider">
                        <Shield size={12} className="text-gray-500" />
                        {member.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className={`p-4 text-right relative ${activeMenuId === member.id ? 'z-50' : ''}`}>
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                        className="p-1.5 text-gray-400 hover:text-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-50)] rounded-lg transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeMenuId === member.id && (
                        <div className="absolute right-8 top-10 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden animate-in fade-in slide-in-from-top-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Edit Staff
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            Change Role
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to remove this staff member?')) {
                                deleteStaff(member.id);
                              }
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No staff members found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="font-serif text-2xl font-bold text-gray-900">
                {editingStaffId ? 'Edit Staff Member' : 'Add New Staff'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingStaffId(null);
                  setFormData({ name: '', email: '', phone: '', role: 'RECEPTION', status: 'Active' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {!editingStaffId && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
                    placeholder="Enter a secure password for this staff member"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
                  >
                    <option value="RECEPTION">Reception</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SERVER">Server</option>
                    <option value="HOUSEKEEPING">Housekeeping</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingStaffId(null);
                    setFormData({ name: '', email: '', phone: '', role: 'RECEPTION', status: 'Active', password: '' });
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-800)] rounded-xl transition-colors shadow-sm"
                >
                  {editingStaffId ? 'Update Staff Member' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} resource="staff members" plan={plan} currentCount={currentCount('staff')} limit={limitFor('staff')} />
    </div>
  );
}
