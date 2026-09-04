interface IconProps {
  className?: string;
}

export function LogoIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7 3.5a2 2 0 1 1 4 0v11a3 3 0 1 1-3-3h9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3 5 5.7v5.4c0 4.3 2.9 8.3 7 9.5 4.1-1.2 7-5.2 7-9.5V5.7L12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2.2 2.2L15.5 10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MicIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        fill="currentColor"
      />
      <path
        d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MicOffIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        fill="currentColor"
      />
      <path
        d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PhoneOffIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/*
        Hang-up is the same handset as PhoneIcon, tipped back onto the cradle:
        rotated 135deg about the centre so it lies flat with the cups pointing
        down, and scaled in a little so the corners stay inside the viewBox.
      */}
      <path
        transform="translate(12 12) scale(0.86) rotate(135) translate(-12 -12)"
        d="M6.6 3.5a1.6 1.6 0 0 1 2.2.7l1.3 2.6a1.6 1.6 0 0 1-.4 2l-1.3 1a12 12 0 0 0 5.8 5.8l1-1.3a1.6 1.6 0 0 1 2-.4l2.6 1.3a1.6 1.6 0 0 1 .7 2.2l-.9 1.6a2.6 2.6 0 0 1-2.9 1.2C11 19.9 4.1 13 2.8 6.3A2.6 2.6 0 0 1 4 3.4l1.6-.9Z"
      />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.6 3.5a1.6 1.6 0 0 1 2.2.7l1.3 2.6a1.6 1.6 0 0 1-.4 2l-1.3 1a12 12 0 0 0 5.8 5.8l1-1.3a1.6 1.6 0 0 1 2-.4l2.6 1.3a1.6 1.6 0 0 1 .7 2.2l-.9 1.6a2.6 2.6 0 0 1-2.9 1.2C11 19.9 4.1 13 2.8 6.3A2.6 2.6 0 0 1 4 3.4l1.6-.9Z" />
    </svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.6 4.3a1 1 0 0 1 1.1-.2l15.5 7a1 1 0 0 1 0 1.8l-15.5 7a1 1 0 0 1-1.4-1.1l1.4-5.7a1 1 0 0 1 .8-.7l6.6-1-6.6-1a1 1 0 0 1-.8-.8L3.4 5.3a1 1 0 0 1 .2-1Z" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.6 2.2a.7.7 0 0 1 1.2.7l-2.2 6h4.9a.8.8 0 0 1 .6 1.3l-8.6 11a.7.7 0 0 1-1.2-.7l2.2-6.4H6.1a.8.8 0 0 1-.6-1.3l8.1-10.6Z" />
    </svg>
  );
}

export function WaveIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M4 10.5v3M8 7.5v9M12 4.5v15M16 7.5v9M20 10.5v3" />
      </g>
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4.5"
        y="10"
        width="15"
        height="10.5"
        rx="2.4"
        fill="currentColor"
      />
      <path
        d="M8 10V7.5a4 4 0 0 1 8 0V10"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BoxIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3l8 4v10l-8 4-8-4V7l8-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 7l8 4 8-4M12 11v10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M11 3h6a4 4 0 0 1 4 4v6l-9 9-10-10L11 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function TruckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2.5 6.5h10v10h-10v-10ZM12.5 10h4l3 3v3.5h-7V10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function DotsIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5.5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="18.5" cy="12" r="1.8" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="3.8" fill="currentColor" />
      <path
        d="M4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
