import { useState } from 'react'
import { Bookmark, Database, Download, FileText, Link as LinkIcon, Plus, Search, StickyNote } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../context'
import { Button, EmptyState, PageTitle, Tags } from '../components/ui'

export const resourceKinds = { paper: 'Статья', dataset: 'Данные', note: 'Заметка', link: 'Ссылка' }
const resourceIcons = { paper: FileText, dataset: Database, note: StickyNote, link: LinkIcon }

export function Library() {
  const { data, base, refresh, notify, setModal, canWrite } = useApp()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(null)
  const resources = data.resources.filter(resource => (filter === 'all' || filter === 'saved' && resource.bookmarked || resource.kind === filter) && `${resource.title} ${resource.authors} ${resource.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  async function bookmark(resource) {
    setPending(resource.id)
    try { await api(`${base}/resources/${resource.id}/bookmark`, { method: resource.bookmarked ? 'DELETE' : 'PUT' }); refresh() }
    catch (e) { notify(e.message, true) }
    finally { setPending(null) }
  }
  function exportBibliography() {
    const escape = value => String(value).replace(/[\\{}%&#_$]/g, character => `\\${character}`).replace(/\n/g, ' ')
    const text = resources.map((resource, i) => `@misc{research${i + 1},\n  title = {${escape(resource.title)}},${resource.authors ? `\n  author = {${escape(resource.authors)}},` : ''}${resource.year ? `\n  year = {${resource.year}},` : ''}${resource.url ? `\n  url = {${escape(resource.url)}},` : ''}\n  note = {Exported from Re:Search}\n}`).join('\n\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'research-library.bib'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('Библиография экспортирована. Проверьте метаданные перед публикацией.')
  }
  return <>
    <PageTitle eyebrow="EVIDENCE LIBRARY / БИБЛИОГРАФИЯ" title="Библиотека источников" description="Оригиналы, наборы данных и рабочие заметки. Метаданные требуют проверки перед публикацией."><Button variant="secondary" icon={Download} disabled={!resources.length} onClick={exportBibliography}>BibTeX</Button>{canWrite && <Button icon={Plus} onClick={() => setModal({ type: 'resource' })}>Добавить материал</Button>}</PageTitle>
    <div className="toolbar"><div className="filter-tabs">{[['all', 'Все материалы'], ['paper', 'Статьи'], ['dataset', 'Данные'], ['note', 'Заметки'], ['link', 'Ссылки'], ['saved', 'Избранное']].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div><div className="inline-search"><Search size={16} /><input aria-label="Поиск по библиотеке" placeholder="Название, автор, тема" value={query} onChange={e => setQuery(e.target.value)} /></div></div>
    {resources.length ? <div className="library-list">{resources.map(resource => {
      const Icon = resourceIcons[resource.kind]
      return <article className="resource-row" key={resource.id}><button className="resource-open" onClick={() => setModal({ type: 'resource-detail', item: resource })}><span className={`resource-icon color-${resource.kind === 'paper' ? 'violet' : resource.kind === 'dataset' ? 'sage' : 'peach'}`}><Icon size={21} /></span><div><div className="resource-meta">{resourceKinds[resource.kind]}{resource.year && <><span>·</span>{resource.year}</>}</div><h3>{resource.title}</h3><p>{resource.authors || 'Материал команды'}</p><span className="resource-provenance">{data.projects.find(p => p.id === resource.project_id)?.title || 'Без связи с проектом'} · {resource.url ? 'Внешний источник' : 'Нет внешней ссылки'}</span><Tags tags={resource.tags} /></div></button><button className={`icon-button bookmark-button ${resource.bookmarked ? 'is-saved' : ''}`} aria-label={`${resource.bookmarked ? 'Убрать из' : 'Добавить в'} избранное: ${resource.title}`} aria-pressed={resource.bookmarked} disabled={pending === resource.id} onClick={() => bookmark(resource)}><Bookmark size={19} fill={resource.bookmarked ? 'currentColor' : 'none'} /></button></article>
    })}</div> : <EmptyState title={query ? 'Материалы не найдены' : filter === 'saved' ? 'Соберите свою подборку' : 'Здесь пока нет материалов'} text={query ? 'Измените запрос или сбросьте поиск, чтобы увидеть материалы.' : filter === 'saved' ? 'Нажмите на закладку рядом с полезным материалом.' : 'Добавляйте статьи, наборы данных и заметки или сохраняйте разборы из раздела открытий.'} action={canWrite && filter === 'all' && !query ? 'Добавить материал' : null} onAction={() => setModal({ type: 'resource' })} />}
  </>
}
