import { NextRequest, NextResponse } from 'next/server';
import { getFanConfig, getFanPresets, getFanPreset, updateFanPreset, deleteFanPreset } from '@/lib/fan-store';

export async function GET() {
  const config = getFanConfig();
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = 'default', patterns = {} } = body;

    if (name === 'default') {
      return NextResponse.json({ status: 'error', message: 'Cannot modify default preset' }, { status: 400 });
    }

    updateFanPreset(name, patterns);
    return NextResponse.json({ status: 'ok', message: `Saved: ${name}` });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = '' } = body;

    if (!name || name === 'default') {
      return NextResponse.json({ status: 'error', message: 'Cannot delete default' }, { status: 400 });
    }

    const deleted = deleteFanPreset(name);
    if (deleted) {
      return NextResponse.json({ status: 'ok', message: `Deleted: ${name}` });
    }
    return NextResponse.json({ status: 'error', message: 'Preset not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to delete' }, { status: 500 });
  }
}