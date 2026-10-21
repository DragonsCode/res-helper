import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)
  const [booting, setBooting] = useState(true)
  const [config, setConfig] = useState({ demo_enabled: false })
  const [workspaceId, setWorkspaceId] = useState(localStorage.getItem('research-workspace') || '')
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [revision, setRevision] = useState(0)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const notify = useCallback((message, error = false) => setToast({ message, error, id: Date.now() }), [])
  const refresh = useCallback(() => setRevision(value => value + 1), [])
  const setAuthenticated = useCallback(value => {
    setSession(value)
    setWorkspaceId(previous => value.workspaces.some(w => w.id === previous) ? previous : value.workspaces[0]?.id || '')
  }, [])

  useEffect(() => {
    let live = true
    Promise.all([api('/auth/me').catch(e => { if (e.status === 401) return null; throw e }), api('/config')])
      .then(([value, configValue]) => {
        if (!live) return
        if (value) setAuthenticated(value)
        setConfig(configValue)
      })
      .catch(() => live && setLoadError('Сервер недоступен. Проверьте соединение и обновите страницу.'))
      .finally(() => live && setBooting(false))
    return () => { live = false }
  }, [setAuthenticated])

  useEffect(() => {
    if (!session || !workspaceId) { setData(null); return }
    const controller = new AbortController()
    setLoadError('')
    localStorage.setItem('research-workspace', workspaceId)
    const base = `/workspaces/${workspaceId}`
    const keys = ['projects', 'tasks', 'resources', 'discussions', 'members', 'overview', 'activity', 'catalog', 'read']
    const paths = ['projects', 'tasks', 'resources', 'discussions', 'members', 'overview', 'activity']
      .map(path => `${base}/${path}`).concat(['/catalog', '/reading-progress'])
    Promise.all(paths.map(path => api(path, { signal: controller.signal })))
      .then(values => setData({ ...Object.fromEntries(keys.map((key, i) => [key, values[i]])), workspaceId }))
      .catch(error => {
        if (error.name === 'AbortError') return
        if (error.status === 401) { setSession(null); notify('Сессия завершена. Войдите снова.'); return }
        setLoadError(error.message)
      })
    return () => controller.abort()
  }, [session?.user.id, workspaceId, revision, notify])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(timeout)
  }, [toast])

  const upsertProject = project => setData(previous => previous ? { ...previous, projects: [project, ...previous.projects.filter(p => p.id !== project.id)] } : previous)

  const workspace = session?.workspaces.find(w => w.id === workspaceId)
  const updateUser = user => setSession(previous => ({ ...previous, user }))
  const updateWorkspaces = workspaces => setSession(previous => ({ ...previous, workspaces }))
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' })
    setSession(null)
    setData(null)
    setModal(null)
    localStorage.removeItem('research-workspace')
  }

  return <AppContext.Provider value={{
    session, user: session?.user, booting, config, workspaceId, workspace,
    setWorkspaceId, data: data?.workspaceId === workspaceId ? data : null, loadError,
    refresh, upsertProject, hasUnsavedChanges, setHasUnsavedChanges, notify, toast, modal, setModal, setAuthenticated, updateUser, updateWorkspaces, logout,
    canWrite: Boolean(workspace && workspace.role !== 'viewer'), isOwner: workspace?.role === 'owner',
    base: `/workspaces/${workspaceId}`,
  }}>{children}</AppContext.Provider>
}
