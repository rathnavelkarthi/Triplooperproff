import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { 
  Car, Shield, FileText, User, Mail, Phone, Lock, 
  ArrowRight, KeyRound, AlertCircle, CheckCircle2, Loader2,
  Eye, EyeOff
} from 'lucide-react';

export default function DriverRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [carPhoto, setCarPhoto] = useState('');
  const [licenseInfo, setLicenseInfo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const toastId = toast.loading('Uploading car photo...');
    try {
      const ext = file.name.split('.').pop();
      const filePath = `drivers/car-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
      setCarPhoto(data.publicUrl);
      toast.success('Car photo uploaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password || !carNumber || !licenseInfo) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      // Direct insertion into 'drivers' table
      const { error } = await supabase.from('drivers').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password, // In production this would be hashed, for simulation it is saved
        car_number: carNumber.trim().toUpperCase(),
        car_photo: carPhoto.trim() || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500', // default mock photo
        license_info: licenseInfo.trim().toUpperCase(),
        status: 'pending'
      });

      if (error) {
        if (error.message?.includes('unique') || error.message?.includes('key')) {
          throw new Error('This email is already registered as a driver.');
        }
        throw error;
      }

      setSuccess(true);
      toast.success('Registration successful! Awaiting platform verification.');
      setTimeout(() => {
        navigate('/driver/login');
      }, 3000);

    } catch (err: any) {
      toast.error(err.message || 'Failed to register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F9FB] to-[#EEF1F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0E2A38]/5 border border-[#0E2A38]/10 text-xs font-semibold text-[#0E2A38]">
          <Car size={14} /> Triplooper Partners
        </div>
        <h2 className="text-3xl font-extrabold text-[#0E2A38]">Driver Onboarding</h2>
        <p className="text-sm text-gray-500">Register as a partner driver to get active duties and track transfers.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-4 border border-gray-100 shadow-sm rounded-3xl sm:px-10"
        >
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-bold text-[#0E2A38]">Registration Submitted!</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Your driver profile is being verified by the Triplooper Admin. You will be redirected to the login page shortly.
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {/* Basic Details */}
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        className="block w-full pl-10 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/15 focus:border-[#0E2A38]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Phone size={16} />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="block w-full pl-10 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/15 focus:border-[#0E2A38]/30"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="driver@example.com"
                        className="block w-full pl-10 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/15 focus:border-[#0E2A38]/30"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-10 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/15 focus:border-[#0E2A38]/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle & License Info */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Vehicle & Driving License Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Car Number Plate</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Car size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={carNumber}
                        onChange={e => setCarNumber(e.target.value)}
                        placeholder="e.g. MH-12-AB-1234"
                        className="block w-full pl-10 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/15 focus:border-[#0E2A38]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Driving License Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FileText size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={licenseInfo}
                        onChange={e => setLicenseInfo(e.target.value)}
                        placeholder="e.g. DL-12345678901"
                        className="block w-full pl-10 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/15 focus:border-[#0E2A38]/30"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Car Photo (Optional)</label>
                    <div className="flex items-center gap-4">
                      {carPhoto && (
                        <img 
                          src={carPhoto} 
                          alt="Car Preview" 
                          className="w-16 h-16 object-cover rounded-xl border border-gray-150"
                        />
                      )}
                      <div className="relative flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-xl file:border-0
                            file:text-xs file:font-semibold
                            file:bg-gray-100 file:text-gray-700
                            hover:file:bg-gray-200 file:cursor-pointer disabled:opacity-50"
                        />
                        {uploadingImage && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0E2A38] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1a3d4f] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Submitting Registration...' : 'Register as Driver'}
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            Already registered?{' '}
            <Link to="/driver/login" className="text-[#0E2A38] font-bold hover:underline">
              Log in here
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
