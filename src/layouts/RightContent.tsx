import {
  GithubOutlined,
  GlobalOutlined,
  SkinOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { setLocale, useIntl } from '@umijs/max';
import { Avatar, Button, Popover, message } from 'antd';
import { useState } from 'react';

const RightContent = () => {
  const [messageApi, contextHolder] = message.useMessage();
  // NOTE: 多语言
  const intl = useIntl();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [localeType, setLocaleType] = useState(
    localStorage.getItem('umi_locale') || 'zh-CN',
  );
  if (!localStorage.getItem('umi_locale')) {
    setLocale('zh-CN');
  }
  const localeTypeData = [
    {
      label: '中文',
      value: 'zh-CN',
    },
    {
      label: 'English',
      value: 'en-US',
    },
  ];

  const themeType = [
    {
      label: intl.formatMessage({ id: 'undertone' }),
      icons: 'GlobalOutlined',
      value: 'defaultAlgorithm',
    },
    {
      label: intl.formatMessage({ id: 'DarkColor' }),
      icons: 'GlobalOutlined',
      value: 'darkAlgorithm',
    },
  ];

  return (
    <>
      {contextHolder}
      {/* NOTE: user */}
      <Popover
        title=""
        trigger="hover"
        placement="bottom"
        className="flex justify-center items-center mr-5 "
        content={
          <div
            className="hover:bg-zinc-200 py-1 px-2 rounded-md cursor-pointer w-24 text-center"
            onClick={() => {
              console.log('logout');
            }}
          >
            {intl.formatMessage({ id: 'Logout' })}
          </div>
        }
      >
        <Avatar
          className="w-7 h-7 bg-gray-300 flex justify-center items-center"
          icon={<UserOutlined className="text-xl" />}
        />
        <div className="ml-2">Admin</div>
      </Popover>

      <span className="rounded-lg border-2 h-7 mr-5" />

      {/* NOTE: 换肤 */}
      <Popover
        trigger="hover"
        placement="bottom"
        className="mr-5 text-2xl"
        content={
          <div>
            {themeType.map((item, index) => (
              <div
                className="hover:bg-zinc-200 py-1 px-2 rounded-md cursor-pointer w-24 text-center"
                key={index}
                onClick={() => {
                  messageApi.info(intl.formatMessage({ id: 'solution' }));
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        }
      >
        <Button
          className="flex justify-center items-center"
          icon={<SkinOutlined />}
        />
      </Popover>

      {/* NOTE: 多语言 */}
      <Popover
        className="mr-5 text-2xl"
        trigger="hover"
        placement="bottom"
        content={
          <div>
            {localeTypeData.map((item, index) => (
              <div
                className="hover:bg-zinc-200 py-1 px-2 rounded-md cursor-pointer w-24 text-center"
                onClick={() => {
                  setLocale(item.value);
                  setLocaleType(item.value);
                }}
                key={index}
              >
                {item.label}
              </div>
            ))}
          </div>
        }
      >
        <Button
          className="flex justify-center items-center"
          icon={<GlobalOutlined />}
        />
      </Popover>

      {/* NOTE: GitHub 链接 */}
      <Button
        className="mr-6"
        icon={<GithubOutlined />}
        onClick={() => {
          window.open('https://github.com/Jerry-0425/umi-react-admin');
        }}
      />
    </>
  );
};

export default RightContent;
