/**
 * 文本语法高亮渲染：把一段 JSON 文本切成带 class 的行 + token 节点。
 * 全部通过 textContent 创建节点，杜绝 XSS。
 */

import { el } from '../utils/dom.js';

/** 单行 token 匹配：字符串 / 布尔 / null / 数字 / 标点 */
const TOKEN_PATTERN =
  /"(?:\\.|[^"\\])*"|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:]/g;

/** 行数过多时降级为纯文本，避免逐行着色带来的卡顿 */
export const MAX_HIGHLIGHT_LINES = 5000;

export interface HighlightResult {
  /** 逐行元素，行号层按它的实际高度对齐 */
  lines: HTMLElement[];
  /** 实际是否完成了着色 */
  colored: boolean;
}

export function renderHighlight(container: HTMLElement, text: string, colored: boolean): HighlightResult {
  const lines = text.split('\n');
  const useColor = colored && lines.length <= MAX_HIGHLIGHT_LINES;
  const fragment = document.createDocumentFragment();
  const elements: HTMLElement[] = [];

  lines.forEach((line) => {
    const lineEl = el('div', 'code-line');
    if (useColor) {
      appendTokens(lineEl, line);
    } else {
      lineEl.textContent = line;
    }
    fragment.appendChild(lineEl);
    elements.push(lineEl);
  });

  container.replaceChildren(fragment);
  return { lines: elements, colored: useColor };
}

function appendTokens(lineEl: HTMLElement, line: string): void {
  let cursor = 0;

  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) lineEl.appendChild(document.createTextNode(line.slice(cursor, start)));

    const token = match[0];
    const end = start + token.length;
    lineEl.appendChild(el('span', `tk-${classify(token, line, end)}`, token));
    cursor = end;
  }

  if (cursor < line.length) lineEl.appendChild(document.createTextNode(line.slice(cursor)));
}

function classify(token: string, line: string, endIndex: number): string {
  if (token.startsWith('"')) return isKeyToken(line, endIndex) ? 'key' : 'string';
  if (token === 'true' || token === 'false') return 'bool';
  if (token === 'null') return 'null';
  if ('{}[],:'.includes(token)) return 'punc';
  return 'number';
}

/** 字符串后面紧跟冒号时视为键名 */
function isKeyToken(line: string, endIndex: number): boolean {
  let cursor = endIndex;
  while (cursor < line.length && (line[cursor] === ' ' || line[cursor] === '\t')) cursor += 1;
  return line[cursor] === ':';
}
