import { describe, it, expect } from 'vitest';
import {
  parseGoogleMapsUrl,
  buildMapsSearchUrl,
  isPlusCode,
  isLocalPlusCodeWithoutLocality,
  isShortGoogleMapsLink,
} from '../lib/maps';

const EMBED_PREFIX = 'https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s';
const queryEmbed = (q: string) => `${EMBED_PREFIX}${encodeURIComponent(q)}!6i15`;

describe('parseGoogleMapsUrl', () => {
  it('returns empty string for empty input', () => {
    expect(parseGoogleMapsUrl('')).toBe('');
    expect(parseGoogleMapsUrl('   ')).toBe('');
  });

  it('extracts src attribute from iframe HTML snippets', () => {
    const src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.75!2d80.2014!3d12.9233!2sTriplooper!5e0';
    const snippet = `<iframe src="${src}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    expect(parseGoogleMapsUrl(snippet)).toBe(src);
  });

  it('handles iframe snippets pasted with surrounding whitespace and newlines', () => {
    const src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3911.23!2sAnya%20Paradise!5e0';
    const snippet = `\n  <iframe\n    src="${src}"\n    width="600" height="450" loading="lazy">\n  </iframe>\n`;
    expect(parseGoogleMapsUrl(snippet)).toBe(src);
  });

  it('passes through Google Maps embed URLs directly', () => {
    const embedUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1234';
    expect(parseGoogleMapsUrl(embedUrl)).toBe(embedUrl);
  });

  // The old implementation produced maps.google.com/maps?...&output=embed, which
  // answers 301 + X-Frame-Options: SAMEORIGIN and therefore renders a blank iframe.
  it('never emits the legacy output=embed URL that browsers refuse to frame', () => {
    const results = [
      parseGoogleMapsUrl('Ganesh Residency, OMR Road, Chennai'),
      parseGoogleMapsUrl('9PR3+63 Ooty, Tamil Nadu'),
      parseGoogleMapsUrl('https://www.google.com/maps?q=12.9233,80.2014'),
    ];
    for (const url of results) {
      expect(url).not.toContain('output=embed');
      expect(url.startsWith(EMBED_PREFIX)).toBe(true);
    }
  });

  it('embeds a plain address as a map query', () => {
    expect(parseGoogleMapsUrl('Ganesh Residency, OMR Road, Chennai'))
      .toBe(queryEmbed('Ganesh Residency, OMR Road, Chennai'));
  });

  // Regression: the old parser stripped the Plus Code and kept only the city,
  // dropping the pin on the town centre instead of the property.
  it('keeps Plus Codes intact instead of stripping them to the city', () => {
    const url = parseGoogleMapsUrl('9PR3+63 Ooty, Tamil Nadu');
    expect(url).toBe(queryEmbed('9PR3+63 Ooty, Tamil Nadu'));
    expect(decodeURIComponent(url)).toContain('9PR3+63');
  });

  it('appends a locality to a bare local Plus Code when context is available', () => {
    expect(parseGoogleMapsUrl('9PR3+63', 'Ooty, Tamil Nadu'))
      .toBe(queryEmbed('9PR3+63 Ooty, Tamil Nadu'));
  });

  it('leaves a bare local Plus Code alone when there is no context address', () => {
    expect(parseGoogleMapsUrl('9PR3+63')).toBe(queryEmbed('9PR3+63'));
  });

  it('does not append context to a global Plus Code, which is self-locating', () => {
    expect(parseGoogleMapsUrl('7JVW52GR+2V', 'Ooty, Tamil Nadu'))
      .toBe(queryEmbed('7JVW52GR+2V'));
  });

  it('extracts the query from a Google Maps search URL', () => {
    expect(parseGoogleMapsUrl('https://www.google.com/maps?q=12.9233,80.2014'))
      .toBe(queryEmbed('12.9233,80.2014'));
  });

  it('extracts the resolved pin coordinates from a /maps/place/ URL', () => {
    const placeUrl = 'https://www.google.com/maps/place/Anya+Paradise/@11.3906,76.7002,17z/data=!3m1!4b1!4m6!3m5!1s0x3ba8977e7d7ca007!8m2!3d11.3906037!4d76.7026411';
    expect(parseGoogleMapsUrl(placeUrl)).toBe(queryEmbed('11.3906037,76.7026411'));
  });

  it('falls back to the place name when a /maps/place/ URL has no pin data', () => {
    expect(parseGoogleMapsUrl('https://www.google.com/maps/place/Ganesh+Residency'))
      .toBe(queryEmbed('Ganesh Residency'));
  });

  it('returns empty for shortened share links, which cannot be resolved client-side', () => {
    expect(parseGoogleMapsUrl('https://maps.app.goo.gl/abc123')).toBe('');
    expect(parseGoogleMapsUrl('https://goo.gl/maps/abc123')).toBe('');
  });

  it('returns empty for a non-Maps URL rather than embedding nonsense', () => {
    expect(parseGoogleMapsUrl('https://example.com/contact')).toBe('');
  });

  it('returns empty for an iframe snippet with no src', () => {
    expect(parseGoogleMapsUrl('<iframe width="600"></iframe>')).toBe('');
  });

  it('strips the pb field separator from free text so the URL stays well-formed', () => {
    expect(parseGoogleMapsUrl('Hotel!! Paradise')).toBe(queryEmbed('Hotel Paradise'));
  });
});

describe('isPlusCode', () => {
  it('recognises global and local Plus Codes', () => {
    expect(isPlusCode('7JVW52GR+2V')).toBe(true);
    expect(isPlusCode('9PR3+63')).toBe(true);
  });

  it('rejects ordinary text containing a plus sign', () => {
    expect(isPlusCode('Rooms + Suites')).toBe(false);
    expect(isPlusCode('B+B Cottage')).toBe(false);
    // 'A', 'E', 'I' etc. are not in the Plus Code alphabet.
    expect(isPlusCode('ABCD+EF')).toBe(false);
  });
});

describe('isLocalPlusCodeWithoutLocality', () => {
  it('is true only for a short code with nothing after it', () => {
    expect(isLocalPlusCodeWithoutLocality('9PR3+63')).toBe(true);
    expect(isLocalPlusCodeWithoutLocality('9PR3+63 Ooty')).toBe(false);
    expect(isLocalPlusCodeWithoutLocality('7JVW52GR+2V')).toBe(false);
  });
});

describe('isShortGoogleMapsLink', () => {
  it('detects both short link domains', () => {
    expect(isShortGoogleMapsLink('https://maps.app.goo.gl/xyz')).toBe(true);
    expect(isShortGoogleMapsLink('https://goo.gl/maps/xyz')).toBe(true);
    expect(isShortGoogleMapsLink('https://www.google.com/maps/embed?pb=1')).toBe(false);
  });
});

describe('buildMapsSearchUrl', () => {
  it('passes share links and Maps pages through untouched', () => {
    expect(buildMapsSearchUrl('https://maps.app.goo.gl/xyz')).toBe('https://maps.app.goo.gl/xyz');
    const page = 'https://www.google.com/maps/place/Ganesh+Residency';
    expect(buildMapsSearchUrl(page)).toBe(page);
  });

  it('builds a search URL for plain text', () => {
    expect(buildMapsSearchUrl('9PR3+63 Ooty'))
      .toBe('https://www.google.com/maps/search/?api=1&query=9PR3%2B63%20Ooty');
  });

  it('recovers a query from an embed URL', () => {
    const embed = `${EMBED_PREFIX}${encodeURIComponent('Anya Paradise Ooty')}!6i15`;
    expect(buildMapsSearchUrl(embed)).toBe('https://www.google.com/maps');
  });

  it('falls back to plain Google Maps for empty input', () => {
    expect(buildMapsSearchUrl('')).toBe('https://www.google.com/maps');
  });
});
