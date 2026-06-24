import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const required = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
];

const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.warn('[R2] Missing env vars:', missing.join(', '));
  console.warn('[R2] R2 features will not work until configured');
}

const R2_ENDPOINT = process.env.R2_ENDPOINT ||
  `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const R2_CONFIG = {
  bucket: process.env.R2_BUCKET_NAME || 'mwijay-music',
  publicUrl: process.env.R2_PUBLIC_URL || '',
};

export async function generateUploadUrl(
  fileName: string,
  contentType: string,
  folder: 'songs' | 'reels' | 'covers' = 'songs'
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100);
  const timestamp = Date.now();
  const key = `${folder}/${timestamp}_${safeName}`;

  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: 3600,
  });

  const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;

  return { uploadUrl, publicUrl, key };
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_CONFIG.bucket,
    Key: key,
  });
  await r2Client.send(command);
}

export async function listFiles(prefix?: string): Promise<Array<{
  key: string;
  size: number;
  lastModified: Date;
  publicUrl: string;
}>> {
  const command = new ListObjectsV2Command({
    Bucket: R2_CONFIG.bucket,
    Prefix: prefix,
    MaxKeys: 1000,
  });

  const response = await r2Client.send(command);
  return (response.Contents || []).map(obj => ({
    key: obj.Key || '',
    size: obj.Size || 0,
    lastModified: obj.LastModified || new Date(),
    publicUrl: `${R2_CONFIG.publicUrl}/${obj.Key}`,
  }));
}
