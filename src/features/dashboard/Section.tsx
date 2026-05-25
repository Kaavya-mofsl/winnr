import type { ReactNode } from 'react'

interface Props {
  index: string
  title: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
  delay?: number
}

export function Section({ index, title, subtitle, right, children, delay = 0 }: Props) {
  return (
    <section
      className="reveal print-avoid-break"
      style={{ ['--reveal-delay' as string]: `${delay}ms` }}
    >
      <div className="flex items-end justify-between gap-4 mb-4">
        <div className="flex items-baseline gap-4">
          <span className="num text-[color:var(--color-accent)] text-xs tracking-widest">
            {index}
          </span>
          <div>
            <h2 className="text-[color:var(--color-text-1)] text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[color:var(--color-text-3)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {right && <div className="no-print">{right}</div>}
      </div>
      <div className="hairline mb-5" />
      {children}
    </section>
  )
}
