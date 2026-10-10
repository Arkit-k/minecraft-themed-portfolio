"use client";

/**
 * The site's own inked figure: a silhouette hanging from a line, charcoal with
 * orange hands. Used by the page transition and the loading screen.
 */
export function InkSwinger({
  width = 190,
  height = 240,
  lineTo = "M150 22 L1400 -480",
}: {
  width?: number;
  height?: number;
  lineTo?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 190 240"
      fill="none"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {/* the line it hangs from */}
      <path d={lineTo} stroke="#222222" strokeWidth="2.5" strokeLinecap="round" />
      {/* limbs */}
      <g stroke="#222222" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M150 24 C132 40 120 58 110 76" />
        <path d="M96 92 C78 104 62 116 46 120" />
        <path d="M104 136 C120 142 130 152 126 170" />
        <path d="M92 138 C88 156 80 168 70 176" />
      </g>
      {/* head and body */}
      <ellipse cx="97" cy="70" rx="16" ry="18" fill="#222222" />
      <path
        d="M86 84 C82 104 84 124 92 140 C104 142 112 138 114 132 C112 112 112 96 108 82 Z"
        fill="#222222"
      />
      {/* hands, and a curl of slack line */}
      <circle cx="150" cy="22" r="7" fill="#F97316" />
      <circle cx="44" cy="120" r="6" fill="#F97316" />
      <path
        d="M158 26 C171 31 172 45 161 47 C153 48 152 38 158 34"
        stroke="#F97316"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default InkSwinger;
