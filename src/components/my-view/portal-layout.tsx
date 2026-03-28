import type { ReactNode } from 'react'

interface PortalLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function PortalLayout({ title, subtitle, children }: PortalLayoutProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
