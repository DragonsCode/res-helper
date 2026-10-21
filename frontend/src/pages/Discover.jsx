import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, BookmarkPlus, Check, Clock3, Compass, FlaskConical, GraduationCap, ListChecks, Plus, Search } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, audiences } from '../api'
import { useApp } from '../context'
import { ArticleCard, Button, EmptyState, Loading, Logo, PageTitle, Tags } from '../components/ui'

export function Discover({ publicCatalog }) {
  const { data: workspaceData, user } = useApp()
  const data = workspaceData || { catalog: publicCatalog || [], read: [] }
  const [level, setLevel] = useState('all')
  const [query, setQuery] = useState('')
  const preferred = audiences[user?.audience || 'enthusiast'].level
  const items = data.catalog.filter(item => (level === 'all' || item.level === level) && `${item.title} ${item.field} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.level === preferred) - Number(a.level === preferred))
  return <>
    <PageTitle eyebrow="READING ROOM / ОТКРЫТЫЙ ДОСТУП" title="Методы и разборы" description="Редакционные материалы с первоисточниками. Читайте, проверяйте и переходите к практике." />
    <div className="discovery-paths">{[
      ['explore', Compass, 'Открывать', 'Понятно о сложном', 'sage'],
      ['learn', GraduationCap, 'Учиться', 'От знаний к практике', 'blue'],
      ['research', FlaskConical, 'Исследовать', 'Методы и инструменты', 'violet'],
    ].map(([value, Icon, title, subtitle, color]) => <button key={value} aria-pressed={level === value} className={`discovery-path ${level === value ? 'selected' : ''}`} onClick={() => setLevel(level === value ? 'all' : value)}><span className={`path-icon color-${color}`}><Icon size={22} /></span><div><strong>{title}</strong><small>{subtitle}</small></div><ArrowUpRight size={19} /></button>)}</div>
    <div className="toolbar"><div className="filter-tabs"><button aria-pressed={level === 'all'} className={level === 'all' ? 'selected' : ''} onClick={() => setLevel('all')}>Все материалы</button><span className="catalog-note">Редакционная стартовая подборка</span></div><div className="inline-search"><Search size={16} /><input placeholder="Тема или интерес" aria-label="Найти материал" value={query} onChange={e => setQuery(e.target.value)} /></div></div>
    {items.length ? <div className="article-grid">{items.map(item => <ArticleCard key={item.id} article={item} read={data.read.includes(item.id)} />)}</div> : <EmptyState title="Пока не нашли эту тему" text="Попробуйте другой запрос или выберите все материалы." />}
  </>
}

export function Article() {
  const { id } = useParams()
  const { base, data, refresh, upsertProject, notify, canWrite, user } = useApp()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(null)
  const read = data?.read.includes(id) || false
  useEffect(() => {
    const controller = new AbortController()
    setItem(null); setError('')
    api(`/catalog/${id}`, { signal: controller.signal }).then(setItem).catch(e => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [id, retry])
  async function action(kind) {
    setBusy(kind)
    try {
      if (kind === 'read') {
        await api(`/catalog/${id}/read`, { method: read ? 'DELETE' : 'PUT' })
        refresh()
      } else if (kind === 'save') {
        await api(`${base}/catalog/${id}/save`, { method: 'POST' })
        refresh(); notify('Материал и первоисточники сохранены в библиотеку')
      } else {
        const project = await api(`${base}/catalog/${id}/project`, { method: 'POST' })
        upsertProject(project); refresh(); notify('Проект с шагами маршрута создан'); navigate(`/projects/${project.id}`)
      }
    } catch (e) { notify(e.message, true) }
    finally { setBusy(null) }
  }
  if (error) return <EmptyState title="Не удалось открыть материал" text={error} action="Повторить" onAction={() => setRetry(v => v + 1)} />
  if (!item) return <Loading />
  return <div className="article-layout"><div className="article-main"><Link to="/discover" className="back-link"><ArrowLeft size={16} />К открытиям</Link><div className="article-classification"><span className="eyebrow">РЕДАКЦИОННЫЙ РАЗБОР / {item.field}</span><span>Открытый доступ</span></div><div className="article-heading"><div className="article-meta"><span>{item.kind}</span><span><Clock3 size={14} />{item.minutes} мин чтения</span></div><h1>{item.title}</h1><p>{item.subtitle}</p><Tags tags={item.tags} /></div><div className="article-prose">{item.body.map(part => <section key={part.heading}><h2>{part.heading}</h2><p>{part.text}</p></section>)}</div><div className="article-finish"><span>Ещё один шаг к пониманию мира.</span>{user ? <Button variant={read ? 'secondary' : 'primary'} busy={busy === 'read'} icon={Check} onClick={() => action('read')}>{read ? 'Прочитано · отменить' : 'Отметить прочитанным'}</Button> : <Link className="button button-primary" to="/?signup=1">Сохранить свой прогресс<ArrowUpRight size={16} /></Link>}</div></div>
    <aside className="article-aside"><section className="panel sources-panel"><span className="eyebrow">ПРОВЕРЯЙТЕ И УГЛУБЛЯЙТЕСЬ</span><h2>Первоисточники рядом</h2><p>Разбор — отправная точка. Полная картина — в оригинальных материалах.</p>{item.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={17} /></a>)}{user && canWrite && <Button variant="secondary" busy={busy === 'save'} icon={BookmarkPlus} onClick={() => action('save')}>В библиотеку</Button>}</section>
      {item.steps.length > 0 && <section className="panel route-panel"><span className="route-icon"><ListChecks size={22} /></span><h2>Попробуйте на практике</h2><p>Превратите этот маршрут в проект с готовыми задачами.</p><ol>{item.steps.map(step => <li key={step}>{step}</li>)}</ol>{user && canWrite && <Button icon={Plus} busy={busy === 'project'} onClick={() => action('project')}>Начать проект</Button>}</section>}
      <p className="editorial-note">Стартовый образовательный материал Re:Search. Не является рецензируемой научной публикацией.</p>
    </aside>
  </div>
}

export function PublicDiscovery({ article = false }) {
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    api('/catalog', { signal: controller.signal }).then(setCatalog).catch(e => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [retry])
  return <div className="public-discovery"><header className="landing-header"><Link to="/"><Logo /></Link><nav><Link to="/discover">Открывать науку</Link><Link to="/?signup=1" className="button button-primary">Создать пространство<ArrowUpRight size={16} /></Link></nav></header><main className="public-discovery-main">{article ? <Article /> : error ? <EmptyState title="Не удалось загрузить материалы" text={error} action="Повторить" onAction={() => setRetry(v => v + 1)} /> : catalog ? <Discover publicCatalog={catalog} /> : <Loading />}</main><footer className="landing-footer"><Logo /><span>Понимание науки начинается с открытого доступа.</span></footer></div>
}
