export function getSubdomain() {
    const hostname = window.location.hostname;
    console.log('[useSubdomain] Current hostname:', hostname);
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

    // Ignore common non-tenant subdomains
    const ignoredSubdomains = ['www', 'app', 'crm', 'admin'];

    const parts = hostname.split('.');

    // Handle localhost (e.g., ganesh.localhost)
    if (isLocalhost) {
        if (parts.length > 1) {
            const sub = parts[0];
            if (!ignoredSubdomains.includes(sub)) {
                return sub;
            }
        }
        return null;
    }

    // Handle production domains
    // If it's a vercel.app domain (e.g., ganesh-resedence.vercel.app, or ganesh.vercel.app)
    if (hostname.endsWith('.vercel.app')) {
        // Vercel apps are always <project-name>.vercel.app
        const sub = parts[0];
        // If the user's project is named 'ganesh-resedence' but their DB subdomain is 'ganesh',
        // we can try returning the exact project name, but the DB must match it.
        // Let's just return the first part.
            if (!ignoredSubdomains.includes(sub) && sub !== 'vercel') {
                console.log('[useSubdomain] Detected subdomain (Vercel):', sub);
                return sub;
            }
    }

    // Custom Domains (e.g., hotel.superstay.com)
    if (parts.length >= 3) {
        const sub = parts[0];
        if (!ignoredSubdomains.includes(sub)) {
            console.log('[useSubdomain] Detected subdomain (Custom):', sub);
            return sub;
        }
    }

    console.log('[useSubdomain] Detected subdomain:', null);
    return null;
}
