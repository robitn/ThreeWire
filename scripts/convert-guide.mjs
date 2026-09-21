// Renders user.md to the HTML the in-app guide sheet displays.
//
// A deliberately small converter rather than a markdown library: user.md is the only input
// it will ever see, and anything it does not recognise throws instead of falling through as
// literal text. A guide that fails to build is caught at the keyboard; a guide that quietly
// renders **bold** as asterisks is caught by a machinist at a bench.

const HEADING = /^(#{1,6}) +(.*)$/
const LIST_ITEM = /^( *)(?:([-*+])|([0-9]+)\.) +(.*)$/
const TABLE_ROW = /^\|.*\|\s*$/
const TABLE_DIVIDER = /^\|[\s:|-]+\|\s*$/

// Constructs the guide does not use. Rejected by hand because the fallback for an
// unrecognised line is "treat it as a paragraph", which would render the markup verbatim.
const UNSUPPORTED = [
    [/^```/, 'fenced code block'],
    [/^ {0,3}>/, 'block quote'],
    [/^ {0,3}(?:[-*_] *){3,}$/, 'horizontal rule'],
    [/^ {4,}\S/, 'indented code block'],
    [/^ {0,3}</, 'raw HTML'],
    [/^ {0,3}!\[/, 'image'],
]

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// Code spans first, so their contents are never searched for emphasis markers, and links
// before emphasis, so a bold link label still resolves.
function inline(text) {
    return escapeHtml(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(
            /\[([^\]]+)\]\(([^)\s]+)\)/g,
            '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>',
        )
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function slug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function cellsOf(row) {
    return row
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim())
}

// Every non-blank run of lines is one block. Lists and tables in user.md are tight, so a
// blank line always ends the construct it sits in.
function collectChunk(lines, start) {
    let end = start
    while (end < lines.length && lines[end].trim() !== '') end += 1
    return { chunk: lines.slice(start, end), next: end }
}

function renderTable(chunk, lineNumber) {
    if (chunk.length < 3) {
        throw new Error(`Line ${lineNumber}: a table needs a header, a divider and a row`)
    }

    if (!TABLE_DIVIDER.test(chunk[1])) {
        throw new Error(`Line ${lineNumber + 1}: expected a table divider row, got ${chunk[1]}`)
    }

    const columns = cellsOf(chunk[0]).length
    const head = cellsOf(chunk[0])
        .map((cell) => `<th scope="col">${inline(cell)}</th>`)
        .join('')

    const body = chunk.slice(2).map((row, offset) => {
        const cells = cellsOf(row)
        if (cells.length !== columns) {
            throw new Error(
                `Line ${lineNumber + 2 + offset}: row has ${cells.length} cells, header has ${columns}`,
            )
        }

        // The first column of both tables in the guide names the row, so it is a header too.
        return `<tr>${cells
            .map((cell, column) =>
                column === 0
                    ? `<th scope="row">${inline(cell)}</th>`
                    : `<td>${inline(cell)}</td>`,
            )
            .join('')}</tr>`
    })

    // Wrapped so a table wider than a phone scrolls on its own rather than stretching the sheet.
    return `<div class="guide-table"><table><thead><tr>${head}</tr></thead><tbody>${body.join('')}</tbody></table></div>`
}

function renderList(chunk, lineNumber) {
    const opener = LIST_ITEM.exec(chunk[0])
    const baseIndent = opener[1].length
    const ordered = opener[3] !== undefined
    const items = []
    let childIndent = null

    chunk.forEach((line, offset) => {
        const at = lineNumber + offset
        const match = LIST_ITEM.exec(line)
        const indent = match ? match[1].length : line.length - line.trimStart().length
        const current = items[items.length - 1]

        if (match && indent === baseIndent) {
            if ((match[3] !== undefined) !== ordered) {
                throw new Error(`Line ${at}: list switches between bulleted and numbered`)
            }

            items.push({ text: [match[4].trim()], child: [] })
            childIndent = null
            return
        }

        if (!current) throw new Error(`Line ${at}: list continuation before any item`)

        if (match && indent > baseIndent) {
            childIndent ??= indent
            current.child.push(line.slice(childIndent))
            return
        }

        // A wrapped line belongs to whichever item is still open: the nested one if this
        // item has started a sublist, otherwise the outer item's own text.
        if (current.child.length && indent >= childIndent) {
            current.child.push(line.slice(childIndent))
            return
        }

        current.text.push(line.trim())
    })

    const tag = ordered ? 'ol' : 'ul'
    const rendered = items.map((item) => {
        const body = inline(item.text.join(' '))
        const nested = item.child.length ? renderList(item.child, lineNumber) : ''
        return `<li>${body}${nested}</li>`
    })

    return `<${tag}>${rendered.join('')}</${tag}>`
}

/**
 * Convert the guide markdown into the title, the section list the sheet's contents menu is
 * built from, and one HTML string per block.
 */
export function renderGuide(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n')
    const blocks = []
    const sections = []
    const usedIds = new Set()
    let title = null
    let index = 0

    function idFor(text, lineNumber) {
        const id = slug(text)
        if (!id) throw new Error(`Line ${lineNumber}: heading has no usable id`)
        if (usedIds.has(id)) throw new Error(`Line ${lineNumber}: duplicate heading id "${id}"`)
        usedIds.add(id)
        return id
    }

    while (index < lines.length) {
        const line = lines[index]
        const lineNumber = index + 1

        if (line.trim() === '') {
            index += 1
            continue
        }

        for (const [pattern, name] of UNSUPPORTED) {
            if (pattern.test(line)) {
                throw new Error(`Line ${lineNumber}: ${name} is not supported by the guide converter`)
            }
        }

        const heading = HEADING.exec(line)
        if (heading) {
            const level = heading[1].length
            const text = heading[2].trim()

            if (level > 3) {
                throw new Error(`Line ${lineNumber}: heading level ${level} is deeper than the sheet renders`)
            }

            // The single h1 titles the sheet itself rather than appearing in the body.
            if (level === 1) {
                if (title !== null) throw new Error(`Line ${lineNumber}: second h1 in the guide`)
                title = text
                index += 1
                continue
            }

            const id = idFor(text, lineNumber)
            if (level === 2) sections.push({ id, title: text })
            blocks.push(`<h${level} id="${id}">${inline(text)}</h${level}>`)
            index += 1
            continue
        }

        const { chunk, next } = collectChunk(lines, index)

        if (TABLE_ROW.test(chunk[0])) {
            blocks.push(renderTable(chunk, lineNumber))
        } else if (LIST_ITEM.test(chunk[0])) {
            blocks.push(renderList(chunk, lineNumber))
        } else {
            blocks.push(`<p>${inline(chunk.map((text) => text.trim()).join(' '))}</p>`)
        }

        index = next
    }

    if (title === null) throw new Error('The guide has no h1 to title the sheet with')
    if (!sections.length) throw new Error('The guide has no h2 sections to build a contents list from')

    return { title, sections, blocks }
}

/** The generated module, as text. Kept here so a test can check the committed copy matches. */
export function buildModule(markdown) {
    const { title, sections, blocks } = renderGuide(markdown)
    const html = blocks.map((block) => `  ${JSON.stringify(block)},`).join('\n')

    return `// Generated from user.md by scripts/generate-guide.mjs. Do not edit by hand.
// Edit user.md and run: npm run generate:guide

export const guideTitle = ${JSON.stringify(title)}

export const guideSections = Object.freeze(${JSON.stringify(sections, null, 2)})

// One entry per block, so a change to one paragraph shows up as a one line diff.
export const guideHtml = [
${html}
].join('\\n')
`
}
