import React from 'react';
import { Row, Col, Typography } from 'antd';
import { COLORS } from '../../lib/theme';

const { Title } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, extra }: PageHeaderProps) {
  return (
    <Row justify="space-between" align="middle" wrap={false}>
      <Col flex="auto">
        <Title level={4} style={{ marginBottom: 2 }}>
          {title}
        </Title>
        {subtitle && (
          <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{subtitle}</span>
        )}
      </Col>
      {extra && <Col flex="none">{extra}</Col>}
    </Row>
  );
}
