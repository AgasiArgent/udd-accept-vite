// Adapted from delivery/src/issueBody.ts of the user-driven-development kit.
// Report text is untrusted. In the issue it must not render HTML, ping people, or start a bot,
// so `<`, `>`, `&` are escaped and `@` gets a zero-width space.

export interface Payload {
  comment: string
  createdAt: string
  user?: string
  target?: { selector: string; tagName: string; text?: string }
  context: {
    url: string
    viewport?: { width: number; height: number }
    userAgent?: string
    consoleErrors?: string[]
    failedRequests?: { method: string; url: string; status: number }[]
  }
}

export interface NewIssue {
  title: string
  body: string
  labels: string[]
}

export function neutralise(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/@/g, '@​')
}

const quote = (text: string) =>
  neutralise(text)
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')

/** GitHub rejects issue bodies over 65536 characters. */
export const MAX_BODY = 65_000
const TRUNCATED = '\n> _(truncated)_'
const SLOT = '\u0000QUOTE\u0000'
// Inside a code span Markdown shows HTML literally, so only backticks, newlines and mentions are handled.
export const code = (text: string) =>
  '`' + text.replace(/`/g, "'").replace(/\s*\n\s*/g, ' ').replace(/@/g, '@​') + '`'

/** The exact Reporter line, also used to find a user's own issues on the "My feedback" page. */
export const reporterLine = (user: string) => `- **Reporter:** ${code(user)}`

const FOOTER =
  'Add the label `approved` to let the coding agent work on this. Close it as *not planned* to reject it.'

export function renderIssue(p: Payload, user: string): NewIssue {
  const firstLine = p.comment.split('\n')[0].trim()
  const short = Array.from(firstLine).length > 80 ? Array.from(firstLine).slice(0, 79).join('') + '…' : firstLine
  const title = `[feedback] ${short.replace(/@/g, '@​')}`
  const lines = ['### Report', SLOT, '', reporterLine(user), `- **Page:** ${code(p.context.url)}`]
  if (p.target) {
    lines.push(
      `- **Element:** ${code(p.target.selector)} (${code(p.target.tagName)})${p.target.text ? ` — text ${code(p.target.text)}` : ''}`,
    )
  }
  if (p.context.viewport) lines.push(`- **Window:** ${p.context.viewport.width}×${p.context.viewport.height}`)
  if (p.context.userAgent) lines.push(`- **Browser:** ${code(p.context.userAgent)}`)
  lines.push('- **Screenshot:** not stored (the app has no storage)')
  if (p.context.consoleErrors?.length) {
    lines.push('', '### Console errors', ...p.context.consoleErrors.map((e) => `- ${code(e)}`))
  }
  if (p.context.failedRequests?.length) {
    lines.push(
      '',
      '### Failed requests',
      ...p.context.failedRequests.map((r) => `- ${code(`${r.method} ${r.url} → ${r.status || 'network error'}`)}`),
    )
  }
  lines.push('', '---', FOOTER)
  // Only the quoted report is cut; the structured sections and footer stay whole.
  const rest = lines.join('\n')
  const room = MAX_BODY - (rest.length - SLOT.length)
  let q = quote(p.comment)
  if (q.length > room) q = q.slice(0, room - TRUNCATED.length).replace(/[\ud800-\udbff]$/, '') + TRUNCATED
  return { title, body: rest.replace(SLOT, () => q), labels: ['feedback'] }
}
