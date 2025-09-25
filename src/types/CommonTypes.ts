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

// 基础用户信息接口
export interface BaseUserInfo {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

// 玩家信息接口
export interface PlayerInfo {
  id: string;
  name: string;
  score?: number;
  rank?: number;
  level?: number;
  experience?: number;
  achievements?: string[];
  lastPlayed?: string;
  [key: string]: any;
}

// 用户偏好设置接口
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: 'zh-CN' | 'en-US' | 'ja-JP';
  notifications?: boolean;
  soundEnabled?: boolean;
  autoSave?: boolean;
  [key: string]: any;
}

// 用户数据接口
export interface UserData {
  user: User;
  playerInfo?: PlayerInfo;
  preferences?: UserPreferences;
  metadata?: Record<string, any>;
}

// 认证状态接口
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

// 认证结果接口
export interface AuthResult<T = any> {
  data: T | null;
  error: any | null;
}

// 用户会话接口
export interface UserSession {
  user: User;
  session: Session;
  expiresAt: number;
}

// 权限接口
export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource?: string;
  action?: string;
}

// 角色接口
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  level: number;
}

// 用户角色接口
export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: string;
  assignedBy?: string;
  expiresAt?: string;
}

// 缓存项接口
export interface CacheItem<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
}

// 用户统计信息接口
export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageScore: number;
  bestScore: number;
  totalPlayTime: number;
  lastGameDate?: string;
}

// 用户成就接口
export interface UserAchievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  unlockedAt: string;
  progress?: number;
  maxProgress?: number;
}

// 用户设置接口
export interface UserSettings {
  profile: {
    displayName?: string;
    avatar?: string;
    bio?: string;
    isPublic: boolean;
  };
  privacy: {
    showEmail: boolean;
    showStats: boolean;
    allowFriendRequests: boolean;
    allowMessages: boolean;
  };
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    marketing: boolean;
  };
  gameplay: {
    difficulty: 'easy' | 'normal' | 'hard';
    autoSave: boolean;
    confirmActions: boolean;
    showTutorials: boolean;
  };
}

// 用户活动日志接口
export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'game_start' | 'game_end' | 'achievement' | 'setting_change';
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

// 用户关系接口
export interface UserRelationship {
  id: string;
  userId: string;
  relatedUserId: string;
  type: 'friend' | 'blocked' | 'following';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// 用户邀请接口
export interface UserInvitation {
  id: string;
  inviterId: string;
  inviteeEmail: string;
  type: 'game' | 'friend' | 'team';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  metadata?: Record<string, any>;
}

// 导出所有类型
export type { User, Session };

// 类型守卫函数
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
};

export const isPlayerInfo = (obj: any): obj is PlayerInfo => {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
};

export const isUserPreferences = (obj: any): obj is UserPreferences => {
  return obj && typeof obj === 'object';
};

export const isUserData = (obj: any): obj is UserData => {
  return obj && isUser(obj.user);
};

// 工具类型
export type PartialUserData = Partial<UserData>;
export type PartialPlayerInfo = Partial<PlayerInfo>;
export type PartialUserPreferences = Partial<UserPreferences>;
export type PartialUserSettings = Partial<UserSettings>;

// 常量定义
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
} as const;

export const USER_THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
} as const;

export const USER_LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
  JA_JP: 'ja-JP',
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
} as const;
