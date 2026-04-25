import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';

const PORT = env.PORT;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

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
