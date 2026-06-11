import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';

const PORT = env.PORT;

async function connectWithRetry(retries = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log('Database connected successfully');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Database connection attempt ${attempt}/${retries} failed — retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function bootstrap() {
  try {
    await connectWithRetry();

    app.listen(PORT, () => {
      console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();
