const state = {
  entries: loadEntries(),
  editingId: null,
  referenceImage: null,
  videoUrl: null,
  rangeStart: null,
  rangeEnd: null,
};

const typeRules = [
  ["删除", ["删除", "删掉", "去掉", "不用", "不要", "撤掉"]],
  ["花字 / 包装", ["花字", "包装", "动效", "小花字", "版式"]],
  ["字幕", ["字幕", "title", "Title", "打上"]],
  ["素材", ["素材", "版权", "插入"]],
  ["美颜", ["美颜", "磨皮", "肤色", "皮肤", "祛痘", "瘦脸", "血色", "气血", "胖", "瘦", "双下巴"]],
  ["画面剪辑", ["切", "点头", "景别", "斜拼", "画面", "拉大", "圈出来", "停留"]],
  ["结构", ["开头", "结尾", "分隔页", "直接进", "按照脚本"]],
];

const elements = {
  workspace: document.querySelector("#workspace"),
  videoLocator: document.querySelector("#videoLocator"),
  form: document.querySelector("#entryForm"),
  videoInput: document.querySelector("#videoInput"),
  videoDropzone: document.querySelector("#videoDropzone"),
  videoFileName: document.querySelector("#videoFileName"),
  videoTools: document.querySelector("#videoTools"),
  sourceVideo: document.querySelector("#sourceVideo"),
  currentVideoTime: document.querySelector("#currentVideoTime"),
  playToggle: document.querySelector("#playToggleButton"),
  videoScrubber: document.querySelector("#videoScrubber"),
  stripCurrentTime: document.querySelector("#stripCurrentTime"),
  stripDuration: document.querySelector("#stripDuration"),
  speedToggle: document.querySelector("#speedToggleButton"),
  jumpTime: document.querySelector("#jumpTimeInput"),
  jumpTimeButton: document.querySelector("#jumpTimeButton"),
  selectedRange: document.querySelector("#selectedRangeLabel"),
  rangeStartText: document.querySelector("#rangeStartText"),
  rangeEndText: document.querySelector("#rangeEndText"),
  rangeStartJump: document.querySelector("#rangeStartJumpButton"),
  rangeEndJump: document.querySelector("#rangeEndJumpButton"),
  clearRangeStart: document.querySelector("#clearRangeStartButton"),
  clearRangeEnd: document.querySelector("#clearRangeEndButton"),
  setRangeStart: document.querySelector("#setRangeStartButton"),
  setRangeEnd: document.querySelector("#setRangeEndButton"),
  applyRange: document.querySelector("#applyRangeButton"),
  captureFrame: document.querySelector("#captureFrameButton"),
  time: document.querySelector("#timeInput"),
  type: document.querySelector("#typeInput"),
  note: document.querySelector("#noteInput"),
  imageInput: document.querySelector("#referenceImageInput"),
  imageFileName: document.querySelector("#referenceFileName"),
  imagePreview: document.querySelector("#referencePreview"),
  imagePreviewImg: document.querySelector("#referencePreviewImage"),
  removeImage: document.querySelector("#removeReferenceButton"),
  submit: document.querySelector("#submitButton"),
  copyLastTime: document.querySelector("#copyLastTimeButton"),
  cancel: document.querySelector("#cancelEditButton"),
  list: document.querySelector("#entryList"),
  count: document.querySelector("#countLabel"),
  toast: document.querySelector("#statusToast"),
  exportProject: document.querySelector("#exportProjectButton"),
  importProject: document.querySelector("#importProjectInput"),
  downloadPdf: document.querySelector("#downloadPdfButton"),
  clearAll: document.querySelector("#clearAllButton"),
  batchInput: document.querySelector("#batchInput"),
  parseBatch: document.querySelector("#parseBatchButton"),
  clearBatch: document.querySelector("#clearBatchButton"),
};

elements.form.addEventListener("submit", handleSubmit);
elements.videoInput.addEventListener("change", handleVideoUpload);
elements.videoDropzone.addEventListener("dragenter", handleVideoDragEnter);
elements.videoDropzone.addEventListener("dragover", handleVideoDragOver);
elements.videoDropzone.addEventListener("dragleave", handleVideoDragLeave);
elements.videoDropzone.addEventListener("drop", handleVideoDrop);
elements.sourceVideo.addEventListener("timeupdate", updateCurrentVideoTime);
elements.sourceVideo.addEventListener("loadedmetadata", () => {
  updateCurrentVideoTime();
  updateVideoLayout();
});
elements.sourceVideo.addEventListener("play", updatePlayButton);
elements.sourceVideo.addEventListener("pause", updatePlayButton);
elements.playToggle.addEventListener("click", toggleVideoPlayback);
elements.videoScrubber.addEventListener("input", scrubVideo);
elements.speedToggle.addEventListener("click", cyclePlaybackSpeed);
elements.jumpTimeButton.addEventListener("click", jumpToTypedTime);
elements.jumpTime.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    jumpToTypedTime();
  }
});
document.querySelectorAll("[data-nudge]").forEach((button) => {
  button.addEventListener("click", () => nudgeVideo(button.dataset.nudge));
});
elements.setRangeStart.addEventListener("click", setRangeStart);
elements.setRangeEnd.addEventListener("click", setRangeEnd);
elements.applyRange.addEventListener("click", applySelectedRange);
elements.rangeStartJump.addEventListener("click", () => jumpToRangePoint("start"));
elements.rangeEndJump.addEventListener("click", () => jumpToRangePoint("end"));
elements.clearRangeStart.addEventListener("click", () => clearRangePoint("start"));
elements.clearRangeEnd.addEventListener("click", () => clearRangePoint("end"));
elements.captureFrame.addEventListener("click", captureCurrentFrame);
elements.cancel.addEventListener("click", resetForm);
elements.copyLastTime.addEventListener("click", copyLastTime);
elements.imageInput.addEventListener("change", handleImageUpload);
elements.removeImage.addEventListener("click", removeReferenceImage);
elements.exportProject.addEventListener("click", exportProject);
elements.importProject.addEventListener("change", importProject);
elements.downloadPdf.addEventListener("click", downloadPdf);
elements.clearAll.addEventListener("click", clearAll);
elements.parseBatch.addEventListener("click", parseBatchText);
elements.clearBatch.addEventListener("click", () => {
  elements.batchInput.value = "";
});
document.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches && event.touches.length > 1) {
      event.preventDefault();
    }
  },
  { passive: false },
);
document.addEventListener(
  "gesturestart",
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  "gesturechange",
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

render();

function handleSubmit(event) {
  event.preventDefault();
  const rawTime = elements.time.value.trim();
  const note = elements.note.value.trim();
  const selectedType = elements.type.value;

  if (!note) {
    elements.note.focus();
    return;
  }

  if (state.editingId) {
    const target = state.entries.find((entry) => entry.id === state.editingId);
    if (target) {
      const timecode = normalizeTimeInput(rawTime);
      target.timecode = timecode;
      target.note = note;
      target.type = selectedType === "自动识别" ? detectType(note, timecode) : selectedType;
      target.sortValue = getSortValue(timecode);
      target.referenceImage = state.referenceImage;
      target.updatedAt = new Date().toISOString();
      showToast("已保存成功");
    }
  } else {
    const timecode = normalizeTimeInput(rawTime);
    const now = new Date().toISOString();
    state.entries.push({
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now() + Math.random()),
      order: Date.now() + state.entries.length,
      timecode,
      type: selectedType === "自动识别" ? detectType(note, timecode) : selectedType,
      note,
      referenceImage: state.referenceImage,
      sortValue: getSortValue(timecode),
      createdAt: now,
      updatedAt: now,
    });
    showToast("已添加成功");
  }

  saveEntries();
  resetForm({ focusTime: true, forceFocus: true });
  render();
}

