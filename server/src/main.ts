import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
<<<<<<< HEAD
=======
import { ObservabilityService } from './common/services/observability.service.js';
>>>>>>> 7884868 (STOCKSYS)
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
  );
<<<<<<< HEAD
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const config = new DocumentBuilder()
    .setTitle('StockSys API')
    .setDescription('Backend API for StockSys')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port as number);
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
=======
  const observability = app.get(ObservabilityService);
  app.useGlobalFilters(new HttpExceptionFilter(observability));
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Only expose Swagger when allowed (disable or gate in production)
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    const swaggerUser = process.env.SWAGGER_USER;
    const swaggerPass = process.env.SWAGGER_PASSWORD;
    const ipWhitelist = (process.env.SWAGGER_IP_WHITELIST || '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const basicAuthRequired = Boolean(swaggerUser && swaggerPass);
    const checkAuth = (req: any, res: any, next: any) => {
      if (ipWhitelist.length > 0) {
        const ip = req.ip || req.connection?.remoteAddress;
        const match = ipWhitelist.some((allowed) => ip?.includes(allowed));
        if (!match) {
          return res.status(403).send('Forbidden');
        }
      }

      if (basicAuthRequired) {
        const header = req.headers['authorization'] || '';
        const token = header.startsWith('Basic ') ? header.slice(6) : null;
        if (!token) return res.status(401).setHeader('WWW-Authenticate', 'Basic').send('Auth required');
        const decoded = Buffer.from(token, 'base64').toString();
        const [user, pass] = decoded.split(':');
        if (user !== swaggerUser || pass !== swaggerPass) {
          return res.status(401).setHeader('WWW-Authenticate', 'Basic').send('Invalid credentials');
        }
      }
      return next();
    };

    app.use(['/api/docs', '/api/docs-json'], checkAuth);

    const config = new DocumentBuilder()
      .setTitle('StockSys API')
      .setDescription('Backend API for StockSys')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port as number);
  console.log(`Server listening on http://localhost:${port}`);
  if (swaggerEnabled) {
    console.log('Swagger docs available at /api/docs');
  }
>>>>>>> 7884868 (STOCKSYS)
}

bootstrap();
