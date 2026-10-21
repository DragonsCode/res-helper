import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpen, Check, Compass, FlaskConical, GraduationCap, Sparkles } from 'lucide-react'
import { api, audiences } from '../api'
import { useApp } from '../context'
import { Button, Field, Logo, Modal } from '../components/ui'

export function Landing() {
  const { setAuthenticated, config, loadError } = useApp()
  const [params] = useSearchParams()
  const [auth, setAuth] = useState(params.has('signup') ? 'register' : null)
  const [role, setRole] = useState('researcher')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function demo() {
    setBusy(true); setError('')
    try { setAuthenticated(await api('/auth/demo', { method: 'POST', body: { audience: role } })) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError('')
    const values = Object.fromEntries(new FormData(event.currentTarget))
    if (auth === 'register') values.audience = role
    try { setAuthenticated(await api(`/auth/${auth}`, { method: 'POST', body: values })) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <div className="landing">
    <header className="landing-header"><Logo /><nav><a href="#paths">Для кого</a><Link to="/discover">Открывать науку</Link><button onClick={() => { setAuth('login'); setError('') }}>Войти</button><Button onClick={() => { setAuth('register'); setError('') }}>Начать бесплатно<ArrowUpRight size={16} /></Button></nav></header>
    <main>
      <section className="landing-hero" id="idea"><div className="landing-copy"><span className="eyebrow">RESEARCH, WITH A RECORD.</span><h1>За каждым выводом<br /><em>должен быть источник.</em></h1><p>Рабочее пространство для научного мышления. Формулируйте вопросы, документируйте метод и сохраняйте контекст исследования.</p>
        <div className="landing-actions"><Button onClick={() => { setAuth('register'); setError('') }} icon={ArrowRight}>Найти свой путь</Button>{config.demo_enabled && <Button variant="secondary" onClick={demo} busy={busy}>Открыть демо <ArrowUpRight size={16} /></Button>}</div><Link to="/discover" className="public-reading-link">Почитать без регистрации <ArrowRight size={14} /></Link>
        <div className="landing-benefits"><span><Check size={14} />Открытые разборы</span><span><Check size={14} />Приватные пространства</span></div>
        {(error || loadError) && <p className="form-error" role="alert">{error || loadError}</p>}
      </div><div className="landing-document"><div className="document-stamp">RE:SEARCH / ПРИНЦИП РАБОТЫ<span>01—04</span></div><h2>От вопроса<br />к проверяемой работе.</h2><ol><li><span>01</span><div><strong>Сформулировать вопрос</strong><p>Отделить гипотезу от наблюдения.</p></div></li><li><span>02</span><div><strong>Зафиксировать метод</strong><p>Описать процедуру и её ограничения.</p></div></li><li><span>03</span><div><strong>Собрать основания</strong><p>Связать первоисточники и данные.</p></div></li><li><span>04</span><div><strong>Обсудить выводы</strong><p>Сохранить контекст и неопределённость.</p></div></li></ol><p className="document-footnote">Научная точность начинается с прозрачности процесса.</p></div></section>
      <section id="paths" className="landing-paths"><div className="landing-section-heading"><span className="eyebrow">РАЗНЫЕ ПУТИ. ОДНО ЛЮБОПЫТСТВО.</span><h2>Наука открыта для каждого.</h2><p>Выберите, с чего начать. Ваш путь всегда можно изменить.</p></div>
        <div className="path-cards">{[
          { key: 'enthusiast', icon: Compass, number: '01', title: 'Открывать новое', text: 'Для интересующихся и журналистов', details: 'Понятные разборы, проверка научных новостей и ссылки на первоисточники.', color: 'sage' },
          { key: 'student', icon: GraduationCap, number: '02', title: 'Учиться и преподавать', text: 'Для студентов и преподавателей', details: 'Учебные маршруты, первые исследования и проекты, которые объединяют группу.', color: 'blue' },
          { key: 'researcher', icon: FlaskConical, number: '03', title: 'Двигать науку вперёд', text: 'Для исследователей и команд', details: 'Проекты, задачи, общая библиотека и обсуждение результатов в одном месте.', color: 'violet' },
        ].map(path => <button aria-pressed={role === path.key} className={`path-card ${role === path.key ? 'path-selected' : ''}`} key={path.key} onClick={() => setRole(path.key)}>
          <div className="path-card-top"><span className={`path-icon color-${path.color}`}><path.icon size={23} /></span><span>{path.number}</span></div><h3>{path.title}</h3><strong>{path.text}</strong><p>{path.details}</p><span className="path-action">{role === path.key ? <><Check size={16} />Выбрано для старта</> : <>Выбрать путь<ArrowRight size={16} /></>}</span>
        </button>)}</div>
      </section>
      <section className="landing-bottom"><div><span>Сначала вопрос. Затем — основания.</span></div><Button variant="secondary" onClick={() => setAuth('register')}>Задать свой <ArrowUpRight size={16} /></Button></section>
    </main><footer className="landing-footer"><Logo /><span>Пространство для любопытных умов.</span><span>Re:Search · 2026</span></footer>
    {auth && <Modal title={auth === 'register' ? 'Начните свой путь в науке' : 'С возвращением'} subtitle={auth === 'register' ? 'Создадим ваше личное пространство. Команду можно пригласить позже.' : 'Ваши материалы и проекты уже ждут.'} onClose={() => { setAuth(null); setError('') }}>
      <form onSubmit={submit} className="stack-form">
        {auth === 'register' && <Field label="Как вас зовут"><input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Имя и фамилия" /></Field>}
        <Field label={auth === 'register' ? 'Email' : 'Email или прежний логин'}><input type={auth === 'register' ? 'email' : 'text'} name={auth === 'register' ? 'email' : 'identifier'} autoComplete="username" required placeholder="you@example.com" /></Field>
        <Field label="Пароль" hint={auth === 'register' ? 'Не менее 10 символов' : ''}><input type="password" name="password" autoComplete={auth === 'register' ? 'new-password' : 'current-password'} required minLength={auth === 'register' ? 10 : 1} maxLength={128} /></Field>
        {auth === 'register' && <Field label="Ваш путь"><select value={role} onChange={e => setRole(e.target.value)}>{Object.entries(audiences).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}</select></Field>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" busy={busy}>{auth === 'register' ? 'Создать аккаунт' : 'Войти'}<ArrowRight size={17} /></Button>
        <button type="button" className="text-link centered" onClick={() => { setAuth(auth === 'login' ? 'register' : 'login'); setError('') }}>{auth === 'login' ? 'Ещё нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}</button>
      </form>
    </Modal>}
  </div>
}
