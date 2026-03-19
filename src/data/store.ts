import { Investment } from '@/types/investment';
import { INVESTMENT_DATA } from './investments';

// 메모리 저장소 (나중에 DB로 교체)
// 모듈 스코프에 저장되므로 서버가 재시작되기 전까지 유지됨
export const investments: Investment[] = [...INVESTMENT_DATA];
let nextId = investments.length + 1;

export function getNextId(): string {
  return String(nextId++);
}
