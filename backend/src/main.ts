import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost:16001'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Gist API')
    .setDescription('Gist-like code sharing platform API')
    .setVersion('1.0')
    .addCookieAuth('refreshToken')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000, '0.0.0.0');
  console.log('Application is running on: http://localhost:3000');
  console.log('Swagger docs: http://localhost:3000/api/docs');
}

bootstrap();
