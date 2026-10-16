import type { PresetColor } from '@/constants/semantic';
import { useThemeMode } from '@/hooks/useThemeMode';
import { Tag } from 'antd';
import type { ReactNode } from 'react';

type SemanticTagProps = {
  /** 与全站语义色板同源的预设色名；不传时为 antd 默认标签 */
  tone?: PresetColor;
  className?: string;
  children: ReactNode;
};

/**
 * 语义标签（无障碍 Q5）：antd 预设色 Tag =「调色板 7 档文字 + 1 档底色」，两套主题都有不达标的组合——
 * 浅色 orange 3.33:1、gold 2.75:1、green 3.46:1、cyan 3.35:1、lime 2.42:1；
 * 深色 purple 3.25:1、magenta/geekblue 等也在边缘。这里按当前主题把文字换成同色系中
 * 能压在该主题底色上的档位（括号内为实测对比度，色值经 @ant-design/colors 的 generate 复核）。
 */
const LIGHT_TEXT: Partial<Record<PresetColor, string>> = {
  orange: '#ad4e00', // #fff7e6 上 5.09:1（默认 #d46b08 3.33:1）
  gold: '#874d00', // #fffbe6 上 6.53:1（默认 #d48806 2.75:1）
  green: '#237804', // #f6ffed 上 5.44:1（默认 #389e0d 3.46:1）
  cyan: '#006d75', // #e6fffb 上 5.82:1（默认 #08979c 3.35:1）
  lime: '#3f6600', // #fcffe6 上 6.65:1（默认 #7cb305 2.42:1）
};

/** 深色主题下 antd 的 1 档底色是深色，7 档文字偏暗：换成亮档（对比度为在该色深色底上的实测值） */
const DARK_TEXT: Partial<Record<PresetColor, string>> = {
  red: '#dc6966', // #2a1215 上 5.23:1
  volcano: '#dc8861', // #2b1611 上 6.31:1
  orange: '#dca65c', // #2b1d11 上 7.50:1
  gold: '#dcb95a', // #2b2111 上 8.38:1
  lime: '#b9db5c', // #1f2611 上 9.94:1
  green: '#82c058', // #162312 上 7.50:1
  cyan: '#51bdb6', // #112123 上 7.35:1
  blue: '#5c99dc', // #111a2c 上 5.83:1
  geekblue: '#748fdc', // #131629 上 5.71:1
  purple: '#9b6fcb', // #1a1325 上 4.75:1（默认 #854eca 只有 3.25:1）
  magenta: '#dc74a6', // #291321 上 5.86:1
};

export default function SemanticTag({ tone, className, children }: SemanticTagProps) {
  const { dark } = useThemeMode();
  const text = tone ? (dark ? DARK_TEXT[tone] : LIGHT_TEXT[tone]) : undefined;
  return (
    <Tag color={tone} className={className} style={text ? { color: text } : undefined}>
      {children}
    </Tag>
  );
}
