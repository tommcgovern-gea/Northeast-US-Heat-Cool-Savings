import Link from "next/link";

/** Post-registration success screen (building portal onboarding). */
export function BuildingSignupSuccess() {
  return (
    <div className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-8 text-center text-white sm:px-8">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30"
          aria-hidden
        >
          <svg
            className="h-9 w-9"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold sm:text-2xl">Registration complete</h2>
      </div>

      <div className="px-6 py-8 text-sm leading-relaxed text-gray-700 sm:px-8">
        <p>
          You have successfully entered all information, thanks for your help.
        </p>

        <div className="h-16" aria-hidden />

        <p>
          You will begin receiving messages regarding building temperature
          setpoint changes every day and special alerts any time the temperature
          fluctuates significantly.
        </p>
        <p className="mt-4">
          Keep an eye out for these messages and send back the proof of changes
          as discussed during onboarding.
        </p>

        <div className="h-16" aria-hidden />

        <p>
          Thanks so much, looking forward to helping you reduce your energy
          consumption substantially.
        </p>

        <Link
          href="/building"
          className="mt-8 flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Go to building portal
        </Link>
      </div>
    </div>
  );
}
