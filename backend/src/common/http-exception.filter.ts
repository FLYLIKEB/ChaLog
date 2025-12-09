import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

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

      // 500 에러가 아닌 경우에도 로깅 (경고 레벨)
      if (status >= 500) {
        this.logger.error(
          `HTTP ${status} Error: ${JSON.stringify(message)}`,
          exception instanceof Error ? exception.stack : undefined,
        );
      } else {
        this.logger.warn(
          `HTTP ${status} Error: ${JSON.stringify(message)} - ${request.method} ${request.url}`,
        );
      }
    } else if (exception instanceof Error) {
      // 모든 에러에 대해 원본 메시지를 그대로 전달
      message = exception.message;
      error = exception.name;
      
      // 상세한 에러 로깅
      this.logger.error(
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      this.logger.error(
        `Request Details: ${request.method} ${request.url}`,
        JSON.stringify({
          query: request.query,
          params: request.params,
          body: request.body,
          headers: {
            'content-type': request.headers['content-type'],
            'authorization': request.headers['authorization'] ? '[REDACTED]' : undefined,
          },
        }, null, 2),
      );
    } else {
      // 알 수 없는 에러 타입
      this.logger.error(
        `Unknown Exception Type: ${typeof exception}`,
        JSON.stringify(exception, Object.getOwnPropertyNames(exception)),
      );
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

