export function getSubdomain() {
    const hostname = window.location.hostname;
    console.log('[useSubdomain] Current hostname:', hostname);
    
    // Check if hostname is an IP address (e.g., 127.0.0.1)
    const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
    if (isIP) {
        return null;
    }

    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

    // Ignore common platform non-tenant subdomains
    const ignoredSubdomains = [
        'www', 'app', 'crm', 'admin', 'api', 'mail', 'auth',
        'triplooper', 'triplooper-lams', 'triplooper-app', 'triplooper-web',
        'easystay', 'superstay', 'preview', 'staging', 'demo', 'vercel'
    ];

    const isIgnored = (sub: string) => {
        const s = sub.toLowerCase();
        return ignoredSubdomains.includes(s) || s.startsWith('triplooper');
    };

    const parts = hostname.split('.');

    // Handle localhost (e.g., ganesh.localhost)
    if (isLocalhost) {
        if (parts.length > 1) {
            const sub = parts[0];
            if (!isIgnored(sub)) {
                return sub;
            }
        }
        return null;
    }

    // Handle production domains
    // If it's a vercel.app domain (e.g., ganesh-resedence.vercel.app, or ganesh.vercel.app)
    if (hostname.endsWith('.vercel.app')) {
        const sub = parts[0];
        if (!isIgnored(sub)) {
            console.log('[useSubdomain] Detected subdomain (Vercel):', sub);
            return sub;
        }
        return null;
    }

    // Custom Domains (e.g., hotel.superstay.com)
    if (parts.length >= 3) {
        const sub = parts[0];
        if (!isIgnored(sub)) {
            console.log('[useSubdomain] Detected subdomain (Custom):', sub);
            return sub;
        }
    }

    console.log('[useSubdomain] Detected subdomain:', null);
    return null;
}
