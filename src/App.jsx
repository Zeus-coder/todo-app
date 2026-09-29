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

const formatAdded = (id) =>
  new Date(id).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function App() {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  })
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [today] = useState(() => new Date())
  const inputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  const addTodo = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTodos(prev => [...prev, { id: Date.now(), text, completed: false }])
    setInput('')
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
    setTodos(prev => prev.filter(t => !t.completed))
  }

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const remaining = todos.filter(t => !t.completed).length
  const completedCount = todos.length - remaining
  const counts = { all: todos.length, active: remaining, completed: completedCount }
  const progress = todos.length ? Math.round((completedCount / todos.length) * 100) : 0
  const ringLength = 2 * Math.PI * 52

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
              <h1>My tasks</h1>
              <p className="subtitle">{todos.length === 0 ? 'Start adding tasks' : `${remaining} task${remaining !== 1 ? 's' : ''} remaining`}</p>
            </div>
            <p className="today">{today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
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
                placeholder="What needs to be done?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="add-btn" aria-label="Add task">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add task</span>
            </button>
          </form>

          <div className="list-scroll">
            {todos.length > 0 && (
              <ul className="todo-list" aria-label="Task list">
                {filtered.length === 0 && (
                  <li className="empty-state">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <p>No {filter} tasks</p>
                  </li>
                )}
                {filtered.map(todo => (
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
                        <span className="meta-item"><span className="meta-label">Added:</span> {formatAdded(todo.id)}</span>
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
                ))}
              </ul>
            )}

            {todos.length === 0 && (
              <div className="onboarding">
                <div className="onboarding-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <h2>All clear!</h2>
                <p>Add your first task above to get started.</p>
              </div>
            )}
          </div>
        </main>

        {/* ── Detail panel ── */}
        <aside className="panel" aria-label="Progress overview">
          <div className="panel-card">
            <h2>Progress</h2>
            <p className="panel-desc">A quick look at how your day is going. Finish tasks to fill the ring.</p>

            <div className="ring" role="img" aria-label={`${progress}% of tasks completed`}>
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
                <span>done</span>
              </div>
            </div>

            <dl className="stats">
              <div><dt>Total:</dt><dd>{todos.length}</dd></div>
              <div><dt>Active:</dt><dd>{remaining}</dd></div>
              <div><dt>Completed:</dt><dd>{completedCount}</dd></div>
              <div><dt>Date:</dt><dd>{today.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
            </dl>

            <button className="clear-btn" onClick={clearCompleted} disabled={completedCount === 0}>
              {completedCount > 0 ? `Clear ${completedCount} completed` : 'Nothing to clear'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
