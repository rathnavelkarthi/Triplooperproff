import type * as React from "react"
import { cn } from "../../lib/utils"

interface BorderBeamProps {
    /** Length (px) of the travelling beam segment. */
    size?: number
    /** Full loop time in seconds. */
    duration?: number
    /** Delay before first loop, in seconds. */
    delay?: number
    /** Gradient start colour (CSS). */
    colorFrom?: string
    /** Gradient end colour (CSS). */
    colorTo?: string
    className?: string
}

/**
 * CSS-only animated border driven by `offset-path` + `offset-distance`.
 * Respects `prefers-reduced-motion`.
 *
 * Requires the `@keyframes border-beam` + `--animate-border-beam` variable
 * defined in `src/index.css`.
 */
export function BorderBeam({
    size = 200,
    duration = 12,
    delay = 0,
    colorFrom = "#C9A646",
    colorTo = "#0E2A38",
    className,
}: BorderBeamProps) {
    return (
        <div
            style={
                {
                    "--size": size,
                    "--duration": duration,
                    "--delay": `-${delay}s`,
                    "--color-from": colorFrom,
                    "--color-to": colorTo,
                } as React.CSSProperties
            }
            className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit]",
                "[border:calc(var(--size)*0px+1px)_solid_transparent]",
                // The pseudo-element travels along the inner rect path.
                "after:absolute after:aspect-square after:w-[calc(var(--size)*1px)]",
                "after:animate-[var(--animate-border-beam)]",
                "after:[animation-delay:var(--delay)]",
                "after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]",
                "after:[offset-anchor:90%_50%]",
                "after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
                "motion-reduce:after:animate-none",
                className
            )}
        />
    )
}
