/** 右侧结果面板：承载折叠树渲染器，并维护空状态 */

import { formatJson, type JsonValue } from '../core/json-utils.js';
import { TreeRenderer } from '../render/tree-renderer.js';
import { el } from '../utils/dom.js';

export interface TreePanelRenderOptions {
  /** 保留当前折叠状态（右侧操作导致数据变化时使用） */
  keepCollapse?: boolean;
}

export class TreePanel {
  private readonly renderer: TreeRenderer;
  private readonly view: HTMLElement;
  private readonly empty: HTMLElement;
  private value: JsonValue | null = null;
  private loaded = false;

  constructor(host: HTMLElement) {
    this.view = el('div', 'tree-view');
    this.view.hidden = true;
    this.empty = el('div', 'empty-state', '左侧输入有效的 JSON 后，这里会自动展示格式化结果');
    host.replaceChildren(this.view, this.empty);
    this.renderer = new TreeRenderer(this.view);
  }

  render(value: JsonValue | null, options: TreePanelRenderOptions = {}): void {
    if (value === null) {
      this.value = null;
      this.loaded = false;
      this.renderer.clear();
      this.view.hidden = true;
      this.empty.hidden = false;
      return;
    }

    const unchanged = this.loaded && this.value === value;
    this.value = value;
    this.loaded = true;
    this.view.hidden = false;
    this.empty.hidden = true;

    if (unchanged && options.keepCollapse) return;
    this.renderer.render(value, { keepCollapse: options.keepCollapse });
  }

  expandAll(): void {
    this.renderer.expandAll();
  }

  collapseAll(): void {
    this.renderer.collapseAll();
  }

  hasContent(): boolean {
    return this.loaded;
  }

  getValue(): JsonValue | null {
    return this.value;
  }

  /** 复制用的文本：始终输出格式化后的完整 JSON */
  getText(): string {
    return this.value === null ? '' : formatJson(this.value);
  }
}
