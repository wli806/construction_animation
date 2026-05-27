import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import BimViewer from '../components/BimViewer.jsx'
import ProgramEditor from '../components/ProgramEditor.jsx'
import Timeline from '../components/Timeline.jsx'

const RESOURCE_ICON = { worker: '👷', machine: '🚧', material: '📦' }

export default function ProjectView() {
  const { id } = useParams()
  const nav = useNavigate()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDay, setCurrentDay] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const maxDay = tasks.length > 0 ? Math.max(...tasks.map(t => t.day)) : 1

  useEffect(() => {
    fetchProject()
  }, [id]) // eslint-disable-line

  async function fetchProject() {
    try {
      const data = await api.projects.get(id)
      setProject(data)
      setTasks(data.tasks || [])
    } catch { nav('/') }
    setLoading(false)
  }

  const handleTasksChange = useCallback((newTasks) => {
    setTasks(newTasks)
  }, [])

  const handleDayChange = useCallback((dayOrFn) => {
    setCurrentDay(prev => {
      const next = typeof dayOrFn === 'function' ? dayOrFn(prev) : dayOrFn
      return Math.max(1, Math.min(maxDay || 1, next))
    })
  }, [maxDay])

  function togglePlay() { setIsPlaying(p => !p) }
  function rewind() { setIsPlaying(false); setCurrentDay(1) }

  // Today's resources for HUD
  const todayTasks = tasks.filter(t => t.day === currentDay)
  const todayWorkers = todayTasks.reduce((sum, t) =>
    sum + (t.resources || []).filter(r => r.type === 'worker').reduce((s, r) => s + (r.count || 1), 0), 0)
  const todayMachines = todayTasks.flatMap(t => (t.resources || []).filter(r => r.type === 'machine').map(r => r.name))
  const progress = maxDay > 1 ? Math.round(((currentDay - 1) / (maxDay - 1)) * 100) : 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ color: 'var(--text-secondary)' }}>加载中...</div>
    </div>
  )

  return (
    <div style={styles.root}>
      {/* Topbar */}
      <div className="topbar">
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => nav('/')} title="返回">←</button>
        <span style={{ fontSize: 18 }}>🏗</span>
        <span className="topbar-title">{project?.name}</span>
        {project?.location && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {project.location}</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tasks.length} 个任务</span>
      </div>

      {/* Main layout */}
      <div style={styles.main}>
        {/* Left: Program editor */}
        <div style={styles.leftPanel}>
          <ProgramEditor
            projectId={id}
            tasks={tasks}
            currentDay={currentDay}
            onTasksChange={handleTasksChange}
            onDayClick={handleDayChange}
          />
        </div>

        {/* Center: 3D Viewer + HUD */}
        <div style={styles.viewport}>
          <BimViewer tasks={tasks} currentDay={currentDay} />

          {/* Day HUD */}
          <div style={styles.hudDay}>
            <div style={styles.hudDayNum}>第 {currentDay} 天</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>施工进度</div>
            {todayTasks.length > 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 6, maxWidth: 200 }}>
                {todayTasks.map(t => t.name).join(' / ')}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>无施工任务</div>
            )}
          </div>

          {/* Resource HUD */}
          <div style={styles.hudRes}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>今日资源</div>
            {todayWorkers > 0 && (
              <div style={styles.hudResRow}>
                <span style={{ fontSize: 15 }}>👷</span>
                <span style={{ fontSize: 12 }}>工人 × {todayWorkers}</span>
              </div>
            )}
            {todayMachines.slice(0, 3).map((m, i) => (
              <div key={i} style={styles.hudResRow}>
                <span style={{ fontSize: 15 }}>🚧</span>
                <span style={{ fontSize: 12 }}>{m}</span>
              </div>
            ))}
            {todayWorkers === 0 && todayMachines.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>暂无资源进场</div>
            )}
          </div>

          {/* Progress bar */}
          <div style={styles.progressBar}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>总体进度</span>
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            {/* Phase markers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {[1, Math.ceil(maxDay*0.25), Math.ceil(maxDay*0.5), Math.ceil(maxDay*0.75), maxDay].map((d, i) => (
                <span key={i} style={{ fontSize: 10, color: 'var(--text-muted)' }}>D{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Timeline
        currentDay={currentDay}
        maxDay={maxDay}
        isPlaying={isPlaying}
        tasks={tasks}
        onDayChange={handleDayChange}
        onTogglePlay={togglePlay}
        onRewind={rewind}
        onSpeedChange={setSpeed}
      />
    </div>
  )
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  leftPanel: { width: 300, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  viewport: { flex: 1, position: 'relative', overflow: 'hidden' },

  hudDay: {
    position: 'absolute', top: 12, left: 12,
    background: 'rgba(13,17,23,0.88)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(6px)',
  },
  hudDayNum: { fontSize: 26, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 },

  hudRes: {
    position: 'absolute', top: 12, right: 12,
    background: 'rgba(13,17,23,0.88)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(6px)', minWidth: 130,
  },
  hudResRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 },

  progressBar: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    background: 'rgba(13,17,23,0.88)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 14px', backdropFilter: 'blur(6px)',
  },
  progressTrack: { background: 'var(--bg-elevated)', borderRadius: 4, height: 7, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg,#238636,#3fb950)', borderRadius: 4, transition: 'width 0.5s ease' },
}
