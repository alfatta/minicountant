import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const repoRoot = process.cwd()

function scanFixture(fixture: string): { status: number | null, output: string } {
  const patterns = ['parseFloat\\s*\\(', '\\b[0-9][0-9_]*\\.[0-9][0-9_]*\\b']
  if (fileExists('rg')) {
    const res = spawnSync('rg', ['--no-heading', '-n', '-e', patterns[0]!, '-e', patterns[1]!, fixture], {
      encoding: 'utf8'
    })
    return { status: res.status ?? null, output: `${res.stdout ?? ''}${res.stderr ?? ''}` }
  }
  const res = spawnSync('grep', ['-nE', patterns[0]!, fixture], { encoding: 'utf8' })
  const res2 = spawnSync('grep', ['-nE', patterns[1]!, fixture], { encoding: 'utf8' })
  return {
    status: res.status !== null ? res.status : res2.status,
    output: `${res.stdout ?? ''}${res2.stdout ?? ''}${res.stderr ?? ''}${res2.stderr ?? ''}`
  }
}

function fileExists(cmd: string): boolean {
  const res = spawnSync('command', ['-v', cmd], { encoding: 'utf8' })
  return res.status === 0
}

function runLintNoMoney(): { status: number, stdout: string, stderr: string } {
  const res = spawnSync('pnpm', ['lint:no-money'], {
    cwd: repoRoot,
    encoding: 'utf8'
  })
  return {
    status: res.status ?? -1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? ''
  }
}

describe('money-guard script', () => {
  it('pnpm lint:no-money exits 0 on the current repo', () => {
    const res = runLintNoMoney()
    expect(res.status, res.stdout + res.stderr).toBe(0)
  })

  it('a fixture with parseFloat would be flagged by the script', () => {
    const dir = mkdtempSync(join(tmpdir(), 'money-guard-'))
    const fixture = join(dir, 'fixture.ts')
    try {
      writeFileSync(fixture, 'const x = parseFloat("1.5")\nconst y = (1.5 + 2.5)\n')
      const res = scanFixture(fixture)
      expect(res.status).toBe(0)
      expect(res.output).toContain('parseFloat')
      expect(res.output).toContain('1.5')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
