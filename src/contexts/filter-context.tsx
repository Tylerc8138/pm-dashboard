import { createContext, useContext, useState, type ReactNode } from 'react'

interface FilterContextType {
  sprintId: string | null
  setSprintId: (id: string | null) => void
  teamId: string | null
  setTeamId: (id: string | null) => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [sprintId, setSprintId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)

  return (
    <FilterContext.Provider value={{ sprintId, setSprintId, teamId, setTeamId }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within FilterProvider')
  return ctx
}
