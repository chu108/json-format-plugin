# JSON 格式化工具（Chrome 扩展 / Manifest V3）

点击扩展图标即可打开一个独立标签页，整页铺满、深色主题，左右分栏实时处理 JSON 文本：

- 左侧：`反转义` `格式化` `清空` + 带行号的高亮编辑区
- 右侧：`复制` `压缩` `全部展开` `全部收缩` `排序` + 带行号、可按节点折叠的彩色结果区

## 功能规则

| 场景 | 行为 |
| --- | --- |
| 左侧输入变化（停止输入 200ms 后） | 校验 JSON，通过则右侧展示格式化结果并回到默认收缩状态（仅展开根节点）；不通过则右侧保持原内容不变，左侧出现错误色边框 |
| 反转义 | 整体是 JSON 字符串（如 `"{\"a\":1}"`）时取其字符串值，否则逐段还原 `\n`、`\t`、`\uXXXX` 等转义序列 |
| 格式化 | 校验通过后按 2 空格缩进美化左侧内容 |
| 清空 | 同时清空左右两侧 |
| 复制 | 复制右侧当前 JSON 的格式化文本到剪贴板（失败时自动回退到 `execCommand`） |
| 压缩 | 压缩为单行并回写左侧，右侧折叠状态保持不变 |
| 排序 | 递归按键名首字母排序（对象键排序，数组顺序不变），结果回写左侧，右侧折叠状态保持不变 |
| 全部展开 / 全部收缩 | 展开或收起右侧所有节点；收缩会把根节点一并收起（显示为一行） |
| 长行与滚动 | 左右两侧内容超出可视范围时出现滚动条，超宽行自动换行，行号与换行后的首行保持对齐 |

## 目录结构

```
src/
├── entry/
│   ├── background.ts       # Service Worker：点击图标打开独立标签页
│   └── index.ts            # 页面入口：装配 state / panels / toolbar
├── core/json-utils.ts      # JSON 纯函数：校验、格式化、压缩、反转义、排序
├── model/tree-model.ts     # JSON → 渲染节点模型
├── state/app-state.ts      # 单向数据流状态容器（订阅式）
├── render/
│   ├── highlight.ts        # 文本逐行语法高亮
│   └── tree-renderer.ts    # 右侧折叠树渲染（懒渲染 + 分片展开）
├── ui/
│   ├── editor-panel.ts     # 左侧编辑面板（透明输入层 + 高亮层 + 行号层）
│   ├── tree-panel.ts       # 右侧结果面板（承载树渲染器与空状态）
│   ├── toolbar.ts          # 通用按钮行组件（配置化）
│   └── toast.ts            # 轻量提示条
├── utils/                  # dom / debounce / clipboard
├── styles/                 # theme.css（主题与通用）、editor.css、tree.css
└── index.html              # 页面骨架
```

## 开发与构建

```bash
npm install
npm run build      # tsc 编译到 dist/ 并拷贝 manifest、html、css
npm run watch      # 开发时增量编译（修改 html/css 需重新执行 copy-files）
```

## 在 Chrome 中加载

1. 打开 `chrome://extensions`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目的 `dist` 目录
4. 点击工具栏中的扩展图标，即可打开 JSON 格式化页面

## 扩展新功能的方式

- 新增按钮：在 `src/entry/index.ts` 的 `buildLeftActions` / `buildRightActions` 中追加一条 `{ id, label, onClick }` 配置，按钮样式与布局自动复用。
- 新增 JSON 能力：在 `core/json-utils.ts` 中新增纯函数；新增渲染形态：在 `render/` 下新增渲染器；新增面板区域：按 `ui/` 下的面板模式新建组件并在 `index.html` 中预留容器。
- 主题色、字体、行高等统一在 `styles/theme.css` 的 CSS 变量中调整，组件样式各自独立，互不影响。
