import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return reduced;
}

/** Spring animation config — returns empty object when reduced-motion is on */
export function useMotionConfig() {
    const reduced = useReducedMotion();
    const spring = reduced
        ? { duration: 0 }
        : { type: 'spring' as const, stiffness: 100, damping: 20 };

    const fadeIn = reduced
        ? {}
        : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-10%' }, transition: spring };

    return { reduced, spring, fadeIn };
}
