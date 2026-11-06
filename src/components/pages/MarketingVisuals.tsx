export function InsightIllustration() {
  return (
    <svg viewBox="0 0 640 440" role="img" aria-labelledby="insight-title" className="h-full w-full">
      <title id="insight-title">Illustration of a banking overview and spending insights</title>
      <defs><linearGradient id="insight-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e1eee6"/><stop offset="1" stopColor="#c7ddd0"/></linearGradient><linearGradient id="insight-card" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#154f40"/><stop offset="1" stopColor="#0b362c"/></linearGradient></defs>
      <rect width="640" height="440" rx="28" fill="url(#insight-bg)"/><circle cx="544" cy="82" r="62" fill="#fff" opacity=".35"/><circle cx="78" cy="366" r="94" fill="#fff" opacity=".27"/>
      <rect x="78" y="55" width="484" height="330" rx="18" fill="#fffdf8" stroke="#dbe3d9"/>
      <rect x="78" y="55" width="484" height="43" rx="18" fill="#f8f8f3"/><path d="M78 80v18h484V80" fill="#f8f8f3"/><circle cx="100" cy="77" r="4" fill="#b7c3b9"/><circle cx="114" cy="77" r="4" fill="#b7c3b9"/><circle cx="128" cy="77" r="4" fill="#b7c3b9"/><rect x="455" y="70" width="84" height="14" rx="7" fill="#e9eee8"/>
      <text x="106" y="125" fill="#25332c" fontSize="15" fontFamily="Arial" fontWeight="700">Your money, at a glance</text><text x="106" y="145" fill="#89938b" fontSize="9" fontFamily="Arial">Accounts overview</text>
      <rect x="102" y="162" width="210" height="102" rx="12" fill="url(#insight-card)"/><text x="120" y="184" fill="#c8ded0" fontSize="9" fontFamily="Arial">TOTAL BALANCE</text><text x="120" y="214" fill="#fff" fontSize="26" fontFamily="Arial" fontWeight="700">£8,420.50</text><text x="120" y="242" fill="#c8ded0" fontSize="9" fontFamily="Arial">2 accounts  ·  Updated just now</text>
      <rect x="326" y="162" width="212" height="102" rx="12" fill="#f6f7f2" stroke="#e3e7df"/><text x="344" y="184" fill="#78837a" fontSize="9" fontFamily="Arial">INCOME &amp; SPENDING</text><path d="M347 239c18-19 29-9 42-23s22-3 35-14 21 0 32-9 22 2 40-12" fill="none" stroke="#328266" strokeWidth="3" strokeLinecap="round"/><path d="M347 244h171M347 220h171M347 196h171" stroke="#e2e7df" strokeWidth="1"/>
      <text x="106" y="292" fill="#25332c" fontSize="12" fontFamily="Arial" fontWeight="700">Recent activity</text><text x="486" y="292" fill="#28735a" fontSize="9" fontFamily="Arial" fontWeight="700">VIEW ALL</text>
      <circle cx="119" cy="322" r="12" fill="#e6f0e9"/><path d="M115 322h8m-4-4v8" stroke="#28735a" strokeWidth="1.5"/><text x="141" y="319" fill="#26332b" fontSize="10" fontFamily="Arial" fontWeight="700">Monthly salary</text><text x="141" y="333" fill="#89938b" fontSize="8" fontFamily="Arial">Today · Incoming payment</text><text x="485" y="326" fill="#28735a" fontSize="10" fontFamily="Arial" fontWeight="700">+£2,450.00</text>
      <path d="M104 346h432" stroke="#e7e9e3"/><circle cx="119" cy="365" r="12" fill="#f7eee1"/><path d="M115 365h8m-4-4v8" stroke="#99713a" strokeWidth="1.5"/><text x="141" y="362" fill="#26332b" fontSize="10" fontFamily="Arial" fontWeight="700">Groceries</text><text x="141" y="376" fill="#89938b" fontSize="8" fontFamily="Arial">Yesterday · Card payment</text><text x="491" y="369" fill="#26332b" fontSize="10" fontFamily="Arial" fontWeight="700">−£42.80</text>
    </svg>
  );
}

export function CardsIllustration() {
  return (
    <svg viewBox="0 0 640 440" role="img" aria-labelledby="cards-title" className="h-full w-full">
      <title id="cards-title">Illustration of card controls and payment activity</title>
      <defs><linearGradient id="cards-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ede6d6"/><stop offset="1" stopColor="#e0d5bd"/></linearGradient><linearGradient id="cards-main" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#183c32"/><stop offset="1" stopColor="#0b1c17"/></linearGradient></defs>
      <rect width="640" height="440" rx="28" fill="url(#cards-bg)"/><circle cx="88" cy="95" r="55" fill="#fff" opacity=".35"/><circle cx="560" cy="362" r="92" fill="#fff" opacity=".29"/>
      <g transform="rotate(-9 278 182)"><rect x="97" y="98" width="348" height="204" rx="20" fill="#597866" opacity=".23"/><rect x="86" y="82" width="348" height="204" rx="20" fill="url(#cards-main)"/><path d="M86 204c83-55 172-39 348-126v102c-113 55-225 90-348 90z" fill="#a9c4b0" opacity=".16"/><text x="111" y="121" fill="#d9e8dc" fontSize="13" fontFamily="Arial" fontWeight="700">MERIDIAN</text><rect x="111" y="151" width="42" height="30" rx="6" fill="#d9c98c"/><path d="M125 151v30m14-30v30m-28-15h42" stroke="#9d8f60" strokeWidth="1"/><text x="111" y="225" fill="#fff" fontSize="15" fontFamily="Arial" letterSpacing="3">••••  ••••  ••••  4829</text><text x="111" y="255" fill="#cbd9ce" fontSize="9" fontFamily="Arial">ALEX MORGAN</text><circle cx="388" cy="242" r="14" fill="#e2765a" opacity=".9"/><circle cx="405" cy="242" r="14" fill="#efba51" opacity=".9"/></g>
      <rect x="318" y="242" width="245" height="139" rx="16" fill="#fffdf8" stroke="#e1dbcd"/><text x="340" y="272" fill="#768078" fontSize="9" fontFamily="Arial" fontWeight="700">CARD CONTROLS</text><text x="340" y="300" fill="#26332b" fontSize="13" fontFamily="Arial" fontWeight="700">Everyday card</text><text x="340" y="319" fill="#89938b" fontSize="9" fontFamily="Arial">Virtual · ending 4829</text><rect x="340" y="338" width="172" height="25" rx="8" fill="#edf3ed"/><text x="352" y="354" fill="#286b52" fontSize="9" fontFamily="Arial" fontWeight="700">Manage card settings</text><circle cx="538" cy="351" r="10" fill="#286b52"/><path d="m534 351 3 3 5-6" stroke="#fff" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}
