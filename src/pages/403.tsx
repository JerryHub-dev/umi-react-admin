import { Button, Result } from 'antd';

export default () => {
  return (
    <Result
      status="403"
      title="403"
      subTitle="对不起，您没有权限访问此页面."
      extra={<Button type="primary">Back Home</Button>}
    />
  );
};
