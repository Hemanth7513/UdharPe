export default function BrandMark({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="84" height="84" rx="18" fill="#FFFFFF" />
      <rect x="1" y="1" width="82" height="82" rx="17" stroke="#D4D4D8" strokeWidth="2" />
      <path d="M23 24V46C23 55.3888 30.6112 63 40 63C49.3888 63 57 55.3888 57 46V28" stroke="#18181B" strokeWidth="8" strokeLinecap="round" />
      <path d="M47 34L57 24L67 34" stroke="#15803D" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
