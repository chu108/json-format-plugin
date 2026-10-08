/**
 * 右侧折叠树渲染：按节点懒渲染（折叠的节点不生成子 DOM），支持单节点、全部展开与全部收缩。
 * 行号由 CSS counter 自动维护，展开/收缩时无需重新编号。
 */

import type { JsonValue } from '../core/json-utils.js';
import {
  buildTree,
  collectContainerPaths,
  isContainer,
  ROOT_PATH,
  type TreeNode,
} from '../model/tree-model.js';
import { el } from '../utils/dom.js';

/** 一级缩进像素值 */
const INDENT = 14;

/** 分片渲染步长：一次性创建过多 DOM 会阻塞主线程 */
const CHUNK_SIZE = 2000;

interface NodeEntry {
  node: TreeNode;
  body: HTMLElement;
  wrapper: HTMLElement;
}

export interface RenderOptions {
  /** 保留当前折叠状态（右侧操作导致数据变化时使用） */
  keepCollapse?: boolean;
}

export class TreeRenderer {
  private readonly host: HTMLElement;
  private tree: TreeNode | null = null;
  private collapsed = new Set<string>();
  private registry = new Map<string, NodeEntry>();

  constructor(host: HTMLElement) {
    this.host = host;
  }

  /** 整树渲染：默认仅展开根节点 */
  render(value: JsonValue, options: RenderOptions = {}): void {
    this.tree = buildTree(value);
    if (!options.keepCollapse) {
      this.collapsed = new Set(collectContainerPaths(this.tree).filter((path) => path !== ROOT_PATH));
    }
    this.paint();
  }

  expandAll(): void {
    if (!this.tree) return;
    const paths = collectContainerPaths(this.tree);
    let cursor = 0;

    const step = (): void => {
      const end = Math.min(cursor + CHUNK_SIZE, paths.length);
      for (; cursor < end; cursor += 1) this.expand(paths[cursor]);
      if (cursor < paths.length) window.requestAnimationFrame(step);
    };

    step();
  }

  collapseAll(): void {
    if (!this.tree) return;
    // 逆序遍历：先折叠子节点再折叠父节点，避免重复操作已移除的节点
    collectContainerPaths(this.tree)
      .reverse()
      .forEach((path) => this.collapse(path));
  }

  clear(): void {
    this.tree = null;
    this.collapsed.clear();
    this.registry.clear();
    this.host.replaceChildren();
  }

  getValue(): JsonValue | null {
    return this.tree ? this.tree.value : null;
  }

  private paint(): void {
    this.registry.clear();
    if (!this.tree) {
      this.host.replaceChildren();
      return;
    }
    const fragment = document.createDocumentFragment();
    this.buildNode(this.tree, fragment);
    this.host.replaceChildren(fragment);
  }

  private buildNode(node: TreeNode, out: DocumentFragment): void {
    const line = el('div', 'line');
    line.dataset.path = node.path;
    line.appendChild(el('span', 'ln'));

    const body = el('span', 'line-body');
    body.style.paddingLeft = `${node.depth * INDENT}px`;
    line.appendChild(body);
    this.renderLineBody(body, node);
    out.appendChild(line);

    if (isContainer(node) && node.children.length > 0) {
      const wrapper = el('div', 'node-children');
      const entry: NodeEntry = { node, body, wrapper };
      this.registry.set(node.path, entry);
      out.appendChild(wrapper);
      if (!this.collapsed.has(node.path)) this.fillChildren(entry);
    }
  }

  private fillChildren(entry: NodeEntry): void {
    const fragment = document.createDocumentFragment();
    entry.node.children.forEach((child) => this.buildNode(child, fragment));
    fragment.appendChild(this.createClosingLine(entry.node));
    entry.wrapper.replaceChildren(fragment);
  }

  private createClosingLine(node: TreeNode): HTMLElement {
    const line = el('div', 'line');
    line.appendChild(el('span', 'ln'));

    const body = el('span', 'line-body');
    body.style.paddingLeft = `${node.depth * INDENT + 14}px`;
    body.appendChild(el('span', 'tk-punc', node.type === 'object' ? '}' : ']'));
    line.appendChild(body);
    return line;
  }

  private renderLineBody(body: HTMLElement, node: TreeNode): void {
    const collapsible = isContainer(node) && node.children.length > 0;
    const collapsed = this.collapsed.has(node.path);
    const fragment = document.createDocumentFragment();

    if (collapsible) {
      const toggle = el('span', 'node-toggle', collapsed ? '▸' : '▾');
      toggle.title = collapsed ? '展开' : '收缩';
      toggle.addEventListener('click', () => this.toggle(node.path));
      fragment.appendChild(toggle);
    } else {
      fragment.appendChild(el('span', 'node-toggle node-toggle--empty'));
    }

    if (node.key !== null) {
      const keyText = node.indexed ? String(node.key) : JSON.stringify(node.key);
      fragment.appendChild(el('span', node.indexed ? 'tk-index' : 'tk-key', keyText));
      fragment.appendChild(el('span', 'tk-punc', ': '));
    }

    fragment.appendChild(this.createValueContent(node, collapsed));
    body.replaceChildren(fragment);
  }

  private createValueContent(node: TreeNode, collapsed: boolean): DocumentFragment {
    const fragment = document.createDocumentFragment();
    switch (node.type) {
      case 'object':
      case 'array': {
        const open = node.type === 'object' ? '{' : '[';
        const close = node.type === 'object' ? '}' : ']';
        if (node.children.length === 0) {
          fragment.appendChild(el('span', 'tk-punc', `${open}${close}`));
        } else if (collapsed) {
          fragment.appendChild(el('span', 'tk-punc', `${open} … ${close}`));
          fragment.appendChild(el('span', 'tk-count', String(node.children.length)));
        } else {
          fragment.appendChild(el('span', 'tk-punc', open));
        }
        break;
      }
      case 'string':
        fragment.appendChild(el('span', 'tk-string', JSON.stringify(node.value)));
        break;
      case 'number':
        fragment.appendChild(el('span', 'tk-number', String(node.value)));
        break;
      case 'boolean':
        fragment.appendChild(el('span', 'tk-bool', String(node.value)));
        break;
      default:
        fragment.appendChild(el('span', 'tk-null', 'null'));
        break;
    }
    return fragment;
  }

  private toggle(path: string): void {
    if (this.collapsed.has(path)) this.expand(path);
    else this.collapse(path);
  }

  private expand(path: string): void {
    const entry = this.registry.get(path);
    if (!entry || !this.collapsed.has(path)) return;
    this.collapsed.delete(path);
    this.fillChildren(entry);
    this.renderLineBody(entry.body, entry.node);
  }

  private collapse(path: string): void {
    const entry = this.registry.get(path);
    if (!entry || this.collapsed.has(path)) return;
    this.collapsed.add(path);
    entry.wrapper.replaceChildren();
    entry.node.children.forEach((child) => this.forget(child));
    this.renderLineBody(entry.body, entry.node);
  }

  /** 清掉已从 DOM 移除的后代节点的注册信息 */
  private forget(node: TreeNode): void {
    this.registry.delete(node.path);
    node.children.forEach((child) => this.forget(child));
  }
}
