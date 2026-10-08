/**
 * 页面入口：负责装配 state / panels / toolbar 三者，本身不含业务细节。
 * 新增按钮 = 在 build*Actions 中追加一条配置 + 在对应模块实现能力。
 */

import {
  formatJson,
  minify,
  safeParse,
  sortKeysDeep,
  unescapeText,
  type JsonValue,
} from '../core/json-utils.js';
import { AppState } from '../state/app-state.js';
import { EditorPanel } from '../ui/editor-panel.js';
import { TreePanel } from '../ui/tree-panel.js';
import { createToolbar, type ToolbarAction } from '../ui/toolbar.js';
import { showToast } from '../ui/toast.js';
import { copyText } from '../utils/clipboard.js';
import { debounce } from '../utils/debounce.js';
import { mustGetElement } from '../utils/dom.js';

/** 输入停止后多久同步右侧 */
const SYNC_DELAY = 200;

function bootstrap(): void {
  const state = new AppState();
  const editor = new EditorPanel(mustGetElement('left-editor'));
  const tree = new TreePanel(mustGetElement('right-view'));

  const syncToTree = debounce((text: string) => state.updateFromEditor(text), SYNC_DELAY);

  editor.onChange((text) => syncToTree(text));

  state.subscribe((snapshot) => {
    if (snapshot.source === 'external') editor.setValue(snapshot.text, { silent: true });
    editor.setInvalid(snapshot.error !== null && snapshot.text.trim() !== '');
    tree.render(snapshot.json, { keepCollapse: !snapshot.resetView });
  });

  createToolbar(mustGetElement('left-toolbar'), buildLeftActions(editor, state));
  createToolbar(mustGetElement('right-toolbar'), buildRightActions(state, tree));
  editor.focus();
}

function buildLeftActions(editor: EditorPanel, state: AppState): ToolbarAction[] {
  return [
    {
      id: 'unescape',
      label: '反转义',
      onClick: () => {
        const source = editor.getText();
        const result = unescapeText(source);
        if (result === source) {
          showToast('没有可还原的转义字符', 'warn');
          return;
        }
        editor.setValue(result);
        showToast('已反转义');
      },
    },
    {
      id: 'format',
      label: '格式化',
      onClick: () => {
        const parsed = safeParse(editor.getText());
        if (!parsed.ok) {
          showToast('当前内容不是有效的 JSON', 'warn');
          return;
        }
        editor.setValue(formatJson(parsed.value));
        showToast('已格式化');
      },
    },
    {
      id: 'clear',
      label: '清空',
      onClick: () => {
        editor.setValue('', { silent: true });
        state.reset();
      },
    },
  ];
}

function buildRightActions(state: AppState, tree: TreePanel): ToolbarAction[] {
  return [
    {
      id: 'copy',
      label: '复制',
      onClick: async () => {
        if (!tree.hasContent()) {
          showToast('暂无可复制的内容', 'warn');
          return;
        }
        const succeeded = await copyText(tree.getText());
        showToast(succeeded ? '已复制格式化结果' : '复制失败，请检查剪贴板权限', succeeded ? 'info' : 'warn');
      },
    },
    {
      id: 'minify',
      label: '压缩',
      onClick: () => {
        const value = requireValue(tree);
        if (value === undefined) return;
        state.applyJson(value, minify(value));
        showToast('已压缩为单行并回写到左侧');
      },
    },
    {
      id: 'expand-all',
      label: '全部展开',
      onClick: () => {
        if (!tree.hasContent()) {
          showToast('暂无可展开的内容', 'warn');
          return;
        }
        tree.expandAll();
      },
    },
    {
      id: 'collapse-all',
      label: '全部收缩',
      onClick: () => {
        if (!tree.hasContent()) {
          showToast('暂无可收缩的内容', 'warn');
          return;
        }
        tree.collapseAll();
      },
    },
    {
      id: 'sort-keys',
      label: '排序',
      onClick: () => {
        const value = requireValue(tree);
        if (value === undefined) return;
        const sorted = sortKeysDeep(value);
        state.applyJson(sorted);
        showToast('已按键名排序');
      },
    },
  ];
}

/** 取当前 JSON，数据未就绪时给出提示并返回 undefined */
function requireValue(tree: TreePanel): JsonValue | undefined {
  if (!tree.hasContent()) {
    showToast('暂无可处理的内容', 'warn');
    return undefined;
  }
  return tree.getValue() as JsonValue;
}

bootstrap();