function parseBatchText() {
  const text = elements.batchInput.value.trim();
  if (!text) {
    elements.batchInput.focus();
    return;
  }

  const parsed = parseBatchEntries(text);
  if (!parsed.length) {
    showToast("没有识别到修改意见");
    return;
  }

  const now = new Date().toISOString();
  parsed.forEach((item, index) => {
    const timecode = item.timecode || "全片";
    state.entries.push({
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now() + Math.random() + index),
      order: Date.now() + state.entries.length + index,
      timecode,
      type: detectType(item.note, timecode),
      note: item.note,
      referenceImage: null,
      sortValue: getSortValue(timecode),
      createdAt: now,
      updatedAt: now,
    });
  });

  saveEntries();
  render();
  showToast(`已识别 ${parsed.length} 条`);
}

function parseBatchEntries(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const entries = [];

  lines.forEach((line) => {
    const parsed = parseBatchLine(line);
    const shouldAppend = isContinuationLine(line);

    if (shouldAppend && entries.length) {
      entries[entries.length - 1].note += `\n${line}`;
      return;
    }

    if (parsed) {
      entries.push(parsed);
      return;
    }

    if (entries.length && !looksLikeNewUntimedOpinion(line)) {
      entries[entries.length - 1].note += `\n${line}`;
      return;
    }

    entries.push({
      timecode: line.startsWith("开头") ? "00:00:00:00" : "全片",
      note: line,
    });
  });

  return entries.map((entry) => ({ ...entry, note: entry.note.trim() })).filter((entry) => entry.note);
}

function parseBatchLine(line) {
  const match = line.match(/^(\d{1,2}[:：]\d{1,2}(?:[:：]\d{1,2})?|\d{3,6})\s*(.*)$/);
  if (!match) return null;
  const [, rawTime, rest] = match;
  return {
    timecode: normalizeSingleTime(rawTime.replace(/：/g, ":")),
    note: rest.trim() || line,
  };
}

function isContinuationLine(line) {
  return /^(链接|提取码|密码|https?:\/\/|pan\.baidu\.com|网盘|素材链接)[:：\s]/i.test(line);
}

function looksLikeNewUntimedOpinion(line) {
  return /^(开头|结尾|全片|整体|字幕|画面|声音|音乐|bgm|BGM|素材|美颜|调色|包装|花字)/.test(line);
}

function normalizeTimeInput(raw) {
  const value = raw.trim();
  if (!value) return "全片";
  if (value === "全片" || value === "未指定") return value;

  const rangeMatch = value.match(/^(.+?)\s*(?:-|—|–|到|至|~)\s*(.+)$/);
  if (rangeMatch) {
    return `${normalizeSingleTime(rangeMatch[1])} - ${normalizeSingleTime(rangeMatch[2])}`;
  }
  return normalizeSingleTime(value);
}

function normalizeSingleTime(raw) {
  const text = raw.replace(/\s+/g, "");
  const minuteMatch = text.match(/^(\d+)分(\d{1,2})秒?$/);
  if (minuteMatch) {
    const totalMinutes = Number(minuteMatch[1]);
    const seconds = Number(minuteMatch[2]);
    return formatTime(Math.floor(totalMinutes / 60), totalMinutes % 60, seconds, 0);
  }

  if (text.includes(":")) {
    const parts = text.split(":").map(Number);
    if (parts.length === 2) return formatTime(0, parts[0], parts[1], 0);
    if (parts.length === 3) return formatTime(parts[0], parts[1], parts[2], 0);
    if (parts.length === 4) return formatTime(parts[0], parts[1], parts[2], parts[3]);
  }

  const digits = text.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length <= 2) return formatTime(0, 0, Number(digits), 0);
  if (digits.length <= 4) return formatTime(0, Number(digits.slice(0, -2)), Number(digits.slice(-2)), 0);
  return formatTime(Number(digits.slice(0, -4)), Number(digits.slice(-4, -2)), Number(digits.slice(-2)), 0);
}

function formatTime(hours, minutes, seconds, frames) {
  return [hours, minutes, seconds, frames].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatSecondsToTimecode(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(totalSeconds, 0) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = Math.floor(safeSeconds % 60);
  const frames = Math.floor((safeSeconds % 1) * 25);
  return formatTime(hours, minutes, seconds, frames);
}

function detectType(note, timecode) {
  const haystack = `${timecode} ${note}`;
  const found = typeRules.filter(([, words]) => words.some((word) => haystack.includes(word))).map(([label]) => label);
  return found.length ? Array.from(new Set(found)).join(" / ") : "修改";
}

function getSortValue(timecode) {
  if (timecode === "全片") return -1;
  if (timecode === "未指定") return Number.POSITIVE_INFINITY;
  const firstTime = timecode.split("-")[0].trim();
  const match = firstTime.match(/^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return Number.POSITIVE_INFINITY;
  const [, hours, minutes, seconds, frames] = match.map(Number);
  return hours * 3600 + minutes * 60 + seconds + frames / 100;
}

function getSortedEntries() {
  return [...state.entries].sort((a, b) => {
    if (a.sortValue !== b.sortValue) return a.sortValue - b.sortValue;
    return a.order - b.order;
  });
}

function render() {
  const sorted = getSortedEntries();
  const latestFirst = getLatestEntries();
  const duplicateHints = findDuplicateHints(state.entries);
  elements.count.textContent = `${sorted.length} 条`;
  elements.copyLastTime.disabled = state.entries.length === 0;
  renderList(latestFirst, duplicateHints);
}

function getLatestEntries() {
  return [...state.entries].sort((a, b) => b.order - a.order);
}

function renderList(entries, duplicateHints = new Map()) {
  if (!entries.length) {
    elements.list.innerHTML = '<div class="empty-state">还没有添加修改意见</div>';
    return;
  }

  const total = entries.length;
  elements.list.innerHTML = entries
    .map(
      (entry, index) => {
        const duplicate = duplicateHints.get(entry.id);
        return `
        <article class="entry-item ${duplicate ? "is-duplicate" : ""}" data-entry-id="${entry.id}">
          <div class="entry-meta">
            <div>
              <button class="entry-time" type="button" data-action="jump" data-id="${entry.id}">${String(total - index).padStart(2, "0")} · ${escapeHtml(entry.timecode)}</button>
      <span class="tag ${getTagClass(entry.type)}">${escapeHtml(entry.type)}</span>
              ${entry.referenceImage ? '<span class="image-label">含参考图</span>' : ""}
              ${duplicate ? `<button class="duplicate-label" type="button" data-action="highlight" data-id="${duplicate.otherId}">可能和第 ${duplicate.otherNumber} 条重复</button>` : ""}
            </div>
          </div>
          <p class="entry-note">${escapeHtml(entry.note)}</p>
          ${entry.referenceImage ? `<img class="entry-image" src="${entry.referenceImage}" alt="参考图" />` : ""}
          <div class="entry-actions">
            <button type="button" data-action="edit" data-id="${entry.id}">编辑</button>
            <button type="button" data-action="delete" data-id="${entry.id}">删除</button>
          </div>
        </article>
      `;
      },
    )
    .join("");

  elements.list.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "edit") editEntry(button.dataset.id);
      if (button.dataset.action === "delete") deleteEntry(button.dataset.id);
      if (button.dataset.action === "jump") jumpVideoToEntry(button.dataset.id);
      if (button.dataset.action === "highlight") highlightEntry(button.dataset.id);
    });
  });
}

