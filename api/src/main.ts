import { NestFactory } from '@nestjs/core';
import { configureApp } from './app-setup';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  // 0.0.0.0, not the default loopback: inside a container, a process bound to
  // 127.0.0.1 is unreachable from the published port.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
