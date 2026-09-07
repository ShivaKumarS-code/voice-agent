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

export function GoogleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="#1877F2" className={className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C20.081 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function AppleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.13-1.96.99-3.12-1 .04-2.19.67-2.88 1.48-.61.71-1.15 1.88-.99 3.02 1.11.09 2.24-.56 2.88-1.38z" />
    </svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2.25 3h2.25l1.8 11.25a2.25 2.25 0 0 0 2.22 1.89h10.36a2.25 2.25 0 0 0 2.22-1.85l1.35-7.41H6.15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="19.5" r="1.5" fill="currentColor" />
      <circle cx="17.5" cy="19.5" r="1.5" fill="currentColor" />
    </svg>
  );
}


