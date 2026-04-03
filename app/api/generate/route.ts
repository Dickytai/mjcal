import { NextResponse } from 'next/server';
import { callMjCalc } from '@/lib/calc';

export async function GET() {
  try {
    // Try up to 500 times to generate a winning hand
    for (let i = 0; i < 500; i++) {
      const result = await callMjCalc(['generate']);

      if (result.code === 0) {
        const data = JSON.parse(result.stdout);
        if (data.hand) {
          return NextResponse.json(data);
        }
      }
    }

    return NextResponse.json({ error: 'Failed to generate winning hand' }, { status: 500 });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}