/**
 * 从B站视频链接中提取BV号
 * @param url B站视频链接
 * @returns 提取到的BV号，如果没有找到则返回空字符串
 *
 * 支持的链接格式：
 * - https://www.bilibili.com/video/BV1HW421N7d8
 * - https://b23.tv/BV1HW421N7d8
 * - https://www.bilibili.com/video/BV1HW421N7d8?p=1&t=123
 * - https://www.bilibili.com/video/BV1HW421N7d8#t=123
 */
export function extractBVId(url: string): string {
  if (!url || typeof url !== "string") {
    return "";
  }

  const bvPattern = /BV[a-zA-Z0-9]{10}/;
  const match = url.match(bvPattern);

  return match ? match[0] : "";
}

/**
 * 验证BV号格式是否正确
 * @param bvid BV号
 * @returns 是否为有效的BV号格式
 */
export function isValidBVID(bvid: string): boolean {
  if (!bvid || typeof bvid !== "string") {
    return false;
  }

  const bvPattern = /^BV[a-zA-Z0-9]{10}$/;
  return bvPattern.test(bvid);
}

/**
 * 构建B站播放器链接
 * @param bvid BV号
 * @param options 播放器选项
 * @returns 完整的播放器链接
 */
export function buildPlayerUrl(
  bvid: string,
  options: {
    isOutside?: boolean;
    autoplay?: boolean;
    page?: number;
    t?: number;
  } = {}
): string {
  if (!isValidBVID(bvid)) {
    return "";
  }

  const baseUrl = "//player.bilibili.com/player.html";
  const params = new URLSearchParams();

  params.append("bvid", bvid);

  if (options.isOutside !== undefined) {
    params.append("isOutside", options.isOutside.toString());
  }

  if (options.autoplay !== undefined) {
    params.append("autoplay", options.autoplay ? "1" : "0");
  }

  if (options.page !== undefined) {
    params.append("page", options.page.toString());
  }

  if (options.t !== undefined) {
    params.append("t", options.t.toString());
  }

  return `${baseUrl}?${params.toString()}`;
}
