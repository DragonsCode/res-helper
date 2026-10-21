import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, CheckCheck, FlaskConical, FolderKanban, Plus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { api, audiences, dateLabel, relativeTime } from '../api'
import { useApp } from '../context'
import { ArticleCard, Avatar, Button, EmptyState, ProjectCard, SectionHeading } from '../components/ui'

import { EvidenceMap } from '../components/EvidenceMap'

export function TaskRow({ task }) {
  const { base, refresh, notify, canWrite } = useApp()
  const [busy, setBusy] = useState(false)
  async function toggle() {
    setBusy(true)
    try {
      await api(`${base}/tasks/${task.id}`, { method: 'PATCH', body: { status: task.status === 'done' ? 'todo' : 'done' } })
      refresh()
    } catch (e) { notify(e.message, true) }
    finally { setBusy(false) }
  }
  return <div className={`task-row ${task.status === 'done' ? 'task-done' : ''}`}>
    <button className="task-checkbox" aria-label={`${task.status === 'done' ? 'Возобновить' : 'Завершить'}: ${task.title}`} aria-pressed={task.status === 'done'} onClick={toggle} disabled={busy || !canWrite}>{busy ? <span className="pending-dot" /> : task.status === 'done' && <Check size={15} />}</button>
    <div className="task-main"><strong>{task.title}</strong>{task.project_title && <Link to={`/projects/${task.project_id}`}>{task.project_title}</Link>}</div>
    <span className={`task-date ${dateLabel(task.due_date) === 'Сегодня' ? 'due-today' : ''}`}>{dateLabel(task.due_date)}</span>
  </div>
}

export function ActivityList({ items }) {
  if (!items.length) return <p className="quiet-empty">Здесь появятся первые шаги вашей команды.</p>
  return <div className="activity-list">{items.map(item => <div className="activity-item" key={item.id}><Avatar person={item.user} size="xs" /><div><p><strong>{item.user.name}</strong> {item.action}</p><span className="activity-subject">{item.subject}</span><small>{relativeTime(item.created_at)}</small></div></div>)}</div>
}

export function Dashboard() {
  const { data, user, workspace, setModal, canWrite } = useApp()
  const [showDone, setShowDone] = useState(false)
  const [tasksExpanded, setTasksExpanded] = useState(false)
  const audience = audiences[user.audience]
  const projects = data.projects.filter(p => p.status !== 'archived')
  const tasks = data.tasks.filter(t => t.assignee_id === user.id && (showDone || t.status !== 'done'))
  const missing = projects.filter(p => !p.question || !p.method)
  const sourcesWithoutProject = data.resources.filter(r => !r.project_id).length
  return <>
    <div className="journal-heading"><div><p className="eyebrow">LAB NOTEBOOK / {audience.level === 'research' ? 'ИССЛЕДОВАТЕЛЬСКАЯ РАБОТА' : audience.level === 'learn' ? 'УЧЕБНАЯ ПРАКТИКА' : 'ПРОВЕРКА ИСТОЧНИКОВ'}</p><h1>Рабочий журнал<span className="heading-period">.</span></h1><p>{audience.level === 'research' ? 'Вопросы, источники и решения вашей команды.' : audience.level === 'learn' ? 'От первого вопроса к открытию.' : user.audience === 'journalist' ? 'У каждой истории есть источник.' : 'Разбирайтесь в науке через первоисточники.'}</p></div><div className="journal-heading-actions"><span className="today-date">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>{canWrite && <Button onClick={() => setModal({ type: 'project' })} icon={Plus}>Новый проект</Button>}</div></div>
    <div className="workspace-summary" aria-label="Показатели рабочего пространства"><div><strong>{data.overview.active_projects}</strong><span>активных исследований</span></div><div><strong>{data.overview.resources}</strong><span>записей в библиотеке</span></div><div><strong>{data.overview.completed_tasks}<small>/{data.overview.total_tasks}</small></strong><span>задач выполнено</span></div><div><strong>{data.overview.members}</strong><span>участников пространства</span></div></div>
    <div className="journal-grid"><div className="journal-primary">
      <section className="journal-section"><SectionHeading title="Реестр исследований" count={projects.length} to="/projects" link="Весь реестр" />
        {projects.length ? <div className="project-register">{projects.slice(0, 5).map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}</div> : <EmptyState title="Начните с исследовательского вопроса" text="Создайте проект: сформулируйте вопрос, опишите метод и соберите источники." action={canWrite ? 'Создать первый проект' : null} onAction={() => setModal({ type: 'project' })} />}
      </section>
      <EvidenceMap projects={projects.slice(0, 6)} resources={data.resources} />
    </div><aside className="journal-aside">
      <section className="attention-panel"><span className="eyebrow">ТРЕБУЕТ ВНИМАНИЯ</span><h2>Пробелы в документации</h2><p>Проверьте перед обсуждением результатов.</p>{!projects.length ? <p>После создания проекта здесь появятся незаполненные разделы.</p> : missing.length ? <><strong className="attention-number">{missing.length}<span>проектов без вопроса или метода</span></strong><Link className="text-link" to={`/projects/${missing[0].id}#protocol`}>Дополнить паспорт <ArrowUpRight size={16} /></Link></> : <p>Вопрос и метод заполнены во всех открытых досье.</p>}{sourcesWithoutProject > 0 && <Link className="attention-secondary" to="/library">Без связи с проектом: {sourcesWithoutProject} материалов <ArrowRight size={15} /></Link>}<small>Заполненность не подтверждает достоверность.</small></section>
      <section className="tasks-panel"><SectionHeading title="Мои задачи" count={tasks.length}>{canWrite && <button className="icon-button" aria-label="Добавить задачу" onClick={() => setModal({ type: 'task' })}><Plus size={19} /></button>}</SectionHeading><div className="panel-tabs"><button className={!showDone ? 'selected' : ''} aria-pressed={!showDone} onClick={() => setShowDone(false)}>Предстоящие</button><button className={showDone ? 'selected' : ''} aria-pressed={showDone} onClick={() => setShowDone(true)}>Все задачи</button></div>{tasks.length ? tasks.slice(0, tasksExpanded ? tasks.length : 6).map(task => <TaskRow key={task.id} task={task} />) : <p className="quiet-empty">Нет назначенных вам задач в этом списке.</p>}{tasks.length > 6 && <button className="text-link" aria-expanded={tasksExpanded} onClick={() => setTasksExpanded(v => !v)}>{tasksExpanded ? 'Свернуть список' : `Показать все задачи (${tasks.length})`}</button>}</section>
    </aside></div>
    <div className="journal-bottom"><section><SectionHeading title="Журнал изменений" to="/team" link="Команда" /><ActivityList items={data.activity.slice(0, 3)} /></section><section><SectionHeading title={audience.level === 'research' ? 'Методическая полка' : 'Начните с практики'} to="/discover" link="Все разборы" /><div className="reading-suggestions">{[...data.catalog].sort((a,b) => Number(b.level === audience.level) - Number(a.level === audience.level)).slice(0,2).map(article => <ArticleCard key={article.id} article={article} read={data.read.includes(article.id)} />)}</div></section></div>
  </>
}
