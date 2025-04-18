import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: process.env.ALLOWED_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,  // Enable auto-transformation
    transformOptions: {
      enableImplicitConversion: true,  // Convert dot notation to nested objects
    },
  }));

  await app.listen(process.env.PORT ?? 1000);
} 
bootstrap();
