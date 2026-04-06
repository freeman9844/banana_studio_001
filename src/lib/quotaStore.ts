import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';

const dataFilePath = path.join(process.cwd(), 'data', 'quotas.json');
const configFilePath = path.join(process.cwd(), 'data', 'config.json');

const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
const bucketName = process.env.GCS_BUCKET_NAME;

// Ensure directory exists synchronously at startup
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

async function readFromFileOrGcs<T>(filePath: string, gcsFileName: string, fallbackData: T): Promise<T> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (bucketName) {
        try {
          const [content] = await storage.bucket(bucketName).file(gcsFileName).download();
          const parsed = JSON.parse(content.toString('utf-8'));
          await fs.writeFile(filePath, content.toString('utf-8'), 'utf-8');
          console.log(`Recovered ${gcsFileName} from GCS and cached locally.`);
          return parsed;
        } catch {
          return fallbackData;
        }
      }
      return fallbackData;
    }
    console.error(`Error reading ${gcsFileName} file:`, error);
    return fallbackData;
  }
}

async function writeToFileAndGcs<T>(filePath: string, gcsFileName: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
  
  if (bucketName) {
    try {
      await storage.bucket(bucketName).file(gcsFileName).save(content);
      console.log(`Successfully synced ${gcsFileName} to GCS bucket ${bucketName}`);
    } catch (error) {
      console.error(`Error saving ${gcsFileName} to GCS:`, error);
    }
  }
}

export async function getConfig(): Promise<GlobalConfig> {
  const defaultFallback: GlobalConfig = { maxQuota: 20, resolution: '1024' };
  const parsed = await readFromFileOrGcs(configFilePath, 'config.json', defaultFallback);
  return {
    maxQuota: parsed.maxQuota || 20,
    resolution: parsed.resolution || '1024'
  };
}

export async function saveConfig(config: GlobalConfig): Promise<void> {
  await writeToFileAndGcs(configFilePath, 'config.json', config);
}

// Simple in-memory mutex to prevent race conditions on a single Node instance
class Mutex {
  private mutex = Promise.resolve();
  lock(): Promise<() => void> {
    let begin: (unlock: () => void) => void = () => {};
    this.mutex = this.mutex.then(() => new Promise(begin));
    return new Promise(res => {
      begin = res;
    });
  }
}

const fileMutex = new Mutex();

export async function getQuotas(): Promise<QuotaData> {
  return await readFromFileOrGcs(dataFilePath, 'quotas.json', {});
}

export async function saveQuotas(data: QuotaData): Promise<void> {
  await writeToFileAndGcs(dataFilePath, 'quotas.json', data);
}

export async function updateQuotaSafely(
  nickname: string, 
  updateFn: (user: UserQuota | undefined) => UserQuota
): Promise<UserQuota> {
  const unlock = await fileMutex.lock();
  try {
    const quotas = await getQuotas();
    const updatedUser = updateFn(quotas[nickname]);
    quotas[nickname] = updatedUser;
    await saveQuotas(quotas);
    return updatedUser;
  } finally {
    unlock();
  }
}

export async function updateAllQuotasSafely(
  updateFn: (quotas: QuotaData) => QuotaData | void
): Promise<void> {
  const unlock = await fileMutex.lock();
  try {
    const quotas = await getQuotas();
    const updatedQuotas = updateFn(quotas) || quotas;
    await saveQuotas(updatedQuotas);
  } finally {
    unlock();
  }
}
