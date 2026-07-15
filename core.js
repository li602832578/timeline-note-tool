(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) {
    module.exports = api
  }
  root.QitongFlowCore = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PROJECT_SCHEMA = 'qitongflow.project'
  const PROJECT_VERSION = 1
  const DEFAULT_FRAME_RATE = 25

  function nowISO() {
    return new Date().toISOString()
  }

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  function normalizeTitle(rawTitle) {
    const title = String(rawTitle || '').trim()
    if (!title) {
      return '未命名修改意见'
    }
    return title.endsWith('修改意见') ? title : `${title}修改意见`
  }

  function createProject(title) {
    const createdAt = nowISO()
    return {
      schema: PROJECT_SCHEMA,
      version: PROJECT_VERSION,
      title: normalizeTitle(title),
      projectId: createId('project'),
      createdAt,
      updatedAt: createdAt,
      videoRef: null,
      entries: []
    }
  }

  function pad(value, size = 2) {
    return String(Math.max(0, Math.floor(value))).padStart(size, '0')
  }

  function formatTimecode(seconds, frameRate = DEFAULT_FRAME_RATE) {
    const safeSeconds = Math.max(0, Number(seconds || 0))
    const rate = Math.max(1, Number(frameRate || DEFAULT_FRAME_RATE))
    const wholeSeconds = Math.floor(safeSeconds)
    const frames = Math.min(rate - 1, Math.floor((safeSeconds - wholeSeconds) * rate))
    const hours = Math.floor(wholeSeconds / 3600)
    const minutes = Math.floor((wholeSeconds % 3600) / 60)
    const secondPart = wholeSeconds % 60
    return `${pad(hours)}:${pad(minutes)}:${pad(secondPart)}:${pad(frames)}`
  }

  function parseTimecode(rawTimecode, frameRate = DEFAULT_FRAME_RATE) {
    const value = String(rawTimecode || '').trim()
    if (!value || value === '全片') {
      return { label: '全片', seconds: -1 }
    }

    const rangeMatch = value.match(/^\s*((?:\d{1,2}:){1,3}\d{1,2})\s*(?:→|->|至|到|~|－|—|-)\s*((?:\d{1,2}:){1,3}\d{1,2})\s*$/)
    if (rangeMatch) {
      const start = parseTimecode(rangeMatch[1], frameRate)
      const end = parseTimecode(rangeMatch[2], frameRate)
      return {
        label: `${start.label} → ${end.label}`,
        seconds: start.seconds
      }
    }

    const colonParts = value.split(':').map((part) => Number(part))
    if (colonParts.length === 4 && colonParts.every(Number.isFinite)) {
      const [hours, minutes, seconds, frames] = colonParts
      return {
        label: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`,
        seconds: Math.max(0, hours * 3600 + minutes * 60 + seconds + frames / Math.max(1, frameRate))
      }
    }

    if (colonParts.length === 3 && colonParts.every(Number.isFinite)) {
      const [hours, minutes, seconds] = colonParts
      return {
        label: formatTimecode(hours * 3600 + minutes * 60 + seconds, frameRate),
        seconds: Math.max(0, hours * 3600 + minutes * 60 + seconds)
      }
    }

    if (colonParts.length === 2 && colonParts.every(Number.isFinite)) {
      const [minutes, seconds] = colonParts
      return {
        label: formatTimecode(minutes * 60 + seconds, frameRate),
        seconds: Math.max(0, minutes * 60 + seconds)
      }
    }

    const numeric = Number(value)
    if (Number.isFinite(numeric)) {
      return {
        label: formatTimecode(numeric, frameRate),
        seconds: Math.max(0, numeric)
      }
    }

    return { label: value, seconds: -1 }
  }

  function parsePastedFeedback(text, frameRate = DEFAULT_FRAME_RATE) {
    const rows = []
    const unassignedLines = []
    let currentRow = null
    const timePattern = '(?:\\d{1,2}:){1,3}\\d{1,2}'
    const rangePattern = new RegExp(`(${timePattern})\\s*(?:→|->|至|到|~|－|—|-)\\s*(${timePattern})`)
    const singlePattern = new RegExp(`(${timePattern})`)

    String(text || '').replace(/\r/g, '').split('\n').forEach((rawLine) => {
      const line = rawLine.trim()
      if (!line) return

      const rangeMatch = line.match(rangePattern)
      const timeMatch = rangeMatch || line.match(singlePattern)
      if (timeMatch) {
        const timecode = rangeMatch
          ? `${parseTimecode(rangeMatch[1], frameRate).label} → ${parseTimecode(rangeMatch[2], frameRate).label}`
          : parseTimecode(timeMatch[1], frameRate).label
        const note = line
          .replace(rangeMatch ? rangeMatch[0] : timeMatch[0], '')
          .replace(/^\s*[#\d]+[.、)）\-:]?\s*/, '')
          .replace(/^\s*[-—:：|]\s*/, '')
          .trim()
        currentRow = { timecode, note }
        rows.push(currentRow)
        return
      }

      if (currentRow) {
        currentRow.note = [currentRow.note, line].filter(Boolean).join('\n')
      } else {
        unassignedLines.push(line)
      }
    })

    if (unassignedLines.length) {
      rows.push({ timecode: '全片', note: unassignedLines.join('\n') })
    }

    return rows.filter((row) => row.note.trim())
  }

  function addPastedFeedbackEntries(project, rows) {
    return (rows || []).reduce((nextProject, row) => addEntry(nextProject, {
      timecode: row.timecode,
      note: row.note,
      type: row.type
    }), project)
  }

  function detectFeedbackType(note, fallback = '修改') {
    const text = String(note || '')
    if (/删除|删掉|去掉/.test(text)) return '删除'
    if (/字幕|错字|错别字|字距/.test(text)) return '字幕'
    if (/声音|音量|爆音|口播|音乐/.test(text)) return '声音'
    if (/画面|镜头|构图|跳帧|闪帧|黑边/.test(text)) return '画面'
    return String(fallback || '修改').trim() || '修改'
  }

  function sortEntries(entries) {
    return [...(entries || [])].sort((left, right) => {
      const leftSort = Number(left.sortValue ?? -1)
      const rightSort = Number(right.sortValue ?? -1)
      if (leftSort !== rightSort) return leftSort - rightSort
      return Number(left.order ?? 0) - Number(right.order ?? 0)
    })
  }

  function addEntry(project, draft) {
    const parsed = parseTimecode(draft.timecode, project.frameRate || DEFAULT_FRAME_RATE)
    const createdAt = nowISO()
    const note = String(draft.note || '').trim()
    const type = detectFeedbackType(note, draft.type)
    const nextEntry = {
      id: createId('entry'),
      order: Date.now() + (project.entries || []).length,
      timecode: parsed.label,
      type,
      sortValue: Math.floor(parsed.seconds),
      note,
      referenceImage: draft.referenceImage || null,
      frameImage: draft.frameImage || null,
      createdAt,
      updatedAt: createdAt
    }

    return {
      ...project,
      updatedAt: createdAt,
      entries: sortEntries([...(project.entries || []), nextEntry])
    }
  }

  function updateEntry(project, entryId, draft) {
    const parsed = parseTimecode(draft.timecode, project.frameRate || DEFAULT_FRAME_RATE)
    const updatedAt = nowISO()
    const note = String(draft.note || '').trim()
    const type = detectFeedbackType(note, draft.type)
    return {
      ...project,
      updatedAt,
      entries: sortEntries((project.entries || []).map((entry) => {
        if (entry.id !== entryId) {
          return entry
        }
        return {
          ...entry,
          timecode: parsed.label,
          type,
          sortValue: Math.floor(parsed.seconds),
          note,
          referenceImage: draft.referenceImage || null,
          frameImage: draft.frameImage || null,
          updatedAt
        }
      }))
    }
  }

  function deleteEntry(project, entryId) {
    return {
      ...project,
      updatedAt: nowISO(),
      entries: (project.entries || []).filter((entry) => entry.id !== entryId)
    }
  }

  function importProjectFromText(text, fallbackTitle = '导入项目') {
    const parsed = JSON.parse(text)
    if (parsed.schema === PROJECT_SCHEMA && parsed.version === PROJECT_VERSION) {
      return {
        ...parsed,
        title: normalizeTitle(parsed.title),
        entries: sortEntries(parsed.entries || [])
      }
    }

    if (Array.isArray(parsed)) {
      const project = createProject(fallbackTitle)
      return {
        ...project,
        entries: sortEntries(parsed.map((item, index) => {
          const timecode = item.timecode || item.time || item.tc || '全片'
          const note = item.note || item.text || item.comment || ''
          const parsedTime = parseTimecode(timecode)
          const createdAt = nowISO()
          return {
            id: item.id || createId('entry'),
            order: item.order || Date.now() + index,
            timecode: parsedTime.label,
            type: item.type || detectFeedbackType(note),
            sortValue: Math.floor(parsedTime.seconds),
            note,
            referenceImage: item.referenceImage || null,
            frameImage: item.frameImage || null,
            createdAt: item.createdAt || createdAt,
            updatedAt: item.updatedAt || createdAt
          }
        }))
      }
    }

    throw new Error('当前只支持 QTF / JSON 项目文件')
  }

  function exportProject(project) {
    return JSON.stringify({
      ...project,
      updatedAt: nowISO(),
      entries: sortEntries(project.entries || [])
    }, null, 2)
  }

  return {
    PROJECT_SCHEMA,
    PROJECT_VERSION,
    addPastedFeedbackEntries,
    addEntry,
    createProject,
    deleteEntry,
    detectFeedbackType,
    exportProject,
    formatTimecode,
    importProjectFromText,
    parsePastedFeedback,
    parseTimecode,
    sortEntries,
    updateEntry
  }
})
