export type SanitizeOptions = {
  keys?: string[];
};

function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumericString(v: any): boolean {
  return typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v));
}

// Deeply coerces numeric-looking strings to numbers. If `keys` provided, only those keys are coerced.
export function sanitizeNumbers<T>(input: T, opts: SanitizeOptions = {}): T {
  const { keys } = opts;

  const walker = (val: any, key?: string): any => {
    if (Array.isArray(val)) return val.map((v) => walker(v));
    if (isPlainObject(val)) {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) out[k] = walker(v, k);
      return out as any;
    }
    if (isNumericString(val)) {
      if (!keys || (key && keys.includes(key))) return Number(val);
      // If keys filter specified and current key not matched, keep as is
      if (!key && !keys) return Number(val);
    }
    return val;
  };

  return walker(input) as T;
}

