import DemoPage from '@/components/DemoPage';
import type { User } from '@/services/types';
import { importUsers, listUsers } from '@/services/users';
import { BizError } from '@/utils/BizError';
import { CloseOutlined, DownloadOutlined, FileExcelOutlined, InboxOutlined, RedoOutlined } from '@ant-design/icons';
import { Link, useAccess, useIntl } from '@umijs/max';
import { Alert, App, Button, Card, Dropdown, Space, Spin, Table, Tag, Typography, Upload } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { importUsersFile } from './importFile';
import {
  FIELDS,
  buildUsersWorkbook,
  downloadWorkbook,
  restrictRoleColumn,
  toImportRows,
  type ParsedRow,
} from './userSheet';
import { WorkbookInputError, checkWorkbookFileSize } from './xlsxBoundary';

/** exceljs 体积较大，只在点击导入 / 导出时加载 */
const loadExcel = () => import('exceljs');

/** 全量用户（跨分页；导出去重与重复登录名判断都必须覆盖全部页，>200 人时 pageSize 上限截断会漏） */
const fetchAllUsers = async (): Promise<User[]> => {
  const users: User[] = [];
  let current = 1;
  // 演示后端 pageSize 上限 200：循环取完所有分页
  for (;;) {
    const page = await listUsers({ pageSize: 200, current });
    users.push(...page.list);
    if (users.length >= page.total || !page.list.length) return users;
    current += 1;
  }
};

const TEMPLATE_ROWS: Pick<User, (typeof FIELDS)[number]>[] = [
  { name: 'Sample A', username: 'sample.a', email: 'sample.a@example.com', department: 'ops1', role: 'operator' },
  { name: 'Sample B', username: 'sample.b', email: 'sample.b@example.com', department: 'analytics', role: 'analyst' },
];

/** 随项目附带的可下载示例（scripts/make-demo-samples.mjs 生成，场景约定见 docs/demo/） */
const SAMPLE_FILES = [
  { file: 'users-valid.xlsx', key: 'valid' },
  { file: 'users-partial.xlsx', key: 'partial' },
  { file: 'users-invalid.xlsx', key: 'invalid' },
  { file: 'users-duplicate.xlsx', key: 'duplicate' },
] as const;

