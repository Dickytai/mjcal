type FanPattern = {
  name: string;
  fan: number;
};

type FanPreset = {
  name: string;
  patterns: Record<string, number>;
};

const defaultPreset: FanPreset = {
  name: 'default',
  patterns: {},
};

// In-memory store (resets on restart)
let presets: Map<string, FanPreset> = new Map([
  ['default', defaultPreset]
]);

export function getFanConfig(): Record<string, FanPreset> {
  const result: Record<string, FanPreset> = {};
  presets.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function getFanPresets(): Array<{ id: string; name: string }> {
  const result: Array<{ id: string; name: string }> = [];
  presets.forEach((value, key) => {
    result.push({ id: key, name: value.name });
  });
  return result;
}

export function getFanPreset(id: string): FanPreset | null {
  return presets.get(id) || null;
}

export function updateFanPreset(name: string, patterns: Record<string, number>): void {
  const existing = presets.get(name) || { name, patterns: {} };
  existing.patterns = { ...existing.patterns, ...patterns };
  presets.set(name, existing);
}

export function deleteFanPreset(name: string): boolean {
  if (name === 'default') return false;
  return presets.delete(name);
}