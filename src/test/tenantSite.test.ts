import { describe, it, expect } from 'vitest';
import { parseGoogleMapsUrl } from '../pages/TenantSite';

describe('parseGoogleMapsUrl', () => {
  it('returns empty string for empty input', () => {
    expect(parseGoogleMapsUrl('')).toBe('');
    expect(parseGoogleMapsUrl('   ')).toBe('');
  });

  it('extracts src attribute from iframe HTML snippets', () => {
    const iframeSnippet = '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.7562623348123!2d80.20141697593259!3d12.923385715873998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a525da5024765d7%3A0xeab50d43a6d4826b!2sTriplooper!5e0!3m2!1sen!2sin!4v1716298585617!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
    expect(parseGoogleMapsUrl(iframeSnippet)).toBe('https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.7562623348123!2d80.20141697593259!3d12.923385715873998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a525da5024765d7%3A0xeab50d43a6d4826b!2sTriplooper!5e0!3m2!1sen!2sin!4v1716298585617!5m2!1sen!2sin');
  });

  it('passes through Google Maps embed URLs directly', () => {
    const embedUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1234';
    expect(parseGoogleMapsUrl(embedUrl)).toBe(embedUrl);
  });

  it('extracts query param q from raw search urls', () => {
    const searchUrl = 'https://maps.google.com/maps?q=Ganesh+Residency+Chennai&output=embed&z=15';
    expect(parseGoogleMapsUrl(searchUrl)).toBe(searchUrl);

    const rawUrl = 'https://www.google.com/maps?q=12.9233,80.2014';
    expect(parseGoogleMapsUrl(rawUrl)).toBe('https://maps.google.com/maps?q=12.9233%2C80.2014&output=embed&z=15');
  });

  it('wraps plain text address queries into embedded maps queries', () => {
    const address = 'Ganesh Residency, OMR Road, Chennai';
    expect(parseGoogleMapsUrl(address)).toBe('https://maps.google.com/maps?q=Ganesh%20Residency%2C%20OMR%20Road%2C%20Chennai&output=embed&z=15');
  });
});
