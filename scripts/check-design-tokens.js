const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const colorPattern = /#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/g
const tokenNamePattern = /^--[a-z0-9-]+\s*:/

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.vercel') {
        return []
      }
      return listFiles(fullPath)
    }
    return fullPath
  })
}

const failures = []
const stylesSource = fs.readFileSync(path.join(root, 'styles.css'), 'utf8')
const allowedRootTokenColors = new Set(
  stylesSource
    .split(/\r?\n/)
    .filter((line) => tokenNamePattern.test(line.trim()))
    .flatMap((line) => line.match(colorPattern) || [])
)

listFiles(root)
  .filter((filePath) => ['.css', '.html', '.js', '.json', '.md'].includes(path.extname(filePath)))
  .forEach((filePath) => {
    const relativePath = path.relative(root, filePath)
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      const matches = line.match(colorPattern) || []
      matches.forEach((color) => {
        const isTokenDefinition = relativePath === 'styles.css' && tokenNamePattern.test(line.trim())
        if (isTokenDefinition && allowedRootTokenColors.has(color)) {
          return
        }
        failures.push(`${relativePath}:${index + 1}: ${color}`)
      })
    })
  })

if (failures.length) {
  console.error('Found hardcoded colors outside approved design tokens:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('design tokens ok')
