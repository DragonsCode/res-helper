import { useState } from 'react'
import { ArrowRight, FlaskConical, Link as LinkIcon, Mail, Plus, Users } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useApp } from '../context'
import { Avatar, Button, EmptyState, PageTitle } from '../components/ui'

export const roleLabels = { owner: 'Владелец', member: 'Участник', viewer: 'Наблюдатель' }

export function Team() {
  const { data, user, setModal, isOwner, workspace } = useApp()
  return <>
    <PageTitle eyebrow="WORKSPACE / ДОСТУП" title="Команда пространства" description="Участники и права доступа. Ответственный за исследование указан в его досье.">{isOwner && <Button icon={Plus} onClick={() => setModal({ type: 'invite' })}>Пригласить участника</Button>}</PageTitle>
    {workspace.is_demo && <div className="info-banner"><FlaskConical size={18} /><p>Это демонстрационная команда. Создайте свой аккаунт, чтобы пригласить настоящих коллег или учебную группу.</p></div>}
    <div className="team-grid">{data.members.map(member => <article className="member-card" key={member.id}><div className="member-top"><Avatar person={member} size="lg" /><span className={`member-role role-${member.role}`}>{roleLabels[member.role]}</span></div><h2>{member.name}{member.id === user.id && <small>это вы</small>}</h2><p>{member.discipline || 'Направление ещё не указано'}</p><div className="member-bio">{member.bio || 'Участник вашего исследовательского пространства.'}</div><div className="member-footer"><Users size={15} />В команде {new Date(member.joined_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</div></article>)}</div>
    <div className="team-note"><LinkIcon size={20} /><div><h3>Приглашение без лишних барьеров</h3><p>Владелец создаёт персональную ссылку для email участника. Она действует 7 дней. Участник принимает её после входа в свой аккаунт.</p></div></div>
  </>
}

export function AcceptInvite() {
  const [params] = useSearchParams()
  const { updateWorkspaces, setWorkspaceId, notify } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function accept() {
    setBusy(true)
    try {
      const result = await api('/invitations/accept', { method: 'POST', body: { token: params.get('token') || '' } })
      updateWorkspaces(result.workspaces); setWorkspaceId(result.workspace_id); notify('Вы присоединились к команде'); navigate('/team')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <div className="invite-accept"><Mail size={34} /><h1>Вас пригласили исследовать вместе</h1><p>Приглашение доступно только аккаунту с email, указанным отправителем.</p>{error && <p className="form-error" role="alert">{error}</p>}<Button busy={busy} onClick={accept}>Принять приглашение<ArrowRight size={17} /></Button></div>
}
