import { HTMLAttributes } from "react";

export default function ZeptIcon({
  fill = "var(--heat-100)",
  inner = "var(--background-base)",
  ...attrs
}: HTMLAttributes<HTMLOrSVGElement> & {
  fill?: string;
  inner?: string;
}) {
  return (
    <svg
      {...attrs}
      width="600"
      height="600"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Zept logo"
    >
      {/* Background rounded square */}
      <rect x="2" y="2" width="20" height="20" rx="6" fill={fill} />

      {/* Stylized Z mark */}
      <path
        d="M7 8h10L7 16h10"
        fill="none"
        stroke={inner}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

