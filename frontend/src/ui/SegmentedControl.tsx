type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

/** One-of-N picker (floor, wallpaper). Spec: docs/design.md "탭 SegmentedControl". */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const width = `calc((100% - 8px) / ${options.length})`
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      <span className="seg-thumb" style={{ width, transform: `translateX(${index * 100}%)` }} aria-hidden />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="seg-item"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