function findDuplicateHints(entries) {
  const sorted = getSortedEntries();
  const numberById = new Map(sorted.map((entry, index) => [entry.id, index + 1]));
  const hints = new Map();

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      if (!isPotentialDuplicate(left, right)) continue;
      hints.set(left.id, { otherId: right.id, otherNumber: numberById.get(right.id) || rightIndex + 1 });
      hints.set(right.id, { otherId: left.id, otherNumber: numberById.get(left.id) || leftIndex + 1 });
    }
  }

  return hints;
}

function isPotentialDuplicate(left, right) {
  if (!Number.isFinite(left.sortValue) || !Number.isFinite(right.sortValue)) return false;
  if (left.sortValue < 0 || right.sortValue < 0) return false;
  const timeClose = Math.abs(left.sortValue - right.sortValue) <= 5;
  if (!timeClose) return false;
  const overlap = getKeywordOverlap(left.note, right.note);
  return overlap >= 2 || getTextSimilarity(left.note, right.note) >= 0.5;
}

function getKeywordOverlap(leftText, rightText) {
  const leftWords = extractKeywords(leftText);
  const rightWords = extractKeywords(rightText);
  return [...leftWords].filter((word) => rightWords.has(word)).length;
}

function extractKeywords(text) {
  const stopWords = new Set(["这个", "这里", "一下", "一点", "现在", "可以", "需要", "感觉", "有点", "一段", "这一段", "那个"]);
  const matched = String(text).match(/[A-Za-z0-9]+|[\u4e00-\u9fa5]{2,}/g) || [];
  const domainWords = ["删除", "删掉", "不要", "去掉", "点头", "素材", "空镜", "过曝", "裁剪", "防抖", "马赛克", "美颜", "锐度", "饱和度", "对比度", "BGM", "bgm", "花字", "包装", "字幕", "Judy", "深圳", "产品"];
  const words = matched.filter((word) => !stopWords.has(word) && word.length >= 2);
  domainWords.forEach((word) => {
    if (String(text).includes(word)) words.push(word.toLowerCase());
  });
  return new Set(words.map((word) => word.toLowerCase()));
}

function getTextSimilarity(leftText, rightText) {
  const leftWords = extractKeywords(leftText);
  const rightWords = extractKeywords(rightText);
  if (!leftWords.size || !rightWords.size) return 0;
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  return overlap / Math.min(leftWords.size, rightWords.size);
}

function highlightEntry(id) {
  elements.list.querySelectorAll(".entry-item.is-active").forEach((item) => item.classList.remove("is-active"));
  const target = elements.list.querySelector(`.entry-item[data-entry-id="${escapeSelector(id)}"]`);
  target?.classList.add("is-active");
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderPreview(entries) {
  if (!entries.length) {
    elements.preview.innerHTML = `
      <div class="preview-sheet">
        <div class="preview-title">视频修改意见</div>
        <div class="preview-count">共 0 条</div>
      </div>
    `;
    return;
  }

  elements.preview.innerHTML = `
    <div class="preview-sheet" id="previewSheet">
      <div class="preview-title">视频修改意见</div>
      <div class="preview-count">共 ${entries.length} 条</div>
      ${entries
        .map(
          (entry, index) => `
            <article class="preview-card">
              <div class="preview-time-row">
                <span class="preview-index">${String(index + 1).padStart(2, "0")}</span>
                <span class="preview-time">${escapeHtml(entry.timecode)}</span>
              </div>
              <span class="tag ${getTagClass(entry.type)}">${escapeHtml(entry.type)}</span>
              <div class="preview-note">${escapeHtml(entry.note)}</div>
              ${entry.referenceImage ? `<img class="preview-image" src="${entry.referenceImage}" alt="参考图" />` : ""}
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function editEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  state.editingId = id;
  elements.time.value = entry.timecode;
  elements.type.value = [...elements.type.options].some((option) => option.value === entry.type) ? entry.type : "自动识别";
  elements.note.value = entry.note;
  state.referenceImage = entry.referenceImage || null;
  renderReferencePreview();
  elements.submit.textContent = "保存修改";
  elements.cancel.hidden = false;
  elements.note.focus();
}

function deleteEntry(id) {
  state.entries = state.entries.filter((entry) => entry.id !== id);
  if (state.editingId === id) resetForm();
  saveEntries();
  render();
}

function clearAll() {
  if (!state.entries.length) return;
  state.entries = [];
  saveEntries();
  resetForm();
  render();
  showToast("已清空");
}

function copyLastTime() {
  if (!state.entries.length) return;
  const latest = getLatestEntries()[0];
  elements.time.value = latest.timecode;
  elements.note.value = "";
  removeReferenceImage();
  elements.note.focus();
  showToast("已复制时间轴");
}

function jumpVideoToEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry || !state.videoUrl || !Number.isFinite(entry.sortValue) || entry.sortValue < 0) {
    showToast(state.videoUrl ? "这条意见没有可定位时间" : "请先导入视频");
    return;
  }
  seekVideoTo(entry.sortValue);
  elements.list.querySelectorAll(".entry-item.is-active").forEach((item) => item.classList.remove("is-active"));
  elements.list.querySelector(`.entry-item[data-entry-id="${escapeSelector(id)}"]`)?.classList.add("is-active");
  showToast("已定位到原片时间");
}

function nudgeVideo(amount) {
  if (!state.videoUrl) {
    showToast("请先导入视频");
    return;
  }
  const frameStep = 1 / 25;
  const delta = amount === "frame" ? frameStep : amount === "-frame" ? -frameStep : Number(amount);
  if (!Number.isFinite(delta)) return;
  seekVideoTo((elements.sourceVideo.currentTime || 0) + delta);
}

function jumpToTypedTime() {
  if (!state.videoUrl) {
    showToast("请先导入视频");
    return;
  }
  const raw = elements.jumpTime.value.trim();
  if (!raw) {
    elements.jumpTime.focus();
    return;
  }
  const timecode = normalizeSingleTime(raw);
  const seconds = timecodeToSeconds(timecode);
  if (!Number.isFinite(seconds)) {
    showToast("时间格式不对");
    return;
  }
  seekVideoTo(seconds);
}

function seekVideoTo(seconds) {
  const duration = elements.sourceVideo.duration;
  const max = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  elements.sourceVideo.currentTime = Math.max(0, Math.min(seconds, max));
  updateCurrentVideoTime();
}

function toggleVideoPlayback() {
  if (!state.videoUrl) {
    showToast("请先导入视频");
    return;
  }
  if (elements.sourceVideo.paused) {
    elements.sourceVideo.play();
  } else {
    elements.sourceVideo.pause();
  }
}

