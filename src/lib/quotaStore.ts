import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'quotas.json');
const configFilePath = path.join(process.cwd(), 'data', 'config.json');

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

export async function getConfig(): Promise<GlobalConfig> {
  try {
    const fileContent = await fs.readFile(configFilePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    return {
      maxQuota: parsed.maxQuota || 20,
      resolution: parsed.resolution || '1024'
    };
  } catch (error: unknown) {
    // Default fallback if not exists or invalid
    return { maxQuota: 20, resolution: '1024' };
  }
}

export async function saveConfig(config: GlobalConfig): Promise<void> {
  await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
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
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    console.error("Error reading quotas file:", error);
    return {};
  }
}

export async function saveQuotas(data: QuotaData): Promise<void> {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
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
