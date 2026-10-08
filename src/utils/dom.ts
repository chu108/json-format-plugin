/** DOM 小工具：统一创建元素与取节点的方式，避免各模块重复样板代码 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 按 id 取必需节点，缺失时直接抛出，便于尽早暴露页面结构问题 */
export function mustGetElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`缺少必需的 DOM 节点: #${id}`);
  return node as T;
}
