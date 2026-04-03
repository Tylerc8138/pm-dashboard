/** @purpose CRUD hooks for project_settings table (North Star, metrics, plan enables) */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectSetting } from '@/types/database'

export function useProjectSettings() {
  return useQuery<ProjectSetting[]>({
    queryKey: ['project-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_settings')
        .select('*')
      if (error) throw error
      return data as ProjectSetting[]
    },
  })
}

export function useProjectSetting(key: string) {
  const { data: settings = [], ...rest } = useProjectSettings()
  const setting = settings.find(s => s.key === key)
  return { data: setting?.value ?? null, ...rest }
}

export function useUpsertProjectSetting() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from('project_settings')
        .upsert({ key, value: value as never, updated_at: new Date().toISOString() } as unknown as Record<string, unknown>)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-settings'] })
    },
  })
}
