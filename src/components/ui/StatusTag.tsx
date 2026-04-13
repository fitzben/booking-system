import React from 'react';
import { Tag } from 'antd';
import { STATUS_COLORS, STATUS_LABELS, type BookingStatus } from '../../lib/constants';

interface StatusTagProps {
  status: BookingStatus;
  style?: React.CSSProperties;
}

export default function StatusTag({ status, style }: StatusTagProps) {
  return (
    <Tag color={STATUS_COLORS[status]} style={style}>
      {STATUS_LABELS[status]}
    </Tag>
  );
}
