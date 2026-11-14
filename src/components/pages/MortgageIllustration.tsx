export function MortgageIllustration() {
  return (
    <svg
      viewBox="0 0 720 520"
      role="img"
      aria-label="Illustration of a welcoming home surrounded by trees and a garden"
      className="block h-auto w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mortgage-sky" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#eef6ef" />
          <stop offset="1" stopColor="#dcece2" />
        </linearGradient>
        <linearGradient id="mortgage-wall" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fffdf7" />
          <stop offset="1" stopColor="#eee9dc" />
        </linearGradient>
      </defs>
      <rect width="720" height="520" fill="url(#mortgage-sky)" />
      <circle cx="583" cy="98" r="43" fill="#f5dba0" opacity=".8" />
      <path d="M0 355c97-28 173-9 268 3 121 15 209-9 452-31v193H0z" fill="#c9ddcc" />
      <path d="M0 408c138-33 245-9 372 1 125 10 233-19 348-26v137H0z" fill="#9fbea8" />

      <g opacity=".68" fill="#fff" aria-hidden="true">
        <path d="M100 103c0-15 12-27 27-27 11 0 21 7 25 17 4-3 9-5 15-5 14 0 25 11 25 25h-92z" />
        <path d="M433 147c0-11 9-20 20-20 8 0 15 5 18 12 3-2 7-4 11-4 10 0 18 8 18 18h-67z" />
      </g>

      <g>
        <path d="M195 236 356 119l164 117v177H195z" fill="url(#mortgage-wall)" />
        <path d="M168 245 354 109l188 136-17 23-171-124-169 124z" fill="#275b47" />
        <path d="M454 166v-53h43v83z" fill="#d9ded5" />
        <path d="M464 161v-35h23v44z" fill="#aebdb0" />
        <path d="M227 266h82v78h-82z" fill="#8cae9b" />
        <path d="M237 276h62v58h-62z" fill="#b9d5d0" />
        <path d="M268 276v58m-31-29h62" stroke="#f7f6ee" strokeWidth="7" />
        <path d="M402 266h82v78h-82z" fill="#8cae9b" />
        <path d="M412 276h62v58h-62z" fill="#b9d5d0" />
        <path d="M443 276v58m-31-29h62" stroke="#f7f6ee" strokeWidth="7" />
        <path d="M324 317h66v96h-66z" fill="#315e4b" />
        <path d="M335 328h44v85h-44z" fill="#d7bd87" />
        <circle cx="370" cy="372" r="3.5" fill="#315e4b" />
        <path d="M307 412h101v12H307z" fill="#d6d0c2" />
        <path d="M195 410h325v15H195z" fill="#d8d3c6" />
      </g>

      <path d="M355 422c-5 37-15 67-36 98h85c-19-32-31-64-35-98z" fill="#e8e0d0" opacity=".88" />
      <path d="M354 422c-3 35-10 67-19 98m35-98c5 36 13 68 24 98" stroke="#d1c8b5" strokeWidth="2" opacity=".7" />

      <g>
        <path d="M109 284h14v114h-14z" fill="#715c45" />
        <circle cx="116" cy="249" r="49" fill="#6d9275" />
        <circle cx="88" cy="277" r="32" fill="#7fa484" />
        <circle cx="143" cy="276" r="35" fill="#5c8568" />
        <circle cx="116" cy="225" r="28" fill="#82a987" />
        <path d="M558 316h13v82h-13z" fill="#715c45" />
        <circle cx="564" cy="286" r="39" fill="#789a7b" />
        <circle cx="541" cy="306" r="25" fill="#87a98a" />
        <circle cx="585" cy="308" r="27" fill="#638a6c" />
      </g>

      <g fill="#477454">
        <ellipse cx="202" cy="414" rx="33" ry="14" />
        <ellipse cx="510" cy="416" rx="36" ry="16" />
        <ellipse cx="174" cy="429" rx="21" ry="10" fill="#759878" />
        <ellipse cx="540" cy="434" rx="24" ry="11" fill="#759878" />
      </g>
      <g fill="#f7f3e9" opacity=".9">
        <circle cx="172" cy="407" r="3" /><circle cx="188" cy="420" r="3" />
        <circle cx="528" cy="408" r="3" /><circle cx="548" cy="423" r="3" />
      </g>

      <path d="M0 474c151-22 244-13 361 1s226 2 359-19v64H0z" fill="#6e9977" opacity=".55" />
    </svg>
  );
}
