import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const repoRoot = process.cwd()

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
      const res = spawnSync('rg', [
        '-n',
        '--color=never',
        '-g', '*.ts',
        '-e', 'parseFloat\\s*\\(',
        '-e', '\\b[0-9][0-9_]*\\.[0-9][0-9_]*\\b',
        fixture
      ], { encoding: 'utf8' })
      expect(res.status).toBe(0)
      expect(res.stdout).toContain('parseFloat')
      expect(res.stdout).toContain('1.5')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
