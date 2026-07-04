(function () {
  const core = window.QitongFlowCore
  const STORAGE_KEY = 'qitongflow.web.project.v1'
  const FRAME_RATE = 25

  const state = {
    project: core.createProject('未命名'),
    selectedEntryId: null,
    videoUrl: '',
    videoFileName: '',
    duration: 0,
    currentTime: 0,
    rangeStart: null,
    rangeEnd: null,
    draft: {
      timecode: '',
      note: '',
      type: '修改',
      referenceImage: null,
      frameImage: null
    },
    search: '',
    playbackRates: [1, 1.25, 1.5, 2, 0.5],
    playbackRateIndex: 0
  }

  const $ = (id) => document.getElementById(id)

  const elements = {
    projectSubtitle: $('projectSubtitle'),
    statusText: $('statusText'),
    importProjectInput: $('importProjectInput'),
    saveProjectButton: $('saveProjectButton'),
    exportEditButton: $('exportEditButton'),
    entryCount: $('entryCount'),
    searchInput: $('searchInput'),
    entryList: $('entryList'),
    deleteEntryButton: $('deleteEntryButton'),
    clearEntriesButton: $('clearEntriesButton'),
    dropZone: $('dropZone'),
    video: $('reviewVideo'),
    emptyVideoState: $('emptyVideoState'),
    videoInput: $('videoInput'),
    currentFrameLabel: $('currentFrameLabel'),
    playButton: $('playButton'),
    playbackTime: $('playbackTime'),
    muteButton: $('muteButton'),
    volumeSlider: $('volumeSlider'),
    rateButton: $('rateButton'),
    rangeLabel: $('rangeLabel'),
    timelineLabel: $('timelineLabel'),
    timelineSlider: $('timelineSlider'),
    markStartButton: $('markStartButton'),
    markEndButton: $('markEndButton'),
    clearRangeButton: $('clearRangeButton'),
    submitEntryButton: $('submitEntryButton'),
    timecodeInput: $('timecodeInput'),
    wholeVideoButton: $('wholeVideoButton'),
    noteInput: $('noteInput'),
    referencePreview: $('referencePreview'),
    captureFrameButton: $('captureFrameButton'),
    referenceInput: $('referenceInput'),
    removeReferenceButton: $('removeReferenceButton'),
    pasteTextButton: $('pasteTextButton'),
    mergeProjectInput: $('mergeProjectInput')
  }

  function setStatus(message) {
    elements.statusText.textContent = message
  }

  function currentTimecode() {
    return core.formatTimecode(state.currentTime, FRAME_RATE)
  }

  function durationTimecode() {
    return core.formatTimecode(state.duration, FRAME_RATE)
  }

  function rangeLabel() {
    const left = state.rangeStart == null ? '--:--:--:--' : core.formatTimecode(state.rangeStart, FRAME_RATE)
    const right = state.rangeEnd == null ? '--:--:--:--' : core.formatTimecode(state.rangeEnd, FRAME_RATE)
    return `${left} → ${right}`
  }

  function persist() {
    const payload = {
      project: state.project,
      selectedEntryId: state.selectedEntryId,
      rangeStart: state.rangeStart,
      rangeEnd: state.rangeEnd,
      draft: state.draft,
      videoFileName: state.videoFileName
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return false
      }
      const saved = JSON.parse(raw)
      if (saved.project && saved.project.schema === core.PROJECT_SCHEMA) {
        state.project = saved.project
      }
      state.selectedEntryId = saved.selectedEntryId || null
      state.rangeStart = saved.rangeStart ?? null
      state.rangeEnd = saved.rangeEnd ?? null
      state.draft = saved.draft || state.draft
      state.videoFileName = saved.videoFileName || ''
      setStatus('已恢复上次本地草稿')
      return true
    } catch (error) {
      setStatus('本地草稿读取失败，已创建新项目')
      return false
    }
  }

  function renderReferencePreview() {
    const image = state.draft.referenceImage || state.draft.frameImage
    elements.removeReferenceButton.hidden = !image
    if (!image) {
      elements.referencePreview.textContent = '没有参考图'
      return
    }
    elements.referencePreview.innerHTML = ''
    const img = document.createElement('img')
    img.src = image
    img.alt = '参考图'
    elements.referencePreview.appendChild(img)
  }

  function renderEntries() {
    const entries = core.sortEntries(state.project.entries || [])
    const keyword = String(state.search || '').trim().toLowerCase()
    const filtered = keyword
      ? entries.filter((entry) => `${entry.timecode} ${entry.type} ${entry.note}`.toLowerCase().includes(keyword))
      : entries

    elements.entryCount.textContent = `共 ${entries.length} 条`
    elements.clearEntriesButton.disabled = entries.length === 0
    elements.deleteEntryButton.disabled = !state.selectedEntryId
    elements.entryList.innerHTML = ''

    if (!filtered.length) {
      const empty = document.createElement('div')
      empty.className = 'empty-list'
      empty.textContent = entries.length ? '没有匹配的意见' : '还没有修改意见'
      elements.entryList.appendChild(empty)
      return
    }

    filtered.forEach((entry, index) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.className = `entry-row${entry.id === state.selectedEntryId ? ' selected' : ''}`
      row.innerHTML = `
        <div class="entry-row-top">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <span class="mono-time">${entry.timecode}</span>
          <span>${entry.type || '修改'}</span>
        </div>
        <div class="entry-row-note"></div>
      `
      row.querySelector('.entry-row-note').textContent = entry.note || ''
      row.addEventListener('click', () => selectEntry(entry.id, true))
      elements.entryList.appendChild(row)
    })
  }

  function renderVideoState() {
    elements.projectSubtitle.textContent = state.project.title
    elements.currentFrameLabel.textContent = `当前帧 ${currentTimecode()}`
    elements.playbackTime.textContent = `${currentTimecode()} / ${durationTimecode()}`
    elements.timelineLabel.textContent = `${currentTimecode()} / ${durationTimecode()}`
    elements.rangeLabel.textContent = rangeLabel()
    const isPaused = elements.video.paused
    elements.playButton.classList.toggle('is-playing', !isPaused)
    elements.playButton.setAttribute('aria-label', isPaused ? '播放' : '暂停')
    elements.timelineSlider.max = String(Math.max(0, state.duration))
    elements.timelineSlider.value = String(Math.min(state.currentTime, state.duration || state.currentTime))
    elements.timelineSlider.disabled = !state.videoUrl
    elements.emptyVideoState.style.display = state.videoUrl ? 'none' : 'grid'
    elements.video.classList.toggle('has-video', Boolean(state.videoUrl))
    elements.muteButton.classList.toggle('is-muted', elements.video.muted)
    elements.muteButton.setAttribute('aria-label', elements.video.muted ? '取消静音' : '静音')
    elements.rateButton.textContent = `${elements.video.playbackRate || 1}x`
  }

  function renderDraft() {
    elements.timecodeInput.value = state.draft.timecode
    elements.noteInput.value = state.draft.note
    elements.submitEntryButton.textContent = state.selectedEntryId ? '保存修改' : '添加意见'
    renderReferencePreview()
  }

  function render() {
    renderEntries()
    renderVideoState()
    renderDraft()
    persist()
  }

  function syncDraftToCurrentTime() {
    if (state.selectedEntryId) {
      return
    }
    if (state.rangeStart != null && state.rangeEnd != null) {
      state.draft.timecode = rangeLabel()
      return
    }
    state.draft.timecode = currentTimecode()
  }

  function selectEntry(entryId, shouldSeek) {
    const entry = (state.project.entries || []).find((item) => item.id === entryId)
    if (!entry) {
      return
    }
    state.selectedEntryId = entry.id
    state.draft = {
      timecode: entry.timecode,
      note: entry.note,
      type: entry.type,
      referenceImage: entry.referenceImage || null,
      frameImage: entry.frameImage || null
    }
    if (shouldSeek && entry.sortValue >= 0 && state.videoUrl) {
      elements.video.pause()
      elements.video.currentTime = entry.sortValue
    }
    setStatus('已载入这条修改意见')
    render()
  }

  function resetDraft() {
    state.selectedEntryId = null
    state.draft = {
      timecode: currentTimecode(),
      note: '',
      type: '修改',
      referenceImage: null,
      frameImage: null
    }
  }

  function submitEntry() {
    state.draft.timecode = elements.timecodeInput.value
    state.draft.note = elements.noteInput.value
    if (!state.draft.note.trim()) {
      setStatus('请先输入修改意见')
      return
    }

    if (state.selectedEntryId) {
      state.project = core.updateEntry(state.project, state.selectedEntryId, state.draft)
      setStatus('已保存修改意见')
    } else {
      state.project = core.addEntry(state.project, state.draft)
      setStatus('已添加修改意见')
    }
    resetDraft()
    render()
  }

  function deleteSelectedEntry() {
    if (!state.selectedEntryId) {
      return
    }
    state.project = core.deleteEntry(state.project, state.selectedEntryId)
    resetDraft()
    setStatus('已删除修改意见')
    render()
  }

  function clearEntries() {
    if (!window.confirm('确定清空所有修改意见？')) {
      return
    }
    state.project = { ...state.project, entries: [], updatedAt: new Date().toISOString() }
    resetDraft()
    setStatus('已清空修改意见')
    render()
  }

  function loadVideoFile(file) {
    if (!file) {
      return
    }
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl)
    }
    state.videoUrl = URL.createObjectURL(file)
    state.videoFileName = file.name
    state.project = {
      ...state.project,
      title: core.createProject(file.name.replace(/\.[^.]+$/, '')).title,
      videoRef: {
        fileName: file.name,
        sizeBytes: file.size,
        durationSeconds: 0
      },
      updatedAt: new Date().toISOString()
    }
    elements.video.src = state.videoUrl
    setStatus('视频已导入，可以开始审片')
    render()
  }

  function seekBy(seconds) {
    if (!state.videoUrl) {
      return
    }
    const nextTime = Math.min(Math.max(0, elements.video.currentTime + seconds), state.duration || elements.video.duration || 0)
    elements.video.currentTime = nextTime
  }

  function downloadFile(fileName, content, type) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function exportProject(extension) {
    const safeTitle = state.project.title.replace(/[\\/:*?"<>|]/g, '_')
    downloadFile(`${safeTitle}.${extension}`, core.exportProject(state.project), 'application/json;charset=utf-8')
    setStatus(extension === 'qtf' ? '已导出 QTF 项目' : '已导出 JSON 文件')
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function importProjectFile(file) {
    const text = await readFileAsText(file)
    state.project = core.importProjectFromText(text, file.name.replace(/\.[^.]+$/, ''))
    state.selectedEntryId = null
    state.rangeStart = null
    state.rangeEnd = null
    resetDraft()
    setStatus('项目已导入')
    render()
  }

  async function mergeProjectFiles(files) {
    const entries = [...(state.project.entries || [])]
    for (const file of files) {
      const text = await readFileAsText(file)
      const imported = core.importProjectFromText(text, file.name)
      entries.push(...(imported.entries || []))
    }
    state.project = {
      ...state.project,
      entries: core.sortEntries(entries),
      updatedAt: new Date().toISOString()
    }
    setStatus(`已导入 ${files.length} 个意见文件`)
    render()
  }

  function captureCurrentFrame() {
    if (!state.videoUrl || !elements.video.videoWidth) {
      setStatus('请先导入视频')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = elements.video.videoWidth
    canvas.height = elements.video.videoHeight
    const context = canvas.getContext('2d')
    context.drawImage(elements.video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    state.draft.referenceImage = dataUrl
    state.draft.frameImage = dataUrl
    setStatus('已截取当前帧作为参考图')
    render()
  }

  function bindEvents() {
    elements.videoInput.addEventListener('change', (event) => loadVideoFile(event.target.files[0]))
    elements.importProjectInput.addEventListener('change', (event) => {
      const file = event.target.files[0]
      if (file) importProjectFile(file).catch(() => setStatus('导入项目失败'))
      event.target.value = ''
    })
    elements.mergeProjectInput.addEventListener('change', (event) => {
      mergeProjectFiles(Array.from(event.target.files || [])).catch(() => setStatus('导入意见失败'))
      event.target.value = ''
    })

    elements.saveProjectButton.addEventListener('click', () => exportProject('qtf'))
    elements.exportEditButton.addEventListener('click', () => exportProject('json'))
    elements.searchInput.addEventListener('input', (event) => {
      state.search = event.target.value
      renderEntries()
    })
    elements.submitEntryButton.addEventListener('click', submitEntry)
    elements.deleteEntryButton.addEventListener('click', deleteSelectedEntry)
    elements.clearEntriesButton.addEventListener('click', clearEntries)
    elements.wholeVideoButton.addEventListener('click', () => {
      state.draft.timecode = '全片'
      renderDraft()
    })
    elements.noteInput.addEventListener('input', (event) => {
      state.draft.note = event.target.value
      persist()
    })
    elements.timecodeInput.addEventListener('input', (event) => {
      state.draft.timecode = event.target.value
      persist()
    })
    elements.noteInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        submitEntry()
      }
    })

    elements.playButton.addEventListener('click', () => {
      if (!state.videoUrl) return
      if (elements.video.paused) {
        elements.video.play()
      } else {
        elements.video.pause()
      }
    })
    elements.video.addEventListener('loadedmetadata', () => {
      state.duration = elements.video.duration || 0
      state.project.videoRef = {
        ...(state.project.videoRef || {}),
        fileName: state.videoFileName,
        durationSeconds: state.duration,
        displayWidth: elements.video.videoWidth,
        displayHeight: elements.video.videoHeight
      }
      syncDraftToCurrentTime()
      render()
    })
    elements.video.addEventListener('timeupdate', () => {
      state.currentTime = elements.video.currentTime || 0
      syncDraftToCurrentTime()
      renderVideoState()
      if (!state.selectedEntryId) {
        elements.timecodeInput.value = state.draft.timecode
      }
    })
    elements.video.addEventListener('play', renderVideoState)
    elements.video.addEventListener('pause', renderVideoState)
    elements.timelineSlider.addEventListener('input', (event) => {
      if (!state.videoUrl) return
      elements.video.currentTime = Number(event.target.value)
    })
    elements.volumeSlider.addEventListener('input', (event) => {
      elements.video.volume = Number(event.target.value)
    })
    elements.muteButton.addEventListener('click', () => {
      elements.video.muted = !elements.video.muted
      renderVideoState()
    })
    elements.rateButton.addEventListener('click', () => {
      state.playbackRateIndex = (state.playbackRateIndex + 1) % state.playbackRates.length
      elements.video.playbackRate = state.playbackRates[state.playbackRateIndex]
      renderVideoState()
    })
    document.querySelectorAll('[data-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.step
        if (value === 'frame') seekBy(1 / FRAME_RATE)
        else if (value === '-frame') seekBy(-1 / FRAME_RATE)
        else seekBy(Number(value))
      })
    })
    elements.markStartButton.addEventListener('click', () => {
      state.rangeStart = state.currentTime
      syncDraftToCurrentTime()
      render()
    })
    elements.markEndButton.addEventListener('click', () => {
      state.rangeEnd = state.currentTime
      syncDraftToCurrentTime()
      render()
    })
    elements.clearRangeButton.addEventListener('click', () => {
      state.rangeStart = null
      state.rangeEnd = null
      syncDraftToCurrentTime()
      render()
    })
    elements.referenceInput.addEventListener('change', async (event) => {
      const file = event.target.files[0]
      if (!file) return
      state.draft.referenceImage = await readFileAsDataURL(file)
      state.draft.frameImage = null
      setStatus('已上传参考图')
      render()
      event.target.value = ''
    })
    elements.removeReferenceButton.addEventListener('click', () => {
      state.draft.referenceImage = null
      state.draft.frameImage = null
      render()
    })
    elements.captureFrameButton.addEventListener('click', captureCurrentFrame)
    elements.pasteTextButton.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText()
        state.draft.note = text
        renderDraft()
        setStatus('已粘贴文字意见')
      } catch (error) {
        setStatus('浏览器没有允许读取剪贴板')
      }
    })

    elements.dropZone.addEventListener('dragover', (event) => {
      event.preventDefault()
      elements.dropZone.classList.add('dragging')
    })
    elements.dropZone.addEventListener('dragleave', () => elements.dropZone.classList.remove('dragging'))
    elements.dropZone.addEventListener('drop', (event) => {
      event.preventDefault()
      elements.dropZone.classList.remove('dragging')
      const file = Array.from(event.dataTransfer.files || []).find((item) => item.type.startsWith('video/'))
      loadVideoFile(file)
    })

    document.addEventListener('keydown', (event) => {
      const tagName = document.activeElement && document.activeElement.tagName
      const isTyping = tagName === 'INPUT' || tagName === 'TEXTAREA'
      if (event.code === 'Space' && !isTyping) {
        event.preventDefault()
        elements.playButton.click()
      }
    })
  }

  const didRestore = restore()
  bindEvents()
  if (!didRestore) {
    resetDraft()
  }
  render()
})()
