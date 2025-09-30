import type { User, Session } from '@supabase/supabase-js';

export interface RunInfo {
  id: number;
  userid: string;
  nickname: string;
  igt: string;
  date: string;
  version: string;
  subversion: string;
  type: string;
  videolink: string;
  remarks: string;
  seed: string;
  status: string;
  users: {
    id: string;
    nickname: string;
    ingamename: string;
  };
}

// 用户信息接口
export interface UserInfo {
  id: number;
  ingamename: string;
  mc_uuid: string;
  nickname: string;
  user_id: number;
  role: string;
  bili_id: string | null;
  bili_name: string | null;
  bili_room: string | null;
  space_link: string | null;
  liveroom_link: string | null;
}
