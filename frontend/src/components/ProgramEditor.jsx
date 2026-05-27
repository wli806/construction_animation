import { useState } from 'react'
import { api } from '../api/client.js'

const TYPE_OPTIONS = [
  { value: 'excavation', label: '挖掘 Excavation' },
  { value: 'foundation', label: '基础 Foundation' },
  { value: 'structure',  label: '结构 Structure' },
  { value: 'walls',      label: '墙体 Walls' },
  { value: 'roof',       label: '屋顶 Roof' },
  { value: 'finishing',  label: '装修 Finishing' },
  { value: 'other',      label: '其他 Other' },
]

const TYPE_CLASS = {
  excavation: 'type-excavation', foundation: 'type-foundation', structure: 'type-structure',
  walls: 'type-walls', roof: 'type-roof', finishing: 'type-finishing', other: 'type-other',
}

const TYPE_NAMES = {
  excavation: '挖掘', foundation: '基础', structure: '结构',
  walls: '墙体', roof: '屋顶', finishing: '装修', other: '其他',
}

export default function ProgramEditor({ projectId, tasks, currentDay, onTasksChange, onDayClick }) {
  const [modal, setModal] = useState(null) // null | { mode:'add'|'edit', task? }
  const [form, setForm] = useState(defaultForm())
  const [resources, setResources] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function defaultForm() {
    return { day: 1, name: '', type: 'excavation', notes: '' }
  }

  function openAdd() {
    const maxDay = tasks.length > 0 ? Math.max(...tasks.map(t => t.day)) + 1 : 1
    setForm({ ...defaultForm(), day: maxDay })
    setResources([])
    setError('')
    setModal({ mode: 'add' })
  }

  function openEdit(task) {
    setForm({ day: task.day, name: task.name, type: task.type, notes: task.notes || '' })
    setResources(JSON.parse(JSON.stringify(task.resources || [])))
    setError('')
    setModal({ mode: 'edit', task })
  }

  function closeModal() { setModal(null) }

  async function saveTask(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('请输入任务名称'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, day: parseInt(form.day), resources }
      if (modal.mode === 'add') {
        const created = await api.tasks.create(projectId, payload)
        onTasksChange([...tasks, created])
      } else {
        const updated = await api.tasks.update(modal.task.id, payload)
        onTasksChange(tasks.map(t => t.id === updated.id ? updated : t))
      }
      closeModal()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask(task) {
    await api.tasks.delete(task.id)
    onTasksChange(tasks.filter(t => t.id !== task.id))
  }

  function addResource() {
    setResources([...resources, { type: 'worker', name: '', count: 2 }])
  }
  function removeResource(i) {
    setResources(resources.filter((_, idx) => idx !== i))
  }
  function updateResource(i, key, val) {
    const next = resources.map((r, idx) => idx === i ? { ...r, [key]: val } : r)
    setResources(next)
  }

  const sorted = [...tasks].sort((a, b) => a.day - b.day)

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>施工计划</span>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ 添加</button>
      </div>

      <div style={styles.list}>
        {sorted.length === 0 && (
          <div style={styles.empty}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>暂无施工任务</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>点击"+ 添加"开始</div>
          </div>
        )}
        {sorted.map(task => (
          <div
            key={task.id}
            style={{ ...styles.card, ...(task.day === currentDay ? styles.cardActive : {}) }}
            onClick={() => onDayClick(task.day)}
          >
            <div style={styles.cardTop}>
              <span style={styles.dayBadge}>D{task.day}</span>
              <span style={styles.taskName}>{task.name}</span>
              <span className={`badge ${TYPE_CLASS[task.type] || 'type-other'}`} style={{ fontSize: 10, padding: '1px 5px' }}>
                {TYPE_NAMES[task.type] || task.type}
              </span>
              <div style={{ display: 'flex', gap: 2, marginLeft: 2 }}>
                <button className="btn btn-ghost btn-icon" style={{ padding: '2px 5px', fontSize: 12 }}
                  onClick={e => { e.stopPropagation(); openEdit(task) }}>✏</button>
                <button className="btn btn-ghost btn-icon" style={{ padding: '2px 5px', fontSize: 12, color: 'var(--red)' }}
                  onClick={e => { e.stopPropagation(); deleteTask(task) }}>✕</button>
              </div>
            </div>
            {(task.resources || []).length > 0 && (
              <div style={styles.chips}>
                {(task.resources || []).map((r, i) => (
                  <span key={i} style={styles.chip(r.type)}>
                    {r.type === 'worker' ? `👷 ×${r.count}` : r.type === 'machine' ? `🚧 ${r.name}` : `📦 ${r.name}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">{modal.mode === 'add' ? '添加施工任务' : '编辑施工任务'}</div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={saveTask}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label className="form-label">天数</label>
                  <input className="form-control" type="number" min="1" value={form.day}
                    onChange={e => setForm({ ...form, day: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">任务名称 *</label>
                  <input className="form-control" placeholder="例：挖地基" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">任务类型</label>
                <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Resources */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>资源配置</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addResource} style={{ fontSize: 11, padding: '2px 8px' }}>+ 资源</button>
                </div>
                <div style={styles.resBox}>
                  {resources.length === 0 && (
                    <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      点击"+ 资源"添加工人、机械或材料
                    </div>
                  )}
                  {resources.map((r, i) => (
                    <div key={i} style={styles.resRow}>
                      <select style={styles.resSelect} value={r.type} onChange={e => updateResource(i, 'type', e.target.value)}>
                        <option value="worker">👷 工人</option>
                        <option value="machine">🚧 机械</option>
                        <option value="material">📦 材料</option>
                      </select>
                      {r.type === 'worker' ? (
                        <>
                          <input type="number" style={styles.resCount} min="1" max="99" value={r.count}
                            onChange={e => updateResource(i, 'count', parseInt(e.target.value) || 1)} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>人</span>
                        </>
                      ) : (
                        <input style={{ ...styles.resName }} placeholder={r.type === 'machine' ? '机械名称（挖掘机…）' : '材料名称'}
                          value={r.name} onChange={e => updateResource(i, 'name', e.target.value)} />
                      )}
                      <button type="button" className="btn btn-ghost btn-icon" style={{ color: 'var(--red)', padding: '2px 6px' }}
                        onClick={() => removeResource(i)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">备注</label>
                <textarea className="form-control" placeholder="可选..." value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  panel: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: { padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  headerTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  list: { flex: 1, overflowY: 'auto', padding: 8 },
  empty: { textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' },
  card: { background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 6, marginBottom: 6, padding: '7px 9px', cursor: 'pointer', transition: 'border-color 0.15s' },
  cardActive: { borderColor: 'var(--accent)', background: '#1a2b3a' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  dayBadge: { background: '#1f6feb', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0 },
  taskName: { flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  chip: (type) => ({
    fontSize: 11, padding: '1px 7px', borderRadius: 12,
    ...(type === 'worker' ? { background: '#0a2a0a', color: 'var(--green)', border: '1px solid #2a5a2a' }
      : type === 'machine' ? { background: '#2a1a05', color: 'var(--yellow)', border: '1px solid #5a3a05' }
      : { background: '#0a1a2a', color: 'var(--accent)', border: '1px solid #1a3a5a' }),
  }),
  resBox: { border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--bg-base)' },
  resRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' },
  resSelect: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 4, padding: '4px 6px', fontSize: 12, width: 90, flexShrink: 0 },
  resCount: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 4, padding: '4px 6px', fontSize: 12, width: 52 },
  resName: { flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 4, padding: '4px 8px', fontSize: 12, outline: 'none' },
}
