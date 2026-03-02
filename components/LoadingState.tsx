'use client';

import { useState, useEffect } from 'react';

const STEPS = [
  'Fetching portfolio data',
  'Computing financial state',
  'Running scenario analysis',
  'Scoring candidate actions',
  'Generating AI insights',
];

export default function LoadingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((_, i) => {
      const timer = setTimeout(() => {
        setActiveStep(i + 1);
      }, (i + 1) * 500);
      timers.push(timer);
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 px-4">
      {/* Green spinner */}
      <div className="spinner" />

      {/* Title and subtitle */}
      <div className="text-center">
        <p
          className="text-xl font-semibold"
          style={{ color: 'var(--text)' }}
        >
          Analysing your portfolio
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          This takes a few seconds
        </p>
      </div>

      {/* Loading steps */}
      <div className="space-y-3 w-full max-w-xs">
        {STEPS.map((step, i) => {
          let stepClass = 'loading-step';
          if (i < activeStep) {
            stepClass += ' done';
          } else if (i === activeStep) {
            stepClass += ' active';
          }

          return (
            <div key={i} className={stepClass}>
              <span className="step-dot" />
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}
