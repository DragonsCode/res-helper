import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUp, MessageCircle, Plus, Send } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, relativeTime } from '../api'
import { useApp } from '../context'
import { Avatar, Button, EmptyState, Loading, PageTitle, Tags } from '../components/ui'

export const discussionKinds = { discussion: 'Обсуждение', question: 'Вопрос', finding: 'Результат' }

export function VoteButton({ item, after }) {
  const { base, canWrite, refresh, notify } = useApp()
  const [busy, setBusy] = useState(false)
  async function toggle() {
    setBusy(true)
    try { await api(`${base}/discussions/${item.id}/vote`, { method: item.voted ? 'DELETE' : 'PUT' }); refresh(); after?.() }
    catch (e) { notify(e.message, true) }
    finally { setBusy(false) }
  }
  return <button className={`vote-button ${item.voted ? 'voted' : ''}`} aria-label={`${item.voted ? 'Убрать поддержку' : 'Поддержать'}: ${item.title}`} aria-pressed={item.voted} onClick={toggle} disabled={busy || !canWrite}><ArrowUp size={16} />{item.votes}</button>
}

export function Discussions() {
  const { data, setModal, canWrite } = useApp()
  const [filter, setFilter] = useState('all')
  const discussions = data.discussions.filter(d => filter === 'all' || d.kind === filter)
  return <>
    <PageTitle eyebrow="МЫСЛИТЬ ЛУЧШЕ — ВМЕСТЕ" title="Научное обсуждение" description="Аргументы, уточнения и предварительные результаты — в контексте проекта.">{canWrite && <Button icon={Plus} onClick={() => setModal({ type: 'discussion' })}>Начать обсуждение</Button>}</PageTitle>
    <div className="toolbar"><div className="filter-tabs">{[['all', 'Все обсуждения'], ['question', 'Вопросы'], ['finding', 'Результаты'], ['discussion', 'Идеи и мнения']].map(([value, label]) => <button key={value} aria-pressed={value === filter} className={value === filter ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
    <div className="discussion-list">{discussions.length ? discussions.map(item => <article className="discussion-card" key={item.id}><div className="discussion-author"><Avatar person={item.author} /><div><strong>{item.author.name}</strong><small>{item.author.discipline || 'Участник команды'} · {relativeTime(item.created_at)}</small></div><span className={`discussion-kind kind-${item.kind}`}>{discussionKinds[item.kind]}</span></div><Link to={`/discussions/${item.id}`} className="discussion-content"><h2>{item.title}</h2><p>{item.body}</p></Link><Tags tags={item.tags} /><div className="discussion-footer"><VoteButton item={item} /><Link to={`/discussions/${item.id}`}><MessageCircle size={16} />{item.comment_count} ответов</Link><Link className="text-link discussion-open" to={`/discussions/${item.id}`}>Присоединиться →</Link></div></article>) : <EmptyState title="Начните разговор" text="Хорошие исследования начинаются с вопросов, которыми делятся." action={canWrite ? 'Задать вопрос' : null} onAction={() => setModal({ type: 'discussion' })} />}</div>
  </>
}

export function DiscussionDetail() {
  const { id } = useParams()
  const { base, refresh, canWrite, notify } = useApp()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const reload = () => setRevision(v => v + 1)
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    setItem(null)
    api(`${base}/discussions/${id}`, { signal: controller.signal }).then(setItem).catch(e => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [base, id, revision])
  async function comment(event) {
    event.preventDefault()
    const form = event.currentTarget
    const body = new FormData(form).get('body')
    setBusy(true)
    try { const updated = await api(`${base}/discussions/${id}/comments`, { method: 'POST', body: { body } }); setItem(updated); form.reset(); refresh(); notify('Ответ опубликован') }
    catch (e) { notify(e.message, true) }
    finally { setBusy(false) }
  }
  if (error) return <EmptyState title="Не удалось открыть обсуждение" text={error} action="Повторить" onAction={reload} />
  if (!item) return <Loading />
  return <div className="reading-width"><Link to="/discussions" className="back-link"><ArrowLeft size={16} />Все обсуждения</Link><article className="discussion-card discussion-detail"><div className="discussion-author"><Avatar person={item.author} /><div><strong>{item.author.name}</strong><small>{relativeTime(item.created_at)}</small></div><span className={`discussion-kind kind-${item.kind}`}>{discussionKinds[item.kind]}</span></div><h1>{item.title}</h1><p className="prose">{item.body}</p><Tags tags={item.tags} /><div className="discussion-footer"><VoteButton item={item} after={reload} /><span>{item.comment_count} ответов</span></div></article>
    <section className="comments-section"><h2>Продолжим разговор <span className="count">{item.comments.length}</span></h2>{item.comments.map(comment => <div className="comment" key={comment.id}><Avatar person={comment.author} /><div><strong>{comment.author.name}</strong><small>{relativeTime(comment.created_at)}</small><p>{comment.body}</p></div></div>)}
      {canWrite ? <form className="comment-form" onSubmit={comment}><label htmlFor="comment-body">Ваш ответ</label><textarea id="comment-body" name="body" required maxLength={5000} rows={4} placeholder="Поделитесь мыслью, уточнением или полезным источником…" /><Button icon={Send} busy={busy} type="submit">Отправить ответ</Button></form> : <p className="quiet-empty">В этом пространстве у вас доступ только для чтения.</p>}
    </section>
  </div>
}
