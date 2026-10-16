// @vitest-environment jsdom
import type { EventInput } from '@fullcalendar/react';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** FullCalendar 只用来观察 props：事件源函数的引用变化才是「保存后重新拉取」的触发条件 */
type SourceInfo = { startStr: string; endStr: string };
type CalendarProps = {
  events: ((info: SourceInfo) => Promise<EventInput[]>) & { version?: number };
  select: (info: SourceInfo & { allDay: boolean; view: { calendar: { unselect: () => void } } }) => void;
  weekends: boolean;
};

const captured = vi.hoisted(() => ({ props: undefined as CalendarProps | undefined }));

vi.mock('@fullcalendar/react', () => ({
  default: (props: CalendarProps) => {
    captured.props = props;
    return null;
  },
}));
vi.mock('@fullcalendar/react/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/react/interaction', () => ({ default: {} }));
vi.mock('@fullcalendar/react/list', () => ({ default: {} }));
vi.mock('@fullcalendar/react/locales/zh-cn', () => ({ default: {} }));
vi.mock('@fullcalendar/react/multimonth', () => ({ default: {} }));
vi.mock('@fullcalendar/react/themes/classic', () => ({ default: {} }));

vi.mock('@umijs/max', () => ({
  useIntl: () => ({ locale: 'en-US', formatMessage: ({ id }: { id: string }) => id }),
}));
vi.mock('@/components/DemoPage', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useEnums', () => ({
  useEnums: () => ({ label: (_group: string, key: string) => key, options: () => [] }),
}));
// 真实 useChartTheme 用 useMemo 返回稳定引用（依赖 dark/token）；替身必须同样稳定，
// 否则每次渲染都是新 chart → toInput/fetchEvents 必然变新引用，测不出「无关重渲染不刷新事件源」
const chartTheme = vi.hoisted(() => {
  const color = (name: string) => name;
  return { light: { dark: false, token: {}, color, g2Theme: 'classic' } };
});
vi.mock('@/hooks/useChartTheme', () => ({ useChartTheme: () => chartTheme.light }));

const services = vi.hoisted(() => ({
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));
vi.mock('@/services/events', () => services);

const formApi = vi.hoisted(() => ({ validateFields: vi.fn(), setFieldsValue: vi.fn() }));
const message = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));

/** antd 只承担渲染外壳，这里给出最小替身，把交互回调暴露出来供断言 */
vi.mock('antd', () => {
  const PassThrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Button = ({ children, onClick, ...rest }: { children?: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick} {...rest}>
      {children}
    </button>
  );
  const Modal = ({
    open,
    title,
    onOk,
    onCancel,
    children,
    footer,
  }: {
    open?: boolean;
    title?: ReactNode;
    onOk?: () => void;
    onCancel?: () => void;
    children?: ReactNode;
    footer?: ReactNode;
  }) =>
    open ? (
      <div data-modal={String(title)}>
        <span>{title}</span>
        <button type="button" data-role="ok" onClick={onOk}>
          ok
        </button>
        <button type="button" data-role="cancel" onClick={onCancel}>
          cancel
        </button>
        {children}
        {footer}
      </div>
    ) : null;
  return {
    App: { useApp: () => ({ message }) },
    Badge: ({ text }: { text?: ReactNode }) => <span>{text}</span>,
    Button,
    Card: PassThrough,
    Checkbox: ({ children, checked, onChange }: { children?: ReactNode; checked?: boolean; onChange?: () => void }) => (
      <label>
        <input type="checkbox" checked={checked} onChange={onChange} />
        {children}
      </label>
    ),
    Col: PassThrough,
    Empty: () => <div />,
    Form: Object.assign(({ children }: { children?: ReactNode }) => <form>{children}</form>, {
      useForm: () => [formApi],
      Item: PassThrough,
    }),
    Grid: { useBreakpoint: () => ({ md: true }) },
    Input: () => <input />,
    Listy: PassThrough,
    Modal,
    Popconfirm: PassThrough,
    Row: PassThrough,
    Select: () => <select />,
    Typography: { Paragraph: PassThrough, Text: PassThrough, Title: PassThrough },
  };
});

