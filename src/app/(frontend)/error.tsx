"use client";

import { useEffect } from "react";
import Link from "next/link";
import SectionHeader from "@/components/SectionHeader";

/**
 * Route-segment error boundary for the public site. Renders inside the
 * frontend layout, so the header and footer stay in place.
 */
export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Something went wrong"
          subtitle="This page could not be loaded. The rest of the FPA Lens is unaffected."
        />
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-600">
            Reloading usually fixes a temporary problem. If this keeps happening,
            please let us know through the{" "}
            <Link href="/feedback" className="font-medium text-[#21355a] underline hover:no-underline">
              feedback form
            </Link>
            .
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-gray-400">Reference: {error.digest}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#21355a] hover:bg-[#2c4470] text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Reload this page
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-[#21355a] hover:bg-gray-50 transition-colors"
            >
              Back to the home page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
