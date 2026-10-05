/** SVG, so it looks the same in every font. */
export function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: isOpen ? "rotate(90deg)" : undefined }}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
