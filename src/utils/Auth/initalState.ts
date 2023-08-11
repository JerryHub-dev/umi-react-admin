import { UserInfo } from './userInfo';

export async function getInitialState(): Promise<UserInfo> {
  const user: UserInfo = new UserInfo({
    userName: 'admin',
    userEmail: '',
  });

  return user;
}
