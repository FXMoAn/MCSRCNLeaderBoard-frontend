/**
 * 安全工具函数
 * 用于防止XSS攻击和SQL注入
 */

/**
 * 清理HTML特殊字符，防止XSS攻击
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/&/g, '&amp;');
}

/**
 * 清理SQL特殊字符，防止SQL注入
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeSql(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/;/g, '')  // 移除分号
    .replace(/'/g, '')  // 移除单引号
    .replace(/"/g, '')  // 移除双引号
    .replace(/\\/g, '') // 移除反斜杠
    .replace(/--/g, '') // 移除SQL注释
    .replace(/\/\*/g, '') // 移除SQL注释开始
    .replace(/\*\//g, ''); // 移除SQL注释结束
}

/**
 * 综合清理函数，同时防止XSS和SQL注入
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return sanitizeSql(sanitizeHtml(input));
}

/**
 * 验证昵称格式
 * @param nickname 昵称
 * @returns 验证结果对象
 */
export function validateNickname(nickname: string): { isValid: boolean; message: string } {
  if (!nickname || typeof nickname !== 'string') {
    return { isValid: false, message: '昵称不能为空' };
  }
  
  const trimmed = nickname.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, message: '昵称不能为空' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, message: '昵称长度不能超过50个字符' };
  }
  
  // 检查是否包含危险字符
  const dangerousChars = /[<>\"'&;\\\/\-\*]/;
  if (dangerousChars.test(trimmed)) {
    return { isValid: false, message: '昵称包含不允许的特殊字符' };
  }
  
  return { isValid: true, message: '昵称格式正确' };
}

/**
 * 验证备注格式
 * @param remarks 备注
 * @returns 验证结果对象
 */
export function validateRemarks(remarks: string): { isValid: boolean; message: string } {
  if (!remarks || typeof remarks !== 'string') {
    return { isValid: true, message: '备注可以为空' };
  }
  
  const trimmed = remarks.trim();
  
  if (trimmed.length > 200) {
    return { isValid: false, message: '备注长度不能超过200个字符' };
  }
  
  // 检查是否包含危险字符
  const dangerousChars = /[<>\"'&;\\\/\-\*]/;
  if (dangerousChars.test(trimmed)) {
    return { isValid: false, message: '备注包含不允许的特殊字符' };
  }
  
  return { isValid: true, message: '备注格式正确' };
}

/**
 * 验证种子格式
 * @param seed 种子
 * @returns 验证结果对象
 */
export function validateSeed(seed: string): { isValid: boolean; message: string } {
  if (!seed || typeof seed !== 'string') {
    return { isValid: true, message: '种子可以为空' };
  }
  
  const trimmed = seed.trim();
  
  if (trimmed.length > 100) {
    return { isValid: false, message: '种子长度不能超过100个字符' };
  }
  
  // 检查是否包含危险字符
  const dangerousChars = /[<>\"'&;\\\/\-\*]/;
  if (dangerousChars.test(trimmed)) {
    return { isValid: false, message: '种子包含不允许的特殊字符' };
  }
  
  return { isValid: true, message: '种子格式正确' };
}

/**
 * 验证视频链接格式
 * @param link 视频链接
 * @returns 验证结果对象
 */
export function validateVideoLink(link: string): { isValid: boolean; message: string } {
  if (!link || typeof link !== 'string') {
    return { isValid: false, message: '视频链接不能为空' };
  }
  
  const trimmed = link.trim();
  
  if (trimmed.length > 500) {
    return { isValid: false, message: '视频链接长度不能超过500个字符' };
  }
  
  // 检查是否包含危险字符（只检查最危险的XSS字符）
  const dangerousChars = /[<>\"']/;
  if (dangerousChars.test(trimmed)) {
    return { isValid: false, message: '视频链接包含不允许的特殊字符' };
  }
  
  // 检查是否是有效的URL格式
  try {
    const url = new URL(trimmed);
    // 只允许http和https协议
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { isValid: false, message: '只支持HTTP和HTTPS协议的链接' };
    }
  } catch {
    return { isValid: false, message: '请输入有效的视频链接' };
  }
  
  return { isValid: true, message: '视频链接格式正确' };
}

/**
 * 安全地显示用户输入内容
 * @param input 用户输入
 * @returns 安全的HTML字符串
 */
export function safeDisplay(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return sanitizeInput(input);
}

/**
 * 限制字符串长度
 * @param input 输入字符串
 * @param maxLength 最大长度
 * @returns 限制长度后的字符串
 */
export function limitLength(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  if (maxLength <= 0) {
    return input;
  }
  
  return input.substring(0, maxLength);
}

/**
 * 安全清理视频链接（温和版本，不损坏URL）
 * @param link 视频链接
 * @returns 清理后的链接
 */
export function sanitizeVideoLink(link: string): string {
  if (!link || typeof link !== 'string') {
    return '';
  }
  
  let cleaned = link.trim();
  
  // 只移除最危险的XSS字符，保留URL结构
  cleaned = cleaned
    .replace(/</g, '')  // 移除 <
    .replace(/>/g, '')  // 移除 >
    .replace(/"/g, '')  // 移除双引号
    .replace(/'/g, ''); // 移除单引号
  
  // 长度限制
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 500);
  }
  
  return cleaned;
}

/**
 * 安全清理备注和种子（标准版本）
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeTextInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return sanitizeInput(input);
}
