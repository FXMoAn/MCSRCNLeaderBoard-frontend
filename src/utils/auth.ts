import { supabase } from "@/lib/supabaseClient";
import useUserStore from "@/stores/user";

class AuthManager {
  private userInfo: any;

  constructor() {
    this.userInfo = null;
  }

  public async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (data) {
      this.userInfo = data.user;
      useUserStore().isLoggedin = true;
    }
    return { data, error };
  }

  public async signup(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }

  public async signOut() {
    const { error } = await supabase.auth.signOut();
    useUserStore().isLoggedin = false;
    return { error };
  }

  public async getUser() {
    const { data } = await supabase.auth.getUser();
    return data;
  }

  public isLoggedin() {
    return useUserStore().isLoggedin;
  }
}

let authManager = new AuthManager();

export default authManager;
