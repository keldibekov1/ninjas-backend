import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Redirect old domains to new domain
  app.use((req, res, next) => {
    if (req.hostname === 'snapsite.tech') {
      return res.redirect(301, `https://fieldy.io${req.originalUrl}`);
    }
    next();
  });

  // Special handling for Stripe webhook endpoint
  app.use(
    '/stripe/webhook',
    express.raw({
      type: 'application/json',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Middleware to handle large payloads and raw body for Stripe webhook
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Regular JSON parsing for other routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl !== '/stripe/webhook') {
      express.json({
        limit: '50mb',
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        },
      })(req, res, next);
    } else {
      next();
    }
  });

  // URL-encoded parsing for non-webhook routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl !== '/stripe/webhook') {
      express.urlencoded({
        limit: '50mb',
        extended: true,
      })(req, res, next);
    } else {
      next();
    }
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'stripe-signature', // Added stripe-signature header
    ],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle(' API')
    .setDescription('')
    .setVersion('1.0')
    .addSecurityRequirements('bearer', ['bearer'])
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const PORT = process.env.PORT;
  const environment = process.env.NODE_ENV;

  await app.listen(PORT, () => {
    if (environment === 'local') {
      console.log(`Local server is running on port: ${PORT}`);
    } else if (environment === 'production') {
      console.log(`Production server is running on port: ${PORT}`);
    } else {
      console.log('You forget to get environment (NODE_ENV) from env!!');
    }
  });
}

bootstrap();
