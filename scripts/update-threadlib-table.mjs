import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const sourceUrl = 'https://raw.githubusercontent.com/adrianschlatter/threadlib/develop/THREAD_TABLE.scad'
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'threadlib-'))
const sourcePath = join(temporaryDirectory, 'THREAD_TABLE.scad')

try {
    const response = await fetch(sourceUrl)
    if (!response.ok) throw new Error(`Unable to download threadlib table: ${response.status}`)

    await writeFile(sourcePath, await response.text())
    await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [
            'scripts/convert-threadlib-table.mjs',
            sourcePath,
            'src/data/threadDatabase.js',
        ], { stdio: 'inherit' })
        child.on('error', reject)
        child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Converter exited with code ${code}`)))
    })
} finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
}
