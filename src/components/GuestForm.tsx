import React, { useState } from 'react';
import posthog from 'posthog-js';

interface GuestFormProps {
  guestDetails: any;
  onChange: (details: any) => void;
  onSubmit: () => void;
}

export default function GuestForm({ guestDetails, onChange, onSubmit }: GuestFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!guestDetails.fullName) newErrors.fullName = 'Full Name is required';
    if (!guestDetails.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(guestDetails.email)) newErrors.email = 'Email is invalid';
    if (!guestDetails.phone) newErrors.phone = 'Phone number is required';
    if (!guestDetails.agreedToPolicies) newErrors.agreedToPolicies = 'You must agree to the policies';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      posthog.capture('guest_details_submitted', {
        has_special_requests: !!guestDetails.specialRequests,
        has_address: !!guestDetails.address,
      });
      onSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    onChange({
      ...guestDetails,
      [name]: type === 'checkbox' ? checked : value
    });

    // Clear error when typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
      <h2 className="font-serif text-3xl text-[var(--color-ocean-900)] font-bold mb-8">Guest Details</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={guestDetails.fullName || ''}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border ${errors.fullName ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-[var(--color-ocean-500)]'} focus:ring-2 focus:border-transparent outline-none transition-all`}
              placeholder="John Doe"
            />
            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={guestDetails.email || ''}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-[var(--color-ocean-500)]'} focus:ring-2 focus:border-transparent outline-none transition-all`}
              placeholder="john@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={guestDetails.phone || ''}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-[var(--color-ocean-500)]'} focus:ring-2 focus:border-transparent outline-none transition-all`}
              placeholder="+91 98765 43210"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">Address (Optional)</label>
            <input
              type="text"
              id="address"
              name="address"
              value={guestDetails.address || ''}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[var(--color-ocean-500)] focus:border-transparent outline-none transition-all"
              placeholder="City, Country"
            />
          </div>
        </div>

        {/* Special Requests */}
        <div>
          <label htmlFor="specialRequests" className="block text-sm font-semibold text-gray-700 mb-2">Special Requests</label>
          <textarea
            id="specialRequests"
            name="specialRequests"
            value={guestDetails.specialRequests || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[var(--color-ocean-500)] focus:border-transparent outline-none transition-all resize-none"
            placeholder="Any special requests or arrival time?"
          />
        </div>

        {/* Policies Checkbox */}
        <div className="pt-4 border-t border-gray-100">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-1">
              <input
                type="checkbox"
                name="agreedToPolicies"
                checked={guestDetails.agreedToPolicies || false}
                onChange={handleChange}
                className="peer sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${errors.agreedToPolicies ? 'border-red-400' : 'border-gray-300 peer-checked:border-[var(--color-ocean-600)] peer-checked:bg-[var(--color-ocean-600)]'}`}>
                <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <span className="text-sm text-gray-600 leading-relaxed">
              I agree to the <a href="#" className="text-[var(--color-ocean-600)] hover:underline">booking policies</a>, including the cancellation policy and house rules.
            </span>
          </label>
          {errors.agreedToPolicies && <p className="text-red-500 text-xs mt-2 ml-8">{errors.agreedToPolicies}</p>}
        </div>

        {/* Submit Button (Hidden, triggered by parent or visible on mobile) */}
        <div className="pt-6 lg:hidden">
          <button
            type="submit"
            className="w-full py-4 bg-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-800)] text-white rounded-xl font-bold text-lg transition-colors shadow-md hover:shadow-lg"
          >
            Continue to Payment
          </button>
        </div>
      </form>
    </div>
  );
}