function updatePlayButton() {
  const isPlaying = !elements.sourceVideo.paused;
  elements.playToggle.dataset.playing = isPlaying ? "true" : "false";
  elements.playToggle.setAttribute("aria-label", isPlaying ? "暂停" : "播放");
}

function scrubVideo() {
  if (!state.videoUrl) return;
  const duration = elements.sourceVideo.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  seekVideoTo((Number(elements.videoScrubber.value) / 1000) * duration);
}

function cyclePlaybackSpeed() {
  const speeds = [0.5, 0.75, 1, 1.5, 2];
  const current = elements.sourceVideo.playbackRate || 1;
  const currentIndex = speeds.findIndex((speed) => Math.abs(speed - current) < 0.01);
  const speed = speeds[(currentIndex + 1) % speeds.length];
  elements.sourceVideo.playbackRate = speed;
  elements.speedToggle.textContent = `${speed}x`;
  showToast(`已切换到 ${speed}x`);
}

function timecodeToSeconds(timecode) {
  const match = String(timecode).match(/^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return Number.NaN;
  const [, hours, minutes, seconds, frames] = match.map(Number);
  return hours * 3600 + minutes * 60 + seconds + frames / 25;
}

function setRangeStart() {
  if (!state.videoUrl) {
    showToast("请先导入视频");
    return;
  }
  state.rangeStart = elements.sourceVideo.currentTime || 0;
  updateSelectedRangeLabel();
}

function setRangeEnd() {
  if (!state.videoUrl) {
    showToast("请先导入视频");
    return;
  }
  state.rangeEnd = elements.sourceVideo.currentTime || 0;
  updateSelectedRangeLabel();
}

function jumpToRangePoint(point) {
  if (!state.videoUrl) {
    showToast("请先导入视频");
    return;
  }
  const seconds = point === "start" ? state.rangeStart : state.rangeEnd;
  if (!Number.isFinite(seconds)) {
    showToast(point === "start" ? "还没选择开始时间" : "还没选择结束时间");
    return;
  }
  seekVideoTo(seconds);
  showToast(point === "start" ? "已跳到开始时间" : "已跳到结束时间");
}

function clearRangePoint(point) {
  if (point === "start") {
    state.rangeStart = null;
    showToast("已删除开始时间");
  } else {
    state.rangeEnd = null;
    showToast("已删除结束时间");
  }
  updateSelectedRangeLabel();
}

function applySelectedRange() {
  if (!Number.isFinite(state.rangeStart) || !Number.isFinite(state.rangeEnd)) {
    showToast("请先设置起点和终点");
    return;
  }
  const start = Math.min(state.rangeStart, state.rangeEnd);
  const end = Math.max(state.rangeStart, state.rangeEnd);
  if (Math.abs(end - start) < 0.04) {
    showToast("起点和终点太接近");
    return;
  }
  elements.time.value = `${formatSecondsToTimecode(start)} - ${formatSecondsToTimecode(end)}`;
  elements.note.focus();
  showToast("已带入选中区间");
}

function updateSelectedRangeLabel() {
  if (!Number.isFinite(state.rangeStart) && !Number.isFinite(state.rangeEnd)) {
    elements.selectedRange.textContent = "还没选这一段";
    elements.rangeStartText.textContent = "未选择";
    elements.rangeEndText.textContent = "未选择";
    return;
  }
  const startText = Number.isFinite(state.rangeStart) ? formatSecondsToTimecode(state.rangeStart) : "未设起点";
  const endText = Number.isFinite(state.rangeEnd) ? formatSecondsToTimecode(state.rangeEnd) : "未设终点";
  elements.selectedRange.textContent = `${startText} - ${endText}`;
  elements.rangeStartText.textContent = startText;
  elements.rangeEndText.textContent = endText;
}

function escapeSelector(value) {
  if (globalThis.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function handleVideoUpload(event) {
  const file = event.target.files?.[0];
  loadVideoFile(file);
}

function loadVideoFile(file) {
  if (!file) return;
  if (!file.type.startsWith("video/")) {
    showToast("请拖入视频文件");
    return;
  }
  if (state.videoUrl) {
    URL.revokeObjectURL(state.videoUrl);
  }
  state.videoUrl = URL.createObjectURL(file);
  elements.videoFileName.textContent = file.name || "已选择视频";
  elements.sourceVideo.src = state.videoUrl;
  elements.videoTools.hidden = false;
  elements.workspace.classList.add("has-video");
  elements.workspace.classList.remove("video-portrait", "video-landscape");
  state.rangeStart = null;
  state.rangeEnd = null;
  updateSelectedRangeLabel();
  showToast("视频已导入");
}

function handleVideoDragEnter(event) {
  event.preventDefault();
  elements.videoDropzone.classList.add("is-dragging");
}

function handleVideoDragOver(event) {
  event.preventDefault();
  elements.videoDropzone.classList.add("is-dragging");
}

function handleVideoDragLeave(event) {
  if (!elements.videoDropzone.contains(event.relatedTarget)) {
    elements.videoDropzone.classList.remove("is-dragging");
  }
}

function handleVideoDrop(event) {
  event.preventDefault();
  elements.videoDropzone.classList.remove("is-dragging");
  loadVideoFile(event.dataTransfer?.files?.[0]);
}

function updateCurrentVideoTime() {
  const current = elements.sourceVideo.currentTime || 0;
  const duration = elements.sourceVideo.duration || 0;
  const currentText = formatSecondsToTimecode(current);
  elements.currentVideoTime.textContent = currentText;
  elements.stripCurrentTime.textContent = currentText;
  elements.stripDuration.textContent = Number.isFinite(duration) && duration > 0 ? formatSecondsToTimecode(duration) : "00:00:00:00";
  elements.videoScrubber.value = Number.isFinite(duration) && duration > 0 ? String(Math.round((current / duration) * 1000)) : "0";
}

function updateVideoLayout() {
  const video = elements.sourceVideo;
  if (!video.videoWidth || !video.videoHeight) return;
  elements.workspace.classList.remove("video-portrait", "video-landscape");
  elements.workspace.classList.add(video.videoHeight > video.videoWidth ? "video-portrait" : "video-landscape");
}

function captureCurrentFrame() {
  const video = elements.sourceVideo;
  if (!video.src || !video.videoWidth || !video.videoHeight) {
    showToast("请先导入视频");
    return;
  }

  const canvas = document.createElement("canvas");
  const maxWidth = 900;
  const ratio = video.videoHeight / video.videoWidth;
  canvas.width = Math.min(video.videoWidth, maxWidth);
  canvas.height = Math.round(canvas.width * ratio);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  state.referenceImage = canvas.toDataURL("image/jpeg", 0.88);
  elements.time.value = formatSecondsToTimecode(video.currentTime || 0);
  elements.imageInput.value = "";
  elements.imageFileName.textContent = "当前画面截图";
  renderReferencePreview("当前画面截图");
  elements.note.focus();
  showToast("已带入画面");
}

function resetForm(options = {}) {
  const { focusTime = true, forceFocus = false } = options;
  state.editingId = null;
  elements.form.reset();
  state.referenceImage = null;
  renderReferencePreview();
  elements.type.value = "自动识别";
  elements.submit.textContent = "添加一条";
  elements.cancel.hidden = true;
  if (focusTime && (forceFocus || !isSmallScreen())) {
    elements.time.focus();
  } else if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
}

function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  elements.imageFileName.textContent = file.name || "已选择图片";
  const reader = new FileReader();
  reader.onload = () => {
    state.referenceImage = String(reader.result);
    renderReferencePreview(file.name || "已选择图片");
  };
  reader.readAsDataURL(file);
}

function removeReferenceImage() {
  state.referenceImage = null;
  elements.imageInput.value = "";
  elements.imageFileName.textContent = "未选择图片";
  renderReferencePreview();
}

function renderReferencePreview(label = "已选择图片") {
  if (!state.referenceImage) {
    elements.imagePreview.hidden = true;
    elements.imagePreviewImg.removeAttribute("src");
    return;
  }
  elements.imagePreview.hidden = false;
  elements.imagePreviewImg.src = state.referenceImage;
  elements.imageFileName.textContent = label;
}

let toastTimer = null;

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2200);
}

