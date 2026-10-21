import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, BookOpen, Check, ChevronRight, LoaderCircle, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dateLabel } from '../api'
import { useApp } from '../context'

export function Logo({ light = false }) {
  return <span className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark">r<span>:</span></span><span>Re:Search<span className="brand-dot">.</span></span></span>
}

export function Avatar({ person, size = 'sm' }) {
  const initials = person?.name?.split(' ').slice(0, 2).map(word => word[0]).join('') || '?'
  return <span className={`avatar avatar-${size} color-${person?.color || 'sage'}`} title={person?.name}>{initials}</span>
}

export function Modal({ title, subtitle, children, onClose, wide = false, panel = false, dismissible = true }) {
  const { toast } = useApp()
  const ref = useRef(null)
  const id = useId()
  const [closing, setClosing] = useState(false)
  const timer = useRef(null)
  function close() {
    if (closing || !dismissible) return
    setClosing(true)
    timer.current = setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-dismiss')))
  }
  useEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    const initial = dialog.querySelector('input:not([type="hidden"]), textarea, select') || dialog.querySelector('button')
    initial?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { clearTimeout(timer.current); dialog.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus?.(); else document.getElementById('workspace-content')?.focus() }
  }, [])
  return createPortal(<dialog ref={ref} aria-labelledby={id} className={`modal ${wide ? 'modal-wide' : ''} ${panel ? 'modal-panel' : ''} ${closing ? 'is-closing' : ''}`}
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => {
      if (event.target !== ref.current) return
      const bounds = ref.current.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close()
    }}>
    <div className="modal-inner">
      <div className="modal-heading"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button className="icon-button" onClick={close} disabled={!dismissible} aria-label="Закрыть"><X size={20} /></button>
      </div>
      {children}
      {toast && <div className={`dialog-feedback ${toast.error ? 'form-error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.message}</div>}
    </div>
  </dialog>, document.body)
}

export function Button({ children, variant = 'primary', busy = false, icon: Icon, className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props} disabled={busy || props.disabled} aria-busy={busy || undefined}>
    {busy ? <LoaderCircle size={17} className="spin" /> : Icon ? <Icon size={17} /> : null}{children}
  </button>
}

export function Field({ label, children, hint }) {
  const generatedId = useId()
  const id = children.props.id || generatedId
  return <div className="field"><label htmlFor={id}>{label}</label>{cloneElement(children, {
    id, 'aria-describedby': hint ? `${id}-hint` : undefined,
  })}{hint && <small id={`${id}-hint`}>{hint}</small>}</div>
}

export function EmptyState({ title, text, action, onAction, icon: Icon = BookOpen }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={27} /></span><h3>{title}</h3><p>{text}</p>
    {action && <Button onClick={onAction} icon={Plus}>{action}</Button>}
  </div>
}

export function Loading({ label = 'Собираем ваше пространство…' }) {
  return <div className="loading-state" role="status"><LoaderCircle className="spin" size={25} /><p>{label}</p></div>
}

export function Tags({ tags = [] }) {
  return <div className="tags">{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
}

export function PageTitle({ eyebrow, title, description, children }) {
  return <div className="page-title"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div><div className="page-actions">{children}</div></div>
}

export function SectionHeading({ title, count, to, link = 'Посмотреть все', children }) {
  return <div className="section-heading"><h2>{title}{count !== undefined && <span className="count">{count}</span>}</h2>
    {to ? <Link className="text-link" to={to}>{link}<ChevronRight size={15} /></Link> : children}</div>
}

export function ProjectCard({ project, index = 0 }) {
  const status = { active: 'В работе', planned: 'Планируется', completed: 'Завершён', archived: 'В архиве' }
  return <Link to={`/projects/${project.id}`} className="project-card">
    <span className="register-index">{String(index + 1).padStart(2, '0')}</span>
    <div className="register-main"><div className="register-meta"><span>{project.field}</span><span className={`status status-${project.status}`}>{status[project.status]}</span></div><h3>{project.title}</h3><p>{project.question || project.description || 'Исследовательский вопрос ещё не сформулирован.'}</p><div className="register-owner">Ответственный: {project.owner.name}<span>·</span>{dateLabel(project.due_date)}</div></div>
    <div className="register-progress"><span>{project.completed_tasks}<small> / {project.task_count}</small></span><div className="progress-track"><span style={{ transform: `scaleX(${project.task_count ? project.completed_tasks / project.task_count : 0})` }} /></div><small>задач выполнено</small></div><ArrowUpRight size={18} className="card-arrow" />
  </Link>
}

export function ArticleCard({ article, read = false }) {
  return <Link to={`/discover/${article.id}`} className="article-card"><div className="article-card-body"><div className="article-meta"><span>{article.field} / {article.kind}</span><span>{article.minutes} мин</span></div><h3>{article.title}</h3><p>{article.subtitle}</p><span className="article-link">{read ? <><Check size={15} />Прочитано</> : 'Открыть разбор'}<ArrowUpRight size={16} /></span></div></Link>
}
