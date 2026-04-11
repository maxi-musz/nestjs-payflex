import './prisma-paths';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ValidationError } from 'class-validator';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  const out: string[] = [];
  for (const e of errors) {
    if (e.constraints) out.push(...Object.values(e.constraints));
    if (e.children?.length) out.push(...flattenValidationErrors(e.children));
  }
  return out;
}
import { json, urlencoded } from 'express';
import * as colors from 'colors';
import * as express from 'express';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';
import { deviceMetadataMiddleware } from './common/device-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // Middleware to preserve raw body for Paystack webhook signature verification
  app.use('/api/v1/webhook/paystack', express.raw({ type: 'application/json', limit: '50mb' }));
  
  // Increase payload size limit
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Attach device metadata from headers to every request (req.deviceMetadata)
  app.use(deviceMetadataMiddleware);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: process.env.ALLOWED_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, 
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flattenValidationErrors(errors);
        return new BadRequestException(
          messages.length ? messages.join('; ') : 'Validation failed',
        );
      },
    }),
  );

  // Global request logging interceptor
  app.useGlobalInterceptors(new RequestLoggerInterceptor());

  // health endpoint 
  app.getHttpAdapter().get('/health', (req: express.Request, res: express.Response) => {
    res.json({ 
      status: 'OK', 
      message: 'Service is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
     });
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');

  const appUrl = await app.getUrl();
  const baseUrl = process.env.BASE_URL || process.env.APP_URL;
  const env = process.env.NODE_ENV || 'development';

  console.log(colors.blue(`\n🚀 Application started successfully`));
  console.log(colors.blue(`───────────────────────────────────`));
  console.log(`  Environment : ${env}`);
  console.log(`  Port        : ${port}`);
  console.log(`  Local       : ${appUrl}`);
  if (baseUrl) {
    console.log(colors.green(`  Public      : ${baseUrl}`));
  }
  console.log(colors.blue(`───────────────────────────────────\n`));
} 
bootstrap();
