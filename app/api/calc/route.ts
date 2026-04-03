import { NextRequest, NextResponse } from 'next/server';
import { callMjCalc } from '@/lib/calc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hand = [],
      open = [],
      mode = 16,
      is_zimo = false,
      flowers = 0,
      winning_tile = '',
      quan_wind = '',
      wei_wind = '',
      fan_config = {}
    } = body;

    const allTiles = [...hand, ...open];
    const expected = allTiles.length;
    const openCount = open.length;
    const isZimoStr = is_zimo ? '1' : '0';

    const result = await callMjCalc([
      'full',
      JSON.stringify(allTiles),
      String(expected),
      String(mode),
      String(flowers),
      '0', // gang
      isZimoStr,
      '0', '0', '0', // haidi, heidi, lian
      String(openCount),
      quan_wind,
      wei_wind
    ]);

    if (result.code !== 0) {
      return NextResponse.json({ error: 'Calculation failed' }, { status: 400 });
    }

    const data = JSON.parse(result.stdout);

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Calc error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}