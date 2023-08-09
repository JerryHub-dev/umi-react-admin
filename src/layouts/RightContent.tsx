import { DownOutlined, GithubOutlined, UserOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Avatar, Popover } from 'antd';

const RightContent = () => {
  const intl = useIntl();

  return (
    <>
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
