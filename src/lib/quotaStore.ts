import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { logger } from '@/lib/logger';

const dataFilePath = path.join(process.cwd(), 'data', 'quotas.json');
const configFilePath = path.join(process.cwd(), 'data', 'config.json');

const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
const bucketName = process.env.GCS_BUCKET_NAME;

if (!existsSync(path.dirname(dataFilePath))) {
  mkdirSync(path.dirname(dataFilePath), { recursive: true });
}

export interface GlobalConfig {
  maxQuota: number;
  resolution: '512' | '1024';
}

export interface UserQuota {
  usage: number;
  pin: string;
}

export interface QuotaData {
  [nickname: string]: UserQuota;
}

async function readFromFileOrGcs<T>(
  filePath: string,
  gcsFileName: string,
  fallbackData: T
): Promise<T> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      if (bucketName) {
        try {
          const [content] = await storage.bucket(bucketName).file(gcsFileName).download();
          const parsed = JSON.parse(content.toString('utf-8'));
          await fs.writeFile(filePath, content.toString('utf-8'), 'utf-8');
          logger.info(`Recovered ${gcsFileName} from GCS and cached locally.`);
          return parsed;
        } catch {
          return fallbackData;
        }
      }
      return fallbackData;
    }
    logger.error(`Error reading ${gcsFileName} file:`, error);
    return fallbackData;
  }
}

async function writeToFileAndGcs<T>(
  filePath: string,
  gcsFileName: string,
  data: T
): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');

  if (bucketName) {
    try {
      await storage.bucket(bucketName).file(gcsFileName).save(content);
      logger.info(`Synced ${gcsFileName} to GCS bucket ${bucketName}`);
    } catch (error) {
      logger.error(`Error saving ${gcsFileName} to GCS:`, error);
    }
  }
}

class Mutex {
  private mutex = Promise.resolve();
  lock(): Promise<() => void> {
    let begin: (unlock: () => void) => void = () => {};
    this.mutex = this.mutex.then(() => new Promise(begin));
    return new Promise((res) => {
      begin = res;
    });
  }
}

// Config in-memory cache (TTL: 60s)
let configCache: { data: GlobalConfig; expiresAt: number } | null = null;
const CONFIG_TTL_MS = 60_000;

const fileMutex = new Mutex();

export async function getConfig(): Promise<GlobalConfig> {
  if (configCache && Date.now() < configCache.expiresAt) {
    return configCache.data;
  }
  const defaultFallback: GlobalConfig = { maxQuota: 20, resolution: '1024' };
  const parsed = await readFromFileOrGcs(configFilePath, 'config.json', defaultFallback);
  const data: GlobalConfig = {
    maxQuota: parsed.maxQuota || 20,
    resolution: parsed.resolution || '1024',
  };
  configCache = { data, expiresAt: Date.now() + CONFIG_TTL_MS };
  return data;
}

export async function saveConfig(config: GlobalConfig): Promise<void> {
  configCache = null; // Invalidate cache immediately on admin change
  await writeToFileAndGcs(configFilePath, 'config.json', config);
}

export async function getQuotas(): Promise<QuotaData> {
  return readFromFileOrGcs(dataFilePath, 'quotas.json', {});
}

export async function saveQuotas(data: QuotaData): Promise<void> {
  await writeToFileAndGcs(dataFilePath, 'quotas.json', data);
}

function isGcsConflict(error: unknown): boolean {
  return (
    (typeof error === 'object' && error !== null && (error as { code?: number }).code === 412) ||
    (error instanceof Error && error.message.includes('conditionNotMet'))
  );
}

async function retryOnGcsConflict<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (isGcsConflict(error) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 50;
        logger.warn(`GCS generation conflict, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded for GCS conditional write');
}

async function updateWithGcsConditionalWrite(
  gcsFileName: string,
  localFilePath: string,
  mutateFn: (current: QuotaData) => QuotaData
): Promise<QuotaData> {
  if (!bucketName) {
    const quotas = await getQuotas();
    const updated = mutateFn(quotas);
    await saveQuotas(updated);
    return updated;
  }

  const file = storage.bucket(bucketName).file(gcsFileName);
  let quotas: QuotaData = {};
  let generation = 0;

  try {
    const [[content], [metadata]] = await Promise.all([
      file.download() as Promise<[Buffer]>,
      file.getMetadata() as Promise<[{ generation: string }]>,
    ]);
    quotas = JSON.parse(content.toString('utf-8'));
    generation = Number(metadata.generation);
  } catch (err: unknown) {
    if ((err as { code?: number }).code !== 404) throw err;
    generation = 0;
  }

  const updated = mutateFn(quotas);
  const content = JSON.stringify(updated, null, 2);

  await file.save(content, {
    contentType: 'application/json',
    preconditionOpts: { ifGenerationMatch: generation },
  });
  await fs.writeFile(localFilePath, content, 'utf-8');
  logger.info(`GCS conditional write succeeded (generation ${generation})`);

  return updated;
}

export async function updateQuotaSafely(
  nickname: string,
  updateFn: (user: UserQuota | undefined) => UserQuota
): Promise<UserQuota> {
  const unlock = await fileMutex.lock();
  try {
    const updated = await retryOnGcsConflict(() =>
      updateWithGcsConditionalWrite('quotas.json', dataFilePath, (quotas) => {
        const updatedUser = updateFn(quotas[nickname]);
        return { ...quotas, [nickname]: updatedUser };
      })
    );
    return updated[nickname];
  } finally {
    unlock();
  }
}

export async function updateAllQuotasSafely(
  updateFn: (quotas: QuotaData) => QuotaData | void
): Promise<void> {
  const unlock = await fileMutex.lock();
  try {
    await retryOnGcsConflict(() =>
      updateWithGcsConditionalWrite('quotas.json', dataFilePath, (quotas) => {
        return updateFn(quotas) || quotas;
      })
    );
  } finally {
    unlock();
  }
}
