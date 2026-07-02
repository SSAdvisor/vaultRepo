import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');
const TEST_DIR = path.join(os.tmpdir(), 'vr-test-repo-' + Date.now());

function runCLI(args: string, customEnv?: NodeJS.ProcessEnv) {
  try {
    return execSync(`node --no-deprecation ${CLI_PATH} ${args}`, { cwd: TEST_DIR, encoding: 'utf-8', env: customEnv || process.env });
  } catch (err: any) {
    return err.stdout + '\n' + err.stderr;
  }
}

describe('VaultRepo CLI E2E', () => {
  beforeAll(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.writeFileSync(path.join(TEST_DIR, '.env'), 'VITE_SUPABASE_URL=test\nVITE_SUPABASE_ANON_KEY=test');
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should display help', () => {
    const output = runCLI('--help');
    expect(output).toContain('VaultRepo CLI - A file repository controller');
    expect(output).toContain('init [options] <name>');
  });

  it('should error when not logged in and running init', () => {
    const customEnv = { ...process.env, HOME: TEST_DIR };
    try {
      execSync(`node --no-deprecation ${CLI_PATH} init my-repo`, { cwd: TEST_DIR, encoding: 'utf-8', env: customEnv, stdio: 'pipe' });
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      const output = err.stdout?.toString() + err.stderr?.toString();
      expect(output).toContain('You are not logged in');
    }
  });

  it('should show status correctly when working tree is empty', () => {
    fs.mkdirSync(path.join(TEST_DIR, '.vr'));
    fs.writeFileSync(path.join(TEST_DIR, '.vr', 'index.json'), '[]');
    fs.writeFileSync(path.join(TEST_DIR, '.vr', 'config.json'), '{"repoId":"test","name":"test"}');
    
    const statusOut = runCLI('status');
    expect(statusOut).toContain('working tree clean');
  });
});
