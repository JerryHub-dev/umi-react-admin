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
    icon: 'HomeOutlined',
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
    icon: 'ToolOutlined',
    // component: './Feature',
    routes: [
      {
        name: 'formily',
        path: '/feature/formily',
        component: './Feature/Formily',
        icon: 'HourglassOutlined',
      },
      {
        name: 'fullCalendar',
        path: '/feature/fullCalendar',
        component: './Feature/FullCalendar',
        icon: 'CalendarOutlined',
      },
    ],
  },
];