export default function Excel() {
  const intl = useIntl();
  // useCallback 包一层：sampleMenu 的 useMemo 依赖它，行内函数每次渲染都是新引用会让 memo 失效
  const t = useCallback(
    (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values),
    [intl],
  );
  const { message } = App.useApp();
  const access = useAccess();
  const canImport = access.permission('system.user.create');
  const canAssignRole = access.permission('system.user.role.assign');
  const [busy, setBusy] = useState<'export' | 'template' | 'import' | 'save'>();
  const [rows, setRows] = useState<ParsedRow[]>();
  const busyRef = useRef<typeof busy>(undefined);
  const mounted = useRef(true);
  const importController = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      importController.current?.abort();
    };
  }, []);

  const start = (operation: NonNullable<typeof busy>) => {
    busyRef.current = operation;
    setBusy(operation);
  };
  const finish = () => {
    busyRef.current = undefined;
    if (mounted.current) setBusy(undefined);
  };

  const handleExport = async () => {
    if (busyRef.current) return;
    start('export');
    try {
      const [ExcelJS, users] = await Promise.all([loadExcel(), fetchAllUsers()]);
      if (!mounted.current) return;
      await downloadWorkbook(buildUsersWorkbook(ExcelJS, users, t, t('excel.exportTitle')), 'users.xlsx');
      if (mounted.current) message.success(t('excel.exported', { count: users.length }));
    } catch {
      if (mounted.current) message.error(t('excel.exportFailed'));
    } finally {
      finish();
    }
  };

  const handleTemplate = async () => {
    if (busyRef.current) return;
    start('template');
    try {
      const ExcelJS = await loadExcel();
      if (!mounted.current) return;
      await downloadWorkbook(
        buildUsersWorkbook(ExcelJS, TEMPLATE_ROWS, t, t('excel.exportTitle')),
        'users-template.xlsx',
      );
    } catch {
      if (mounted.current) message.error(t('excel.exportFailed'));
    } finally {
      finish();
    }
  };

  const handleImport = async (file: File) => {
    if (busyRef.current && busyRef.current !== 'import') return false;
    importController.current?.abort();
    const controller = new AbortController();
    importController.current = controller;
    start('import');
    try {
      checkWorkbookFileSize(file.size);
      const users = await fetchAllUsers();
      if (controller.signal.aborted || !mounted.current) return false;
      const imported = await importUsersFile(
        file,
        users.map((u) => u.username.toLowerCase()),
        t,
        controller.signal,
      );
      if (!controller.signal.aborted && mounted.current) setRows(restrictRoleColumn(imported, { canAssignRole }, t));
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) {
        const code = error instanceof WorkbookInputError ? error.code : 'parseFailed';
        message.error(t(code === 'parseFailed' || code === 'noSheet' ? `excel.${code}` : `excel.import.error.${code}`));
      }
    } finally {
      if (importController.current === controller) finish();
    }
    return false; // 阻止 Upload 默认上传行为
  };

  const valid = rows?.filter((row) => row.input) ?? [];

  /**
   * 提交导入（F04）：本地校验通过的行按 key 提交（部门/角色的界面标签不进接口），服务端逐行复核——
   * 准确计数（创建/重复/无效），重复与无效不写入；服务端按 Excel 行号报回问题行，预览就地标注。
   * 本地无效的行不提交（服务端也只会再判一次无效），汇总时并入无效计数。
   */
  const handleSave = async () => {
    if (busyRef.current || !rows) return;
    start('save');
    try {
      const payload = toImportRows(rows);
      const localInvalid = rows.length - payload.length;
      const result = await importUsers(payload);
      if (!mounted.current) return;
      const serverIssues = new Map(result.issues.map((issue) => [issue.row, issue]));
      const createdUsernames = new Set(result.users.map((u) => u.username.toLowerCase()));
      const remaining = rows
        .filter((row) => serverIssues.has(row.row) || !createdUsernames.has((row.values.username ?? '').toLowerCase()))
        .map((row) => {
          const issue = serverIssues.get(row.row);
          return issue ? { ...row, input: undefined, errors: [issue.message] } : row;
        });
      const invalid = result.invalid + localInvalid;
      if (result.created && !result.duplicated && !invalid) {
        message.success(t('excel.imported', { count: result.created }));
        setRows(undefined);
      } else if (result.created) {
        message.warning(
          t('excel.import.partial', {
            created: result.created,
            duplicated: result.duplicated,
            invalid,
          }),
        );
        setRows(remaining.length ? remaining : undefined);
      } else {
        message.warning(t('excel.import.none', { duplicated: result.duplicated, invalid }));
        setRows(remaining.length ? remaining : rows);
      }
    } catch (error) {
      // 业务失败与 HTTP 错误（400 结构非法 / 413 超预算 / 403）已由请求层展示服务端 message，
      // 这里不再叠一条「已导入 0 行」的泛化提示；只有请求层没接手的异常才兜底
      const surfaced =
        error instanceof BizError || (typeof error === 'object' && error !== null && 'response' in error);
      if (mounted.current && !surfaced) message.error(t('excel.saveFailed', { count: 0 }));
    } finally {
      finish();
    }
  };

  /** 预览态恢复入口（F04）：重新选择文件 / 取消导入，任何预览状态（全有效、部分有效、全无效）都可用 */
  const resetPicker = () => {
    importController.current?.abort();
    setRows(undefined);
  };

  const sampleMenu = useMemo(
    () => ({
      items: SAMPLE_FILES.map(({ file, key }) => ({
        key,
        label: (
          <a href={`${PUBLIC_PATH}demo/${file}`} download={file}>
            {t(`excel.sample.${key}`)}
          </a>
        ),
      })),
    }),
    [t],
  );

  return (
    <DemoPage
      descriptionId="page.excel.desc"
      source="src/pages/Document/Excel/userSheet.ts"
      extra={
        <>
          <Dropdown menu={sampleMenu}>
            <Button icon={<DownloadOutlined />} disabled={!!busy && busy !== 'template'}>
              {t('excel.samples')}
            </Button>
          </Dropdown>
          <Button
            icon={<DownloadOutlined />}
            disabled={!!busy && busy !== 'export'}
            loading={busy === 'export'}
            onClick={handleExport}
          >
            {t('excel.export')}
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            disabled={!!busy && busy !== 'template'}
            loading={busy === 'template'}
            onClick={handleTemplate}
          >
            {t('excel.template')}
          </Button>
        </>
      }
    >
      {!rows ? (
        // 空状态即导入入口：拖拽区本身就是主操作，并说明需要哪些列
        <Card>
          <Spin spinning={busy === 'import'}>
            <Upload.Dragger
              accept=".xlsx"
              disabled={!!busy && busy !== 'import'}
              beforeUpload={handleImport}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">{t('excel.dropTitle')}</p>
              <p className="ant-upload-hint mx-auto max-w-xl px-4">
                {t('excel.dropHint', { fields: FIELDS.map((field) => t(`users.column.${field}`)).join(' / ') })}
              </p>
            </Upload.Dragger>
          </Spin>
        </Card>
      ) : (
        <Card
          title={t('excel.previewTitle')}
          extra={
            <Space size={8} wrap>
              <Button
                icon={<RedoOutlined />}
                disabled={!!busy && busy !== 'import'}
                onClick={resetPicker}
                data-tour="excel-reselect"
              >
                {t('excel.reselect')}
              </Button>
              <Button icon={<CloseOutlined />} disabled={!!busy} onClick={resetPicker}>
                {t('excel.cancelImport')}
              </Button>
              <Button
                type="primary"
                disabled={!valid.length || (!!busy && busy !== 'save') || !canImport}
                loading={busy === 'save'}
                onClick={handleSave}
              >
                {t('excel.importValid', { count: valid.length })}
              </Button>
            </Space>
          }
        >
          <Alert
            className="mb-4"
            showIcon
            type={valid.length === 0 ? 'error' : valid.length === rows.length ? 'success' : 'warning'}
            title={
              valid.length === 0
                ? t('excel.allInvalid', {
                    total: rows.length,
                    invalid: rows.length - valid.length,
                  })
                : t('excel.summary', {
                    total: rows.length,
                    valid: valid.length,
                    invalid: rows.length - valid.length,
                  })
            }
            description={
              valid.length === 0 ? (
                <Space size={8} wrap>
                  {t('excel.allInvalidHint')}
                  <Link to="/system/users">{t('menu.system.users')}</Link>
                </Space>
              ) : undefined
            }
          />
          <Table<ParsedRow>
            rowKey="key"
            size="small"
            scroll={{ x: 900 }}
            pagination={{ pageSize: 10 }}
            dataSource={rows}
            columns={[
              { title: t('excel.column.row'), dataIndex: 'row', width: 70 },
              ...FIELDS.map((field) => ({
                title: t(`users.column.${field}`),
                key: field,
                render: (_: unknown, row: ParsedRow) =>
                  row.values[field] || <Typography.Text type="secondary">—</Typography.Text>,
              })),
              {
                title: t('excel.column.check'),
                key: 'check',
                width: 260,
                render: (_: unknown, row: ParsedRow) =>
                  row.errors.length ? (
                    <Space size={[4, 4]} wrap>
                      {row.errors.map((error) => (
                        <Tag key={error} color="red">
                          {error}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Tag color="green">{t('excel.valid')}</Tag>
                  ),
              },
            ]}
          />
        </Card>
      )}
    </DemoPage>
  );
}
