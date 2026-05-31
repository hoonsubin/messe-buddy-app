import type { Resource } from '../types.ts'

const RESOURCE_ICONS: Record<string, string> = {
  guide: '📘', video: '▶', link: '🔗', document: '📄',
}

interface ResourcesSectionProps {
  resources: Resource[]
  searchQuery: string
  onSearch: (q: string) => void
}

export default function ResourcesSection({ resources, searchQuery, onSearch }: ResourcesSectionProps) {
  const filtered = resources.filter(r =>
    r.isVisibleToPlayer &&
    (searchQuery === '' || r.title.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="col gap12">
      <input
        className="input"
        placeholder="Search resources..."
        value={searchQuery}
        onChange={e => onSearch(e.target.value)}
      />
      {filtered.length === 0
        ? <div className="empty">No resources found</div>
        : filtered.map(r => (
          <a key={r.id} href={r.url} className="res-card" target="_blank" rel="noreferrer">
            <span className="res-icon">{RESOURCE_ICONS[r.type] ?? '📄'}</span>
            <div>
              <div className="res-title">{r.title}</div>
              <div className="res-type">{r.type}</div>
            </div>
          </a>
        ))
      }
    </div>
  )
}
