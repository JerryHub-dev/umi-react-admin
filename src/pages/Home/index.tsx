import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row } from 'antd';
import DemoColumn from './components/DemoColumn';
import DemoSankey from './components/DemoSankey';
import DemoScatter from './components/DemoScatter';
import DemoSunburst from './components/DemoSunburst';
import DemoLine from './components/Line';

const HomePage: React.FC = () => {
  return (
    <PageContainer ghost header={{ title: '' }}>
      <Row>
        <Col span={8} className="pr-2">
          <Card>
            <DemoLine />
          </Card>
        </Col>
        <Col span={8} className="pr-2">
          <Card>
            <DemoColumn />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <DemoSunburst />
          </Card>
        </Col>
      </Row>
      <Row className="mt-2">
        <Col span={16} className="pr-2">
          <Card>
            <DemoSankey />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <DemoScatter />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default HomePage;
