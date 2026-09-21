import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, it, expect } from 'vitest'

import { buildModule, renderGuide } from '../../scripts/convert-guide.mjs'
import { guideHtml, guideSections, guideTitle } from '../data/userGuide'

// vitest.config.js pins the root to the project directory, so these resolve from there.
const GUIDE_MARKDOWN = resolve(process.cwd(), 'user.md')
const GUIDE_MODULE = resolve(process.cwd(), 'src/data/userGuide.js')

function htmlFor(markdown) {
  return renderGuide(markdown).blocks.join('\n')
}

describe('the generated guide', () => {
  // The guide ships as a generated module, so nothing stops someone editing user.md and
  // forgetting to regenerate. This is the thing that stops it: the committed copy has to be
  // exactly what the converter produces from the markdown beside it.
  it('matches user.md', async () => {
    const [markdown, committed] = await Promise.all([
      readFile(GUIDE_MARKDOWN, 'utf8'),
      readFile(GUIDE_MODULE, 'utf8'),
    ])

    expect(committed).toBe(buildModule(markdown))
  })

  it('titles the sheet from the guide heading', () => {
    expect(guideTitle).toContain('User Guide')
    expect(guideHtml).not.toContain('<h1')
  })

  it('lists every section with an id the body carries', () => {
    expect(guideSections.length).toBeGreaterThan(5)

    for (const section of guideSections) {
      expect(guideHtml).toContain(`<h2 id="${section.id}">`)
    }
  })

  it('renders the class limit tables', () => {
    expect(guideHtml).toContain('<th scope="row">2A</th><td>0.5589 in</td>')
    expect(guideHtml).toContain('<th scope="row">6g</th><td>5.212 mm</td>')
  })
})

describe('the guide converter', () => {
  it('renders headings with slug ids', () => {
    expect(htmlFor('# Title\n\n## Classes Of Fit')).toBe('<h2 id="classes-of-fit">Classes Of Fit</h2>')
  })

  it('renders emphasis, code and links', () => {
    expect(htmlFor('# T\n\n## S\n\n**bold** and *thin* and `0.5660` and [docs](https://example.com)'))
      .toContain(
        '<p><strong>bold</strong> and <em>thin</em> and <code>0.5660</code> and ' +
          '<a href="https://example.com" target="_blank" rel="noreferrer noopener">docs</a></p>',
      )
  })

  it('escapes markup rather than passing it through', () => {
    expect(htmlFor('# T\n\n## S\n\na < b & "c"')).toContain('<p>a &lt; b &amp; &quot;c&quot;</p>')
  })

  it('joins the wrapped lines of a paragraph', () => {
    expect(htmlFor('# T\n\n## S\n\none\ntwo\nthree')).toContain('<p>one two three</p>')
  })

  it('nests a bulleted list inside a numbered one, continuation lines and all', () => {
    const markdown = '# T\n\n## S\n\n1. First:\n   - Nested item that\n     wraps a line\n2. Second'

    expect(htmlFor(markdown)).toContain(
      '<ol><li>First:<ul><li>Nested item that wraps a line</li></ul></li><li>Second</li></ol>',
    )
  })

  it('treats the first column of a table as a row header', () => {
    const markdown = '# T\n\n## S\n\n| Class | Min |\n| --- | --- |\n| 2A | 0.5589 in |'

    expect(htmlFor(markdown)).toContain(
      '<thead><tr><th scope="col">Class</th><th scope="col">Min</th></tr></thead>',
    )
    expect(htmlFor(markdown)).toContain('<tbody><tr><th scope="row">2A</th><td>0.5589 in</td></tr>')
  })

  // The fallback for an unrecognised line is "render it as a paragraph", which would put
  // raw markup in front of a reader. Every one of these has to fail the build instead.
  it.each([
    ['a fenced code block', '```\ncode\n```'],
    ['a block quote', '> quoted'],
    ['a horizontal rule', '---'],
    ['an image', '![alt](icon.png)'],
    ['raw HTML', '<div>hand written</div>'],
    ['a heading deeper than h3', '#### Too deep'],
  ])('refuses %s', (_name, body) => {
    expect(() => renderGuide(`# T\n\n## S\n\n${body}`)).toThrow()
  })

  it('refuses two headings that would share an id', () => {
    expect(() => renderGuide('# T\n\n## Same\n\n## Same')).toThrow(/duplicate heading id/)
  })

  it('refuses a guide with no title or no sections', () => {
    expect(() => renderGuide('## Section only')).toThrow(/no h1/)
    expect(() => renderGuide('# Title only')).toThrow(/no h2 sections/)
  })

  it('refuses a table whose row does not match its header', () => {
    expect(() => renderGuide('# T\n\n## S\n\n| A | B |\n| --- | --- |\n| 1 |')).toThrow(/cells/)
  })
})
