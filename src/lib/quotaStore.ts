import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'quotas.json');

export interface UserQuota {
  usage: number;
  pin: string;
}

export interface QuotaData {
  [nickname: string]: UserQuota;
}

export function getQuotas(): QuotaData {
  if (!fs.existsSync(path.dirname(dataFilePath))) {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
  }
  
  if (!fs.existsSync(dataFilePath)) {
    return {};
  }

  try {
    const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading quotas file:", error);
    return {};
  }
}

export function saveQuotas(data: QuotaData) {
  if (!fs.existsSync(path.dirname(dataFilePath))) {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
  }
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}