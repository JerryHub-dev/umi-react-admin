import {
  DownOutlined,
  FontSizeOutlined,
  GithubOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { setLocale, useIntl } from '@umijs/max';
import { Avatar, Popover } from 'antd';
import { useState } from 'react';

const RightContent = () => {
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

  return (
    <>
      {/* NOTE: 多语言 */}
      <Popover
        className="mr-4 text-2xl"
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
        <FontSizeOutlined className="" />
      </Popover>

      {/* NOTE: user */}
      <Popover
        title=""
        trigger="hover"
        placement="bottom"
        className="flex justify-center items-center mr-4"
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
          className="text-3xl bg-orange-600 flex justify-center items-center"
          icon={<UserOutlined />}
        />
        <div className="ml-2">Admin</div>
        <DownOutlined className="mt-1 text-xs" />
      </Popover>

      {/* NOTE: GitHub 链接 */}
      <a
        className="grid justify-items-center mr-6"
        href="https://github.com/Jerry-0425/umi-react-admin"
        target="blank"
      >
        <GithubOutlined className="text-3xl" />
      </a>
    </>
  );
};

export default RightContent;
