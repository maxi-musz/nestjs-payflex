import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import * as colors from 'colors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // Increase payload size limit
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

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

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');

  
  console.log(colors.blue(`Application is running on: http://0.0.0.0:${port}`));
  console.log(`Access URL from host: http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Port: ${port}`);
} 
bootstrap();
