import { spawn } from 'child_process';
import path from 'path';

// For local development, use project root
// For Vercel, the function is in app/api/calc/ and mj_calc.js is copied there
const LOCAL_SCRIPT = path.join(process.cwd(), 'mj_calc.js');
const SERVERLESS_SCRIPT = path.join(__dirname, 'mj_calc.js');

export function callMjCalc(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    // Try local path first (development), then serverless path
    const scriptPath = process.env.VERCEL ? SERVERLESS_SCRIPT : LOCAL_SCRIPT;

    const proc = spawn('node', [scriptPath, ...args], {
      cwd: path.dirname(scriptPath),
      env: { ...process.env },
      timeout: 10000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('error', (err) => {
      console.error('Process error:', err);
      stderr += err.message;
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 });
    });
  });
}