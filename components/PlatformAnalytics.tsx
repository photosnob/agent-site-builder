import Script from "next/script";

/**
 * Google Tag Manager for Launch & List's own pages (marketing, blog, sign-up,
 * onboarding, dashboard, admin). Deliberately NOT on agents' public sites.
 * Override the container with NEXT_PUBLIC_GTM_ID; set it to "off" to disable.
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-KB6GP84D";

export function PlatformAnalytics() {
  if (!/^GTM-[A-Z0-9]+$/.test(GTM_ID)) return null;
  return (
    <>
      <Script id="gtm" strategy="afterInteractive">{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');
`}</Script>
      <noscript>
        <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="Google Tag Manager" />
      </noscript>
    </>
  );
}
