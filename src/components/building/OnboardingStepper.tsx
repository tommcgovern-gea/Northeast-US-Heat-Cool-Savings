type StepKey = "profile" | "city" | "building";

const STEPS: { key: StepKey; label: string; number: number }[] = [
  { key: "profile", label: "Your details", number: 1 },
  { key: "city", label: "City", number: 2 },
  { key: "building", label: "Building", number: 3 },
];

export function OnboardingStepper({ current }: { current: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Signup progress" className="w-full mb-6">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold border-2 ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white"
                      : done
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-500"
                  }`}
                >
                  {done ? "✓" : step.number}
                </span>
                <span
                  className={`mt-2 text-xs font-medium text-center truncate w-full px-1 ${
                    active ? "text-blue-700" : done ? "text-gray-700" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 mb-6 min-w-[12px] ${
                    index < currentIndex ? "bg-blue-600" : "bg-gray-200"
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
