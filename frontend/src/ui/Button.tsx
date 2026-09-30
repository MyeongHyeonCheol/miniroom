import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  const sizeClass = size === 'md' ? '' : `btn-${size}`
  return <button type={type} className={`btn btn-${variant} ${sizeClass} ${className}`.trim()} {...rest} />
}
