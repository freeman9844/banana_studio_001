import { Storage } from '@google-cloud/storage';
import { logger } from '@/lib/logger';

const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
const bucketName = process.env.GCS_BUCKET_NAME;

export async function saveImageToGcs(
  base64Data: string,
  mimeType: string,
  nickname: string
): Promise<string> {
  if (!bucketName) {
    return `data:${mimeType};base64,${base64Data}`;
  }

  const ext = mimeType.split('/')[1] || 'png';
  const fileName = `images/${nickname}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(base64Data, 'base64');
  const file = storage.bucket(bucketName).file(fileName);

  try {
    await file.save(buffer, { contentType: mimeType, resumable: false });
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });
    logger.info(`Image saved to GCS: ${fileName}`);
    return signedUrl;
  } catch (error) {
    logger.error('Failed to save image to GCS, falling back to data URL:', error);
    return `data:${mimeType};base64,${base64Data}`;
  }
}
