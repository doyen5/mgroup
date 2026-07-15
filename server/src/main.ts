import 'reflect-metadata';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const clientOrigin = config.get<string>('CLIENT_ORIGIN') ?? 'http://127.0.0.1:5173';

  app.use(cookieParser());
  app.enableCors({
    // En developpement, Vite peut ouvrir localhost ou 127.0.0.1 avec un port different.
    origin(origin, callback) {
      const isLocalViteOrigin =
        !origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

      if (origin === clientOrigin || isLocalViteOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
}

void bootstrap();
