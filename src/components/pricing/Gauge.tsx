import React from 'react';

interface GaugeProps {
    value: number;
    color?: string;
    showLabels?: boolean;
    min?: string;
    max?: string;
}

export default function Gauge({ value, color = '#ef4d23', showLabels, min = '0', max = '100' }: GaugeProps) {
    const totalTicks = 40;
    const activeCount = Math.round((value / 100) * totalTicks);
    const xc = 100;
    const yc = 100;
    const outerRadius = 80;
    const innerRadius = 70;

    const angleStart = Math.PI;
    const angleEnd = Math.PI * 2;
    const angleStep = (angleEnd - angleStart) / (totalTicks - 1);

    const ticks = Array.from({ length: totalTicks }).map((_, i) => {
        const angle = angleStart + i * angleStep;
        const x1 = xc + innerRadius * Math.cos(angle);
        const y1 = yc + innerRadius * Math.sin(angle);
        const x2 = xc + outerRadius * Math.cos(angle);
        const y2 = yc + outerRadius * Math.sin(angle);
        const isActive = i < activeCount;

        return {
            x1,
            y1,
            x2,
            y2,
            isActive
        };
    });

    return (
        <div className="w-full max-w-[260px] mx-auto flex flex-col items-center">
            <svg viewBox="0 0 200 120" className="w-full h-auto">
                {ticks.map((tick, i) => (
                    <line
                        key={i}
                        x1={tick.x1}
                        y1={tick.y1}
                        x2={tick.x2}
                        y2={tick.y2}
                        stroke={tick.isActive ? color : '#d4d4d8'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                ))}
                <text
                    x={xc}
                    y={yc + 5}
                    textAnchor="middle"
                    className="fill-slate-800 text-[22px] font-semibold"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                >
                    {value}%
                </text>
            </svg>
            {showLabels && (
                <div className="w-full flex justify-between text-[11px] text-neutral-500 font-medium px-2 -mt-1">
                    <span>{min}</span>
                    <span>{max}</span>
                </div>
            )}
        </div>
    );
}
