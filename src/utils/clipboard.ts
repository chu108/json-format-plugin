/** 剪贴板工具：优先使用异步 API，失败时回退到临时 textarea */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('[json-format] Clipboard API 复制失败，尝试回退方案', error);
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  try {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.top = '-1000px';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const succeeded = document.execCommand('copy');
    helper.remove();
    return succeeded;
  } catch (error) {
    console.error('[json-format] 复制到剪贴板失败', error);
    return false;
  }
}
