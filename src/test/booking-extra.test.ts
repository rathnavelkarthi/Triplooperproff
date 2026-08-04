import { describe, it, expect } from 'vitest';
import { isDemoAccount, mapUIToDBStatus } from '../lib/booking';

describe('isDemoAccount', () => {
  it('returns true for the demo email', () => {
    expect(isDemoAccount('demo@hospitalityos.app')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isDemoAccount('DEMO@HOSPITALITYOS.APP')).toBe(true);
    expect(isDemoAccount('Demo@HospitalityOS.App')).toBe(true);
  });

  it('returns false for other emails', () => {
    expect(isDemoAccount('user@example.com')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isDemoAccount(null)).toBe(false);
    expect(isDemoAccount(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDemoAccount('')).toBe(false);
  });
});

describe('mapUIToDBStatus', () => {
  it('maps Checked In to CHECKED_IN', () => {
    expect(mapUIToDBStatus('Checked In')).toBe('CHECKED_IN');
  });

  it('maps Checked Out to CHECKED_OUT', () => {
    expect(mapUIToDBStatus('Checked Out')).toBe('CHECKED_OUT');
  });

  it('maps simple statuses to uppercase', () => {
    expect(mapUIToDBStatus('Confirmed')).toBe('CONFIRMED');
    expect(mapUIToDBStatus('Pending')).toBe('PENDING');
    expect(mapUIToDBStatus('Cancelled')).toBe('CANCELLED');
  });

  it('returns PENDING for null/undefined', () => {
    expect(mapUIToDBStatus(null)).toBe('PENDING');
    expect(mapUIToDBStatus(undefined)).toBe('PENDING');
  });

  it('trims whitespace', () => {
    expect(mapUIToDBStatus('  Confirmed  ')).toBe('CONFIRMED');
  });
});

describe('discountCalculation', () => {
  it('defaults discount to 0 when undefined or null', () => {
    const res: any = { amount: 2000 };
    const discount = res.discount ?? 0;
    const taxableValue = Math.max(0, res.amount - discount);
    const gst = res.gst_amount || Math.round(taxableValue * 0.12);
    const total = taxableValue + gst;

    expect(discount).toBe(0);
    expect(taxableValue).toBe(2000);
    expect(gst).toBe(240);
    expect(total).toBe(2240);
  });

  it('applies discount when provided', () => {
    const res: any = { amount: 2000, discount: 300 };
    const discount = res.discount ?? 0;
    const taxableValue = Math.max(0, res.amount - discount);
    const gst = res.gst_amount || Math.round(taxableValue * 0.12);
    const total = taxableValue + gst;

    expect(discount).toBe(300);
    expect(taxableValue).toBe(1700);
    expect(gst).toBe(204);
    expect(total).toBe(1904);
  });
});

