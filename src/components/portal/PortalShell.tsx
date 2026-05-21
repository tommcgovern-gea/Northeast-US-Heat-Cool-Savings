import Link from "next/link";

export const inputClass =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export const labelClass =
  "mb-1 block text-sm font-medium text-gray-700";

export const primaryBtnClass =
  "w-full flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryBtnClass =
  "w-full flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50";

export const linkClass = "font-medium text-blue-600 hover:text-blue-500";

export const portalBadgeClass =
  "inline-block rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600";

type PortalShellProps = {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  maxWidth?: "md" | "lg";
  footer?: React.ReactNode;
};

export function PortalShell({
  children,
  backHref,
  backLabel = "Back to home",
  title,
  subtitle,
  maxWidth = "md",
  footer,
}: PortalShellProps) {
  const widthClass = maxWidth === "lg" ? "max-w-lg" : "max-w-md";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="px-4 pt-6 sm:px-6 min-h-[2rem]">
        {backHref ? (
          <Link
            href={backHref}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← {backLabel}
          </Link>
        ) : null}
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col justify-center px-4 py-10 sm:px-6 ${widthClass}`}
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-800">{subtitle}</p>
          )}
        </div>
        {children}
      </main>

      {footer && (
        <footer className="px-4 pb-6 text-center sm:px-6">{footer}</footer>
      )}
    </div>
  );
}
