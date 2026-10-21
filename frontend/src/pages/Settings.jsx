import { useState } from 'react'
import { LogOut, Save } from 'lucide-react'
import { api, audiences } from '../api'
import { useApp } from '../context'
import { Avatar, Button, Field, PageTitle } from '../components/ui'

export function Settings() {
  const { user, workspace, session, updateUser, updateWorkspaces, base, notify, logout, isOwner, setModal } = useApp()
  const [busy, setBusy] = useState(null)
  async function saveProfile(event) {
    event.preventDefault(); setBusy('profile')
    try { updateUser(await api('/auth/me', { method: 'PATCH', body: Object.fromEntries(new FormData(event.currentTarget)) })); notify('Профиль обновлён') }
    catch (e) { notify(e.message, true) }
    finally { setBusy(null) }
  }
  async function saveWorkspace(event) {
    event.preventDefault(); setBusy('workspace')
    try {
      const result = await api(base, { method: 'PATCH', body: Object.fromEntries(new FormData(event.currentTarget)) })
      updateWorkspaces(session.workspaces.map(w => w.id === workspace.id ? { ...w, ...result } : w)); notify('Пространство обновлено')
    } catch (e) { notify(e.message, true) }
    finally { setBusy(null) }
  }
  async function signout() {
    setBusy('logout')
    try { await logout() } catch (e) { notify(e.message, true); setBusy(null) }
  }
  return <>
    <PageTitle eyebrow="ВАШЕ ПРОСТРАНСТВО — ВАШИ ПРАВИЛА" title="Настройки" description="Расскажите о себе и выберите свой путь в науке." />
    <div className="settings-grid"><section className="panel settings-panel"><div className="settings-profile"><Avatar person={user} size="lg" /><div><h2>Ваш профиль</h2><p>{user.is_demo ? 'Демонстрационный аккаунт' : user.email}</p></div></div><form className="stack-form" onSubmit={saveProfile}>
      <Field label="Имя"><input name="name" defaultValue={user.name} required minLength={2} maxLength={100} /></Field>
      <Field label="Направление или интересы"><input name="discipline" defaultValue={user.discipline} maxLength={100} placeholder="Например, нейронаука и машинное обучение" /></Field>
      <Field label="О себе"><textarea name="bio" defaultValue={user.bio} maxLength={1500} rows={3} placeholder="Что вам интересно исследовать?" /></Field>
      <Field label="Ваш путь" hint="Влияет на рекомендации и акценты интерфейса. Не ограничивает доступ к знаниям."><select name="audience" defaultValue={user.audience}>{Object.entries(audiences).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}</select></Field>
      <Button type="submit" busy={busy === 'profile'} icon={Save}>Сохранить профиль</Button>
    </form></section><div className="stack-panels"><section className="panel settings-panel"><h2>Рабочее пространство</h2><p className="muted">Общая среда для вашей команды или учебной группы.</p><form className="stack-form" onSubmit={saveWorkspace} key={workspace.id}><Field label="Название"><input name="name" defaultValue={workspace.name} disabled={!isOwner} required minLength={2} maxLength={100} /></Field><Field label="Описание"><textarea name="description" defaultValue={workspace.description} disabled={!isOwner} rows={3} maxLength={1000} /></Field>{isOwner && <Button variant="secondary" type="submit" busy={busy === 'workspace'} icon={Save}>Сохранить пространство</Button>}</form></section><section className="panel settings-panel"><h2>Планы и сессия</h2><Button variant="secondary" onClick={() => setModal({ type: 'pricing' })}>Узнать о планах</Button><p className="muted">{user.is_demo ? 'Демо-данные отделены от других пользователей. Для постоянной работы создайте собственный аккаунт.' : 'Выход завершит текущую сессию на этом устройстве.'}</p><Button variant="secondary" icon={LogOut} busy={busy === 'logout'} onClick={signout}>Выйти из аккаунта</Button></section></div></div>
  </>
}
