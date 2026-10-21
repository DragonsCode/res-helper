import { Component } from 'react'
import { createBrowserRouter, Navigate, Route, RouterProvider, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context'
import { Layout } from './components/Layout'
import { ModalHost } from './components/ModalHost'
import { Button, EmptyState, Loading } from './components/ui'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { ProjectDetail, Projects } from './pages/Projects'
import { Library } from './pages/Library'
import { DiscussionDetail, Discussions } from './pages/Discussions'
import { Article, Discover, PublicDiscovery } from './pages/Discover'
import { AcceptInvite, Team } from './pages/Team'
import { Settings } from './pages/Settings'

class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="fatal-error"><h1>Не удалось открыть пространство</h1><p>Попробуйте обновить страницу. Ваши сохранённые данные останутся на месте.</p><Button onClick={() => window.location.reload()}>Обновить</Button></div>
    return this.props.children
  }
}

function WorkspaceRoutes() {
  const { booting, session, data, loadError, refresh } = useApp()
  if (booting) return <Loading />
  if (!session) return <Routes><Route path="/discover" element={<PublicDiscovery />} /><Route path="/discover/:id" element={<PublicDiscovery article />} /><Route path="*" element={<Landing />} /></Routes>
  return <>
    <Routes><Route element={<Layout />}>
      <Route path="*" element={loadError ? <EmptyState title="Не удалось загрузить пространство" text={loadError} action="Повторить" onAction={refresh} /> : !data ? <Loading /> : <WorkspacePages />} />
    </Route></Routes>
    {data && <ModalHost />}
  </>
}

function WorkspacePages() {
  return <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/discover" element={<Discover />} />
    <Route path="/discover/:id" element={<Article />} />
    <Route path="/projects" element={<Projects />} />
    <Route path="/projects/:id" element={<ProjectDetail />} />
    <Route path="/library" element={<Library />} />
    <Route path="/discussions" element={<Discussions />} />
    <Route path="/discussions/:id" element={<DiscussionDetail />} />
    <Route path="/team" element={<Team />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/invite" element={<AcceptInvite />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

const router = createBrowserRouter([{ path: '*', element: <AppProvider><WorkspaceRoutes /></AppProvider> }])

export default function App() {
  return <ErrorBoundary><RouterProvider router={router} /></ErrorBoundary>
}
