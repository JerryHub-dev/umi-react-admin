/**
 * 统一的「当前时间」出口：受控演示模式下跟随演示时钟（frozen 时冻结在场景锚点），
 * 否则即系统时间。页面与业务计算（SLA 剩余、持续时长、时间窗裁剪）一律用它，
 * 不要直接 new Date()/Date.now()——否则冻结场景里相对时间会按真实时间漂移。
 */
import { demoClock } from '@/demo/clock';

export const now = (): Date => demoClock.now();
export const nowMs = (): number => demoClock.now().getTime();
