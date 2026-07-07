import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import {
  ShieldCheck, UploadCloud, FileCheck2, Clock, AlertCircle,
  CheckCircle2, Loader2, LogOut, FileText,
} from 'lucide-react';

const BUCKET = 'property-documents';

type DocType = 'govt_trade_authorization' | 'govt_compliance_proof' | 'other';

interface DocSlot {
  type: DocType;
  label: string;
  description: string;
  required: boolean;
}

const DOC_SLOTS: DocSlot[] = [
  {
    type: 'govt_trade_authorization',
    label: 'Government Trade Authorization',
    description: 'Official trade / business licence authorizing you to operate this property.',
    required: true,
  },
  {
    type: 'govt_compliance_proof',
    label: 'Government Compliance Proof',
    description: 'Document showing no outstanding government compliance issues against the property.',
    required: true,
  },
  {
    type: 'other',
    label: 'Other Supporting Document',
    description: 'Any additional proof that helps us verify your property (optional).',
    required: false,
  },
];

interface UploadedDoc {
  doc_type: string;
  file_name: string | null;
  uploaded_at: string;
}

export default function PropertyVerification() {
  const { tenant, user, logout, refreshTenant } = useAuth();
  const [uploaded, setUploaded] = useState<Record<string, UploadedDoc>>({});
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);

  const status = tenant?.verification_status || 'pending';
  const rejectionReason = tenant?.verification_reason;

  const loadDocuments = useCallback(async () => {
    if (!tenant?.id) { setLoading(false); return; }
    const { data } = await supabase
      .from('property_documents')
      .select('doc_type, file_name, uploaded_at')
      .eq('tenant_id', tenant.id)
      .order('uploaded_at', { ascending: false });
    const map: Record<string, UploadedDoc> = {};
    for (const d of data || []) {
      if (!map[d.doc_type]) map[d.doc_type] = d as UploadedDoc;
    }
    setUploaded(map);
    setLoading(false);
  }, [tenant?.id]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleUpload = async (slot: DocSlot, file: File) => {
    if (!tenant?.id) return;
    // Basic client-side guardrails.
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File is too large (max 10 MB).');
      return;
    }
    setUploading(slot.type);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${tenant.id}/${slot.type}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { error: rowErr } = await supabase.from('property_documents').insert({
        tenant_id: tenant.id,
        doc_type: slot.type,
        file_path: filePath,
        file_name: file.name,
        uploaded_by: user?.id || null,
      });
      if (rowErr) throw new Error(rowErr.message);

      toast.success(`${slot.label} uploaded.`);
      await loadDocuments();
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message || 'unknown error'));
    } finally {
      setUploading(null);
    }
  };

  const requiredDone = DOC_SLOTS.filter(s => s.required).every(s => uploaded[s.type]);
  const isApproved = status === 'approved';

  return (
    <div className="min-h-full flex items-start justify-center py-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0E2A38] flex items-center justify-center">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0E2A38] font-playfair">Verify your property</h1>
              <p className="text-sm text-gray-500">{tenant?.business_name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Status banner */}
        {status === 'rejected' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-red-700 text-sm">Your documents were not approved</p>
                {rejectionReason && (
                  <p className="text-sm text-red-600 mt-1 leading-relaxed">{rejectionReason}</p>
                )}
                <p className="text-xs text-red-500 mt-2">Please re-upload the corrected document below. Our team will review it again promptly.</p>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'pending' && requiredDone && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-amber-500 shrink-0" />
              <div>
                <p className="font-bold text-amber-700 text-sm">Under review</p>
                <p className="text-sm text-amber-600">Your documents are submitted. We'll notify you by email and WhatsApp once verified — usually within a business day.</p>
              </div>
            </div>
          </motion.div>
        )}

        {isApproved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <div>
                <p className="font-bold text-emerald-700 text-sm">Verified</p>
                <p className="text-sm text-emerald-600">Your property is live. Reload to enter your dashboard.</p>
              </div>
            </div>
          </motion.div>
        )}

        {!isApproved && (
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            To keep Triplooper trusted, we manually verify every property before it goes live.
            Upload the documents below — your property will be published once our team approves them.
          </p>
        )}

        {/* Upload slots */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            DOC_SLOTS.map(slot => {
              const done = uploaded[slot.type];
              const busy = uploading === slot.type;
              return (
                <div
                  key={slot.type}
                  className={`rounded-xl border p-4 transition-colors ${done ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        {done ? <FileCheck2 size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800 text-sm truncate">{slot.label}</p>
                          {slot.required
                            ? <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">Required</span>
                            : <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Optional</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{slot.description}</p>
                        {done && (
                          <p className="text-xs text-emerald-600 mt-1 truncate">
                            {done.file_name || 'Uploaded'} · {new Date(done.uploaded_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {!isApproved && (
                      <label className={`shrink-0 cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${done ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-white bg-[#0E2A38] hover:bg-[#0E2A38]/90'}`}>
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                        {busy ? 'Uploading' : done ? 'Replace' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          disabled={busy}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(slot, f); e.target.value = ''; }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer action */}
        {!isApproved && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Accepted: PDF or image, up to 10 MB each.
            </p>
            <button
              onClick={() => refreshTenant()}
              className="text-xs font-semibold text-[#0E2A38] hover:underline"
            >
              Refresh status
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
