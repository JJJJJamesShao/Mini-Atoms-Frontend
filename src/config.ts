// 环境变量与常量
export const API_BASE: string = import.meta.env.VITE_API_URL || '';

// SSE 看门狗：超过该时长未收到任何数据（含心跳）判定连接死亡
export const SSE_WATCHDOG_MS = 45_000;

export const TOKEN_STORAGE_KEY = 'token';
