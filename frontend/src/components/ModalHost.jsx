import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, Copy, ExternalLink, FolderKanban, GraduationCap, Mail, MessageSquare, Plus, Search, Sparkles, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api, audiences } from '../api'
import { useApp } from '../context'
import { ActivityList } from '../pages/Dashboard'
import { resourceKinds } from '../pages/Library'
import { discussionKinds } from '../pages/Discussions'
import { Button, EmptyState, Field, Modal, Tags } from './ui'

const titles = { project: 'Новый проект', resource: 'Добавить материал', task: 'Следующий шаг', discussion: 'Начнём разговор' }
const descriptions = {
  project: 'Дайте идее имя. Детали и задачи можно добавить по ходу работы.',
  resource: 'Сохраните источник, набор данных или собственную заметку.',
  task: 'Один понятный шаг приближает к большому результату.',
  discussion: 'Хороший вопрос может изменить направление исследования.',
}

function Editor({ type, item, projectId, onClose }) {
  const { data, user, base, refresh, upsertProject, notify } = useApp()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    const values = Object.fromEntries(new FormData(event.currentTarget))
    if ('tags' in values) values.tags = values.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    for (const key of ['due_date', 'project_id', 'assignee_id', 'url']) if (key in values && values[key] === '') values[key] = null
    if ('year' in values) values.year = values.year ? Number(values.year) : null
    const path = { project: 'projects', resource: 'resources', task: 'tasks', discussion: 'discussions' }[type]
    try {
      const result = await api(`${base}/${path}${item ? `/${item.id}` : ''}`, { method: item ? 'PUT' : 'POST', body: values })
      if (type === 'project') upsertProject(result)
      refresh(); onClose(); notify(item ? 'Изменения сохранены' : { project: 'Проект создан', resource: 'Материал добавлен', task: 'Задача добавлена', discussion: 'Обсуждение опубликовано' }[type])
      if (type === 'project' || type === 'discussion') navigate(`/${path}/${result.id}`)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <Modal title={item ? type === 'project' ? 'Редактировать проект' : 'Редактировать материал' : titles[type]} subtitle={descriptions[type]} dismissible={!busy} onClose={onClose}>
    <form className="stack-form" onSubmit={submit}>
      <fieldset className="editor-fields" disabled={busy}><Field label={type === 'task' ? 'Что нужно сделать?' : type === 'discussion' ? 'Тема' : 'Название'}><input name="title" defaultValue={item?.title} required maxLength={type === 'project' ? 160 : type === 'resource' ? 240 : 200} placeholder={type === 'project' ? 'Какой вопрос вы хотите исследовать?' : type === 'resource' ? 'Название статьи, набора данных или заметки' : type === 'task' ? 'Например, подготовить обзор литературы' : 'С чего начнём?'} autoFocus /></Field>
      {type === 'project' && <>
        <Field label="Описание"><textarea name="description" defaultValue={item?.description} rows={3} maxLength={5000} placeholder="Гипотеза, цель и ожидаемый результат" /></Field>
        <div className="form-grid"><Field label="Направление"><input name="field" defaultValue={item?.field || ''} required maxLength={80} placeholder="Например, экология" /></Field><Field label="Срок"><input type="date" name="due_date" defaultValue={item?.due_date || ''} /></Field></div>
        <div className="form-grid"><Field label="Статус"><select name="status" defaultValue={item?.status || 'active'}><option value="active">В работе</option><option value="planned">Планируется</option><option value="completed">Завершён</option><option value="archived">В архиве</option></select></Field><input type="hidden" name="color" value={item?.color || 'sage'} /></div>
      </>}
      {type === 'resource' && <>
        <div className="form-grid"><Field label="Тип"><select name="kind" defaultValue={item?.kind || 'paper'}>{Object.entries(resourceKinds).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field><Field label="Год"><input type="number" name="year" defaultValue={item?.year || ''} min={1500} max={2100} placeholder="2026" /></Field></div>
        <Field label="Авторы или источник"><input name="authors" defaultValue={item?.authors || ''} maxLength={200} placeholder="Имя автора, команда или организация" /></Field>
        <Field label="Ссылка на источник"><input type="url" name="url" defaultValue={item?.url || ''} maxLength={2000} placeholder="https://doi.org/…" /></Field>
        <Field label="Заметки"><textarea name="notes" defaultValue={item?.notes || ''} rows={3} maxLength={10000} placeholder="Почему это важно для вашей работы?" /></Field>
      </>}
      {type === 'discussion' && <>
        <Field label="Тип обсуждения"><select name="kind" defaultValue="discussion">{Object.entries(discussionKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Ваша мысль"><textarea name="body" required rows={5} maxLength={20000} placeholder="Добавьте контекст, аргументы и ссылки на источники…" /></Field>
      </>}
      {type !== 'project' && <Field label="Проект"><select name="project_id" defaultValue={item?.project_id || projectId || ''}><option value="">Без привязки к проекту</option>{data.projects.filter(p => p.status !== 'archived' || p.id === item?.project_id).map(project => <option value={project.id} key={project.id}>{project.title}</option>)}</select></Field>}
      {type === 'task' && <>
        <div className="form-grid"><Field label="Исполнитель"><select name="assignee_id" defaultValue={user.id}><option value="">Не назначен</option>{data.members.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field><Field label="Срок"><input type="date" name="due_date" /></Field></div>
        <Field label="Статус"><select name="status" defaultValue="todo"><option value="todo">Предстоит</option><option value="in_progress">В работе</option><option value="done">Готово</option></select></Field>
      </>}
      {type !== 'task' && <Field label="Теги" hint="Через запятую, до 8 тегов"><input name="tags" defaultValue={item?.tags?.join(', ') || ''} placeholder="Открытая наука, методология" /></Field>}
      </fieldset>{error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-footer"><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Отмена</Button><Button type="submit" busy={busy}>{item ? 'Сохранить' : type === 'discussion' ? 'Опубликовать' : type === 'project' ? 'Создать проект' : 'Добавить'}<ArrowRight size={16} /></Button></div>
    </form>
  </Modal>
}

function ResourceDetail({ item, onClose }) {
  const { user, isOwner, canWrite, setModal, data } = useApp()
  const project = data.projects.find(p => p.id === item.project_id)
  return <Modal panel title={item.title} subtitle={`${resourceKinds[item.kind]}${item.year ? ` · ${item.year}` : ''}`} onClose={onClose}>
    <div className="source-classification">ИСТОЧНИК / РАБОЧАЯ ЗАПИСЬ</div>
    <dl className="source-metadata"><div><dt>Автор / организация</dt><dd>{item.authors || 'Не указаны'}</dd></div><div><dt>Проект</dt><dd>{project ? <Link to={`/projects/${project.id}`} onClick={onClose}>{project.title}</Link> : 'Не связан с проектом'}</dd></div><div><dt>Добавил(а)</dt><dd>{item.added_by.name}</dd></div><div><dt>Ссылка</dt><dd>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}<ExternalLink size={14} /></a> : 'Нет внешнего источника'}</dd></div></dl>
    {item.kind === 'dataset' && <p className="document-notice">Сохранена ссылка на набор данных. Данные не загружены и не проанализированы в Re:Search.</p>}
    <Tags tags={item.tags} /><h3 className="source-notes-heading">Заметки и контекст</h3><div className="resource-notes prose">{item.notes || 'Заметок к этому материалу пока нет.'}</div>
    <p className="editorial-note">Запись внесена участником пространства. Наличие ссылки не подтверждает утверждения и качество исследования.</p>
    <div className="form-footer">{canWrite && (isOwner || item.added_by.id === user.id) && <Button variant="secondary" onClick={() => setModal({ type: 'resource', item })}>Редактировать</Button>}{item.url && <a className="button button-primary" href={item.url} target="_blank" rel="noopener noreferrer">Первоисточник<ExternalLink size={16} /></a>}</div>
  </Modal>
}

function SearchModal({ onClose }) {
  const { base, setModal, data } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!query.trim()) { setResults([]); setBusy(false); return }
    const controller = new AbortController()
    setBusy(true); setError('')
    const timer = setTimeout(() => {
      api(`${base}/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then(setResults)
        .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
        .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, base, retry])
  function open(item) {
    if (item.kind === 'resource') {
      const resource = data.resources.find(r => r.id === item.id)
      if (resource) setModal({ type: 'resource-detail', item: resource })
    } else { navigate(`/${item.kind === 'project' ? 'projects' : 'discussions'}/${item.id}`); onClose() }
  }
  const kinds = { project: ['Проект', FolderKanban], resource: ['Материал', BookOpen], discussion: ['Обсуждение', MessageSquare] }
  return <Modal title="Найти в пространстве" onClose={onClose}><div className="search-modal-input"><Search size={20} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} maxLength={100} placeholder="Проект, статья или обсуждение…" aria-label="Поисковый запрос" /></div>
    <div className="search-results">{error ? <div><p className="form-error" role="alert">{error}</p><Button variant="secondary" onClick={() => setRetry(v => v + 1)}>Повторить поиск</Button></div> : busy ? <p className="quiet-empty">Ищем…</p> : results.length ? results.map(item => { const [label, Icon] = kinds[item.kind]; return <button key={`${item.kind}-${item.id}`} onClick={() => open(item)}><Icon size={20} /><div><strong>{item.title}</strong><small>{label}</small></div><ArrowUpRight size={17} /></button> }) : <p className="quiet-empty">{query ? 'Ничего не найдено. Попробуйте другие слова.' : 'Все знания команды — на расстоянии одного запроса.'}</p>}</div>
  </Modal>
}

function InviteModal({ onClose }) {
  const { base, workspace, notify } = useApp()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setBusy(true)
    try { setResult(await api(`${base}/invitations`, { method: 'POST', body: Object.fromEntries(new FormData(event.currentTarget)) })) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  const link = result ? `${window.location.origin}/invite?token=${encodeURIComponent(result.token)}` : ''
  return <Modal title="Пригласите любопытный ум" subtitle="Совместная работа начинается с приглашения." onClose={onClose}>
    {workspace.is_demo ? <EmptyState title="Соберите свою настоящую команду" text="Приглашения доступны в личном аккаунте. Выйдите из демо и зарегистрируйтесь, чтобы создать собственное пространство." icon={Users} /> : result ? <div className="stack-form"><div className="success-message"><CheckCheck size={25} /><h3>Приглашение готово</h3><p>Для {result.email} · действует 7 дней</p></div><Field label="Персональная ссылка"><input value={link} readOnly onFocus={e => e.target.select()} /></Field><p className="muted">Отправьте ссылку участнику удобным способом. Сервис не отправляет письмо автоматически.</p><Button icon={Copy} onClick={async () => { try { await navigator.clipboard.writeText(link); notify('Ссылка скопирована') } catch { notify('Выделите и скопируйте ссылку из поля', true) } }}>Скопировать ссылку</Button></div> : <form className="stack-form" onSubmit={submit}><Field label="Email участника"><input type="email" name="email" required placeholder="colleague@example.com" /></Field><Field label="Доступ"><select name="role"><option value="member">Участник — создавать и обсуждать</option><option value="viewer">Наблюдатель — только читать</option></select></Field><p className="form-hint">Приглашение сможет принять только аккаунт с указанным email. Письмо не отправляется: вы получите ссылку.</p>{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" busy={busy} icon={Mail}>Создать приглашение</Button></form>}
  </Modal>
}

function AudienceModal({ onClose }) {
  const { user, updateUser, notify } = useApp()
  const [busy, setBusy] = useState(null)
  async function select(audience) {
    setBusy(audience)
    try {
      updateUser(await api('/auth/me', { method: 'PATCH', body: { name: user.name, bio: user.bio, discipline: user.discipline, audience } }))
      onClose(); notify('Ваш путь обновлён. Все материалы и проекты сохранены.')
    } catch (e) { notify(e.message, true) }
    finally { setBusy(null) }
  }
  return <Modal title="Ваш путь в науке" subtitle="Любопытство не требует должности. Выбирайте то, что ближе сейчас." onClose={onClose}><div className="audience-options">{Object.entries(audiences).map(([key, audience]) => <button key={key} className={key === user.audience ? 'selected' : ''} disabled={!!busy} onClick={() => select(key)}><div><strong>{audience.label}</strong><small>{audience.description}</small></div>{key === user.audience ? <Check size={19} /> : <ArrowRight size={17} />}</button>)}</div></Modal>
}

function PricingModal({ onClose }) {
  const { notify, user } = useApp()
  const [busy, setBusy] = useState(null)
  async function interest(plan) {
    setBusy(plan)
    try { const response = await api('/plan-interest', { method: 'POST', body: { plan } }); notify(response.message) }
    catch (e) { notify(e.message, true) }
    finally { setBusy(null) }
  }
  return <Modal title="Знания открыты. Работа растёт вместе с вами." subtitle="Проект тарифов для раннего доступа. Подписки и списания пока не подключены." wide onClose={onClose}>
    <div className="pricing-grid">{[
      { id: 'free', name: 'Открытый', price: '$0', unit: 'для каждого', icon: BookOpen, text: 'Читать, разбираться и начинать.', features: ['Разборы и первоисточники', 'Личная библиотека', 'Учебные маршруты', 'Первые проекты'] },
      { id: 'education', name: 'Образование', price: '$9', unit: 'за преподавателя / месяц', icon: GraduationCap, text: 'Гипотеза тарифа для учебных групп.', features: ['Всё из открытого уровня', 'Класс до 30 участников', 'Шаблоны учебных проектов', 'В перспективе: оценка работ'] },
      { id: 'team', name: 'Research Team', price: '$12', unit: 'за участника / месяц', icon: Sparkles, text: 'Гипотеза тарифа для лабораторий.', features: ['Общие проекты и библиотека', 'Роли и приглашения', 'Экспорт библиографии', 'В перспективе: интеграции'] },
    ].map(plan => <div className={`pricing-card ${plan.id === 'team' ? 'pricing-featured' : ''}`} key={plan.id}><plan.icon size={23} /><h3>{plan.name}</h3><p>{plan.text}</p><strong className="plan-price">{plan.price}</strong><small>{plan.unit}</small><ul>{plan.features.map(feature => <li key={feature}><Check size={14} />{feature}</li>)}</ul><Button variant={plan.id === 'team' ? 'primary' : 'secondary'} disabled={plan.id === 'free'} busy={busy === plan.id} onClick={() => interest(plan.id)}>{plan.id === 'free' ? 'Бесплатный ранний доступ' : 'Мне интересно'}</Button></div>)}</div>
    <p className="pricing-note">Цены и ограничения — гипотеза для проверки, сейчас платных ограничений нет. {user.is_demo ? 'Интерес к тарифу можно сохранить после регистрации.' : '«Мне интересно» сохраняет ваш выбор без оплаты и без отправки сообщений.'}</p>
    <div className="institution-row"><div><strong>Университет или научный центр?</strong><p>Проверяем спрос на институциональный план.</p></div><Button variant="secondary" busy={busy === 'institution'} onClick={() => interest('institution')}>Сохранить интерес<ArrowUpRight size={16} /></Button></div>
  </Modal>
}

export function ModalHost() {
  const { modal, setModal, data } = useApp()
  if (!modal) return null
  const onClose = () => setModal(null)
  if (titles[modal.type]) return <Editor key={`${modal.type}-${modal.item?.id || 'new'}`} {...modal} onClose={onClose} />
  if (modal.type === 'evidence-list') return <Modal panel title={modal.title} subtitle="Связанные записи библиотеки. Количество не оценивает доказательность." onClose={onClose}>{modal.resources.map(item => <button className="related-item" key={item.id} onClick={() => setModal({ type: 'resource-detail', item })}><strong>{item.title}</strong><small>{item.authors || 'Автор не указан'}</small></button>)}</Modal>
  if (modal.type === 'resource-detail') return <ResourceDetail item={modal.item} onClose={onClose} />
  if (modal.type === 'search') return <SearchModal onClose={onClose} />
  if (modal.type === 'invite') return <InviteModal onClose={onClose} />
  if (modal.type === 'audience') return <AudienceModal onClose={onClose} />
  if (modal.type === 'pricing') return <PricingModal onClose={onClose} />
  if (modal.type === 'activity') return <Modal title="Пульс команды" subtitle="Последние изменения в вашем пространстве." onClose={onClose}><ActivityList items={data?.activity || []} /></Modal>
  return null
}
