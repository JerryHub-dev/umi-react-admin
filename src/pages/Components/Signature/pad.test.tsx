// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockPad = {
  canvas: HTMLCanvasElement;
  options: { penColor?: string };
  penColor: string;
  compositeOperation: string;
  clear: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  isEmpty: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  toData: ReturnType<typeof vi.fn>;
  fromData: ReturnType<typeof vi.fn>;
};

const pads = vi.hoisted(() => [] as MockPad[]);
const observers = vi.hoisted(() => [] as { disconnect: ReturnType<typeof vi.fn> }[]);
const theme = vi.hoisted(() => ({ dark: false }));

vi.mock('signature_pad', () => {
  class SignaturePad {
    canvas: HTMLCanvasElement;
    options: { penColor?: string };
    penColor: string;
    compositeOperation = 'source-over';
    clear = vi.fn();
    off = vi.fn();
    isEmpty = vi.fn(() => false);
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    toData = vi.fn(() => [{ penColor: '#1f1f1f' }]);
    fromData = vi.fn();
    constructor(canvas: HTMLCanvasElement, options: { penColor?: string } = {}) {
      this.canvas = canvas;
      this.options = options;
      this.penColor = options.penColor ?? '';
      pads.push(this);
    }
  }
  return { default: SignaturePad };
});

vi.mock('@umijs/max', () => ({ useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }) }));
vi.mock('@/components/DemoPage', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useChartTheme', () => ({
  useChartTheme: () => ({
    dark: theme.dark,
    token: { colorText: '#e6e6e6', colorBorder: '#333', colorFillQuaternary: '#111' },
    color: (name: string) => name,
  }),
}));
vi.mock('@/utils/signature', () => ({ safeSignature: (value: string | undefined) => value }));

const pendingTickets = vi.hoisted(() => [
  {
    id: 'WO-1',
    title: 'Antenna swap',
    deviceName: 'RRU-1',
    assigneeName: 'Ada',
    resolvedAt: '2026-10-14T02:00:00.000Z',
    priority: 'high',
    slaHours: 4,
  },
  {
    id: 'WO-2',
    title: 'Fiber splice',
    deviceName: 'RRU-2',
    assigneeName: 'Bo',
    resolvedAt: '2026-10-14T03:00:00.000Z',
    priority: 'medium',
    slaHours: 8,
  },
]);

const api = vi.hoisted(() => ({ reload: vi.fn() }));
vi.mock('@/hooks/useApi', () => ({
  useApi: () => ({ data: pendingTickets, loading: false, error: undefined, reload: api.reload }),
}));

const services = vi.hoisted(() => ({ signTicket: vi.fn(), listTickets: vi.fn() }));
vi.mock('@/services/ops', () => services);

const message = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));

vi.mock('antd', () => {
  const PassThrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Descriptions = Object.assign(PassThrough, { Item: PassThrough });
  return {
    App: { useApp: () => ({ message }) },
    Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    Card: PassThrough,
    Col: PassThrough,
    Descriptions,
    Empty: ({ description }: { description?: ReactNode }) => <div data-testid="empty">{description}</div>,
    Result: ({ extra }: { extra?: ReactNode }) => <div data-testid="result">{extra}</div>,
    Row: PassThrough,
    Segmented: ({
      value,
      onChange,
      options,
    }: {
      value: string;
      onChange: (value: string) => void;
      options: { value: string; label: ReactNode }[];
    }) => (
      <select data-testid="tool" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Select: ({
      value,
      onChange,
      options,
    }: {
      value?: string;
      onChange: (value: string) => void;
      options: { value: string; label: ReactNode }[];
    }) => (
      <select data-testid="ticket" value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Space: PassThrough,
    Tag: PassThrough,
    Typography: { Text: PassThrough },
  };
});

import Signature from './index';

const context2d = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
  globalCompositeOperation: 'source-over',
};

beforeEach(() => {
  pads.length = 0;
  observers.length = 0;
  theme.dark = false;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor() {
      observers.push(this);
    }
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context2d as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,exported');
  services.signTicket.mockReset().mockResolvedValue({
    id: 'WO-1',
    title: 'Antenna swap',
    acceptance: {
      signature: 'data:image/png;base64,exported',
      signerName: 'Ada',
      signedAt: '2026-10-14T04:00:00.000Z',
    },
  });
  message.success.mockReset();
  message.warning.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const mount = () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root: Root = createRoot(host);
  const render = () => act(() => root.render(<Signature />));
  render();
  const button = (label: string) =>
    [...host.querySelectorAll('button')].find((element) => element.textContent === label);
  return {
    host,
    root,
    render,
    button,
    selectTicket: (id: string) =>
      act(() => {
        const select = host.querySelector<HTMLSelectElement>('[data-testid="ticket"]');
        if (select) {
          select.value = id;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }),
    unmount: () => act(() => root.unmount()),
  };
};

const flush = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

describe('Signature pad lifecycle', () => {
  it('creates one pad on the canvas with the light-theme ink and observes its size', () => {
    const harness = mount();

    expect(pads).toHaveLength(1);
    expect(pads[0].options.penColor).toBe('#1f1f1f');
    expect(pads[0].canvas.tagName).toBe('CANVAS');
    expect(pads[0].addEventListener).toHaveBeenCalledWith('endStroke', expect.any(Function));
    expect(observers).toHaveLength(1);
    expect(observers[0].disconnect).not.toHaveBeenCalled();

    harness.unmount();
    expect(pads[0].off).toHaveBeenCalledTimes(1);
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('clears the pad when the selected ticket changes so signatures never mix', () => {
    const harness = mount();
    // 挂载时「选中第一张有效工单」本身就会清一次空画板，所以断言的是切换后清板次数增加
    const clearsBefore = pads[0].clear.mock.calls.length;

    harness.selectTicket('WO-2');

    expect(pads[0].clear.mock.calls.length).toBeGreaterThan(clearsBefore);
    // 换工单只清画板，不重建
    expect(pads).toHaveLength(1);
    harness.unmount();
  });

  it('recolours existing strokes on theme change instead of recreating the pad', () => {
    const harness = mount();

    theme.dark = true;
    harness.render();

    // 切主题不能重建画板（重建等于清掉已画笔迹）
    expect(pads).toHaveLength(1);
    expect(pads[0].penColor).toBe('#e6e6e6');
    expect(pads[0].fromData).toHaveBeenCalledWith([{ penColor: '#e6e6e6' }]);
    harness.unmount();
  });

  it('signs with the exported PNG, tears the pad down, then rebuilds it for the next ticket', async () => {
    const harness = mount();

    await act(async () => {
      harness.button('signature.submit')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();

    expect(services.signTicket).toHaveBeenCalledWith('WO-1', 'data:image/png;base64,exported');
    // 提交成功后画板被结果视图替换：pad 必须解除绑定，避免继续持有已卸载的 canvas
    expect(pads[0].off).toHaveBeenCalledTimes(1);
    expect(harness.host.querySelector('canvas')).toBeNull();

    // 「下一张」重新挂上画板：新 canvas 需要新的 SignaturePad 实例
    await act(async () => {
      harness.button('signature.next')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flush();

    expect(pads).toHaveLength(2);
    expect(pads[1].canvas).toBe(harness.host.querySelector('canvas'));
    expect(pads[1].options.penColor).toBe('#1f1f1f');
    harness.unmount();
  });
});
