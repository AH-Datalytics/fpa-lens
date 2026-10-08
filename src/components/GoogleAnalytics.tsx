import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/ga4";

/**
 * GA4 tag for the public site only (rendered from the (frontend) layout, so the
 * Payload admin is never tracked). The property is FPA-administered; see
 * src/lib/ga4.ts. Renders nothing until GA_MEASUREMENT_ID is set.
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
