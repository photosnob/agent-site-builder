import Script from "next/script";
import { TRACKERS, type SiteTracking as Ids } from "@/lib/tracking";

/**
 * The agent's own analytics/ad tags, rendered from validated IDs using each
 * vendor's official snippet. Only on public pages, never in editor previews.
 */
export function SiteTracking({ ids }: { ids?: Ids }) {
  if (!ids) return null;
  // Re-check at render time: only exact, well-formed IDs ever reach a script.
  const ok = (k: keyof typeof TRACKERS) => (ids[k] && TRACKERS[k].re.test(ids[k]!) ? ids[k]! : null);
  const gtm = ok("gtm"), ga4 = ok("ga4"), ads = ok("googleAds"), meta = ok("metaPixel"), li = ok("linkedin");
  const gtagIds = [ga4, ads].filter(Boolean) as string[];
  return (
    <>
      {gtm && (
        <>
          <Script id="site-gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
          <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${gtm}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="Google Tag Manager" /></noscript>
        </>
      )}
      {gtagIds.length > 0 && (
        <>
          <Script id="site-gtag-src" src={`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`} strategy="afterInteractive" />
          <Script id="site-gtag" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${gtagIds.map((i) => `gtag('config','${i}');`).join("")}`}</Script>
        </>
      )}
      {meta && (
        <>
          <Script id="site-meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');`}</Script>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <noscript><img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${meta}&ev=PageView&noscript=1`} /></noscript>
        </>
      )}
      {li && (
        <>
          <Script id="site-linkedin" strategy="afterInteractive">{`_linkedin_partner_id="${li}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s);})(window.lintrk);`}</Script>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <noscript><img height="1" width="1" style={{ display: "none" }} alt="" src={`https://px.ads.linkedin.com/collect/?pid=${li}&fmt=gif`} /></noscript>
        </>
      )}
    </>
  );
}
