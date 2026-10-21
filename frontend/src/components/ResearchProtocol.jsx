import { useEffect, useState } from 'react'
import { Download, Pencil, Save } from 'lucide-react'
import { useBlocker } from 'react-router-dom'
import { api } from '../api'
import { useApp } from '../context'
import { Button, Field, Modal } from './ui'

const fields = [
  ['question', 'Исследовательский вопрос', 'Что именно вы проверяете? Укажите объект, условия и проверяемое предположение.', 5000],
  ['method', 'Метод и протокол', 'Как собрать и обработать данные? Опишите выборку, процедуру, инструменты и критерии анализа.', 10000],
  ['limitations', 'Ограничения', 'Что этот метод не позволяет заключить? Отметьте смещения, неопределённость и недостающие данные.', 10000],
  ['conclusion', 'Предварительные выводы', 'Отделяйте наблюдения от интерпретаций. Ссылайтесь на материалы проекта.', 10000],
]
export function ResearchProtocol({ project }) {
  const { base, refresh, notify, canWrite, isOwner, user, data, setHasUnsavedChanges } = useApp()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(project)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => { setHasUnsavedChanges(dirty); return () => setHasUnsavedChanges(false) }, [dirty, setHasUnsavedChanges])
  useEffect(() => { setSaved(project) }, [project])
  useEffect(() => {
    const guard = e => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await api(`${base}/projects/${project.id}/protocol`, { method: 'PATCH', body: Object.fromEntries(new FormData(event.currentTarget)) }); setSaved(result); setEditing(false); setDirty(false); refresh(); notify('Паспорт исследования сохранён') }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  function download() {
    const sources = data.resources.filter(r => r.project_id === project.id)
    const text = `# ${project.title}\n\nСтатус: рабочий документ. Выводы предварительные.\n\n${fields.map(([key,label]) => `## ${label}\n\n${saved[key] || 'Не заполнено'}`).join('\n\n')}\n\n## Материалы\n\n${sources.map(r => `- ${r.title}${r.authors ? ` — ${r.authors}` : ''}${r.url ? ` (${r.url})` : ''}`).join('\n') || 'Нет связанных материалов'}\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `research-protocol-${project.id.slice(0,8)}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
    notify('Паспорт экспортирован в Markdown')
  }
  return <>{blocker.state === 'blocked' && <Modal title="Есть несохранённые изменения" subtitle="Сохраните паспорт перед переходом или продолжите без сохранения." onClose={() => blocker.reset()}><div className="form-footer"><Button variant="secondary" onClick={() => blocker.proceed()}>Уйти без сохранения</Button><Button onClick={() => blocker.reset()}>Вернуться к паспорту</Button></div></Modal>}<section id="protocol" className="protocol-document"><div className="document-heading"><div><span className="eyebrow">01 / ПАСПОРТ ИССЛЕДОВАНИЯ</span><h2>Вопрос. Метод. Ограничения.</h2></div><div className="document-actions"><Button variant="secondary" icon={Download} onClick={download} disabled={editing}>.md</Button>{!editing && canWrite && (isOwner || project.owner.id === user.id) && <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Заполнить паспорт</Button>}</div></div>
    <p className="document-notice">Рабочий документ команды · предварительные выводы, без независимой проверки.</p>
    {editing ? <form onSubmit={save} onChange={() => setDirty(true)} className="protocol-form"><p className="form-hint" role="status">Сохранение вручную. {dirty ? 'Есть несохранённые изменения.' : 'Дополните нужные разделы.'}</p><fieldset className="editor-fields" disabled={busy}>{fields.map(([key,label,hint,max]) => <Field key={key} label={label} hint={hint}><textarea name={key} defaultValue={saved[key]} rows={key === 'method' ? 6 : 4} maxLength={max} /></Field>)}</fieldset>{error && <p className="form-error" role="alert">{error} Введённый текст сохранён в форме. Попробуйте ещё раз.</p>}<div className="form-footer"><Button variant="secondary" type="button" disabled={busy} onClick={() => { setEditing(false); setDirty(false); setError('') }}>Отменить изменения</Button><Button icon={Save} busy={busy} type="submit">Сохранить паспорт</Button></div></form> : <div className="protocol-sections">{fields.map(([key,label], index) => <section key={key}><span className="document-section-number">{String(index + 1).padStart(2,'0')}</span><div><h3>{label}</h3><p className={`prose ${saved[key] ? '' : 'unfilled'}`}>{saved[key] || 'Не заполнено'}</p></div></section>)}</div>}
  </section></>
}
