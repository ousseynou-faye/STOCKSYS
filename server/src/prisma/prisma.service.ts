import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

// Best-effort: ensure DATABASE_URL is loaded even if ConfigModule paths miss.
// Tries common locations relative to server/ at runtime.
try { loadEnv({ path: '.env' }); } catch {}
try { loadEnv({ path: '../prisma/.env' }); } catch {}
try { loadEnv({ path: '../.env' }); } catch {}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
