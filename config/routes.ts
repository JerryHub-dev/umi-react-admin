// 用于配置路由的文件
// https://umijs.org/docs/guides/routes

export const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    name: 'home',
    path: '/home',
    icon: 'HomeFilled',
    component: './Home',
  },
  // {
  //   name: '权限演示',
  //   path: '/access',
  //   component: './Access',
  // },
  // {
  //   name: ' CRUD 示例',
  //   path: '/table',
  //   component: './Table',
  // },
  {
    name: 'feature',
    path: '/feature',
    icon: 'ToolFilled',
    routes: [
      {
        name: 'feature',
        path: '/feature',
        hideInMenu: true,
        // component: './Feature/index',
        component: './Feature/FullCalendar',
      },
      {
        name: 'formily',
        path: '/feature/formily',
        component: './Feature/Formily/Designable',
        icon: 'HourglassOutlined',
        target: '_blank',
        hideChildrenInMenu: true,
        menuRender: false,
      },
      {
        name: 'fullCalendar',
        path: '/feature/fullCalendar',
        component: './Feature/FullCalendar',
        icon: 'CalendarOutlined',
      },
      {
        name: 'RichTextEditing',
        path: '/feature/RichTextEditing',
        component: './Feature/RichTextEditing',
        icon: 'FileTextOutlined',
      },
      {
        name: 'DndKit',
        path: '/feature/DndKit',
        component: './Feature/DndKit',
        icon: 'BlockOutlined',
      },
      {
        name: 'Signature',
        path: '/feature/Signature',
        component: './Feature/Signature',
        icon: 'EditOutlined',
      },
      {
        name: 'VideoPlayer',
        path: '/feature/VideoPlayer',
        component: './Feature/VideoPlayer',
        icon: 'VideoCameraAddOutlined',
      },
      {
        name: 'AudioFeature',
        path: '/feature/AudioFeature',
        // icon: 'NotificationOutlined',
        icon: 'CustomerServiceOutlined',
        routes: [
          {
            name: 'AudioPlayer',
            path: '/feature/AudioFeature/AudioPlayer',
            component: './Feature/AudioFeature/AudioPlayer',
          },
          {
            name: 'AudioVisible',
            path: '/feature/AudioFeature/AudioVisible',
            component: './Feature/AudioFeature/AudioVisible',
          },
        ],
      },
    ],
  },
  {
    name: 'Office',
    path: '/Office',
    icon: 'ExperimentFilled',
    routes: [
      {
        name: 'Office',
        path: '/Office',
        hideInMenu: true,
        component: './Office/index',
      },
      {
        name: 'pdf',
        path: '/Office/pdf',
        component: './Office/Pdf',
        icon: 'FilePdfOutlined',
      },
      {
        name: 'excel',
        path: '/Office/excel',
        component: './Office/Excel',
        icon: 'FileExcelOutlined',
      },
    ],
  },
  {
    path: '/403',
    name: 'NotAccessible',
    component: '@/pages/403',
    hideInMenu: true,
  },
  {
    path: '*',
    name: 'NotFound',
    component: '@/pages/404',
    hideInMenu: true,
  },
];
