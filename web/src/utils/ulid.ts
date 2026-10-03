// Crockford's Base32 编码字符集 (排除容易混淆的 I, L, O, U)
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;

/**
 * 生成规范的 26 字符 ULID (Universally Unique Lexicographically Sortable Identifier)
 */
export function ulid(seedTime: number = Date.now()): string {
  // 10 字符时间戳 (48-bit timestamp)
  let timeStr = '';
  let time = seedTime;
  for (let i = 9; i >= 0; i--) {
    const mod = time % ENCODING_LEN;
    timeStr = ENCODING.charAt(mod) + timeStr;
    time = Math.floor(time / ENCODING_LEN);
  }

  // 16 字符随机熵 (80-bit randomness)
  let randStr = '';
  for (let i = 0; i < 16; i++) {
    const rand = Math.floor(Math.random() * ENCODING_LEN);
    randStr += ENCODING.charAt(rand);
  }

  return timeStr + randStr;
}

/**
 * 生成适合 ACA 组件 ID / 接口后缀的小写 ULID 字符串
 */
export function generateIdSuffix(): string {
  return ulid().toLowerCase();
}
