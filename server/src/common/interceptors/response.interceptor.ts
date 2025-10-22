import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Si le contrôleur a déjà renvoyé undefined (ex: 204), ne pas envelopper
        if (data === undefined) return undefined;
        // Normaliser la réponse
        return { data };
      })
    );
  }
}

