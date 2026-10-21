export async function api(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'ReSearch',
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map(item => `${item.loc.at(-1)}: ${item.msg}`).join('; ')
      : data.detail
    const error = new Error(detail || 'Не удалось выполнить запрос. Попробуйте ещё раз.')
    error.status = response.status
    throw error
  }
  return data
}

export const audiences = {
  enthusiast: { label: 'Интересуюсь наукой', short: 'Исследую мир', level: 'explore', title: 'Любопытство — начало открытия.', description: 'Понятные разборы, надёжные источники и новые вопросы.' },
  journalist: { label: 'Журналист', short: 'Научная журналистика', level: 'explore', title: 'У каждой истории есть источник.', description: 'Разбирайтесь в исследованиях и проверяйте научные утверждения.' },
  student: { label: 'Студент', short: 'Учусь исследовать', level: 'learn', title: 'От первого вопроса к открытию.', description: 'Осваивайте методы и превращайте знания в свои проекты.' },
  teacher: { label: 'Преподаватель', short: 'Учу исследовать', level: 'learn', title: 'Зажигайте любопытство вместе.', description: 'Учебные маршруты и командные проекты для ваших студентов.' },
  researcher: { label: 'Исследователь', short: 'Провожу исследования', level: 'research', title: 'Большие идеи рождаются вместе.', description: 'Всё для вашего следующего открытия — в одном пространстве.' },
}

export const dateLabel = value => {
  if (!value) return 'Без срока'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Сегодня'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return 'Завтра'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function relativeTime(value) {
  const milliseconds = Date.now() - new Date(value.endsWith('Z') || /\+\d\d:\d\d$/.test(value) ? value : `${value}Z`).getTime()
  const hours = Math.max(0, Math.floor(milliseconds / 3600000))
  if (hours === 0) return 'Недавно'
  if (hours < 24) return `${hours} ч назад`
  return `${Math.floor(hours / 24)} дн назад`
}
