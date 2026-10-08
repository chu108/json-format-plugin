/** JSON 到渲染节点模型的转换：渲染层只消费这里的数据结构，不直接操作原始 JSON */

import type { JsonValue } from '../core/json-utils.js';

export type JsonNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface TreeNode {
  /** 对象键名或数组索引文本；根节点为 null */
  key: string | null;
  /** 键名来自数组索引时为 true，渲染时使用弱化样式 */
  indexed: boolean;
  type: JsonNodeType;
  value: JsonValue;
  depth: number;
  /** 唯一路径，例如 $、$.list、$.list[0] */
  path: string;
  children: TreeNode[];
}

export const ROOT_PATH = '$';

export function detectType(value: JsonValue): JsonNodeType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'object';
}

export function isContainer(node: TreeNode): boolean {
  return node.type === 'object' || node.type === 'array';
}

export function buildTree(
  value: JsonValue,
  key: string | null = null,
  indexed = false,
  path: string = ROOT_PATH,
  depth = 0,
): TreeNode {
  const node: TreeNode = { key, indexed, type: detectType(value), value, depth, path, children: [] };

  if (node.type === 'object') {
    const source = value as { [key: string]: JsonValue };
    Object.keys(source).forEach((childKey) => {
      node.children.push(buildTree(source[childKey], childKey, false, `${path}.${childKey}`, depth + 1));
    });
  } else if (node.type === 'array') {
    (value as JsonValue[]).forEach((item, index) => {
      node.children.push(buildTree(item, String(index), true, `${path}[${index}]`, depth + 1));
    });
  }

  return node;
}

/** 收集所有容器节点路径（按深度优先前序，父节点一定排在子节点之前） */
export function collectContainerPaths(node: TreeNode, out: string[] = []): string[] {
  if (isContainer(node)) {
    out.push(node.path);
    node.children.forEach((child) => collectContainerPaths(child, out));
  }
  return out;
}
