import type { MissionTag, MissionType } from '../types.ts'

interface TagBadgeProps {
  label: string
  variant: MissionTag | MissionType | string
}

export default function TagBadge({ label, variant }: TagBadgeProps) {
  return <span className={`tag tag-${variant}`}>{label}</span>
}
