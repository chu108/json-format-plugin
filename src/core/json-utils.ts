/**
 * JSON 纯函数核心：只处理数据、不依赖 DOM。
 * 新增 JSON 处理能力（如转义、路径提取）时在本文件内追加导出即可，不影响其它模块。
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ParseResult = { ok: true; value: JsonValue } | { ok: false; error: string };

/** 解析 JSON，失败时返回错误信息而不抛异常 */
export function safeParse(text: string): ParseResult {
  const source = text.trim();
  if (!source) return { ok: false, error: '内容为空' };
  try {
    return { ok: true, value: JSON.parse(source) as JsonValue };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'JSON 解析失败' };
  }
}

/** 格式化为带缩进的可读文本 */
export function formatJson(value: JsonValue, indent = 2): string {
  return stringify(value, indent);
}

/** 压缩为单行文本 */
export function minify(value: JsonValue): string {
  return stringify(value, 0);
}

function stringify(value: JsonValue, indent: number): string {
  const result = JSON.stringify(value, null, indent);
  return typeof result === 'string' ? result : 'null';
}

const UNESCAPE_MAP: Record<string, string> = {
  '"': '"',
  "'": "'",
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

/**
 * 反转义：
 * 1. 整体本身是一个 JSON 字符串（如 "{\"a\":1}"）时直接取其字符串值；
 * 2. 否则逐段还原 \\n、\\t、\\uXXXX 等转义序列。
 */
export function unescapeText(text: string): string {
  const parsed = safeParse(text);
  if (parsed.ok && typeof parsed.value === 'string') return parsed.value;

  return text.replace(/\\(u[0-9a-fA-F]{4}|[\s\S])/g, (match, token: string) => {
    if (token.length === 5 && (token[0] === 'u' || token[0] === 'U')) {
      return String.fromCharCode(parseInt(token.slice(1), 16));
    }
    return UNESCAPE_MAP[token] ?? match;
  });
}

/** 递归按键名排序：只对对象键排序，数组保持原顺序 */
export function sortKeysDeep(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map((item) => sortKeysDeep(item));

  if (value !== null && typeof value === 'object') {
    const source = value as { [key: string]: JsonValue };
    const sorted: { [key: string]: JsonValue } = {};
    Object.keys(source)
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }))
      .forEach((key) => {
        sorted[key] = sortKeysDeep(source[key]);
      });
    return sorted;
  }

  return value;
}
