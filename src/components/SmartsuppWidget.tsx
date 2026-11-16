import Script from "next/script";

export function SmartsuppWidget() {
  const key = process.env.NEXT_PUBLIC_SMARTSUPP_KEY;
  if (!key?.trim()) return null;
  const safeKey = JSON.stringify(key).replace(/</g, "\\u003c");

  return (
    <Script id="smartsupp-chat-widget" strategy="afterInteractive">
      {`window._smartsupp = window._smartsupp || {};
window._smartsupp.key = ${safeKey};
window.smartsupp || (function(d) {
  var s, c, o = window.smartsupp = function() { o._.push(arguments); };
  o._ = [];
  s = d.getElementsByTagName("script")[0];
  c = d.createElement("script");
  c.type = "text/javascript";
  c.charset = "utf-8";
  c.async = true;
  c.src = "https://www.smartsuppchat.com/loader.js?";
  s.parentNode.insertBefore(c, s);
})(document);`}
    </Script>
  );
}
