import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { AlertCircle, CheckCircle, Clock, Upload, LogOut, User, GraduationCap, Building2 } from 'lucide-react';

export default function StudentDashboard() {
  const { userProfile, signOut } = useAuth();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [correctionPhoto, setCorrectionPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userProfile?.student_id) {
      fetchViolations();
    }
  }, [userProfile]);

  const fetchViolations = async () => {
    try {
      const { data, error } = await supabase
        .from('violations')
        .select('*')
        .eq('student_id', userProfile?.student_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setViolations(data || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeViolation = async (violationId) => {
    try {
      const { error } = await supabase
        .from('violations')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', violationId);

      if (error) throw error;
      fetchViolations();
    } catch (error) {
      console.error('Error acknowledging violation:', error);
      alert('Failed to acknowledge violation');
    }
  };

  const uploadCorrectionProof = async (violationId) => {
    if (!correctionPhoto) return;

    setUploading(true);
    try {
      const fileExt = correctionPhoto.name.split('.').pop();
      const fileName = `${violationId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('correction-photos')
        .upload(filePath, correctionPhoto);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('correction-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('violations')
        .update({
          status: 'corrected',
          correction_url: publicUrl,
          corrected_at: new Date().toISOString(),
        })
        .eq('id', violationId);

      if (updateError) throw updateError;

      setCorrectionPhoto(null);
      setSelectedViolation(null);
      fetchViolations();
      alert('Correction proof uploaded successfully!');
    } catch (error) {
      console.error('Error uploading correction proof:', error);
      alert('Failed to upload correction proof');
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const stats = {
    total: violations.length,
    pending: violations.filter((v) => v.status === 'pending').length,
    corrected: violations.filter((v) => v.status === 'corrected').length,
    verified: violations.filter((v) => v.status === 'verified').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Student Dashboard</h1>
              <p className="text-blue-100 text-sm">Compliance Tracking Portal</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{userProfile?.full_name}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Student ID:</span>
                  <span className="font-semibold text-gray-800">{userProfile?.student_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Department:</span>
                  <span className="font-semibold text-gray-800">{userProfile?.department}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100">Total Violations</span>
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-4xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-100">Pending Action</span>
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-4xl font-bold">{stats.pending}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100">Awaiting Review</span>
              <Upload className="w-5 h-5" />
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

        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">My Violations</h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading violations...</div>
            ) : violations.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No violations recorded. Keep up the good work!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {violations.map((violation) => (
                  <div
                    key={violation.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {violation.category}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(violation.status)}`}>
                            {violation.status}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(violation.priority)}`}>
                            {violation.priority}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{violation.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Reported: {new Date(violation.created_at).toLocaleDateString()}</span>
                          <span className={isOverdue(violation.due_date) && violation.status !== 'verified' ? 'text-red-600 font-semibold' : ''}>
                            Due: {new Date(violation.due_date).toLocaleDateString()}
                            {isOverdue(violation.due_date) && violation.status !== 'verified' && ' (Overdue)'}
                          </span>
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

                    {violation.status === 'pending' && (
                      <button
                        onClick={() => acknowledgeViolation(violation.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                      >
                        Acknowledge Violation
                      </button>
                    )}

                    {(violation.status === 'acknowledged' || violation.status === 'correcting') && (
                      <div className="mt-4">
                        {selectedViolation?.id === violation.id ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Correction Proof
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setCorrectionPhoto(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => uploadCorrectionProof(violation.id)}
                                disabled={!correctionPhoto || uploading}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50"
                              >
                                {uploading ? 'Uploading...' : 'Submit Correction'}
                              </button>
                              <button
                                onClick={() => setSelectedViolation(null)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedViolation(violation)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                          >
                            Upload Correction Proof
                          </button>
                        )}
                      </div>
                    )}

                    {violation.correction_url && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Correction Proof:</p>
                        <img
                          src={violation.correction_url}
                          alt="Correction"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}

                    {violation.status === 'verified' && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-semibold">Violation Verified and Resolved</span>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          Verified on {new Date(violation.verified_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {violation.rejection_reason && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</p>
                        <p className="text-sm text-red-600">{violation.rejection_reason}</p>
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
