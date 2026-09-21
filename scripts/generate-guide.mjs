import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

import { buildModule, renderGuide } from './convert-guide.mjs'

// user.md is the guide. This turns it into the module the sheet imports, so there is one
// copy of the text and the app cannot drift from the file people read on the repository.
const source = fileURLToPath(new URL('../user.md', import.meta.url))
const output = fileURLToPath(new URL('../src/data/userGuide.js', import.meta.url))

const markdown = await readFile(source, 'utf8')
const { sections, blocks } = renderGuide(markdown)

await writeFile(output, buildModule(markdown))

console.log(`Generated the guide: ${sections.length} sections, ${blocks.length} blocks.`)
