/**
 * 应用状态：单向数据流的唯一数据源。
 * 只保存文本与 JSON 数据，不持有任何 DOM，视图通过 subscribe 被动更新。
 */

import { formatJson, safeParse, type JsonValue } from '../core/json-utils.js';

export type UpdateSource = 'editor' | 'external';

export interface AppSnapshot {
  /** 左侧文本（与编辑器保持一致） */
  text: string;
  /** 最近一次校验通过的 JSON；校验失败时保留上一次的值 */
  json: JsonValue | null;
  /** 校验错误信息，成功时为 null */
  error: string | null;
  /** 本次更新来源：external 表示需要回写左侧编辑器 */
  source: UpdateSource;
  /** 是否重置右侧折叠状态（左侧输入时重置，右侧操作时保持） */
  resetView: boolean;
  /** 递增版本号，便于订阅方做增量判断 */
  revision: number;
}

export type StateListener = (snapshot: AppSnapshot) => void;

export class AppState {
  private snapshot: AppSnapshot = {
    text: '',
    json: null,
    error: null,
    source: 'editor',
    resetView: true,
    revision: 0,
  };

  private readonly listeners = new Set<StateListener>();

  get current(): AppSnapshot {
    return this.snapshot;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 左侧内容变化：校验通过则更新右侧并回到默认收缩状态，校验失败则右侧保持不变 */
  updateFromEditor(text: string): void {
    const result = safeParse(text);
    this.commit({
      text,
      json: result.ok ? result.value : this.snapshot.json,
      error: result.ok ? null : result.error,
      source: 'editor',
      resetView: result.ok,
    });
  }

  /** 右侧操作（压缩/排序）产生的新数据：同步数据与左侧文本，保持右侧折叠状态 */
  applyJson(value: JsonValue, text: string = formatJson(value)): void {
    this.commit({ text, json: value, error: null, source: 'external', resetView: false });
  }

  /** 清空左右两侧 */
  reset(): void {
    this.commit({ text: '', json: null, error: null, source: 'external', resetView: true });
  }

  private commit(patch: Omit<AppSnapshot, 'revision'>): void {
    this.snapshot = { ...patch, revision: this.snapshot.revision + 1 };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
