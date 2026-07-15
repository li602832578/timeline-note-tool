const assert = require('assert')
const core = require('../core')

assert.strictEqual(core.formatTimecode(14.5, 25), '00:00:14:12')
assert.strictEqual(core.parseTimecode('00:00:14:12', 25).seconds, 14.48)
assert.strictEqual(core.parseTimecode('全片').seconds, -1)
assert.strictEqual(core.detectFeedbackType('这里口误的地方删除'), '删除')
assert.strictEqual(core.detectFeedbackType('字幕字距太近'), '字幕')

let project = core.createProject('Wayne')
project = core.addEntry(project, {
  timecode: '00:00:03:00',
  note: '开头音量再稳一点'
})
project = core.addEntry(project, {
  timecode: '全片',
  note: '整体节奏可以更紧'
})

assert.strictEqual(project.title, 'Wayne修改意见')
assert.strictEqual(project.entries.length, 2)
assert.strictEqual(project.entries[0].timecode, '全片')
assert.strictEqual(project.entries[1].timecode, '00:00:03:00')
assert.strictEqual(project.entries[1].type, '声音')

const exported = core.exportProject(project)
const imported = core.importProjectFromText(exported, 'fallback')
assert.strictEqual(imported.schema, core.PROJECT_SCHEMA)
assert.strictEqual(imported.entries.length, 2)

const listImported = core.importProjectFromText(JSON.stringify([
  { time: '00:12', text: '字幕错别字' }
]))
assert.strictEqual(listImported.entries[0].type, '字幕')
assert.strictEqual(listImported.entries[0].timecode, '00:00:12:00')

const pastedRows = core.parsePastedFeedback(`
00:03 开场口播音量再稳一点
00:00:12:10 - 00:00:15:00 字幕字距太近
00:20
这里口误的地方删除
`)
assert.strictEqual(pastedRows.length, 3)
assert.strictEqual(pastedRows[0].timecode, '00:00:03:00')
assert.strictEqual(pastedRows[1].timecode, '00:00:12:10 → 00:00:15:00')
assert.strictEqual(pastedRows[2].note, '这里口误的地方删除')

const pastedProject = core.addPastedFeedbackEntries(core.createProject('粘贴意见'), pastedRows)
assert.strictEqual(pastedProject.entries.length, 3)
assert.strictEqual(pastedProject.entries[1].timecode, '00:00:12:10 → 00:00:15:00')

console.log('qitongflow web core ok')
