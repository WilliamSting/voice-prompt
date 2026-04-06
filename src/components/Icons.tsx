import type { SVGProps } from 'react'

export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="M3 10a7 7 0 1 0 2.1-5" />
      <path d="M3 4v3h3" />
      <path d="M10 6.5v3.8l2.8 1.7" />
    </svg>
  )
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="M10 2.5l1.2 1.9 2.2.3.6 2.1 1.9 1.2-.7 2.1.7 2.1-1.9 1.2-.6 2.1-2.2.3-1.2 1.9-2.1-.7-2.1.7-1.2-1.9-2.2-.3-.6-2.1-1.9-1.2.7-2.1-.7-2.1 1.9-1.2.6-2.1 2.2-.3L7.9 2.5l2.1.7 2.1-.7Z" />
      <circle cx="10" cy="10" r="2.6" />
    </svg>
  )
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <rect x="6.5" y="6.5" width="9" height="9" rx="2" />
      <path d="M4.5 12.5V5.8A1.8 1.8 0 0 1 6.3 4h6.7" />
    </svg>
  )
}

export function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="m10 2 1.6 4.4L16 8l-4.4 1.6L10 14l-1.6-4.4L4 8l4.4-1.6L10 2Z" />
      <path d="m15.5 13 0.8 2.2 2.2 0.8-2.2 0.8-0.8 2.2-0.8-2.2-2.2-0.8 2.2-0.8 0.8-2.2Z" />
    </svg>
  )
}

export function InsertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="M10 3v10" />
      <path d="m6.5 9.5 3.5 3.5 3.5-3.5" />
      <path d="M4 16.5h12" />
    </svg>
  )
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="M4.5 6h11" />
      <path d="M7.5 6V4.7A1.7 1.7 0 0 1 9.2 3h1.6a1.7 1.7 0 0 1 1.7 1.7V6" />
      <path d="m6 6 0.7 9a1.5 1.5 0 0 0 1.5 1.4h3.6a1.5 1.5 0 0 0 1.5-1.4L14 6" />
    </svg>
  )
}

export function LockClosedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <rect x="4.5" y="8.5" width="11" height="8" rx="2" />
      <path d="M7 8.5V6.8A3 3 0 0 1 10 4a3 3 0 0 1 3 2.8v1.7" />
    </svg>
  )
}

export function LockOpenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <rect x="4.5" y="8.5" width="11" height="8" rx="2" />
      <path d="M13 8.5V6.8A3 3 0 0 0 10 4a3 3 0 0 0-3 2.8" />
    </svg>
  )
}
