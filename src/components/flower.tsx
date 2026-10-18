export function Flower({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true">
      <g fill="currentColor">
        {[0, 45, 90, 135].map((angle) => (
          <ellipse
            key={angle}
            cx="100"
            cy="100"
            rx="13"
            ry="90"
            transform={`rotate(${angle} 100 100)`}
          />
        ))}
      </g>
    </svg>
  );
}
