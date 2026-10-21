import { Link } from 'react-router-dom'
import { useApp } from '../context'

const types = [['paper', 'Статьи'], ['dataset', 'Данные'], ['note', 'Заметки'], ['link', 'Ссылки']]
export function EvidenceMap({ projects, resources }) {
  const { setModal } = useApp()
  return <figure className="evidence-map"><figcaption><span className="eyebrow">FIG. 01 / КАРТА МАТЕРИАЛОВ</span><h2>На чём строится работа</h2><p>Число записей, связанных с проектами. Нажмите на количество, чтобы открыть материалы.</p></figcaption>
    {projects.length ? <><p className="matrix-hint">Таблицу можно прокручивать по горизонтали →</p><div className="matrix-scroll" tabIndex={0} role="region" aria-label="Таблица связанных материалов"><table><thead><tr><th scope="col">Исследование</th>{types.map(([key, label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead><tbody>{projects.map((project, index) => <tr key={project.id}><th scope="row"><Link to={`/projects/${project.id}`}><span className="matrix-id">{String(index + 1).padStart(2, '0')}</span>{project.title}</Link></th>{types.map(([kind, label]) => { const matches = resources.filter(r => r.project_id === project.id && r.kind === kind); return <td key={kind}>{matches.length ? <button className={`matrix-cell density-${Math.min(matches.length, 3)}`} aria-label={`${project.title}: ${label} — ${matches.length}`} onClick={() => setModal({ type: 'evidence-list', title: `${project.title} · ${label}`, resources: matches })}>{matches.length}</button> : <span className="matrix-zero" aria-label={`${label}: нет записей`}>—</span>}</td> })}</tr>)}</tbody></table></div></> : <p className="quiet-empty">Карта появится после создания первого проекта.</p>}
    <div className="figure-note"><span>Источник: библиотека пространства</span><span>Количество ≠ качество доказательств</span></div>
  </figure>
}