function isSmallScreen() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function exportProject() {
  const project = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
  };
  const content = JSON.stringify(project, null, 2);
  downloadBlob(content, `视频修改意见项目_${getDateStamp()}.json`, "application/json");
  showToast("项目已导出");
}

function importProject(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || "{}"));
      const incoming = Array.isArray(data) ? data : data.entries;
      if (!Array.isArray(incoming)) throw new Error("invalid project");

      const result = mergeImportedEntries(incoming);
      saveEntries();
      resetForm({ focusTime: false });
      render();
      showToast(`已导入 ${result.added} 条，合并 ${result.merged} 条`);
    } catch (error) {
      console.error(error);
      showToast("项目文件无法导入");
    } finally {
      elements.importProject.value = "";
    }
  };
  reader.readAsText(file);
}

function mergeImportedEntries(incomingEntries) {
  let added = 0;
  let merged = 0;
  const byId = new Map(state.entries.map((entry) => [entry.id, entry]));
  const byContent = new Map(state.entries.map((entry) => [getEntryContentKey(entry), entry]));

  incomingEntries.forEach((entry, index) => {
    const normalized = normalizeImportedEntry(entry, index);
    if (!normalized) return;

    const sameId = byId.get(normalized.id);
    if (sameId) {
      if (isImportedEntryNewer(normalized, sameId)) {
        Object.assign(sameId, normalized);
      }
      merged += 1;
      byContent.set(getEntryContentKey(sameId), sameId);
      return;
    }

    const sameContent = byContent.get(getEntryContentKey(normalized));
    if (sameContent) {
      if (!sameContent.referenceImage && normalized.referenceImage) {
        sameContent.referenceImage = normalized.referenceImage;
        sameContent.updatedAt = normalized.updatedAt;
      }
      merged += 1;
      byId.set(sameContent.id, sameContent);
      return;
    }

    state.entries.push(normalized);
    byId.set(normalized.id, normalized);
    byContent.set(getEntryContentKey(normalized), normalized);
    added += 1;
  });

  return { added, merged };
}

function normalizeImportedEntry(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const note = String(entry.note || "").trim();
  if (!note) return null;

  const timecode = entry.timecode ? String(entry.timecode) : "全片";
  const type = entry.type ? String(entry.type) : detectType(note, timecode);
  const now = new Date().toISOString();
  return {
    id: entry.id ? String(entry.id) : globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now() + Math.random()),
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : Date.now() + index,
    timecode,
    type,
    note,
    referenceImage: entry.referenceImage ? String(entry.referenceImage) : null,
    sortValue: getSortValue(timecode),
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || entry.createdAt || now,
  };
}

function getEntryContentKey(entry) {
  return [entry.timecode || "全片", entry.type || "修改", entry.note || ""].map((value) => String(value).trim()).join("||");
}

function isImportedEntryNewer(incoming, existing) {
  const incomingTime = Date.parse(incoming.updatedAt || incoming.createdAt || "");
  const existingTime = Date.parse(existing.updatedAt || existing.createdAt || "");
  if (Number.isFinite(incomingTime) && Number.isFinite(existingTime)) return incomingTime > existingTime;
  if (Number.isFinite(incomingTime)) return true;
  return false;
}

async function downloadJpg() {
  try {
    const entries = getSortedEntries();
    if (!entries.length) return;
    const imageCount = entries.filter((entry) => entry.referenceImage).length;
    if (entries.length > 12 || imageCount >= 6) {
      showToast("正在生成总览图");
      const canvas = await createOverviewCanvas(entries, imageCount >= 6);
      downloadCanvasAsJpg(canvas, `修改意见_${getDateStamp()}_总览.jpg`);
      return;
    }
    const canvas = await createImageCanvas(entries);
    downloadCanvasAsJpg(canvas, `修改意见_${getDateStamp()}.jpg`);
  } catch (error) {
    console.error(error);
    showToast("生成失败，请重试");
  }
}

