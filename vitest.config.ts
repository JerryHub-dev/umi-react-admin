import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      /**
       * 门禁覆盖的是**选定域**，不是全项目：`vitest.config.ts` 只把数据/逻辑层（utils、services、demo）
       * 与安全相关页面逻辑纳入统计，界面组件（src/components、src/pages 其余页面、src/layouts）不在其中。
       * 因此这里的百分比不能当成全项目覆盖率对外引用；需要全项目口径时用 `--coverage.include='src/**'` 单独跑。
       * 扩面顺序：初始只挑 4 个文件 → 2026-10 扩到 utils / services / demo / 安全页面（本次 Q1）。
       */
      include: [
        'src/utils/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
        'src/demo/**/*.{ts,tsx}',
        // 安全相关页面逻辑：登录凭据入口、用户与角色（账号、权限）管理
        'src/pages/Login/**/*.{ts,tsx}',
        'src/pages/System/Users/**/*.{ts,tsx}',
        'src/pages/System/Roles/**/*.{ts,tsx}',
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
});
