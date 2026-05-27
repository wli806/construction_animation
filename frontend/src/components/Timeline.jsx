import { useEffect, useRef } from 'react'

export default function Timeline({ currentDay, maxDay, isPlaying, onDayChange, onTogglePlay, onRewind, onSpeedChange, tasks = [] }) {
  const intervalRef = useRef(null)
  const speedRef = useRef(1)

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        onDayChange(prev => {
          if (prev >= maxDay) {
            onTogglePlay()
            return prev
          }
          return prev + 1
        })
      }, 1200 / speedRef.current)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, maxDay]) // eslint-disable-line

  function changeSpeed(v) {
    speedRef.current = parseFloat(v)
    onSpeedChange(parseFloat(v))
    // Restart interval if playing
    if (isPlaying) {
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        onDayChange(prev => {
          if (prev >= maxDay) { onTogglePlay(); return prev }
          return prev + 1
        })
      }, 1200 / speedRef.current)
    }
  }

  const today = tasks.filter(t => t.day === currentDay)
  const pct = maxDay > 1 ? ((currentDay - 1) / (maxDay - 1)) * 100 : 0

  return (
    <div style={styles.bar}>
      {/* Controls */}
      <div style={styles.controls}>
        <button style={styles.iconBtn} onClick={onRewind} title="重置到第1天">⏮</button>
        <button
          style={{ ...styles.iconBtn, ...(isPlaying ? styles.iconBtnActive : {}) }}
          onClick={onTogglePlay}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button style={styles.iconBtn} onClick={() => onDayChange(d => Math.max(1, d - 1))} title="上一天">◀</button>
        <button style={styles.iconBtn} onClick={() => onDayChange(d => Math.min(maxDay, d + 1))} title="下一天">▶</button>
      </div>

      {/* Day display */}
      <div style={styles.dayBox}>
        <span style={styles.dayNum}>第 {currentDay} 天</span>
        <span style={styles.dayTotal}>/ {maxDay} 天</span>
      </div>

      {/* Today's task name */}
      <div style={styles.taskInfo}>
        {today.length > 0 ? today.map(t => t.name).join(' · ') : <span style={{ color: 'var(--text-muted)' }}>无任务</span>}
      </div>

      {/* Slider + progress */}
      <div style={styles.sliderWrap}>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          {/* Day tick marks */}
          {maxDay <= 30 && Array.from({ length: maxDay }, (_, i) => {
            const hasTasks = tasks.some(t => t.day === i + 1)
            return (
              <div
                key={i}
                style={{
                  ...styles.tick,
                  left: `${maxDay > 1 ? (i / (maxDay - 1)) * 100 : 0}%`,
                  background: hasTasks ? 'var(--accent)' : 'var(--border)',
                  width: hasTasks ? 4 : 2,
                  height: hasTasks ? 10 : 6,
                }}
                onClick={() => onDayChange(i + 1)}
                title={`第 ${i+1} 天`}
              />
            )
          })}
        </div>
        <input
          type="range" min={1} max={maxDay} value={currentDay}
          onChange={e => onDayChange(parseInt(e.target.value))}
          style={styles.slider}
        />
      </div>

      {/* Speed */}
      <select style={styles.speedSelect} onChange={e => changeSpeed(e.target.value)} defaultValue="1">
        <option value="0.5">0.5×</option>
        <option value="1">1×</option>
        <option value="2">2×</option>
        <option value="4">4×</option>
      </select>
    </div>
  )
}

const styles = {
  bar: {
    height: 52, background: 'var(--bg-surface)', borderTop: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, flexShrink: 0,
  },
  controls: { display: 'flex', gap: 4 },
  iconBtn: {
    width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-elevated)',
    border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
    transition: 'all 0.15s',
  },
  iconBtnActive: { background: 'var(--green-bg)', borderColor: 'var(--green-bg)' },
  dayBox: { display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0 },
  dayNum: { fontSize: 15, fontWeight: 700, color: 'var(--accent)' },
  dayTotal: { fontSize: 11, color: 'var(--text-muted)' },
  taskInfo: { fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 },
  sliderWrap: { flex: 1, position: 'relative', display: 'flex', alignItems: 'center' },
  progressTrack: { position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: 4, background: 'var(--bg-elevated)', borderRadius: 2, pointerEvents: 'none' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg,#238636,#3fb950)', borderRadius: 2, transition: 'width 0.4s ease' },
  tick: { position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)', borderRadius: 1, cursor: 'pointer' },
  slider: {
    width: '100%', appearance: 'none', WebkitAppearance: 'none',
    height: 4, background: 'transparent', outline: 'none', cursor: 'pointer', position: 'relative', zIndex: 1,
  },
  speedSelect: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 4, padding: '4px 6px',
    fontSize: 12, cursor: 'pointer', flexShrink: 0,
  },
}