function downloadCanvasAsJpg(canvas, filename) {
  if (canvas.toBlob) {
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        downloadBlob(blob, filename, "image/jpeg");
      },
      "image/jpeg",
      0.86,
    );
    return;
  }
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/jpeg", 0.86);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function createOverviewCanvas(entries, imageFocused = false) {
  const scale = 2;
  const width = 1920;
  const margin = 64;
  const gap = 18;
  const cols = getOverviewColumnCount(entries, imageFocused);
  const headerHeight = 168;
  const cellWidth = (width - margin * 2 - gap * (cols - 1)) / cols;
  const cellHeight = getOverviewCellHeight(imageFocused, cols);
  const rows = Math.ceil(entries.length / cols);
  const height = margin * 2 + headerHeight + rows * cellHeight + Math.max(rows - 1, 0) * gap;
  const maxNoteLines = imageFocused ? 4 : cols >= 5 ? 2 : 3;
  const fonts = {
    title: '800 46px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    small: '500 24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    column: '900 26px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    index: '900 24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    time: '900 30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    type: '800 20px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    note: '800 27px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
  };
  const images = await Promise.all(entries.map((entry) => loadReferenceImage(entry.referenceImage)));

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f6f7f1";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#181f2a";
  ctx.font = fonts.title;
  ctx.fillText("视频修改意见总览", margin, 82);
  ctx.fillStyle = "#5c6370";
  ctx.font = fonts.small;
  ctx.fillText(`共 ${entries.length} 条`, margin, 118);
  for (let col = 0; col < cols; col += 1) {
    const columnX = margin + col * (cellWidth + gap);
    const label = `第 ${col + 1} 列 ↓`;
    const labelY = margin + headerHeight - 42;
    roundRect(ctx, columnX, labelY, cellWidth, 36, 9, "#182033", null);
    ctx.fillStyle = "#fff";
    ctx.font = fonts.column;
    ctx.textAlign = "center";
    ctx.fillText(label, columnX + cellWidth / 2, labelY + 27);
    ctx.textAlign = "left";
    if (col > 0) {
      const lineX = columnX - gap / 2;
      ctx.fillStyle = "#d5d8d0";
      ctx.fillRect(lineX - 2, margin + headerHeight - 42, 4, height - margin - (margin + headerHeight - 42));
    }
  }

  entries.forEach((entry, index) => {
    const image = images[index];
    const col = Math.floor(index / rows);
    const row = index % rows;
    const x = margin + col * (cellWidth + gap);
    const y = margin + headerHeight + row * (cellHeight + gap);
    const realIndex = index + 1;

    roundRect(ctx, x, y, cellWidth, cellHeight, 14, "#fff", "#dfe1dc");
    roundRect(ctx, x + 18, y + 16, 44, 36, 9, "#182033", null);
    ctx.fillStyle = "#fff";
    ctx.font = fonts.index;
    ctx.fillText(String(realIndex).padStart(2, "0"), x + 26, y + 42);

    ctx.fillStyle = "#09101b";
    ctx.font = fonts.time;
    ctx.fillText(entry.timecode, x + 74, y + 40);

    const tagText = entry.type;
    const tagColor = getCanvasTagColor(tagText);
    ctx.font = fonts.type;
    const tagWidth = Math.min(ctx.measureText(tagText).width + 24, cellWidth - 36);
    roundRect(ctx, x + 18, y + 58, tagWidth, 32, 9, tagColor, null);
    ctx.fillStyle = "#fff";
    ctx.fillText(tagText, x + 30, y + 82);

    const noteX = x + 18;
    const noteY = y + 104;
    const noteHeight = cellHeight - 122;
    const imageMaxWidth = getOverviewImageMaxWidth(imageFocused, cols, cellWidth);
    const imageMaxHeight = getOverviewImageMaxHeight(imageFocused, cols, noteHeight);
    const imageBox = image ? calculateImageSize(image, imageMaxWidth, imageMaxWidth, imageMaxHeight) : null;
    const imageX = image ? x + cellWidth - imageBox.width - 18 : 0;
    const imageY = image ? y + 104 : 0;
    const noteWidth = image ? imageX - noteX - 14 : cellWidth - 36;
    roundRect(ctx, noteX, noteY, noteWidth, noteHeight, 10, "#fff1a8", null);
    ctx.fillStyle = "#0c111a";
    ctx.font = fonts.note;
    const lines = limitCanvasLines(ctx, wrapCanvasText(ctx, entry.note, noteWidth - 28), maxNoteLines, noteWidth - 28);
    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, noteX + 14, noteY + 38 + lineIndex * 38);
    });

    if (image) {
      roundRect(ctx, imageX, imageY, imageBox.width, imageBox.height, 10, "#f4f5f0", null);
      ctx.save();
      roundedClip(ctx, imageX, imageY, imageBox.width, imageBox.height, 10);
      ctx.drawImage(image, imageX, imageY, imageBox.width, imageBox.height);
      ctx.restore();
    }
  });

  canvas.safeSliceY = createOverviewSafeSliceY(rows, margin, headerHeight, cellHeight, gap, height, scale);
  return canvas;
}

function createOverviewSafeSliceY(rows, margin, headerHeight, cellHeight, gap, height, scale) {
  const breaks = [0];
  for (let row = 1; row < rows; row += 1) {
    const rowTop = margin + headerHeight + row * (cellHeight + gap);
    breaks.push(Math.round((rowTop - gap / 2) * scale));
  }
  breaks.push(Math.round(height * scale));
  return breaks;
}

function getOverviewColumnCount(entries, imageFocused) {
  const count = entries.length;
  if (imageFocused) {
    if (count >= 18) return 3;
    return 2;
  }
  if (count > 60) return 5;
  if (count > 30) return 4;
  return 3;
}

function getOverviewCellHeight(imageFocused, cols) {
  if (imageFocused) {
    if (cols === 3) return 320;
    return 318;
  }
  if (cols >= 5) return 180;
  if (cols === 4) return 192;
  return 206;
}

function getOverviewImageMaxWidth(imageFocused, cols, cellWidth) {
  if (imageFocused) {
    if (cols === 3) return Math.min(260, cellWidth * 0.42);
    return Math.min(310, cellWidth * 0.42);
  }
  return cols >= 4 ? 136 : 178;
}

function getOverviewImageMaxHeight(imageFocused, cols, noteHeight) {
  if (imageFocused) {
    if (cols === 3) return Math.min(noteHeight, 170);
    return noteHeight;
  }
  return cols >= 4 ? 92 : 126;
}

function limitCanvasLines(ctx, lines, maxLines, maxWidth) {
  if (lines.length <= maxLines) return lines;
  const limited = lines.slice(0, maxLines);
  const lastIndex = limited.length - 1;
  let lastLine = limited[lastIndex];
  while (lastLine.length > 1 && ctx.measureText(`${lastLine}...`).width > maxWidth) {
    lastLine = lastLine.slice(0, -1);
  }
  limited[lastIndex] = `${lastLine}...`;
  return limited;
}

async function downloadPdf() {
  try {
    const entries = getSortedEntries();
    if (!entries.length) return;
    showToast("正在生成 PDF");
    const pdfBytes = await createPdfFromEntries(entries);
    downloadBlob(pdfBytes, `修改意见_${getDateStamp()}.pdf`, "application/pdf");
  } catch (error) {
    console.error(error);
    showToast("生成 PDF 失败，请重试");
  }
}

async function createPdfFromEntries(entries) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const pdfMargin = 24;
  const pdfContentWidth = pageWidth - pdfMargin * 2;
  const scale = 2;
  const width = 1900;
  const margin = 70;
  const cardPad = 34;
  const cardGap = 18;
  const defaultPageHeight = Math.round(width * ((pageHeight - pdfMargin * 2) / pdfContentWidth));
  const bottomPad = 50;
  const firstPageTop = 168;
  const nextPageTop = 54;
  const fonts = {
    title: '800 54px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    small: '500 30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    meta: '800 30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    time: '900 42px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    type: '800 30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    note: '850 44px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
  };
  const cards = await prepareExportCards(entries, { width, margin, cardPad, fonts });
  const pages = [];
  let page = createPdfPageCanvas(width, defaultPageHeight, scale);
  drawPdfHeader(page.ctx, { margin, fonts, total: entries.length });
  let y = firstPageTop;
  let pageHasCard = false;

  const finishPage = () => {
    pages.push(canvasToPdfImagePage(page.canvas, pdfContentWidth));
  };

  cards.forEach((card, index) => {
    const wouldOverflow = y + card.height > page.logicalHeight - bottomPad;
    if (pageHasCard && wouldOverflow) {
      finishPage();
      page = createPdfPageCanvas(width, Math.max(defaultPageHeight, nextPageTop + card.height + bottomPad), scale);
      y = nextPageTop;
      pageHasCard = false;
    } else if (!pageHasCard && wouldOverflow && y + card.height + bottomPad > page.logicalHeight) {
      page = createPdfPageCanvas(width, y + card.height + bottomPad, scale);
      if (index === 0) drawPdfHeader(page.ctx, { margin, fonts, total: entries.length });
    }

    drawExportCard(page.ctx, card, index, y, { width, margin, cardPad, fonts });
    y += card.height + cardGap;
    pageHasCard = true;
  });

  if (pageHasCard || !pages.length) finishPage();
  return buildImagePdf(pages, pageWidth, pageHeight, pdfMargin, pdfContentWidth);
}

