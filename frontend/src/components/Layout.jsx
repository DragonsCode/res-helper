import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowUpRight, ChevronDown, Menu, Search, Settings } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { audiences } from '../api'
import { useApp } from '../context'
import { Avatar, Logo, Modal } from './ui'

const navigation = [ ['/', 'Рабочий журнал', 'Обзор'], ['/projects', 'Исследования', 'Проекты'], ['/library', 'Источники', 'Библиотека'], ['/discussions', 'Обсуждения', 'Обсуждения'], ['/discover', 'Методы и разборы', 'Открывать новое'], ['/team', 'Команда', 'Команда'] ]
export function Layout() {
  const { user, workspace, session, workspaceId, setWorkspaceId, setModal, toast, modal, hasUnsavedChanges } = useApp()
  const [mobile, setMobile] = useState(false)
  const location = useLocation()
  const main = useRef(null)
  const previousPath = useRef(location.pathname)
  useEffect(() => {
    setMobile(false)
    if (previousPath.current !== location.pathname) { main.current?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }); previousPath.current = location.pathname }
    document.title = `${navigation.find(([to]) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))?.[1] || 'Досье'} — Re:Search`
  }, [location.pathname])
  useEffect(() => {
    const handler = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setModal({ type: 'search' }) } }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [setModal])
  const links = navigation.map(([to, title, label], index) => <NavLink key={to} to={to} end={to === '/'} aria-label={title} onClick={() => setMobile(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-index">0{index + 1}</span>{title}</NavLink>)
  return <div className="app-shell">
    <a className="skip-link" href="#workspace-content">Перейти к содержимому</a>
    <header className="instrument-bar"><Link to="/" aria-label="Re:Search — обзор"><Logo light /></Link><span className="instrument-divider" />
      <div className="workspace-switcher"><label htmlFor="workspace-select">РАБОЧЕЕ ПРОСТРАНСТВО</label><select id="workspace-select" value={workspaceId} onChange={e => { if (!hasUnsavedChanges || window.confirm('В паспорте есть несохранённые изменения. Сменить пространство без сохранения?')) setWorkspaceId(e.target.value) }}>{session.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      <button className="global-search" aria-label="Поиск в пространстве" onClick={() => setModal({ type: 'search' })}><Search size={17} /><span>Поиск в пространстве</span><kbd>⌘ K</kbd></button>
      <div className="instrument-actions"><button className="icon-button" aria-label="Активность команды" onClick={() => setModal({ type: 'activity' })}><Activity size={19} /></button><Link className="icon-button" to="/settings" aria-label="Настройки"><Settings size={19} /></Link><Link to="/settings" aria-label="Мой профиль"><Avatar person={user} /></Link><button className="icon-button mobile-menu" aria-label="Открыть меню" onClick={() => setMobile(true)}><Menu size={22} /></button></div>
    </header>
    <div className="workspace-navigation"><nav aria-label="Разделы пространства">{links}</nav><button className="audience-switch" onClick={() => setModal({ type: 'audience' })} aria-label={audiences[user.audience].short}>{audiences[user.audience].short}<ChevronDown size={14} /></button></div>
    {workspace?.is_demo && <div className="demo-strip"><span className="demo-label">DEMO</span><span>Учебное пространство · записи и участники демонстрационные. Изменения сохраняются в вашей отдельной сессии.</span></div>}
    <main id="workspace-content" ref={main} tabIndex={-1} className="main-content"><Outlet /></main>
    <footer className="app-footer"><span>RE:SEARCH / RESEARCH WORKSPACE</span><span>Вопрос → метод → источники → выводы</span><Link to="/discover">Проверять первоисточники <ArrowUpRight size={14} /></Link></footer>
    {mobile && <Modal title="Навигация пространства" onClose={() => setMobile(false)}><nav className="mobile-navigation" aria-label="Мобильные разделы">{links}<Link className="nav-item" to="/settings" onClick={() => setMobile(false)}>Настройки</Link></nav><button className="audience-switch" onClick={() => { setMobile(false); setModal({ type: 'audience' }) }}>{audiences[user.audience].short}<ChevronDown size={16} /></button></Modal>}
    {toast && !modal && !mobile && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role={toast.error ? 'alert' : 'status'}><span>{toast.error ? 'Ошибка' : 'Сохранено'}</span>{toast.message}</div>}
  </div>
}
