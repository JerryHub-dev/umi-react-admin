import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn() },
  useAccess: () => ({ systemUserView: true }),
  useAppData: () => ({
    clientRoutes: [
      { name: 'dashboard', path: '/dashboard' },
      { name: 'system', path: '/system', routes: [{ name: 'users', path: '/system/users', access: 'systemUserView' }] },
    ],
  }),
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
}));
// Modal 直接渲染内容；Input 渲染成原生 input，只透传 DOM 属性（allowClear/variant/prefix 是 antd 专有）
vi.mock('antd', () => ({
  Modal: ({ children }: { children: unknown }) => children,
  Input: ({ allowClear: _a, variant: _v, prefix: _p, ...rest }: ComponentProps<'input'> & Record<string, unknown>) => (
    <input {...rest} />
  ),
  theme: { useToken: () => ({ token: {} }) },
}));

import CommandPalette from './index';

const attr = (html: string, pattern: RegExp) => pattern.exec(html)?.[1];

describe('CommandPalette combobox semantics', () => {
  it('输入框是 combobox：aria-controls 指向 listbox，aria-activedescendant 指向当前活动项', () => {
    const html = renderToStaticMarkup(<CommandPalette />);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('aria-expanded="true"');

    const listId = attr(html, /aria-controls="([^"]+)"/);
    expect(listId).toBeTruthy();
    expect(html).toContain(`id="${listId}" role="listbox"`);

    const activeId = attr(html, /aria-activedescendant="([^"]+)"/);
    expect(activeId).toBeTruthy();
    // 活动项（默认第一项）就是带该 id、且 aria-selected 的 option
    expect(html).toMatch(new RegExp(`id="${activeId}" role="option" aria-selected="true"`));
    expect(html.match(/role="option"/g)).toHaveLength(2);
  });
});
