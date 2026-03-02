'use client';

const STEPS = [
  'Computing portfolio metrics…',
  'Scoring all possible actions…',
  'Projecting base, recession & bull scenarios…',
  'Generating AI insight…',
];

export default function LoadingState() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 px-4">
      {/* Animated logo mark */}
      <div className="flex items-center gap-2">
        <span className="pulse-dot   w-3 h-3 rounded-full bg-navy-800" />
        <span className="pulse-dot-2 w-3 h-3 rounded-full bg-navy-800" />
        <span className="pulse-dot-3 w-3 h-3 rounded-full bg-navy-800" />
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold text-navy-800">Analysing your portfolio</p>
        <p className="text-sm text-gray-500 mt-1">This takes a few seconds</p>
      </div>

      <ul className="space-y-3 text-sm text-gray-600 w-full max-w-xs">
        {STEPS.map((step, i) => (
          <li key={i} className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full border-2 border-navy-700 border-t-transparent animate-spin"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}