import Calendar from './index';

beforeEach(() => {
  captured.props = undefined;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // jsdom 没有 matchMedia：Calendar 用它同步判断首帧是否窄屏
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      media: '(min-width: 768px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  services.listEvents.mockReset().mockResolvedValue([]);
  services.createEvent.mockReset().mockResolvedValue({ id: 'new' });
  formApi.validateFields.mockReset().mockResolvedValue({ title: 'Night shift', type: 'duty' });
  formApi.setFieldsValue.mockReset();
  message.success.mockReset();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const mount = () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root: Root = createRoot(host);
  act(() => root.render(<Calendar />));
  return { host, root, unmount: () => act(() => root.unmount()) };
};

const flush = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

/** WCAG 2.1 相对亮度对比度（白字压在该背景色上） */
const contrastWithWhite = (hex: string) => {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05);
};

describe('Calendar event source', () => {
  it('maps API rows for the requested view range with a white-text-safe event colour', async () => {
    services.listEvents.mockResolvedValue([
      {
        id: 'e1',
        title: 'Duty',
        start: '2026-01-01T00:00:00Z',
        end: '2026-01-01T08:00:00Z',
        allDay: false,
        type: 'duty',
      },
    ]);
    const harness = mount();
    // 挂载时的「接下来 14 天」请求也要落地，否则其 setState 落在 act 之外
    await flush();
    const source = captured.props?.events;
    expect(source).toBeTypeOf('function');

    const rows = await act(async () => source?.({ startStr: 'RANGE-START', endStr: 'RANGE-END' }));

    expect(services.listEvents).toHaveBeenCalledWith('RANGE-START', 'RANGE-END');
    const [first] = rows ?? [];
    expect(first).toMatchObject({
      id: 'e1',
      title: 'Duty',
      start: '2026-01-01T00:00:00Z',
      end: '2026-01-01T08:00:00Z',
      allDay: false,
      extendedProps: { type: 'duty' },
    });

    // 事件块是「深底 + 白字」，颜色必须是能压住白字的具体色值（不是 antd 预设名），
    // 且与白色的对比度 ≥4.5:1（Q5 契约）。不锁定具体色号，允许无障碍调色迭代。
    const color = String(first?.color ?? '');
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrastWithWhite(color)).toBeGreaterThanOrEqual(4.5);
    harness.unmount();
  });

  it('keeps the source identity stable across unrelated re-renders', async () => {
    const harness = mount();
    const before = captured.props?.events;

    // 勾选“显示周末”只是重渲染，不应让 FullCalendar 重新拉取事件源
    const checkbox = harness.host.querySelector<HTMLInputElement>('input[type="checkbox"]');
    await act(async () => {
      checkbox?.click();
    });
    expect(captured.props?.events).toBe(before);
    harness.unmount();
  });

  it('changes the source identity after saving so FullCalendar refetches', async () => {
    const harness = mount();
    const before = captured.props?.events;

    // 框选时间段 → 打开新建弹窗 → 确认保存
    await act(async () => {
      captured.props?.select({
        startStr: '2026-02-01T09:00:00Z',
        endStr: '2026-02-01T10:00:00Z',
        allDay: false,
        view: { calendar: { unselect: vi.fn() } },
      });
    });
    const ok = harness.host.querySelector('[data-modal="calendar.newEvent"] [data-role="ok"]');
    expect(ok).not.toBeNull();
    await act(async () => {
      ok?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();

    expect(services.createEvent).toHaveBeenCalledWith({
      title: 'Night shift',
      type: 'duty',
      start: '2026-02-01T09:00:00Z',
      end: '2026-02-01T10:00:00Z',
      allDay: false,
    });
    // 关键断言：事件源必须是新引用，否则 FullCalendar 不会重新拉取（保存后日历看不到新日程）
    expect(captured.props?.events).not.toBe(before);
    harness.unmount();
  });
});
