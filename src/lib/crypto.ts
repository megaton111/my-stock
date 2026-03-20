import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) throw new Error('EMAIL_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.');
  return Buffer.from(key, 'hex');
}

/** AES-256-GCM 암호화 — 랜덤 IV로 매번 다른 암호문 생성 */
export function encryptEmail(email: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(email, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // iv(12) + tag(16) + encrypted → base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/** AES-256-GCM 복호화 */
export function decryptEmail(encrypted: string): string {
  const key = getKey();
  const buf = Buffer.from(encrypted, 'base64');

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
}

/** HMAC-SHA256 해시 — DB 조회용 (결정론적) */
export function hashEmail(email: string): string {
  const key = getKey();
  return crypto
    .createHmac('sha256', key)
    .update(email.toLowerCase().trim())
    .digest('hex');
}