async function prepareExportCards(entries, layout) {
  const { width, margin, cardPad, fonts } = layout;
  const fullContentWidth = width - margin * 2 - cardPad * 2;
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = fonts.note;
  const loadedImages = await Promise.all(entries.map((entry) => loadReferenceImage(entry.referenceImage)));
  return entries.map((entry, index) => {
    const image = loadedImages[index];
    const isPortraitImage = image && getImageRatio(image) > 1.12;
    const imageBox = image ? calculateImageSize(image, fullContentWidth, isPortraitImage ? 390 : 720, isPortraitImage ? 500 : 440) : null;
    const textWidth = isPortraitImage ? fullContentWidth - imageBox.width - 34 : fullContentWidth;
    const lines = wrapCanvasText(measureCtx, entry.note, textWidth - 44);
    const noteBlockHeight = lines.length * 62 + 28;
    const baseHeight = 152 + noteBlockHeight + 34;
    const imageExtraHeight = image && !isPortraitImage ? imageBox.height + 62 : 0;
    const sideBySideHeight = image && isPortraitImage ? Math.max(baseHeight, 152 + imageBox.height + 34) : baseHeight;
    return {
      entry,
      lines,
      image,
      imageBox,
      isPortraitImage,
      textWidth,
      noteBlockHeight,
      height: image && isPortraitImage ? sideBySideHeight : baseHeight + imageExtraHeight,
    };
  });
}

function createPdfPageCanvas(width, height, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = Math.ceil(height) * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f6f7f1";
  ctx.fillRect(0, 0, width, height);
  return {
    canvas,
    ctx,
    logicalHeight: height,
  };
}

function drawPdfHeader(ctx, { margin, fonts, total }) {
  ctx.fillStyle = "#181f2a";
  ctx.font = fonts.title;
  ctx.fillText("视频修改意见", margin, 96);
  ctx.fillStyle = "#5c6370";
  ctx.font = fonts.small;
  ctx.fillText(`共 ${total} 条`, margin, 146);
}

function drawExportCard(ctx, card, index, y, layout) {
  const { width, margin, cardPad, fonts } = layout;
  const { entry, lines, image, imageBox, isPortraitImage, textWidth, noteBlockHeight, height: cardHeight } = card;
  roundRect(ctx, margin, y, width - margin * 2, cardHeight, 18, "#fff", "#dfe1dc");
  ctx.fillStyle = "#777e8a";
  ctx.font = fonts.meta;
  ctx.fillText(String(index + 1).padStart(2, "0"), margin + cardPad, y + 64);
  ctx.fillStyle = "#09101b";
  ctx.font = fonts.time;
  ctx.fillText(entry.timecode, margin + cardPad + 82, y + 62);

  const tag = getCanvasTagColor(entry.type);
  ctx.font = fonts.type;
  const tagWidth = ctx.measureText(entry.type).width + 34;
  roundRect(ctx, margin + cardPad, y + 94, tagWidth, 46, 13, tag, null);
  ctx.fillStyle = "#fff";
  ctx.fillText(entry.type, margin + cardPad + 17, y + 128);

  const noteX = margin + cardPad;
  const noteY = y + 152;
  roundRect(ctx, noteX, noteY, textWidth, noteBlockHeight, 12, "#fff1a8", null);
  ctx.fillStyle = "#0c111a";
  ctx.font = fonts.note;
  lines.forEach((line, lineIndex) => {
    ctx.fillText(line, noteX + 22, noteY + 54 + lineIndex * 62);
  });

  if (image) {
    const imageX = isPortraitImage ? noteX + textWidth + 34 : noteX;
    const imageY = isPortraitImage ? y + 152 : noteY + noteBlockHeight + 20;
    roundRect(ctx, imageX, imageY, imageBox.width, imageBox.height, 12, "#f4f5f0", null);
    ctx.save();
    roundedClip(ctx, imageX, imageY, imageBox.width, imageBox.height, 12);
    ctx.drawImage(image, imageX, imageY, imageBox.width, imageBox.height);
    ctx.restore();
  }
}

function canvasToPdfImagePage(canvas, contentWidth) {
  const jpegBytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.86));
  return {
    bytes: jpegBytes,
    pixelWidth: canvas.width,
    pixelHeight: canvas.height,
    drawHeight: contentWidth * (canvas.height / canvas.width),
  };
}

async function createImageCanvas(entries) {
  const scale = 2;
  const width = 1600;
  const margin = 70;
  const cardPad = 34;
  const cardGap = 26;
  const fullContentWidth = width - margin * 2 - cardPad * 2;
  const fonts = {
    title: '800 54px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    small: '500 30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    meta: '800 30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    time: '900 42px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    type: '800 30px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    note: '850 44px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
  };

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = fonts.note;
  const loadedImages = await Promise.all(entries.map((entry) => loadReferenceImage(entry.referenceImage)));
  const cards = entries.map((entry, index) => {
    const image = loadedImages[index];
    const isPortraitImage = image && getImageRatio(image) > 1.12;
    const imageBox = image ? calculateImageSize(image, fullContentWidth, isPortraitImage ? 430 : 760, isPortraitImage ? 560 : 520) : null;
    const textWidth = isPortraitImage ? fullContentWidth - imageBox.width - 34 : fullContentWidth;
    const lines = wrapCanvasText(measureCtx, entry.note, textWidth - 44);
    const noteBlockHeight = lines.length * 62 + 28;
    const baseHeight = 152 + noteBlockHeight + 34;
    const imageExtraHeight = image && !isPortraitImage ? imageBox.height + 62 : 0;
    const sideBySideHeight = image && isPortraitImage ? Math.max(baseHeight, 152 + imageBox.height + 34) : baseHeight;
    return {
      entry,
      lines,
      image,
      imageBox,
      isPortraitImage,
      textWidth,
      noteBlockHeight,
      height: image && isPortraitImage ? sideBySideHeight : baseHeight + imageExtraHeight,
    };
  });
  const height = Math.max(500, 244 + cards.reduce((sum, card) => sum + card.height + cardGap, 0));

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f6f7f1";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#181f2a";
  ctx.font = fonts.title;
  ctx.fillText("视频修改意见", margin, 96);
  ctx.fillStyle = "#5c6370";
  ctx.font = fonts.small;
  ctx.fillText(`共 ${entries.length} 条`, margin, 146);

  let y = 184;
  const safeSliceY = [0];
  cards.forEach(({ entry, lines, image, imageBox, isPortraitImage, textWidth, noteBlockHeight, height: cardHeight }, index) => {
    roundRect(ctx, margin, y, width - margin * 2, cardHeight, 18, "#fff", "#dfe1dc");
    ctx.fillStyle = "#777e8a";
    ctx.font = fonts.meta;
    ctx.fillText(String(index + 1).padStart(2, "0"), margin + cardPad, y + 64);
    ctx.fillStyle = "#09101b";
    ctx.font = fonts.time;
    ctx.fillText(entry.timecode, margin + cardPad + 82, y + 62);

    const tag = getCanvasTagColor(entry.type);
    ctx.font = fonts.type;
    const tagWidth = ctx.measureText(entry.type).width + 34;
    roundRect(ctx, margin + cardPad, y + 94, tagWidth, 46, 13, tag, null);
    ctx.fillStyle = "#fff";
    ctx.fillText(entry.type, margin + cardPad + 17, y + 128);

    const noteX = margin + cardPad;
    const noteY = y + 152;
    roundRect(ctx, noteX, noteY, textWidth, noteBlockHeight, 12, "#fff1a8", null);
    ctx.fillStyle = "#0c111a";
    ctx.font = fonts.note;
    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, noteX + 22, noteY + 54 + lineIndex * 62);
    });

    if (image) {
      const imageX = isPortraitImage ? noteX + textWidth + 34 : noteX;
      const imageY = isPortraitImage ? y + 152 : noteY + noteBlockHeight + 20;
      roundRect(ctx, imageX, imageY, imageBox.width, imageBox.height, 12, "#f4f5f0", null);
      ctx.save();
      roundedClip(ctx, imageX, imageY, imageBox.width, imageBox.height, 12);
      ctx.drawImage(image, imageX, imageY, imageBox.width, imageBox.height);
      ctx.restore();
    }
    y += cardHeight + cardGap;
    safeSliceY.push(Math.round((y - cardGap / 2) * scale));
  });

  safeSliceY[safeSliceY.length - 1] = canvas.height;
  canvas.safeSliceY = safeSliceY;
  return canvas;
}

function loadReferenceImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function getImageRatio(image) {
  const naturalWidth = image.naturalWidth || image.width || 1;
  const naturalHeight = image.naturalHeight || image.height || 1;
  return naturalHeight / naturalWidth;
}

function calculateImageSize(image, maxWidth, preferredWidth = 760, maxHeight = 520) {
  const naturalWidth = image.naturalWidth || image.width || 1;
  const naturalHeight = image.naturalHeight || image.height || 1;
  const ratio = naturalHeight / naturalWidth;
  let width = Math.min(maxWidth, preferredWidth);
  let height = Math.round(width * ratio);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height / ratio);
  }
  return {
    width,
    height,
  };
}

function roundedClip(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.clip();
}

async function createPdfFromCanvas(sourceCanvas) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 24;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const sliceHeight = Math.floor(sourceCanvas.width * (contentHeight / contentWidth));
  const pages = [];

  for (let y = 0; y < sourceCanvas.height; ) {
    const targetEnd = Math.min(y + sliceHeight, sourceCanvas.height);
    const sliceEnd = getSafePdfSliceEnd(sourceCanvas, y, targetEnd, sliceHeight);
    const currentHeight = sliceEnd - y;
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = sourceCanvas.width;
    pageCanvas.height = currentHeight;
    const ctx = pageCanvas.getContext("2d");
    ctx.fillStyle = "#f6f7f1";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(sourceCanvas, 0, y, sourceCanvas.width, currentHeight, 0, 0, sourceCanvas.width, currentHeight);
    const jpegBytes = dataUrlToBytes(pageCanvas.toDataURL("image/jpeg", 0.86));
    pages.push({
      bytes: jpegBytes,
      pixelWidth: pageCanvas.width,
      pixelHeight: pageCanvas.height,
      drawHeight: contentWidth * (pageCanvas.height / pageCanvas.width),
    });
    y = sliceEnd;
  }

  return buildImagePdf(pages, pageWidth, pageHeight, margin, contentWidth);
}

function getSafePdfSliceEnd(sourceCanvas, sliceStart, targetEnd, sliceHeight) {
  if (targetEnd >= sourceCanvas.height) return sourceCanvas.height;
  const safeSliceY = Array.isArray(sourceCanvas.safeSliceY) ? sourceCanvas.safeSliceY : [];
  const minEnd = sliceStart + Math.min(900, Math.floor(sliceHeight * 0.35));
  const candidates = safeSliceY.filter((breakY) => breakY > minEnd && breakY <= targetEnd);
  if (candidates.length) return candidates[candidates.length - 1];
  return Math.max(targetEnd, sliceStart + 1);
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildImagePdf(pages, pageWidth, pageHeight, margin, contentWidth) {
  const encoder = new TextEncoder();
  const objects = [];
  const pageObjectIds = [];

  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject("");
  const pagesId = addObject("");

  pages.forEach((page, index) => {
    const imageId = addObject({
      header: `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`,
      bytes: page.bytes,
      footer: "\nendstream",
    });
    const imageName = `/Im${index + 1}`;
    const drawHeight = Math.min(page.drawHeight, pageHeight - margin * 2);
    const drawY = pageHeight - margin - drawHeight;
    const content = `q\n${contentWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${margin.toFixed(2)} ${drawY.toFixed(2)} cm\n${imageName} Do\nQ\n`;
    const contentBytes = encoder.encode(content);
    const contentId = addObject({
      header: `<< /Length ${contentBytes.length} >>\nstream\n`,
      bytes: contentBytes,
      footer: "\nendstream",
    });
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /ProcSet [/PDF /ImageC] /XObject << ${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageObjectIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  const chunks = [];
  const offsets = [0];
  let length = 0;
  const pushText = (text) => {
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    length += bytes.length;
  };
  const pushBytes = (bytes) => {
    chunks.push(bytes);
    length += bytes.length;
  };

  pushText("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
  objects.forEach((object, index) => {
    offsets[index + 1] = length;
    pushText(`${index + 1} 0 obj\n`);
    if (typeof object === "string") {
      pushText(object);
    } else {
      pushText(object.header);
      pushBytes(object.bytes);
      pushText(object.footer);
    }
    pushText("\nendobj\n");
  });

  const xrefOffset = length;
  pushText(`xref\n0 ${objects.length + 1}\n`);
  pushText("0000000000 65535 f \n");
  for (let index = 1; index <= objects.length; index += 1) {
    pushText(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const output = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function wrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  String(text)
    .split("\n")
    .forEach((part) => {
      let current = "";
      Array.from(part).forEach((char) => {
        const candidate = current + char;
        if (ctx.measureText(candidate).width <= maxWidth || !current) {
          current = candidate;
        } else {
          lines.push(current);
          current = char;
        }
      });
      if (current) lines.push(current);
    });
  return lines.length ? lines : [""];
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function getTagClass(type) {
  if (type.includes("删除")) return "delete";
  if (type.includes("花字") || type.includes("包装")) return "package";
  if (type.includes("字幕")) return "subtitle";
  if (type.includes("素材")) return "asset";
  if (type.includes("美颜")) return "beauty";
  if (type.includes("画面")) return "visual";
  if (type.includes("结构")) return "structure";
  return "default";
}

function getCanvasTagColor(type) {
  if (type.includes("删除")) return "#e24e43";
  if (type.includes("花字") || type.includes("包装")) return "#7052be";
  if (type.includes("字幕")) return "#187e9d";
  if (type.includes("素材")) return "#328051";
  if (type.includes("美颜")) return "#cc4f8a";
  if (type.includes("画面")) return "#c56f1c";
  if (type.includes("结构")) return "#5865f2";
  return "#596170";
}

function downloadBlob(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function getDateStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function saveEntries() {
  try {
    localStorage.setItem("timeline-note-entries", JSON.stringify(state.entries));
  } catch {
    // 浏览器禁用本地存储时，仍然允许本次页面内继续使用。
  }
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem("timeline-note-entries") || "[]").map((entry, index) => ({
      ...entry,
      order: entry.order ?? Date.now() + index,
      sortValue: getSortValue(entry.timecode || "未指定"),
      createdAt: entry.createdAt || null,
      updatedAt: entry.updatedAt || entry.createdAt || null,
    }));
  } catch {
    return [];
  }
}
