const state = {
  entries: loadEntries(),
  editingId: null,
};

const typeRules = [
  ["删除", ["删除", "删掉", "去掉", "不用", "不要", "撤掉"]],
  ["花字 / 包装", ["花字", "包装", "动效", "小花字", "版式"]],
  ["字幕", ["字幕", "title", "Title", "打上"]],
  ["素材", ["素材", "版权", "插入"]],
  ["画面剪辑", ["切", "点头", "景别", "斜拼", "画面", "拉大", "圈出来", "停留"]],
  ["结构", ["开头", "结尾", "分隔页", "直接进", "按照脚本"]],
];

const elements = {
  form: document.querySelector("#entryForm"),
  time: document.querySelector("#timeInput"),
  type: document.querySelector("#typeInput"),
  note: document.querySelector("#noteInput"),
  submit: document.querySelector("#submitButton"),
  cancel: document.querySelector("#cancelEditButton"),
  list: document.querySelector("#entryList"),
  preview: document.querySelector("#imagePreview"),
  count: document.querySelector("#countLabel"),
  toast: document.querySelector("#statusToast"),
  downloadJpg: document.querySelector("#downloadJpgButton"),
  clearAll: document.querySelector("#clearAllButton"),
};

elements.form.addEventListener("submit", handleSubmit);
elements.cancel.addEventListener("click", resetForm);
elements.downloadJpg.addEventListener("click", downloadJpg);
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
      sortValue: getSortValue(timecode),
    });
    showToast("已添加成功");
  }

  saveEntries();
  resetForm({ focusTime: false });
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
  elements.count.textContent = `${sorted.length} 条`;
  renderList(sorted);
  renderPreview(sorted);
}

function renderList(entries) {
  if (!entries.length) {
    elements.list.innerHTML = '<div class="empty-state">还没有添加修改意见</div>';
    return;
  }

  elements.list.innerHTML = entries
    .map(
      (entry, index) => `
        <article class="entry-item">
          <div class="entry-meta">
            <div>
              <div class="entry-time">${String(index + 1).padStart(2, "0")} · ${escapeHtml(entry.timecode)}</div>
              <span class="tag ${getTagClass(entry.type)}">${escapeHtml(entry.type)}</span>
            </div>
          </div>
          <p class="entry-note">${escapeHtml(entry.note)}</p>
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

function resetForm(options = {}) {
  const { focusTime = true } = options;
  state.editingId = null;
  elements.form.reset();
  elements.type.value = "自动识别";
  elements.submit.textContent = "添加一条";
  elements.cancel.hidden = true;
  if (focusTime && !isSmallScreen()) {
    elements.time.focus();
  } else if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
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

function downloadJpg() {
  const entries = getSortedEntries();
  if (!entries.length) return;
  const canvas = createImageCanvas(entries);
  const filename = `修改意见_${getDateStamp()}.jpg`;
  if (canvas.toBlob) {
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        downloadBlob(blob, filename, "image/jpeg");
      },
      "image/jpeg",
      0.95,
    );
    return;
  }
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function createImageCanvas(entries) {
  const scale = 2;
  const width = 1600;
  const margin = 70;
  const cardPad = 34;
  const cardGap = 26;
  const noteWidth = width - margin * 2 - cardPad * 2 - 44;
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
  const cards = entries.map((entry) => {
    const lines = wrapCanvasText(measureCtx, entry.note, noteWidth);
    return { entry, lines, height: 160 + lines.length * 62 };
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
  cards.forEach(({ entry, lines, height: cardHeight }, index) => {
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
    roundRect(ctx, noteX, noteY, width - margin * 2 - cardPad * 2, lines.length * 62 + 28, 12, "#fff1a8", null);
    ctx.fillStyle = "#0c111a";
    ctx.font = fonts.note;
    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, noteX + 22, noteY + 54 + lineIndex * 62);
    });
    y += cardHeight + cardGap;
  });

  return canvas;
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
  if (type.includes("画面")) return "visual";
  if (type.includes("结构")) return "structure";
  return "default";
}

function getCanvasTagColor(type) {
  if (type.includes("删除")) return "#e24e43";
  if (type.includes("花字") || type.includes("包装")) return "#7052be";
  if (type.includes("字幕")) return "#187e9d";
  if (type.includes("素材")) return "#328051";
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
