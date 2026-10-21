import { useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCheck, Pencil, Plus, Search } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { dateLabel } from '../api'
import { useApp } from '../context'
import { Avatar, Button, EmptyState, PageTitle, ProjectCard, SectionHeading, Tags } from '../components/ui'
import { TaskRow } from './Dashboard'
import { ResearchProtocol } from '../components/ResearchProtocol'

export function Projects() {
  const { data, setModal, canWrite } = useApp()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const projects = data.projects.filter(project => (filter === 'all' ? project.status !== 'archived' : project.status === filter) && `${project.title} ${project.field}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <PageTitle eyebrow="ОТ ГИПОТЕЗЫ К РЕЗУЛЬТАТУ" title="Реестр исследований" description="Вопрос, метод, материалы и рабочий план каждого проекта.">{canWrite && <Button icon={Plus} onClick={() => setModal({ type: 'project' })}>Новый проект</Button>}</PageTitle>
    <div className="toolbar"><div className="filter-tabs">{[['all', 'Все проекты'], ['active', 'В работе'], ['planned', 'Планируются'], ['completed', 'Завершены'], ['archived', 'Архив']].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div><div className="inline-search"><Search size={16} /><input placeholder="Найти проект" aria-label="Найти проект" value={query} onChange={e => setQuery(e.target.value)} /></div></div>
    {projects.length ? <div className="project-register">{projects.map((project, index) => <ProjectCard project={project} key={project.id} index={index} />)}</div> : <EmptyState title={query || filter !== 'all' ? 'Ничего не найдено' : 'Начните с хорошего вопроса'} text={query || filter !== 'all' ? 'Попробуйте другой запрос или фильтр.' : 'Создайте свой первый проект и разбейте идею на понятные шаги.'} action={!query && filter === 'all' && canWrite ? 'Создать проект' : null} onAction={() => setModal({ type: 'project' })} />}
  </>
}

export function ProjectDetail() {
  const { id } = useParams()
  const { data, user, setModal, canWrite, isOwner } = useApp()
  const project = data.projects.find(item => item.id === id)
  const [filter, setFilter] = useState('all')
  if (!project) return <EmptyState title="Проект не найден" text="Возможно, он находится в другом рабочем пространстве." />
  const tasks = data.tasks.filter(task => task.project_id === id && (filter === 'all' || task.status === filter))
  const resources = data.resources.filter(item => item.project_id === id)
  const discussions = data.discussions.filter(item => item.project_id === id)
  return <>
    <Link to="/projects" className="back-link"><ArrowLeft size={16} />Все проекты</Link>
    <PageTitle eyebrow={project.field} title={project.title} description={project.description}>
      {canWrite && (isOwner || project.owner.id === user.id) && <Button variant="secondary" icon={Pencil} onClick={() => setModal({ type: 'project', item: project })}>Изменить</Button>}
    </PageTitle>
    <div className="project-detail-meta"><Tags tags={project.tags} /><span><CalendarDays size={16} />{dateLabel(project.due_date)}</span><span><Avatar person={project.owner} size="xs" />{project.owner.name}</span><span><CheckCheck size={16} />{project.completed_tasks}/{project.task_count} задач</span></div>
    <nav className="dossier-nav" aria-label="Разделы досье"><a href="#protocol">01 Паспорт</a><a href="#research-plan">02 Рабочий план</a><a href="#project-evidence">03 Материалы</a></nav>
    <ResearchProtocol key={project.id} project={project} />
    <div className="detail-columns" id="research-plan"><section className="panel"><SectionHeading title="План исследования" count={project.task_count}>{canWrite && <Button variant="secondary" icon={Plus} onClick={() => setModal({ type: 'task', projectId: id })}>Задача</Button>}</SectionHeading>
      <div className="panel-tabs">{[['all', 'Все'], ['todo', 'Предстоит'], ['in_progress', 'В работе'], ['done', 'Готово']].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
      {tasks.length ? tasks.map(task => <TaskRow key={task.id} task={task} />) : <EmptyState title="Пока нет задач" text="Определите следующий шаг для этого исследования." />}
    </section><div className="stack-panels"><section className="panel" id="project-evidence"><SectionHeading title="Материалы" count={resources.length}>{canWrite && <button className="icon-button" aria-label="Добавить материал в проект" onClick={() => setModal({ type: 'resource', projectId: id })}><Plus size={18} /></button>}</SectionHeading>{resources.length ? resources.map(resource => <button key={resource.id} className="related-item" onClick={() => setModal({ type: 'resource-detail', item: resource })}><strong>{resource.title}</strong><small>{resource.authors || 'Материал команды'}</small></button>) : <p className="quiet-empty">Добавьте источники и заметки проекта.</p>}</section>
      <section className="panel"><SectionHeading title="Обсуждения" count={discussions.length}>{canWrite && <button className="icon-button" aria-label="Начать обсуждение проекта" onClick={() => setModal({ type: 'discussion', projectId: id })}><Plus size={18} /></button>}</SectionHeading>{discussions.length ? discussions.map(item => <Link className="related-item" to={`/discussions/${item.id}`} key={item.id}><strong>{item.title}</strong><small>{item.comment_count} ответов</small></Link>) : <p className="quiet-empty">Обсудите гипотезу или поделитесь результатом.</p>}</section>
    </div></div>
  </>
}
