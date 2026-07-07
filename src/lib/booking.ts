/**
 * Pure utility functions for booking calculations.
 * Extracted from components so they can be unit tested.
 */

/** Demo account email - this account shows hardcoded showcase data for investors/clients. */
export const DEMO_EMAIL = 'demo@hospitalityos.app';

/** Check if the current user is the demo/showcase account. */
export function isDemoAccount(email: string | undefined | null): boolean {
  return email?.toLowerCase() === DEMO_EMAIL.toLowerCase();
}

/** Calculate the number of nights between two date strings. */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/** Calculate booking price breakdown. */
export function calculateBookingPrice(pricePerNight: number, nights: number) {
  const roomPrice = pricePerNight * nights;
  const taxes = Math.round(roomPrice * 0.12); // 12% GST
  const total = roomPrice + taxes;
  return { roomPrice, taxes, total };
}

/** Format a date string for display. */
export function formatBookingDate(dateString: string): string {
  if (!dateString) return 'Select date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Generate a URL-safe subdomain slug from a business name. */
export function generateSubdomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

/** Map DB reservation status to UI status. */
export function mapReservationStatus(dbStatus: string | null | undefined): 'Confirmed' | 'Pending' | 'Cancelled' | 'Checked In' | 'Checked Out' | 'No Show' {
  const statusMap: Record<string, 'Confirmed' | 'Pending' | 'Cancelled' | 'Checked In' | 'Checked Out' | 'No Show'> = {
    'CONFIRMED': 'Confirmed',
    'PENDING': 'Pending',
    'CANCELLED': 'Cancelled',
    'CHECKED_IN': 'Checked In',
    'CHECKED_OUT': 'Checked Out',
    'NO_SHOW': 'No Show',
  };
  const mapped = statusMap[dbStatus?.toUpperCase() ?? ''] || 'Pending';
  console.log('booking.ts: mapping status', dbStatus, 'to', mapped);
  return mapped;
}

/** Map UI reservation status back to DB format. */
export function mapUIToDBStatus(uiStatus: string | undefined | null): string {
  if (!uiStatus) return 'PENDING';
  const status = uiStatus.toUpperCase().trim();
  if (status === 'CHECKED IN') return 'CHECKED_IN';
  if (status === 'CHECKED OUT') return 'CHECKED_OUT';
  if (status === 'NO SHOW') return 'NO_SHOW';
  return status;
}

/** Map DB payment status to UI payment status. */
export function mapPaymentStatus(dbPaymentStatus: string | null | undefined): 'Paid' | 'Unpaid' | 'Partial' | 'Refunded' {
  const paymentMap: Record<string, 'Paid' | 'Unpaid' | 'Partial' | 'Refunded'> = {
    'PAID': 'Paid',
    'UNPAID': 'Unpaid',
    'PENDING': 'Unpaid',
    'PARTIAL': 'Partial',
    'REFUNDED': 'Refunded',
  };
  return paymentMap[dbPaymentStatus?.toUpperCase() ?? ''] || 'Unpaid';
}

/** Check if a user role has permission. */
export function hasPermission(userRole: string | null | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/** Format a number as Indian Rupee (HTML entity version for invoices). */
export function formatINR(amount: number): string {
  return `&#8377;${amount.toLocaleString('en-IN')}`;
}
