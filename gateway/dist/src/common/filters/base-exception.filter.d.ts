import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export declare class BaseExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void;
}
