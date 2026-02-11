import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { VIOLATION_CATEGORIES } from '../types/database.js';
import { AlertCircle, Clock, CheckCircle, LogOut, Users, Upload } from 'lucide-react';

export default function StaffDashboard() {
  const { userProfile, signOut } = useAuth();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    department: '',
    category: '',
    description: '',
    dueDate: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    try {
      const { data, error } = await supabase
        .from('violations')
        .select('*')
        .eq('reported_by', userProfile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setViolations(data || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let evidenceUrl = '';

      if (evidencePhoto) {
        const fileExt = evidencePhoto.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('evidence-photos')
          .upload(filePath, evidencePhoto);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('evidence-photos')
          .getPublicUrl(filePath);

        evidenceUrl = publicUrl;
      }

      const { error } = await supabase.from('violations').insert({
        student_id: formData.studentId,
        student_name: formData.studentName,
        department: formData.department,
        category: formData.category,
        description: formData.description,
        due_date: formData.dueDate,
        priority: formData.priority,
        evidence_url: evidenceUrl || null,
        reported_by: userProfile?.id,
      });

      if (error) throw error;

      setFormData({
        studentId: '',
        studentName: '',
        department: '',
        category: '',
        description: '',
        dueDate: '',
        priority: 'medium',
      });
      setEvidencePhoto(null);
      setShowReportForm(false);
      fetchViolations();
      alert('Compliance issue reported successfully!');
    } catch (error) {
      console.error('Error reporting violation:', error);
      alert('Failed to report compliance issue');
    } finally {
      setUploading(false);
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
    resolved: violations.filter((v) => v.status === 'verified').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Staff Dashboard</h1>
              <p className="text-green-100 text-sm">Report Compliance Issues</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Welcome, {userProfile?.full_name}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100">Total Reports</span>
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-4xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-100">Pending Resolution</span>
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-4xl font-bold">{stats.pending}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100">Resolved</span>
              <CheckCircle className="w-5 h-5" />
            </div>
            <p className="text-4xl font-bold">{stats.resolved}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Report New Compliance Issue</h2>
            <button
              onClick={() => setShowReportForm(!showReportForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              {showReportForm ? 'Hide Form' : 'Report Issue'}
            </button>
          </div>

          {showReportForm && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., STU001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter student name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Computer Science"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compliance Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select category</option>
                    {VIOLATION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the compliance issue in detail..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date for Correction <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Evidence (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEvidencePhoto(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-2">Click to upload photo evidence</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Upload className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Compliance Report'
                )}
              </button>
            </form>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">My Reported Compliances</h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading violations...</div>
            ) : violations.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No violations reported yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {violations.map((violation) => (
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
                        </div>
                      </div>
                    </div>

                    {violation.evidence_url && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Evidence Photo:</p>
                        <img
                          src={violation.evidence_url}
                          alt="Evidence"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}

                    {violation.correction_url && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Student's Correction Proof:</p>
                        <img
                          src={violation.correction_url}
                          alt="Correction"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                        />
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
