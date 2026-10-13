/**
 * 生成 Excel 导入功能的可下载示例文件（场景清单与样例约定见 docs/demo/）。
 *
 * 页面「示例文件」下拉按 `${PUBLIC_PATH}demo/<file>` 直接下载这四个文件（见
 * src/pages/Document/Excel/index.tsx 的 SAMPLE_FILES），拖回导入区即可演示逐行校验：
 * 全有效 / 部分有效 / 全部无效 / 重复登录名（文件内重复 + 与现有用户冲突）。
 *
 * 用法：node scripts/make-demo-samples.mjs
 * - 确定性：数据写死、文档元数据时间戳固定，重复执行产物字节一致（无随机、无当前时间）
 * - 表头用默认语言 zh-CN 的列名（姓名/登录名/邮箱/部门/角色），与页面在中文界面导出的模板一致；
 *   解析端对表头与枚举值双语 + key 都识别（userSheet.ts），英文界面导入同样有效
 * - 部门/角色单元格写 key（ops1/operator 等），与 locale 无关，解析后即枚举 key
 * - 每行命中 userSheet.ts 校验规则的哪一条，由 src/pages/Document/Excel/samples.test.ts 兜底断言
 *   （走真实导入管线 validateXlsxArchive + ExcelJS + parseUsersWorkbook）
 * - demo.iris / demo.hugo / demo.nora 为演示主线（E08）保留用户名，不与种子用户（拼音式 + admin/guest）冲突
 */
import ExcelJS from 'exceljs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo');
const SHEET_NAME = '用户数据'; // 页面导出用 t('excel.exportTitle')，中文界面即「用户数据」
const HEADERS = ['姓名', '登录名', '邮箱', '部门', '角色'];
const COLUMN_WIDTHS = [18, 18, 32, 18, 18]; // 与 buildUsersWorkbook 一致：邮箱列加宽
/** 固定的文档元数据时间戳，保证产物字节可复现 */
const FIXED_DATE = new Date('2026-10-12T00:00:00Z');

const SAMPLES = [
  {
    file: 'users-valid.xlsx',
    rows: [
      // 3 行全部有效；demo.* 用户名不与 86 个种子用户（拼音式 + admin/guest）冲突
      ['陈雨薇', 'demo.iris', 'demo.iris@example.com', 'ops1', 'operator'],
      ['顾浩宇', 'demo.hugo', 'demo.hugo@example.com', 'analytics', 'analyst'],
      ['林诺拉', 'demo.nora', 'demo.nora@example.com', 'support', 'viewer'],
    ],
  },
  {
    file: 'users-partial.xlsx',
    rows: [
      // 2 行有效 + 2 行互不相同的三类错误：邮箱格式 / 登录名非法（数字开头，小写化后仍不合法）
      ['赵明轩', 'demo.para', 'demo.para@example.com', 'ops2', 'lead'],
      ['钱思远', 'demo.parb', 'demo.parb@example.com', 'ops3', 'viewer'],
      ['孙晓梅', 'demo.mail', 'bad-email@example', 'platform', 'analyst'],
      ['周子墨', '1zimo', 'demo.zimo@example.com', 'security', 'operator'],
    ],
  },
  {
    file: 'users-invalid.xlsx',
    rows: [
      // 4 行全部无效，各命中一种错误：邮箱格式（无 @）/ 登录名非法（含 !）/ 姓名必填 / 登录名必填
      ['郑楚然', 'demo.badmail', 'not-an-email', 'ops1', 'operator'],
      ['冯晓晓', 'Zhao!bang', 'demo.zhao@example.com', 'analytics', 'analyst'],
      ['', 'demo.noname', 'demo.noname@example.com', 'ops2', 'viewer'],
      ['何家豪', '', 'demo.he@example.com', 'platform', 'lead'],
    ],
  },
  {
    file: 'users-duplicate.xlsx',
    rows: [
      // 1 行唯一有效 + 文件内重复一对（两行同报错）+ 与现有用户冲突（种子 admin）+ 跨文件冲突（demo.iris
      // 与 users-valid.xlsx 同一行：先导主线再导本文件即报「登录名已存在」）
      ['苏婉清', 'demo.su', 'demo.su@example.com', 'support', 'viewer'],
      ['韩冰', 'demo.twin', 'demo.twin@example.com', 'ops2', 'operator'],
      ['曹阳', 'demo.twin', 'demo.twin@example.com', 'ops3', 'operator'],
      ['陆明轩', 'admin', 'admin.demo@example.com', 'platform', 'operator'],
      ['陈雨薇', 'demo.iris', 'demo.iris@example.com', 'ops1', 'operator'],
    ],
  },
];

const buildWorkbook = (rows) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'umi-react-admin demo samples';
  workbook.lastModifiedBy = 'umi-react-admin demo samples';
  workbook.created = FIXED_DATE;
  workbook.modified = FIXED_DATE;
  const sheet = workbook.addWorksheet(SHEET_NAME);
  sheet.addRow(HEADERS);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  rows.forEach((row) => sheet.addRow(row));
  return workbook;
};

mkdirSync(OUT_DIR, { recursive: true });
for (const { file, rows } of SAMPLES) {
  const bytes = Buffer.from(await buildWorkbook(rows).xlsx.writeBuffer());
  writeFileSync(join(OUT_DIR, file), bytes);
  console.log(`${file}: ${rows.length} 行数据，${bytes.byteLength} 字节`);
}
