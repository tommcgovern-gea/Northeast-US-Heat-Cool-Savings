import Link from "next/link";

/** Post-registration success screen (building portal onboarding). */
export function BuildingSignupSuccess() {
  return (
    <div className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-6 text-center text-white sm:px-8">
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
        <p>You have successfully entered all information.</p>

        <div className="rounded-md bg-blue-50 border border-blue-200 p-4 mt-3">
          <p className="text-sm font-medium text-blue-900">
            Thanks for taking steps to lower your energy consumption and help
            our shared environment.
            <br />
            <br />
            We are so glad you joined the portal, you will receive messages to
            help raise or lower temperature setpoints.
            <br />
            <br />
            To keep our guarantee active, please be sure to email back a photo
            of the changed setpoint within 2-hours of every message.
            <br />
            <br />
            Your cooperation is deeply appreciated, call Tom at 631 521 3594
            with any questions.
            <br />
            <br />
            We can't wait to share savings with you and continue our path to
            improving our shared environment.
            <br />
            <br />
            Thank you
          </p>
        </div>

        {/* <div className="h-16" aria-hidden /> */}

        {/* <p>
          You will begin receiving messages regarding building temperature
          setpoint changes every day and special alerts any time the temperature
          fluctuates significantly.
        </p> */}
        {/* <p className="mt-3">
          Keep an eye out for these messages and send back the proof of changes
          as discussed during onboarding.
        </p>

        <div className="h-16" aria-hidden />

        <p>
          Thanks so much, looking forward to helping you reduce your energy
          consumption substantially.
        </p> */}

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
