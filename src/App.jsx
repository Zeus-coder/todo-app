import { useState, useEffect, useRef } from 'react'
import './App.css'

const STORAGE_KEY = 'todo-app-items'

const FILTERS = [
  {
    key: 'all',
    label: 'All tasks',
    icon: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </>
    ),
  },
  {
    key: 'active',
    label: 'Active',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </>
    ),
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
]

/* ── Date helpers (local time, keys are YYYY-MM-DD) ── */
const pad = (n) => String(n).padStart(2, '0')
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7))
const formatDay = (d, opts) => d.toLocaleDateString(undefined, opts)
const formatTime = (time) => {
  const [h, m] = time.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`

const ChevronIcon = ({ dir }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
  </svg>
)

function App() {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    // Tasks saved before scheduling existed land on the day they were created
    return saved
      ? JSON.parse(saved).map(t => ({ date: toKey(new Date(t.id)), time: '', ...t }))
      : []
  })
  const [input, setInput] = useState('')
  const [time, setTime] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [today] = useState(() => new Date())
  const todayKey = toKey(today)
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [calMonth, setCalMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const inputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  const selectDate = (key) => {
    const d = fromKey(key)
    setSelectedDate(key)
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }

  const shiftMonth = (n) => {
    setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + n, 1))
  }

  const addTodo = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTodos(prev => [...prev, { id: Date.now(), text, completed: false, date: selectedDate, time }])
    setInput('')
    setTime('')
    inputRef.current?.focus()
  }

  const toggleTodo = (id) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const startEditing = (todo) => {
    setEditingId(todo.id)
    setEditText(todo.text)
  }

  const saveEdit = (id) => {
    const text = editText.trim()
    if (!text) return deleteTodo(id)
    setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t))
    setEditingId(null)
    setEditText('')
  }

  const clearCompleted = () => {
    setTodos(prev => prev.filter(t => !(t.completed && t.date === selectedDate)))
  }

  /* ── Derived: selected day ── */
  const selected = fromKey(selectedDate)
  const dayTodos = todos.filter(t => t.date === selectedDate)
  const remaining = dayTodos.filter(t => !t.completed).length
  const completedCount = dayTodos.length - remaining
  const counts = { all: dayTodos.length, active: remaining, completed: completedCount }
  const progress = dayTodos.length ? Math.round((completedCount / dayTodos.length) * 100) : 0
  const ringLength = 2 * Math.PI * 52

  const filtered = dayTodos
    .filter(t => {
      if (filter === 'active') return !t.completed
      if (filter === 'completed') return t.completed
      return true
    })
    .sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id)

  // Group into time slots; untimed tasks sort first as "Anytime"
  const slots = []
  for (const t of filtered) {
    const last = slots[slots.length - 1]
    if (last && last.time === t.time) last.items.push(t)
    else slots.push({ time: t.time, label: t.time ? formatTime(t.time) : 'Anytime', items: [t] })
  }

  /* ── Derived: calendar markers ── */
  const byDate = {}
  for (const t of todos) {
    const entry = (byDate[t.date] ??= { total: 0, active: 0 })
    entry.total++
    if (!t.completed) entry.active++
  }

  const dayLabel = (d) => {
    const key = toKey(d)
    const info = byDate[key]
    return `${formatDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}${info ? `, ${plural(info.total, 'task')}` : ''}`
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selected), i))

  const monthLead = (calMonth.getDay() + 6) % 7
  const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate()
  const calStart = addDays(calMonth, -monthLead)
  const calDays = Array.from({ length: Math.ceil((monthLead + daysInMonth) / 7) * 7 }, (_, i) => addDays(calStart, i))

  const selectedLabel = selectedDate === todayKey
    ? 'Today'
    : selectedDate === toKey(addDays(today, 1))
      ? 'Tomorrow'
      : formatDay(selected, { weekday: 'long' })

  const renderTodo = (todo) => (
    <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <label className="checkbox-wrapper" aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggleTodo(todo.id)}
          className="todo-checkbox"
        />
        <span className="checkmark" aria-hidden="true">
          {todo.completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </label>

      <div className="todo-body">
        {editingId === todo.id ? (
          <>
            <label htmlFor={`edit-${todo.id}`} className="sr-only">Edit task</label>
            <input
              id={`edit-${todo.id}`}
              type="text"
              className="edit-input"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => saveEdit(todo.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(todo.id)
                if (e.key === 'Escape') setEditingId(null)
              }}
              autoFocus
            />
          </>
        ) : (
          <span
            className="todo-text"
            onDoubleClick={() => startEditing(todo)}
            title="Double-click to edit"
          >
            {todo.text}
          </span>
        )}
        <p className="todo-meta">
          <span className="meta-item"><span className="meta-label">Time:</span> {todo.time ? formatTime(todo.time) : 'Anytime'}</span>
          <span className="meta-sep" aria-hidden="true">·</span>
          <span className="meta-item"><span className="meta-label">Status:</span> {todo.completed ? 'Done' : 'To do'}</span>
        </p>
      </div>

      <div className="item-actions">
        <button
          className="edit-btn"
          onClick={() => startEditing(todo)}
          aria-label={`Edit "${todo.text}"`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="delete-btn"
          onClick={() => deleteTodo(todo.id)}
          aria-label={`Delete "${todo.text}"`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </li>
  )

  return (
    <div className="backdrop">
      <div className="shell">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>Todo at home</span>
          </div>

          <nav className="side-nav" aria-label="Filter tasks">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`nav-btn ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {f.icon}
                </svg>
                <span className="nav-label">{f.label}</span>
                <span className="nav-count">{counts[f.key]}</span>
              </button>
            ))}
          </nav>

          <svg className="sidebar-art" viewBox="0 0 140 120" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M24 74c-10-30 26-60 60-52s46 40 28 62-62 26-82 6c-12-14-2-40 24-48" />
            <path d="M34 30c10-8 30-14 48-8" />
            <rect x="48" y="36" width="44" height="54" rx="6" className="art-fill" />
            <rect x="60" y="30" width="20" height="10" rx="3" className="art-paper" />
            <path d="M56 54l4 4 8-8" />
            <line x1="72" y1="54" x2="84" y2="54" />
            <path d="M56 72l4 4 8-8" />
            <line x1="72" y1="72" x2="84" y2="72" />
            <line x1="14" y1="104" x2="126" y2="104" />
            <circle cx="112" cy="30" r="1.6" />
            <circle cx="22" cy="46" r="1.2" />
          </svg>
        </aside>

        {/* ── Main ── */}
        <main className="main">
          <header className="main-header">
            <div>
              <h1>{selectedLabel}</h1>
              <p className="subtitle">
                {dayTodos.length === 0 ? 'Nothing scheduled yet' : `${plural(remaining, 'task')} remaining`}
              </p>
            </div>
            <div className="header-date">
              <span className="today">{formatDay(selected, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              {selectedDate !== todayKey && (
                <button className="today-btn" onClick={() => selectDate(todayKey)}>Back to today</button>
              )}
            </div>
          </header>

          <form className="todo-form" onSubmit={addTodo}>
            <label htmlFor="todo-input" className="sr-only">Add a new task</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <input
                id="todo-input"
                ref={inputRef}
                type="text"
                className="todo-input"
                placeholder={`Add a task for ${formatDay(selected, { weekday: 'short', day: 'numeric', month: 'short' })}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
            </div>
            <label htmlFor="todo-time" className="sr-only">Time (optional)</label>
            <input
              id="todo-time"
              type="time"
              className="time-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <button type="submit" className="add-btn" aria-label="Add task">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add</span>
            </button>
          </form>

          <div className="planner">
            {/* ── Week strip ── */}
            <div className="week-strip" role="group" aria-label="Choose a day">
              <div className="week-nav">
                <button className="week-arrow" onClick={() => selectDate(toKey(addDays(selected, -7)))} aria-label="Previous week">
                  <ChevronIcon dir="left" />
                </button>
                <span>{formatDay(selected, { month: 'short' })}</span>
                <button className="week-arrow" onClick={() => selectDate(toKey(addDays(selected, 7)))} aria-label="Next week">
                  <ChevronIcon dir="right" />
                </button>
              </div>
              <div className="week-days">
                {weekDays.map(d => {
                  const key = toKey(d)
                  const info = byDate[key]
                  return (
                    <button
                      key={key}
                      className={`day-btn ${key === selectedDate ? 'selected' : ''} ${key === todayKey ? 'today' : ''}`}
                      onClick={() => selectDate(key)}
                      aria-pressed={key === selectedDate}
                      aria-current={key === todayKey ? 'date' : undefined}
                      aria-label={dayLabel(d)}
                    >
                      <span className="day-num">{d.getDate()}</span>
                      <span className="day-name">{formatDay(d, { weekday: 'short' })}</span>
                      {info && <span className={`day-dot ${info.active ? '' : 'done'}`} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Tasks by time slot ── */}
            <div className="list-scroll">
              {todos.length === 0 ? (
                <div className="onboarding">
                  <div className="onboarding-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </div>
                  <h2>All clear!</h2>
                  <p>Pick a day and add your first task above.</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="empty-state">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <p>{dayTodos.length === 0 ? 'Nothing scheduled for this day' : `No ${filter} tasks on this day`}</p>
                </div>
              ) : (
                <ul className="todo-list" aria-label={`Tasks for ${formatDay(selected, { weekday: 'long', day: 'numeric', month: 'long' })}`}>
                  {slots.map(slot => (
                    <li key={slot.time || 'anytime'} className="slot">
                      <span className="slot-label">{slot.label}</span>
                      <ul className="slot-items">
                        {slot.items.map(renderTodo)}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>

        {/* ── Calendar + progress panel ── */}
        <aside className="panel" aria-label="Calendar and progress">
          <div className="panel-card">
            <div className="calendar">
              <div className="cal-head">
                <h2>{formatDay(calMonth, { month: 'long', year: 'numeric' })}</h2>
                <div className="cal-nav">
                  <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                    <ChevronIcon dir="left" />
                  </button>
                  <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
                    <ChevronIcon dir="right" />
                  </button>
                </div>
              </div>

              <div className="cal-grid">
                {calDays.slice(0, 7).map(d => (
                  <span key={`wd-${d.getDay()}`} className="cal-weekday" aria-hidden="true">
                    {formatDay(d, { weekday: 'narrow' })}
                  </span>
                ))}
                {calDays.map(d => {
                  const key = toKey(d)
                  const info = byDate[key]
                  const outside = d.getMonth() !== calMonth.getMonth()
                  return (
                    <button
                      key={key}
                      className={`cal-day ${outside ? 'outside' : ''} ${key === selectedDate ? 'selected' : ''} ${key === todayKey ? 'today' : ''}`}
                      onClick={() => selectDate(key)}
                      aria-pressed={key === selectedDate}
                      aria-current={key === todayKey ? 'date' : undefined}
                      aria-label={dayLabel(d)}
                    >
                      {d.getDate()}
                      {info && <span className={`cal-dot ${info.active ? '' : 'done'}`} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="panel-side">
              <h3>Day progress</h3>
              <div className="day-progress">
                <div className="ring" role="img" aria-label={`${progress}% of this day's tasks completed`}>
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle className="ring-track" cx="60" cy="60" r="52" />
                    <circle
                      className="ring-value"
                      cx="60"
                      cy="60"
                      r="52"
                      strokeDasharray={ringLength}
                      strokeDashoffset={ringLength * (1 - progress / 100)}
                    />
                  </svg>
                  <div className="ring-label" aria-hidden="true">
                    <strong>{progress}%</strong>
                  </div>
                </div>

                <dl className="stats">
                  <div><dt>Total:</dt><dd>{dayTodos.length}</dd></div>
                  <div><dt>Active:</dt><dd>{remaining}</dd></div>
                  <div><dt>Completed:</dt><dd>{completedCount}</dd></div>
                </dl>
              </div>

              <button className="clear-btn" onClick={clearCompleted} disabled={completedCount === 0}>
                {completedCount > 0 ? `Clear ${completedCount} completed` : 'Nothing to clear'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
