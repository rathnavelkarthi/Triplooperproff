import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSubdomain } from '../hooks/useSubdomain';

function mockHostname(hostname: string) {
  Object.defineProperty(window, 'location', {
    value: { hostname },
    writable: true,
    configurable: true,
  });
}

describe('getSubdomain', () => {
  it('returns subdomain from localhost', () => {
    mockHostname('ganesh.localhost');
    expect(getSubdomain()).toBe('ganesh');
  });

  it('returns null for plain localhost', () => {
    mockHostname('localhost');
    expect(getSubdomain()).toBe(null);
  });

  it('ignores www subdomain on localhost', () => {
    mockHostname('www.localhost');
    expect(getSubdomain()).toBe(null);
  });

  it('ignores app subdomain on localhost', () => {
    mockHostname('app.localhost');
    expect(getSubdomain()).toBe(null);
  });

  it('returns subdomain from vercel.app', () => {
    mockHostname('my-hotel.vercel.app');
    expect(getSubdomain()).toBe('my-hotel');
  });

  it('ignores www on vercel.app', () => {
    mockHostname('www.vercel.app');
    expect(getSubdomain()).toBe(null);
  });

  it('returns subdomain from custom domain', () => {
    mockHostname('hotel.superstay.com');
    expect(getSubdomain()).toBe('hotel');
  });

  it('returns null for bare custom domain', () => {
    mockHostname('superstay.com');
    expect(getSubdomain()).toBe(null);
  });

  it('ignores admin subdomain on custom domain', () => {
    mockHostname('admin.superstay.com');
    expect(getSubdomain()).toBe(null);
  });

  it('ignores platform domains on vercel.app (triplooper, triplooper-lams)', () => {
    mockHostname('triplooper.vercel.app');
    expect(getSubdomain()).toBe(null);

    mockHostname('triplooper-lams.vercel.app');
    expect(getSubdomain()).toBe(null);
  });

  it('ignores preview and staging subdomains', () => {
    mockHostname('preview.superstay.com');
    expect(getSubdomain()).toBe(null);

    mockHostname('staging.triplooper.com');
    expect(getSubdomain()).toBe(null);
  });
});
