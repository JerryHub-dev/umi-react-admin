// 频率刻度点数组
export const frequencyTicks: any = [
  { value: 0, label: '0kHz' },
  { value: 500000, label: '500kHz' },
  { value: 1000000, label: '1000kHz' },
  { value: 100000000, label: '100MHz' },
  { value: 200000000, label: '200MHz' },
  { value: 300000000, label: '300MHz' },
  { value: 400000000, label: '400MHz' },
  { value: 500000000, label: '500MHz' },
  { value: 600000000, label: '600MHz' },
  { value: 700000000, label: '700MHz' },
  { value: 800000000, label: '800MHz' },
  { value: 900000000, label: '900MHz' },
  { value: 1000000000, label: '1000MHz' },
  { value: 15000000000, label: '15GHz' },
  { value: 30000000000, label: '30GHz' },
  { value: 45000000000, label: '45GHz' },
  { value: 60000000000, label: '60GHz' },
];

// 频率数组
export const data: any = [
  {
    typeName: '无线设备',
    ranges: [
      {
        frequencyName: '设备A',
        range: [35000, 140000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备A',
        range: [90000000, 140000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: false, backward: true },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备A',
        range: [1000000, 500000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: false, backward: true },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备A',
        range: [10000000, 50000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备A',
        range: [10000000, 500000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
    ],
  },
  {
    typeName: '无线设备',
    ranges: [
      {
        frequencyName: '设备c',
        range: [1000000, 5000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备c',
        range: [1000000, 500000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备c',
        range: [1000000, 500000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备c',
        range: [1000000, 500000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备c',
        range: [1000000, 500000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备d',
        range: [100000, 500000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
    ],
  },
  {
    typeName: '无线设备',
    ranges: [
      {
        frequencyName: '设备A',
        range: [100000, 5000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备A',
        range: [100000, 500000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
    ],
  },
  {
    typeName: '无线设备',
    ranges: [
      {
        frequencyName: '设备A',
        range: [100000, 500000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备A',
        range: [10000000, 500000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: false },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备A',
        range: [1000000, 500000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: true, backward: true },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
      {
        frequencyName: '设备A',
        range: [1000000, 600000000], // 100kHz-500kHz
        color: '#4299e1',
        slashStyle: { forward: false, backward: true },
        customInfo: {
          description: '测试设备',
          power: '10W',
          status: '正常',
        },
      },
    ],
  },
];
