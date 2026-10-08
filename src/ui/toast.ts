/** 轻量提示条：用于复制、压缩、排序等操作的反馈 */

export type ToastTone = 'info' | 'warn';

let hideTimer: number | undefined;
let removeTimer: number | undefined;

export function showToast(message: string, tone: ToastTone = 'info'): void {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  window.requestAnimationFrame(() => toast.classList.add('is-visible'));

  if (hideTimer !== undefined) window.clearTimeout(hideTimer);
  if (removeTimer !== undefined) window.clearTimeout(removeTimer);

  hideTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    removeTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 180);
  }, 1400);
}
