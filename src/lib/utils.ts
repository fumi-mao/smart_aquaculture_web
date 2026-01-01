import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
}

export function formatDateTime(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/\//g, '-'); 
}

/**
 * 格式化 API 所需的日期时间字符串 (YYYY-MM-DD HH:mm:ss)
 * 作用：统一前端调用接口的时间格式，避免各处重复实现和格式不一致
 * 输入：Date 对象
 * 输出：符合后端时间解析的字符串
 */
export function formatApiDateTime(date: Date) {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}
