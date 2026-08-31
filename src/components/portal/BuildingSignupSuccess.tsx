import Link from "next/link";
import { REGISTRATION_SUCCESS_MESSAGE } from "@/lib/content/registrationSuccessMessage";

/** Post-registration success screen (building portal onboarding). */
export function BuildingSignupSuccess() {
  const [intro, ...bodyParagraphs] = REGISTRATION_SUCCESS_MESSAGE.split("\n\n");
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
        <p>{intro}</p>

        <div className="rounded-md bg-blue-50 border border-blue-200 p-4 mt-3">
          <p className="text-sm font-medium text-blue-900">
            {bodyParagraphs.map((paragraph, i) => (
              <span key={i}>
                {i > 0 && (
                  <>
                    <br />
                    <br />
                  </>
                )}
                {paragraph}
              </span>
            ))}
          </p>
        </div>

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
