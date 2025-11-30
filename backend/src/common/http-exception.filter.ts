import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exceptionResponse;
        error = (exceptionResponse as any).error;
      }
    } else if (exception instanceof Error) {
      // 모든 에러에 대해 원본 메시지를 그대로 전달
      message = exception.message;
      error = exception.name;
      
      // 스택 트레이스도 포함 (개발 환경에서 유용)
      if (process.env.NODE_ENV !== 'production') {
        console.error('Unhandled exception:', {
          message: exception.message,
          stack: exception.stack,
          url: request.url,
          method: request.method,
        });
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(message) ? message : [message],
      ...(error && { error }),
    };

    response.status(status).json(errorResponse);
  }
}

