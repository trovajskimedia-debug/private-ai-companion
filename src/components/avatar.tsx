import type { CharacterInput } from "@/lib/types";

export function Avatar({
  character,
  className = "",
  compact = false,
  illustrationOnly = false,
}: {
  character: CharacterInput & { portraitId?: string | null };
  className?: string;
  compact?: boolean;
  illustrationOnly?: boolean;
}) {
  const c = character;
  if (c.portraitId && !illustrationOnly)
    return (
      <img
        src={`/api/images/${c.portraitId}`}
        className={`photo-avatar ${className}`}
        alt={`AI-generated portrait of ${c.name}`}
      />
    );
  const build = (c.build - 50) * 0.13;
  const hip = (c.curves - 50) * 0.12;
  const palettes: Record<string, [string, string]> = {
    sage: ["#e3e8d9", "#b2bea4"],
    rose: ["#eee0e3", "#c6a8b2"],
    sand: ["#f0e5d7", "#d4b894"],
    sky: ["#dfe8eb", "#a9bdc8"],
  };
  const [bg, accent] = palettes[c.avatar] || palettes.sage;
  return (
    <svg
      className={className}
      viewBox={compact ? "60 15 240 230" : "0 0 360 480"}
      role="img"
      aria-label={`Illustrated preview of ${c.name}`}
    >
      <rect width="360" height="480" fill={bg} />
      <circle cx="180" cy="171" r="125" fill="white" opacity=".28" />
      <path
        d="M0 320 Q100 240 185 346 T400 290 V480 H0Z"
        fill={accent}
        opacity=".25"
      />
      <g stroke={accent} strokeWidth="2" fill="none" opacity=".6">
        <path d="M20 420 Q65 320 40 240 M40 280 Q0 260 9 239 Q42 235 40 280 M43 313 Q93 275 96 298 Q92 330 43 313 M35 346 Q2 325 1 345 Q3 369 35 346 M315 420 Q287 338 321 281 M311 322 Q340 292 348 312 Q346 335 311 322 M304 351 Q263 322 263 346 Q271 369 304 351" />
      </g>
      <ellipse cx="180" cy="461" rx="69" ry="11" fill={accent} opacity=".33" />
      <g
        transform={`translate(180 240) scale(${1 + build / 140} ${0.94 + (c.height - 145) / 400}) translate(-180 -240)`}
      >
        {c.hairStyle === "long" && (
          <path
            d="M130 98 Q120 42 178 40 Q237 41 234 108 L247 221 Q220 250 180 215 Q145 242 116 220Z"
            fill={c.hairColor}
          />
        )}
        {c.hairStyle === "bun" && (
          <ellipse cx="181" cy="44" rx="30" ry="28" fill={c.hairColor} />
        )}
        <path
          d="M165 131 L165 163 Q180 179 195 163 L195 131"
          fill={c.skinColor}
        />
        <path
          d={`M147 161 Q126 161 117 192 L97 274 Q92 290 103 295 Q114 298 119 281 L143 213 M214 162 Q236 163 245 196 L262 273 Q268 290 257 294 Q247 295 241 279 L216 211`}
          fill={c.skinColor}
        />
        {c.outfit !== "dress" ? (
          <>
            <path
              d={
                c.outfit === "casual"
                  ? `M148 247 Q${129 - hip} 263 ${133 - hip} 311 L140 442 L169 442 L177 324 L183 324 L192 442 L221 442 L${229 + hip} 309 Q${231 + hip} 268 213 247Z`
                  : `M148 247 Q${130 - hip} 263 ${136 - hip} 311 L148 438 Q151 450 166 444 L177 324 L183 324 L197 444 Q211 450 215 438 L${225 + hip} 309 Q${231 + hip} 268 213 247Z`
              }
              fill={c.outfitColor}
            />
            <path
              d="M180 278 L180 315 M145 267 Q180 281 216 267"
              fill="none"
              stroke="black"
              opacity=".12"
              strokeWidth="2"
            />
            <path
              d="M145 441 Q156 435 167 441 L165 456 L139 456 Q135 451 145 441 M198 441 Q208 436 218 441 L228 451 Q231 457 220 457 L198 455Z"
              fill="#eee8de"
            />
          </>
        ) : (
          <>
            <path
              d="M151 347 L154 440 Q161 448 172 442 L178 347 M188 347 L195 442 Q205 449 214 440 L208 347"
              fill={c.skinColor}
            />
            <path
              d="M153 440 L172 441 L170 455 L146 455 Q139 453 153 440 M196 441 L215 440 L226 452 Q228 457 218 456 L197 454Z"
              fill="#735c4a"
            />
          </>
        )}
        <path
          d={
            c.outfit === "dress"
              ? `M149 158 Q180 174 211 158 L227 198 L210 239 Q218 280 242 354 Q183 379 119 354 L149 239 L133 198Z`
              : "M148 158 Q180 176 212 158 L226 194 L212 217 L217 258 Q180 272 142 258 L148 217 L133 194Z"
          }
          fill={c.outfit === "dress" ? c.outfitColor : c.topColor}
        />
        <path
          d="M150 160 Q180 196 210 160"
          stroke="white"
          strokeWidth="2"
          fill="none"
          opacity=".4"
        />
        <ellipse cx="180" cy="100" rx="40" ry="49" fill={c.skinColor} />
        <path
          d={
            c.hairStyle === "short"
              ? "M136 106 Q119 43 177 43 Q235 43 224 120 L214 111 L210 79 Q175 96 151 76 L145 112Z"
              : "M137 104 Q123 45 179 45 Q235 45 225 108 L212 92 L208 72 Q174 93 149 78 L146 105Z"
          }
          fill={c.hairColor}
        />
        <path
          d="M154 104 Q160 100 167 104 M192 104 Q199 100 205 104"
          stroke={c.hairColor}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="161" cy="109" rx="2.1" ry="2.7" fill="#332d29" />
        <ellipse cx="199" cy="109" rx="2.1" ry="2.7" fill="#332d29" />
        <path
          d="M179 110 L176 121 L182 122 M170 131 Q180 138 190 131"
          stroke="#9e5f54"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="155" cy="122" rx="8" ry="4" fill="#cc8a7d" opacity=".25" />
        <ellipse cx="204" cy="122" rx="8" ry="4" fill="#cc8a7d" opacity=".25" />
      </g>
    </svg>
  );
}
