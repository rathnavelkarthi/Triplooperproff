import { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMDataContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { calculateNights as calcNights } from '../lib/booking';
import BookingProgress from '../components/BookingProgress';
import RoomSelector from '../components/RoomSelector';
import BookingSummary from '../components/BookingSummary';
import GuestForm from '../components/GuestForm';
import PaymentSection from '../components/PaymentSection';
import ConfirmationPage from '../components/ConfirmationPage';

export default function Booking() {
  const location = useLocation();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
    room: null as any,
    guestDetails: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      specialRequests: '',
      agreedToPolicies: false,
    },
    paymentMethod: 'upi',
  });

  // Initialize from URL params if available
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const checkInParam = searchParams.get('checkIn');
    const checkOutParam = searchParams.get('checkOut');
    const guestsParam = searchParams.get('guests');

    if (checkInParam || checkOutParam || guestsParam) {
      setBookingData(prev => ({
        ...prev,
        checkIn: checkInParam || prev.checkIn,
        checkOut: checkOutParam || prev.checkOut,
        guests: guestsParam ? parseInt(guestsParam, 10) : prev.guests,
      }));
    }
  }, [location.search]);

  const nights = calcNights(bookingData.checkIn, bookingData.checkOut);

  const { addReservation } = useCRM();

  // Handlers
  const handleNextStep = () => {
    if (step < 4) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(-1);
    }
  };

  const handleRoomSelect = (room: any) => {
    setBookingData(prev => ({ ...prev, room }));
  };

  const handleGuestDetailsChange = (details: any) => {
    setBookingData(prev => ({ ...prev, guestDetails: details }));
  };

  const handlePaymentConfirm = async () => {
    // Save to Supabase
    try {
      const roomPrice = bookingData.room?.price || 0;
      const baseAmount = roomPrice * nights;
      const gstAmount = Math.round(baseAmount * 0.12);
      const totalAmount = baseAmount + gstAmount;

      await addReservation({
        guest: bookingData.guestDetails.fullName,
        guest_email: bookingData.guestDetails.email,
        guest_phone: bookingData.guestDetails.phone,
        guest_location: bookingData.guestDetails.address || '',
        room: bookingData.room?.name || 'Standard Room',
        room_id: bookingData.room?.id,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        source: 'Website',
        status: 'Confirmed',
        payment: 'Paid',
        amount: totalAmount,
        gst_amount: gstAmount,
      });

      handleNextStep();
    } catch (err) {
      console.error("Failed to save reservation:", err);
      // Still move to confirmation for UX, but log error
      handleNextStep();
    }
  };

  // Render Step Content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              {/* Date Selection (simplified for this view) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Check-in</label>
                  <input
                    type="date"
                    value={bookingData.checkIn}
                    onChange={(e) => setBookingData(prev => ({ ...prev, checkIn: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-ocean-500)] outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Check-out</label>
                  <input
                    type="date"
                    value={bookingData.checkOut}
                    onChange={(e) => setBookingData(prev => ({ ...prev, checkOut: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-ocean-500)] outline-none"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Guests</label>
                  <select
                    value={bookingData.guests}
                    onChange={(e) => setBookingData(prev => ({ ...prev, guests: parseInt(e.target.value, 10) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-ocean-500)] outline-none appearance-none bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
              </div>

              <RoomSelector
                selectedRoomId={bookingData.room?.id || null}
                onSelectRoom={handleRoomSelect}
                nights={nights}
              />
            </div>
            <div className="hidden lg:block lg:col-span-1">
              <BookingSummary
                {...bookingData}
                nights={nights}
                onContinue={handleNextStep}
                buttonText="Continue to Guest Details"
              />
            </div>

            {/* Mobile Drawer Summary */}
            <BookingSummary
              {...bookingData}
              nights={nights}
              onContinue={handleNextStep}
              buttonText="Continue"
              isMobileDrawer={true}
            />
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <button
                onClick={handlePrevStep}
                className="mb-6 text-[var(--color-ocean-600)] font-medium hover:underline flex items-center gap-2"
              >
                &larr; Back to Room Selection
              </button>
              <GuestForm
                guestDetails={bookingData.guestDetails}
                onChange={handleGuestDetailsChange}
                onSubmit={handleNextStep}
              />
            </div>
            <div className="hidden lg:block lg:col-span-1">
              <BookingSummary
                {...bookingData}
                nights={nights}
                onContinue={() => {
                  // Trigger form submission programmatically
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }}
                buttonText="Continue to Payment"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <button
                onClick={handlePrevStep}
                className="mb-6 text-[var(--color-ocean-600)] font-medium hover:underline flex items-center gap-2"
              >
                &larr; Back to Guest Details
              </button>
              <PaymentSection
                onConfirm={handlePaymentConfirm}
                totalAmount={(bookingData.room?.price || 0) * nights * 1.12} // Including 12% GST
              />
            </div>
            <div className="hidden lg:block lg:col-span-1">
              <BookingSummary
                {...bookingData}
                nights={nights}
                onContinue={handlePaymentConfirm}
                buttonText={`Pay ₹${((bookingData.room?.price || 0) * nights * 1.12).toLocaleString('en-IN')}`}
              />
            </div>
          </div>
        );
      case 4:
        return (
          <ConfirmationPage bookingData={bookingData} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-sand-50)] pt-20 pb-24">
      {step < 4 && <BookingProgress currentStep={step} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
