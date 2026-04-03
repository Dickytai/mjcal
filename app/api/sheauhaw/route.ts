import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hand = [], mode = 16, wildcards = {} } = body;

    // Call sheauhaw_adapter.js
    const scriptPath = path.join(process.cwd(), 'sheauhaw_adapter.js');

    // Helper to run subprocess
    const runNode = (args: string[]): Promise<{ stdout: string; code: number }> => {
      return new Promise((resolve) => {
        const proc = spawn('node', args, { cwd: process.cwd() });
        let stdout = '';
        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.on('close', (code) => resolve({ stdout, code: code || 0 }));
      });
    };

    // Build tile counts
    const tileCounts: Record<string, number> = {};
    for (const t of hand) {
      tileCounts[t] = (tileCounts[t] || 0) + 1;
    }

    // Calculate shanten
    const shantenResult = await runNode([
      scriptPath, 'step',
      JSON.stringify(tileCounts),
      String(mode),
      JSON.stringify(wildcards)
    ]);
    const shanten = shantenResult.code === 0 ? parseInt(shantenResult.stdout.trim()) : null;

    // Calculate waiting
    const waitingResult = await runNode([
      scriptPath, 'waiting',
      JSON.stringify(tileCounts),
      String(mode),
      JSON.stringify(wildcards)
    ]);
    const waiting = waitingResult.code === 0 ? JSON.parse(waitingResult.stdout.trim()) : [];

    return NextResponse.json({ shanten, waiting, mode });
  } catch (error) {
    console.error('Sheauhaw error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}