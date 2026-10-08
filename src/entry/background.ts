/**
 * MV3 Service Worker：唯一职责是把扩展页面以独立标签页形式打开。
 * action 未声明 default_popup，因此点击图标会触发 onClicked。
 */

const PAGE_PATH = 'index.html';

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL(PAGE_PATH) }).catch((error: unknown) => {
    console.error('[json-format] 打开 JSON 格式化页面失败', error);
  });
});
