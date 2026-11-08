import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

dotenv.config({ path: path.join(rootDir, '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT || '5173', 10),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymvault',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10)
  },
  crypto: {
    masterSalt: process.env.CRYPTO_MASTER_SALT || 'e4f89d3a7b1c5e902468ace013579bdf',
    keyVersion: parseInt(process.env.CRYPTO_KEY_VERSION || '1', 10)
  },
  storage: {
    encryptedFiles: path.resolve(rootDir, process.env.STORAGE_ENCRYPTED_FILES || './storage/encrypted_files'),
    stegoImages: path.resolve(rootDir, process.env.STORAGE_STEGO_IMAGES || './storage/stego_images'),
    checkpointFile: path.resolve(rootDir, process.env.CHECKPOINT_FILE_PATH || './storage/.gymvault_checkpoint')
  },
  biometrics: {
    confidenceThreshold: parseFloat(process.env.FACE_CONFIDENCE_THRESHOLD || '0.650'),
    modelPath: path.resolve(rootDir, process.env.FACE_MODEL_PATH || './assets/models/mobilefacenet.onnx')
  },
  dongle: {
    timeoutMs: parseInt(process.env.DONGLE_TIMEOUT_MS || '5000', 10)
  }
};
