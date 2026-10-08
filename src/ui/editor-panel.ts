/**
 * 左侧编辑面板：透明 textarea（真实输入）+ 高亮层（逐行对齐）+ 行号层 的三段式结构。
 * 行号高度按高亮行的实际渲染高度同步，保证长行自动换行后行号依然对齐。
 */

import { safeParse } from '../core/json-utils.js';
import { MAX_HIGHLIGHT_LINES, renderHighlight } from '../render/highlight.js';
import { el } from '../utils/dom.js';

export type EditorChangeHandler = (text: string) => void;

export class EditorPanel {
  private readonly root: HTMLElement;
  private readonly textarea: HTMLTextAreaElement;
  private readonly highlight: HTMLElement;
  private readonly highlightInner: HTMLElement;
  private readonly gutterInner: HTMLElement;
  private handler: EditorChangeHandler | null = null;
  private lines: HTMLElement[] = [];

  constructor(host: HTMLElement) {
    this.textarea = el('textarea', 'editor-input');
    this.textarea.spellcheck = false;
    this.textarea.setAttribute('wrap', 'soft');
    this.textarea.setAttribute('autocapitalize', 'off');
    this.textarea.setAttribute('autocomplete', 'off');
    this.textarea.placeholder = '在此粘贴 JSON 或 JSON 字符串…';

    this.highlight = el('div', 'editor-highlight');
    this.highlightInner = el('div', 'editor-highlight-inner');
    this.highlight.appendChild(this.highlightInner);

    const gutter = el('div', 'editor-gutter');
    this.gutterInner = el('div', 'editor-gutter-inner');
    gutter.appendChild(this.gutterInner);

    const main = el('div', 'editor-main');
    main.append(this.highlight, this.textarea);

    this.root = el('div', 'editor');
    this.root.append(gutter, main);
    host.replaceChildren(this.root);

    this.textarea.addEventListener('input', () => {
      this.paint();
      this.emit();
    });
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    window.addEventListener('resize', () => {
      this.syncMetrics();
      this.paint();
    });

    this.syncMetrics();
    this.paint();
  }

  getText(): string {
    return this.textarea.value;
  }

  /** 设置文本；silent 为 true 时不触发外部变更回调（用于右侧操作回写） */
  setValue(text: string, options: { silent?: boolean } = {}): void {
    if (this.textarea.value !== text) {
      this.textarea.value = text;
      this.textarea.scrollTop = 0;
      this.textarea.scrollLeft = 0;
    }
    this.paint();
    if (!options.silent) this.emit();
  }

  onChange(handler: EditorChangeHandler): void {
    this.handler = handler;
  }

  /** 校验失败时给出边框提示（内容为空时不算错误） */
  setInvalid(invalid: boolean): void {
    this.root.classList.toggle('is-invalid', invalid);
  }

  focus(): void {
    this.textarea.focus();
  }

  /** 重新渲染高亮层与行号层：着色取决于当前文本是否为有效 JSON */
  private paint(): void {
    const text = this.textarea.value;
    const valid = safeParse(text).ok;
    const result = renderHighlight(this.highlightInner, text, valid);
    this.lines = result.lines;
    this.renderGutter(result.colored);
    this.syncScroll();
  }

  private renderGutter(colored: boolean): void {
    const fragment = document.createDocumentFragment();

    if (colored && this.lines.length <= MAX_HIGHLIGHT_LINES) {
      // 先读完所有高度再写 DOM，避免读写交替造成的布局抖动
      const heights = this.lines.map((line) => line.offsetHeight);
      heights.forEach((height, index) => {
        const item = el('div', 'gutter-line', String(index + 1));
        item.style.height = `${height}px`;
        fragment.appendChild(item);
      });
    } else {
      this.lines.forEach((_line, index) => {
        fragment.appendChild(el('div', 'gutter-line', String(index + 1)));
      });
    }

    this.gutterInner.replaceChildren(fragment);
  }

  /** 高亮层与行号层跟随 textarea 滚动 */
  private syncScroll(): void {
    const { scrollTop, scrollLeft } = this.textarea;
    this.highlightInner.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    this.gutterInner.style.transform = `translateY(${-scrollTop}px)`;
  }

  /** 按 textarea 的滚动条宽度修正高亮层宽度，保证换行位置完全一致 */
  private syncMetrics(): void {
    const scrollbar = this.textarea.offsetWidth - this.textarea.clientWidth;
    this.highlight.style.right = `${Math.max(scrollbar, 0)}px`;
  }

  private emit(): void {
    if (this.handler) this.handler(this.textarea.value);
  }
}
