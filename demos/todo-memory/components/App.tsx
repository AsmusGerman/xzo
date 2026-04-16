import { define, css } from 'xzo'
import { signal, computed } from 'xzo'

define('todo-app', (ctx) => {
  type Todo = { id: number; text: string; done: boolean }

  const items = signal<Todo[]>([
    { id: 1, text: 'Buy groceries', done: false },
    { id: 2, text: 'Walk the dog', done: true },
    { id: 3, text: 'Read a book', done: false },
  ])
  let nextId = 4

  const pending = computed(() => items.value.filter((t) => !t.done).length)

  function addTodo(text: string): void {
    if (!text.trim()) return
    items.value = [...items.value, { id: nextId++, text: text.trim(), done: false }]
  }

  function toggleTodo(id: number): void {
    items.value = items.value.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    )
  }

  function removeTodo(id: number): void {
    items.value = items.value.filter((t) => t.id !== id)
  }

  function handleAdd(e: Event): void {
    const form = e.currentTarget as HTMLFormElement
    const input = form.elements.namedItem('text') as HTMLInputElement
    addTodo(input.value)
    input.value = ''
    e.preventDefault()
  }

  ctx.onMount(() => {
    console.log('[todo-app] mounted')
  })

  ctx.onUnmount(() => {
    console.log('[todo-app] unmounted — check Memory tab for leaks')
  })

  return {
    template: (
      <div class="todo-app">
        <h3>Todos <span class="badge">{pending} pending</span></h3>
        <form onsubmit={handleAdd} class="add-form">
          <input name="text" type="text" placeholder="New todo…" autocomplete="off" />
          <button type="submit">Add</button>
        </form>
        <ul class="list">
          {() => items.value.map((todo) => (
            <li class={todo.done ? 'done' : ''}>
              <input
                type="checkbox"
                checked={todo.done}
                onchange={() => toggleTodo(todo.id)}
              />
              <span>{todo.text}</span>
              <button class="remove" onclick={() => removeTodo(todo.id)}>✕</button>
            </li>
          ))}
        </ul>
        <p class="summary">
          {() => `${items.value.length} item(s) total, ${pending} pending`}
        </p>
      </div>
    ),

    styles: css`
      .todo-app {
        font-family: system-ui, sans-serif;
      }
      h3 {
        margin: 0 0 12px;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .badge {
        font-size: 12px;
        background: #4f46e5;
        color: white;
        border-radius: 12px;
        padding: 2px 8px;
      }
      .add-form {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      .add-form input {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
      }
      .add-form button {
        padding: 6px 14px;
        background: #4f46e5;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }
      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 14px;
      }
      li span {
        flex: 1;
      }
      li.done span {
        text-decoration: line-through;
        color: #9ca3af;
      }
      .remove {
        background: none;
        border: none;
        cursor: pointer;
        color: #9ca3af;
        font-size: 12px;
        padding: 2px 4px;
      }
      .remove:hover {
        color: #ef4444;
      }
      .summary {
        font-size: 12px;
        color: #6b7280;
        margin: 10px 0 0;
      }
    `,
  }
})
