import DemoPage from '@/components/DemoPage';
import type { User } from '@/services/types';
import { createUser, listUsers } from '@/services/users';
import { DownloadOutlined, FileExcelOutlined, InboxOutlined } from '@ant-design/icons';
import { Link, useIntl } from '@umijs/max';
import { Alert, App, Button, Card, Space, Spin, Table, Tag, Typography, Upload } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { importUsersFile } from './importFile';
import { FIELDS, buildUsersWorkbook, downloadWorkbook, type ParsedRow } from './userSheet';
import { WorkbookInputError, checkWorkbookFileSize } from './xlsxBoundary';

/** exceljs 体积较大，只在点击导入 / 导出时加载 */
const loadExcel = () => import('exceljs');

const fetchAllUsers = async () => (await listUsers({ pageSize: 200 })).list;

const TEMPLATE_ROWS: Pick<User, (typeof FIELDS)[number]>[] = [
  { name: 'Sample A', username: 'sample.a', email: 'sample.a@example.com', department: 'ops1', role: 'operator' },
  { name: 'Sample B', username: 'sample.b', email: 'sample.b@example.com', department: 'analytics', role: 'analyst' },
];

export default function Excel() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const { message } = App.useApp();
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
      if (!controller.signal.aborted && mounted.current) setRows(imported);
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

  const handleSave = async () => {
    if (busyRef.current) return;
    start('save');
    const created = new Set<string>();
    try {
      for (const row of valid) {
        if (!mounted.current) return;
        await createUser(row.input!);
        created.add(row.key);
      }
      if (mounted.current) {
        message.success(t('excel.imported', { count: valid.length }));
        setRows(undefined);
      }
    } catch {
      if (mounted.current) {
        setRows((current) => current?.filter((row) => !created.has(row.key)));
        message.error(t('excel.saveFailed', { count: created.size }));
      }
    } finally {
      finish();
    }
  };

  return (
    <DemoPage
      descriptionId="page.excel.desc"
      source="src/pages/Document/Excel/userSheet.ts"
      extra={
        <>
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
            <Button
              type="primary"
              disabled={!valid.length || (!!busy && busy !== 'save')}
              loading={busy === 'save'}
              onClick={handleSave}
            >
              {t('excel.importValid', { count: valid.length })}
            </Button>
          }
        >
          <Alert
            className="mb-4"
            showIcon
            type={valid.length === rows.length ? 'success' : 'warning'}
            title={t('excel.summary', {
              total: rows.length,
              valid: valid.length,
              invalid: rows.length - valid.length,
            })}
            action={<Link to="/system/users">{t('menu.system.users')}</Link>}
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
