class UserService {
  private userInfo: any;

  constructor() {
    this.userInfo = null;
  }

  setUserInfo(userInfo: any) {
    this.userInfo = userInfo;
  }

  getUserInfo() {
    return this.userInfo;
  }
}

let userService = new UserService();

export default userService;
