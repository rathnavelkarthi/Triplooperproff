// ============================================================================
// Google Maps embed helpers
//
// Shared by the public tenant website (TenantSite) and the CRM Website Editor
// so both render the *same* map for a given input. Keep this module free of
// React / page imports — it is pure string handling.
// ============================================================================

/**
 * Open Location Code (Plus Code) alphabet. Plus Codes only ever use these 20
 * characters, which is what lets us tell `9PR3+63` apart from ordinary text
 * containing a `+`.
 */
const PLUS_CODE_CHARS = '23456789CFGHJMPQRVWX';

/** Global (full) Plus Code, e.g. `7JVW52GR+2V` — self-locating, needs no city. */
const GLOBAL_PLUS_CODE = new RegExp(
    `^[${PLUS_CODE_CHARS}]{8}\\+[${PLUS_CODE_CHARS}]{2,3}$`,
    'i'
);

/** Local (short) Plus Code, e.g. `9PR3+63` — ambiguous without a locality. */
const LOCAL_PLUS_CODE = new RegExp(
    `^[${PLUS_CODE_CHARS}]{4,6}\\+[${PLUS_CODE_CHARS}]{2,3}$`,
    'i'
);

/** Bare `lat,lng` pair. */
const LAT_LNG = /^-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/;

/**
 * Shortened share links (`maps.app.goo.gl/...`, `goo.gl/maps/...`). These are
 * HTTP redirects and cannot be resolved from the browser (no CORS), so they can
 * never be turned into a working embed client-side.
 */
export function isShortGoogleMapsLink(input: string): boolean {
    return /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(input || '');
}

/** True when `input` is a Plus Code (global or local form). */
export function isPlusCode(input: string): boolean {
    const t = (input || '').trim();
    return GLOBAL_PLUS_CODE.test(t) || LOCAL_PLUS_CODE.test(t);
}

/**
 * True when `input` is a *local* Plus Code with no locality attached, e.g.
 * `9PR3+63` on its own. Google needs a city to disambiguate these, so callers
 * should append one (the contact address) before embedding.
 */
export function isLocalPlusCodeWithoutLocality(input: string): boolean {
    const t = (input || '').trim();
    return LOCAL_PLUS_CODE.test(t) && !GLOBAL_PLUS_CODE.test(t);
}

/**
 * Build a frame-safe Google Maps embed URL for a free-text query.
 *
 * We deliberately do NOT use `maps.google.com/maps?q=...&output=embed`: that URL
 * answers `301` with `X-Frame-Options: SAMEORIGIN`, and browsers apply the
 * header from the redirect response, so the iframe renders blank. The
 * `/maps/embed?pb=` endpoint Google itself redirects to answers `200` with no
 * frame restrictions, so we target it directly.
 */
function buildQueryEmbedUrl(query: string): string {
    // `!` is the field separator inside the `pb` parameter, so it can never
    // appear inside a value.
    const safe = query.replace(/!/g, ' ').replace(/\s+/g, ' ').trim();
    if (!safe) return '';
    return `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${encodeURIComponent(safe)}!6i15`;
}

/** Extract a usable query string out of a full google.com/maps/... page URL. */
function queryFromMapsPageUrl(rawUrl: string): string {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return '';
    }

    // ?q= / ?query= / ?daddr= are the documented search params.
    const param = url.searchParams.get('q')
        || url.searchParams.get('query')
        || url.searchParams.get('daddr');
    if (param) return param;

    // `!3d<lat>!4d<lng>` inside the `data=` blob is the most precise signal
    // available in a /maps/place/ URL — it is the resolved pin, not the viewport.
    const pin = rawUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (pin) return `${pin[1]},${pin[2]}`;

    // `/@lat,lng,zoom` is the map viewport centre.
    const at = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) return `${at[1]},${at[2]}`;

    // `/maps/place/Some+Name/...` — the place name is URL-encoded with `+`
    // standing in for spaces.
    const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
    if (place) {
        try {
            return decodeURIComponent(place[1].replace(/\+/g, ' '));
        } catch {
            return place[1].replace(/\+/g, ' ');
        }
    }

    return '';
}

/**
 * Turn whatever the property owner pasted into the Website Editor into a URL
 * that renders inside an iframe.
 *
 * Accepts, in order of preference:
 *   1. A full `<iframe ...>` snippet copied from Google Maps → Share → Embed.
 *   2. A bare `google.com/maps/embed?pb=...` URL.
 *   3. Any other Google Maps page URL (`/maps/place/...`, `?q=...`, `/@lat,lng`).
 *   4. Plain text: a street address, a Plus Code, or a `lat,lng` pair.
 *
 * Returns `''` when the input cannot be embedded (empty, or a shortened
 * `maps.app.goo.gl` link) so callers can fall back to a static location card.
 *
 * @param input          Raw value from the `googleMapsUrl` setting.
 * @param contextAddress Optional address used to disambiguate a bare local
 *                       Plus Code such as `9PR3+63`.
 */
export function parseGoogleMapsUrl(input: string, contextAddress?: string): string {
    if (!input) return '';
    let trimmed = input.trim();
    if (!trimmed) return '';

    // 1. Full iframe snippet — pull the src out and carry on with that.
    if (trimmed.includes('<iframe')) {
        const match = trimmed.match(/src=["']([^"']+)["']/i);
        if (!match || !match[1]) return '';
        trimmed = match[1].trim();
    }

    // 2. Already an official embed URL — Google guarantees these are frameable.
    if (trimmed.includes('google.com/maps/embed')) {
        return trimmed;
    }

    // Shortened share links redirect and cannot be resolved in the browser.
    if (isShortGoogleMapsLink(trimmed)) return '';

    // 3. Some other Google Maps URL — reduce it to a query we can embed.
    let query = trimmed;
    if (/^https?:\/\//i.test(trimmed)) {
        query = queryFromMapsPageUrl(trimmed);
        // A non-Maps URL (or one we cannot read) is not a location.
        if (!query) return '';
    }

    // 4. Plain text. A Plus Code must be kept intact — stripping it and keeping
    // only the city (the old behaviour) dropped the pin on the town centre
    // instead of the property.
    if (isLocalPlusCodeWithoutLocality(query) && contextAddress) {
        query = `${query} ${contextAddress}`;
    }

    if (!LAT_LNG.test(query)) {
        query = query.replace(/\s+/g, ' ').trim();
    }

    return buildQueryEmbedUrl(query);
}

/**
 * Link target for "Open in Google Maps" buttons. Unlike the embed URL this is
 * opened in a new tab, so a share link can be passed straight through.
 */
export function buildMapsSearchUrl(input: string): string {
    const trimmed = (input || '').trim();
    if (!trimmed) return 'https://www.google.com/maps';

    // Share links and Maps pages already point at the right place.
    if (isShortGoogleMapsLink(trimmed)) return trimmed;
    if (/^https?:\/\//i.test(trimmed) && /google\.[^/]+\/maps/i.test(trimmed) && !trimmed.includes('/maps/embed')) {
        return trimmed;
    }

    // For an embed URL there is no clean public equivalent, so fall back to a
    // search on whatever query we can recover from it.
    let query = trimmed;
    if (/^https?:\/\//i.test(trimmed)) {
        query = queryFromMapsPageUrl(trimmed) || '';
        if (!query) return 'https://www.google.com/maps';
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
