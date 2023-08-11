// use to init UserInfo
export type UserClaim = {
  userName: string;
  userEmail: string;
};

export class UserInfo {
  public userName: string;
  public userEmail: string;

  constructor(userClaim: UserClaim) {
    this.userName = userClaim.userName || '';
    this.userEmail = userClaim.userEmail || '';
  }
}
