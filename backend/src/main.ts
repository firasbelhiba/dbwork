import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('cors.origin'),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Dar Blockchain PM API')
    .setDescription('Project Management Tool API for Dar Blockchain Company')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Projects')
    .addTag('Issues')
    .addTag('Sprints')
    .addTag('Comments')
    .addTag('Notifications')
    .addTag('Reports')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Create uploads directories
  const dirs = [
    './uploads',
    './uploads/avatars',
    './uploads/attachments',
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Start server
  const port = configService.get<number>('port');
  await app.listen(port);

  console.log(`
    🚀 Dar Blockchain PM Backend is running!
    📍 Server: http://localhost:${port}
    📚 API Docs: http://localhost:${port}/api/docs
    🔒 Environment: ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap();
