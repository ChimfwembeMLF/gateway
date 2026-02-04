import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserHashPasswordInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    if (request.body && request.body.password) {
      request.body.password = await bcrypt.hash(request.body.password, 10);
    }
    return next.handle().pipe(map(data => data));
  }
}
