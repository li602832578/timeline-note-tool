const state = {
  entries: loadEntries(),
  editingId: null,
  referenceImage: null,
  videoUrl: null,
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
  videoFileName: document.querySelector("#videoFileName"),
  videoTools: document.querySelector("#videoTools"),
  sourceVideo: document.querySelector("#sourceVideo"),
  currentVideoTime: document.querySelector("#currentVideoTime"),
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
  preview: document.querySelector("#imagePreview"),
  count: document.querySelector("#countLabel"),
  toast: document.querySelector("#statusToast"),
  downloadJpg: document.querySelector("#downloadJpgButton"),
  downloadPdf: document.querySelector("#downloadPdfButton"),
  clearAll: document.querySelector("#clearAllButton"),
};

elements.form.addEventListener("submit", handleSubmit);
elements.videoInput.addEventListener("change", handleVideoUpload);
elements.sourceVideo.addEventListener("timeupdate", updateCurrentVideoTime);
elements.sourceVideo.addEventListener("loadedmetadata", () => {
  updateCurrentVideoTime();
  updateVideoLayout();
});
elements.captureFrame.addEventListener("click", captureCurrentFrame);
elements.cancel.addEventListener("click", resetForm);
elements.copyLastTime.addEventListener("click", copyLastTime);
elements.imageInput.addEventListener("change", handleImageUpload);
elements.removeImage.addEventListener("click", removeReferenceImage);
elements.downloadJpg.addEventListener("click", downloadJpg);
elements.downloadPdf.addEventListener("click", downloadPdf);
elements.clearAll.addEventListener("click", clearAll);
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
      showToast("已保存成功");
    }
  } else {
    const timecode = normalizeTimeInput(rawTime);
    state.entries.push({
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now() + Math.random()),
      order: Date.now() + state.entries.length,
      timecode,
      type: selectedType === "自动识别" ? detectType(note, timecode) : selectedType,
      note,
      referenceImage: state.referenceImage,
      sortValue: getSortValue(timecode),
    });
    showToast("已添加成功");
  }

  saveEntries();
  resetForm({ focusTime: true, forceFocus: true });
  render();
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
  elements.count.textContent = `${sorted.length} 条`;
  elements.copyLastTime.disabled = state.entries.length === 0;
  renderList(latestFirst);
  renderPreview(sorted);
}

function getLatestEntries() {
  return [...state.entries].sort((a, b) => b.order - a.order);
}

function renderList(entries) {
  if (!entries.length) {
    elements.list.innerHTML = '<div class="empty-state">还没有添加修改意见</div>';
    return;
  }

  const total = entries.length;
  elements.list.innerHTML = entries
    .map(
      (entry, index) => `
        <article class="entry-item">
          <div class="entry-meta">
            <div>
              <div class="entry-time">${String(total - index).padStart(2, "0")} · ${escapeHtml(entry.timecode)}</div>
      <span class="tag ${getTagClass(entry.type)}">${escapeHtml(entry.type)}</span>
              ${entry.referenceImage ? '<span class="image-label">含参考图</span>' : ""}
            </div>
          </div>
          <p class="entry-note">${escapeHtml(entry.note)}</p>
          ${entry.referenceImage ? `<img class="entry-image" src="${entry.referenceImage}" alt="参考图" />` : ""}
          <div class="entry-actions">
            <button type="button" data-action="edit" data-id="${entry.id}">编辑</button>
            <button type="button" data-action="delete" data-id="${entry.id}">删除</button>
          </div>
        </article>
      `,
    )
    .join("");

  elements.list.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "edit") editEntry(button.dataset.id);
      if (button.dataset.action === "delete") deleteEntry(button.dataset.id);
    });
  });
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

function handleVideoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (state.videoUrl) {
    URL.revokeObjectURL(state.videoUrl);
  }
  state.videoUrl = URL.createObjectURL(file);
  elements.videoFileName.textContent = file.name || "已选择视频";
  elements.sourceVideo.src = state.videoUrl;
  elements.videoTools.hidden = false;
  elements.workspace.classList.add("has-video");
  elements.workspace.classList.remove("video-portrait", "video-landscape");
  showToast("原片已载入");
}

function updateCurrentVideoTime() {
  elements.currentVideoTime.textContent = formatSecondsToTimecode(elements.sourceVideo.currentTime || 0);
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
    showToast("请先上传原片");
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
  const cols = imageFocused ? 2 : 3;
  const headerHeight = 168;
  const cellWidth = (width - margin * 2 - gap * (cols - 1)) / cols;
  const cellHeight = imageFocused ? 268 : 206;
  const rows = Math.ceil(entries.length / cols);
  const height = margin * 2 + headerHeight + rows * cellHeight + Math.max(rows - 1, 0) * gap;
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
    const imageMaxWidth = imageFocused ? Math.min(310, cellWidth * 0.42) : 178;
    const imageMaxHeight = imageFocused ? noteHeight : 126;
    const imageBox = image ? calculateImageSize(image, imageMaxWidth, imageMaxWidth, imageMaxHeight) : null;
    const imageX = image ? x + cellWidth - imageBox.width - 18 : 0;
    const imageY = image ? y + 104 : 0;
    const noteWidth = image ? imageX - noteX - 14 : cellWidth - 36;
    roundRect(ctx, noteX, noteY, noteWidth, noteHeight, 10, "#fff1a8", null);
    ctx.fillStyle = "#0c111a";
    ctx.font = fonts.note;
    const lines = wrapCanvasText(ctx, entry.note, noteWidth - 28).slice(0, 3);
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

  return canvas;
}

async function downloadPdf() {
  const entries = getSortedEntries();
  if (!entries.length) return;
  showToast("正在生成 PDF");
  const canvas = await createImageCanvas(entries);
  const pdfBytes = await createPdfFromCanvas(canvas);
  downloadBlob(pdfBytes, `修改意见_${getDateStamp()}.pdf`, "application/pdf");
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
  });

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

  for (let y = 0; y < sourceCanvas.height; y += sliceHeight) {
    const currentHeight = Math.min(sliceHeight, sourceCanvas.height - y);
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
  }

  return buildImagePdf(pages, pageWidth, pageHeight, margin, contentWidth);
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
    const content = `q\n${contentWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${margin.toFixed(2)} ${drawY.toFixed(2)} cm\n${imageName} Do\nQ`;
    const contentBytes = encoder.encode(content);
    const contentId = addObject({
      header: `<< /Length ${contentBytes.length} >>\nstream\n`,
      bytes: contentBytes,
      footer: "\nendstream",
    });
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << ${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
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
  URL.revokeObjectURL(url);
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
    }));
  } catch {
    return [];
  }
}
