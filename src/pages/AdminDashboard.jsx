import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { VIOLATION_CATEGORIES } from '../types/database.js';
import { AlertCircle, Clock, CheckCircle, XCircle, LogOut, Shield, Search, Download } from 'lucide-react';

export default function AdminDashboard() {
  const { userProfile, signOut } = useAuth();
  const [violations, setViolations] = useState([]);
  const [filteredViolations, setFilteredViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: '',
  });
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchViolations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [violations, filters]);

  const fetchViolations = async () => {
    try {
      const { data, error } = await supabase
        .from('violations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setViolations(data || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...violations];

    if (filters.status !== 'all') {
      filtered = filtered.filter((v) => v.status === filters.status);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter((v) => v.category === filters.category);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.student_id.toLowerCase().includes(searchLower) ||
          v.student_name.toLowerCase().includes(searchLower) ||
          v.department.toLowerCase().includes(searchLower)
      );
    }

    setFilteredViolations(filtered);
  };

  const verifyViolation = async (violationId) => {
    try {
      const { error } = await supabase
        .from('violations')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: userProfile?.id,
        })
        .eq('id', violationId);

      if (error) throw error;
      fetchViolations();
      setSelectedViolation(null);
      alert('Violation verified successfully!');
    } catch (error) {
      console.error('Error verifying violation:', error);
      alert('Failed to verify violation');
    }
  };

  const rejectViolation = async (violationId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('violations')
        .update({
          status: 'correcting',
          rejection_reason: rejectionReason,
          correction_url: null,
        })
        .eq('id', violationId);

      if (error) throw error;
      fetchViolations();
      setSelectedViolation(null);
      setRejectionReason('');
      alert('Correction rejected. Student will need to resubmit.');
    } catch (error) {
      console.error('Error rejecting violation:', error);
      alert('Failed to reject violation');
    }
  };

  const exportData = (format) => {
    if (format === 'csv') {
      const headers = ['ID', 'Student ID', 'Student Name', 'Department', 'Category', 'Status', 'Priority', 'Created Date', 'Due Date'];
      const rows = filteredViolations.map((v) => [
        v.id,
        v.student_id,
        v.student_name,
        v.department,
        v.category,
        v.status,
        v.priority,
        new Date(v.created_at).toLocaleDateString(),
        new Date(v.due_date).toLocaleDateString(),
      ]);

      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const jsonContent = JSON.stringify(filteredViolations, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800';
      case 'correcting':
        return 'bg-orange-100 text-orange-800';
      case 'corrected':
        return 'bg-purple-100 text-purple-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: violations.length,
    pending: violations.filter((v) => v.status === 'pending').length,
    corrected: violations.filter((v) => v.status === 'corrected').length,
    verified: violations.filter((v) => v.status === 'verified').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-purple-100 text-sm">Compliance Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Admin: {userProfile?.full_name}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100">Total Compliances</span>
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-4xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-100">Pending</span>
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-4xl font-bold">{stats.pending}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100">Awaiting Verification</span>
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-4xl font-bold">{stats.corrected}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100">Verified</span>
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-4xl font-bold">{stats.verified}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Filter Compliances</h2>
            <div className="flex gap-2">
              <button
                onClick={() => exportData('csv')}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => exportData('json')}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="correcting">Correcting</option>
                  <option value="corrected">Corrected</option>
                  <option value="verified">Verified</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {VIOLATION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Student
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Search by ID, name, or department"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">All Compliance Records</h2>
            <p className="text-sm text-gray-600">Showing {filteredViolations.length} of {violations.length} records</p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading compliance data...</div>
            ) : filteredViolations.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No compliance records found matching your filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredViolations.map((violation) => (
                  <div
                    key={violation.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {violation.student_id} - {violation.student_name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(violation.status)}`}>
                            {violation.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Department: {violation.department}
                        </p>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Category: {violation.category}
                        </p>
                        <p className="text-gray-600 text-sm mb-2">{violation.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Reported: {new Date(violation.created_at).toLocaleDateString()}</span>
                          <span>Due: {new Date(violation.due_date).toLocaleDateString()}</span>
                          {violation.acknowledged_at && (
                            <span>Acknowledged: {new Date(violation.acknowledged_at).toLocaleDateString()}</span>
                          )}
                          {violation.corrected_at && (
                            <span>Corrected: {new Date(violation.corrected_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {violation.evidence_url && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Evidence Photo:</p>
                          <img
                            src={violation.evidence_url}
                            alt="Evidence"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}

                      {violation.correction_url && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Correction Proof:</p>
                          <img
                            src={violation.correction_url}
                            alt="Correction"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                    </div>

                    {violation.status === 'corrected' && (
                      <div className="mt-4">
                        {selectedViolation?.id === violation.id ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rejection Reason (if rejecting)
                              </label>
                              <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                rows={2}
                                placeholder="Explain why this correction is insufficient..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => verifyViolation(violation.id)}
                                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve & Verify
                              </button>
                              <button
                                onClick={() => rejectViolation(violation.id)}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject Correction
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedViolation(null);
                                  setRejectionReason('');
                                }}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedViolation(violation)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                          >
                            Review Correction
                          </button>
                        )}
                      </div>
                    )}

                    {violation.status === 'verified' && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-semibold">Verified and Resolved</span>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          Verified on {new Date(violation.verified_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
