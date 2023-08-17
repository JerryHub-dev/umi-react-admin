import { Button, Result } from 'antd';

export default () => {
  return (
    <Result
      status="404"
      title="404"
      subTitle="对不起，您访问的页面不存在。"
      extra={<Button>Back Home</Button>}
    />
  );
};
