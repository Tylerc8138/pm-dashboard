import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared team color definitions used across calendar and kanban views
export const TEAM_COLORS: Record<string, { bg: string; text: string; badge: string; bar: string; barBg: string }> = {
  PM:                { bg: 'bg-purple-100', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', bar: '#a855f7', barBg: '#a855f720' },
  Product:           { bg: 'bg-blue-100',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',     bar: '#3b82f6', barBg: '#3b82f620' },
  Marketing:         { bg: 'bg-green-100',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700',   bar: '#22c55e', barBg: '#22c55e20' },
  Comms:             { bg: 'bg-orange-100', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', bar: '#f97316', barBg: '#f9731620' },
  Legal:             { bg: 'bg-red-100',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',       bar: '#ef4444', barBg: '#ef444420' },
  'Search Strategy': { bg: 'bg-teal-100',   text: 'text-teal-700',   badge: 'bg-teal-100 text-teal-700',     bar: '#14b8a6', barBg: '#14b8a620' },
}

export const DEFAULT_TEAM_COLOR = { bg: 'bg-gray-100', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700', bar: '#6b7280', barBg: '#6b728020' }

export function getTeamColor(teamName: string) {
  return TEAM_COLORS[teamName] ?? DEFAULT_TEAM_COLOR
}
