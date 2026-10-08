/** 通用按钮行组件：按钮以配置数组注册，新增功能只需追加一项配置 */

import { el } from '../utils/dom.js';

export interface ToolbarAction {
  id: string;
  label: string;
  onClick: () => void;
}

export function createToolbar(host: HTMLElement, actions: ToolbarAction[]): void {
  const fragment = document.createDocumentFragment();

  actions.forEach((action) => {
    const button = el('button', 'tool-btn', action.label);
    button.type = 'button';
    button.dataset.action = action.id;
    button.title = action.label;
    button.addEventListener('click', () => action.onClick());
    fragment.appendChild(button);
  });

  host.replaceChildren(fragment);
}
