import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Required: the button has no visible text. Also shown as the tooltip. */
  label: string
  children: ReactNode
}

/** Round icon button. Spec: docs/design.md "아이콘 버튼 IconButton" (44px, floats over the 3D view). */
export function IconButton({ label, className = '', type = 'button', children, ...rest }: Props) {
  return (
    <button type={type} aria-label={label} title={label} className={`icon-btn ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}

const svg = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const RotateIcon = () => (
  <svg {...svg} aria-hidden>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </svg>
)

export const TrashIcon = () => (
  <svg {...svg} aria-hidden>
    <path d="M4 7h16" />
    <path d="M9 7V4.5h6V7" />
    <path d="M6.5 7l1 12.5h9l1-12.5" />
  </svg>
)
