import { PageContainer } from '@ant-design/pro-components';
import { Carousel } from 'antd';

const HomePage: React.FC = () => {
  const contentStyle: React.CSSProperties = {
    margin: 0,
    height: '260px',
    color: '#fff',
    lineHeight: '260px',
    textAlign: 'center',
    background: '#364d79',
  };

  return (
    <PageContainer ghost header={{ title: '' }}>
      <Carousel arrows infinite={false} autoplay>
        <div>
          <h3 style={contentStyle}>1</h3>
        </div>
        <div>
          <h3 style={contentStyle}>2</h3>
        </div>
        <div>
          <h3 style={contentStyle}>3</h3>
        </div>
        <div>
          <h3 style={contentStyle}>4</h3>
        </div>
      </Carousel>
    </PageContainer>
  );
};

export default HomePage;
