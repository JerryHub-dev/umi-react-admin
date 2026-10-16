import type { ThemeConfig } from 'antd';

/**
 * 无障碍（Q5 / WCAG 2.1 AA）主题 token 覆盖的单一来源。
 *
 * 为什么需要它：antd 默认调色板在「当文字用」的场景下明暗两套都达不到 4.5:1 ——
 * 浅色 colorPrimary/colorLink #1677ff 白底 4.10:1、白字压在主色按钮上同为 4.10:1；
 * 深色 colorLink #1668dc 在 #141414 上 3.55:1；占位符（antd 渲染成真实 DOM 文本）
 * 浅色 1.83:1 / 深色 2.24:1；状态色当文字用时 light error #ff4d4f 3.26:1、
 * success #52c41a 2.26:1、warning #faad14 1.90:1。
 *
 * 为什么分主题两套值：同一个 token 既要当「白底上的文字」（要求足够深），又要当「深底上的文字」
 * （要求足够浅），方向相反、无法用一组值同时满足，所以按当前主题返回对应的一组。
 * 同一份值必须同时被启动配置（src/app.tsx 的 antd runtime）与热切换（src/hooks/useThemeMode.ts
 * 的 apply）使用。⚠️ 两套的**键集合必须完全一致**：umi 的 setAntdConfig 是深合并
 * （@umijs/plugins antd runtime 的 `merge({}, prev, next)`，只覆盖 next 里出现的键），
 * 暗色那套少写一个键，切换时就会残留浅色的值——例如浅色 colorPrimary #0958d9 残留后，
 * 暗色算法从它重新派生，主色文字在 #141414 上只剩 2.48:1。src/styles/themeTokens.test.ts
 * 用键集合断言把这条不变量钉死。
 *
 * 两个容易踩的坑（都用 @ant-design/colors@8 的 generate() 复核过）：
 * 1) colorPrimary / colorLink / colorSuccess / colorError / colorWarning 属于 seed token，
 *    会被算法重算：浅色档位 6 恰好等于输入值，所以浅色的输入即最终值；暗色档位会做明暗映射，
 *    例如输入 #69b1ff 得到 #5c99dc、输入 #52c41a 得到 #49aa19。因此暗色那套显式写回 antd 的
 *    暗色默认 seed（#1677ff / #52c41a / #faad14），让「冷启动暗色」与「切换来的暗色」逐 token 一致。
 * 2) 改 seed 会连带改变由它派生的底色（Tag 的填充色、Alert 背景）——例如把浅色 success 换成
 *    #237804 会让 colorSuccessBg 变成灰绿 #adb8a5，状态标签反而只有 2.70:1；暗色那套若不写
 *    Bg / Border，切换后会残留浅色档的近白底（#f6ffed 等）。所以 Bg / Border 这类 map token
 *    在两套里都按 antd 算法的实际派生值显式钉住（map token 不会被重算）。
 *
 * 每个值后面的对比度均为 WCAG 相对亮度公式实测（见 task-4 报告）。
 */

/**
 * 返回类型去掉 `ThemeConfig['token']` 自带的 `| undefined`：本函数永远返回一个完整对象，
 * 消费方（以及 src/styles/themeTokens.test.ts 的键集合断言）不该被迫做非空判断。
 */
export type A11yThemeTokens = NonNullable<ThemeConfig['token']>;

export const a11yThemeTokens = (mode: 'light' | 'realDark'): A11yThemeTokens =>
  mode === 'realDark'
    ? {
        // 暗色：显式写回 antd 暗色默认 seed —— 不是「省略」：umi 的 setAntdConfig 深合并只覆盖
        // 新配置里出现的键，暗色那套少写一个键，切换时就会残留浅色的值
        colorPrimary: '#1677ff', // 暗色算法派生 #1668dc；白字压其上 5.19:1
        colorLink: '#69b1ff', // 派生 #5c99dc：#141414 6.18:1、#1f1f1f 5.53:1、#222222 5.34:1、页脚 #000 7.05:1
        colorSuccess: '#52c41a', // 派生 #49aa19：#141414 6.18:1
        colorSuccessBg: '#162312', // 该 seed 派生的暗色绿 1 档：#49aa19 压其上 5.49:1
        colorSuccessBorder: '#274916',
        colorError: '#ff7875', // 派生 #dc6966：#141414 5.49:1（暗色默认 #dc4446 只有 4.34:1）
        colorErrorBg: '#2c1b1c', // 由 #ff7875 派生的暗色红 1 档：#dc6966 压其上 4.88:1
        colorErrorBorder: '#5b3231',
        colorWarning: '#faad14', // 派生 #d89614：#141414 7.27:1
        colorWarningBg: '#2b2111', // 暗色金 1 档：#d89614 压其上 6.24:1
        colorWarningBorder: '#594214',
        colorTextTertiary: '#a6a6a6', // 说明文字：#141414 7.57:1、#1f1f1f 6.77:1、选中态蓝底 5.26:1
        colorTextPlaceholder: '#8f8f8f', // Select 占位符：#141414 5.70:1（默认 2.24:1）
      }
    : {
        colorPrimary: '#0958d9', // 白底文字 6.16:1；白字压主色底 6.16:1（默认 #1677ff 均 4.10:1）
        // 链接色不跟随 colorPrimary：浅色算法取的是 seed.colorLink（默认空 → 用 colorInfo #1677ff）
        colorLink: '#0958d9', // #fff 6.16:1、#fafafa 5.90:1
        colorSuccess: '#237804', // 成功文字：#fff 5.59:1、#fafafa 5.35:1（默认 #52c41a 2.26:1）
        colorSuccessBg: '#f6ffed', // 状态标签底色拉回官方绿 1 档：#237804 压其上 5.44:1
        colorSuccessBorder: '#b7eb8f',
        colorError: '#cf1322', // 危险文字：#fff 5.57:1、#fafafa 5.34:1（默认 #ff4d4f 3.26:1）
        colorErrorBg: '#fff1f0', // 红 1 档：#cf1322 压其上 5.07:1
        colorErrorBorder: '#ffccc7',
        colorWarning: '#ad4e00', // 警告文字：#fff 5.43:1、#fafafa 5.20:1（默认 #faad14 1.90:1）
        colorWarningBg: '#fffbe6', // 金 1 档：#ad4e00 压其上 5.22:1
        colorWarningBorder: '#ffe58f',
        colorTextTertiary: '#5f5f5f', // 说明文字：#fff 6.39:1、#e6f4ff 5.70:1（#6f6f6f 在浅蓝卡上只有 4.48:1）
        colorTextPlaceholder: '#6f6f6f', // Select 占位符：#fff 5.02:1、#f5f5f5 4.68:1（默认 #bfbfbf 1.83:1）
      };
