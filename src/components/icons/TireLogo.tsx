interface TireLogoProps {
  className?: string;
  size?: number;
}

export function TireLogo({ className = "", size = 24 }: TireLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer tire ring */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Inner wheel hub */}
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="currentColor"
      />
      {/* Spoke lines - minimal design */}
      <line x1="12" y1="8" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
