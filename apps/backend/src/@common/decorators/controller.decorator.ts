import { applyDecorators, Controller as NestController } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export interface ControllerOptions {
  tags?: string[];
}

export function Controller(path: string, options?: ControllerOptions) {
  const fullPath = `/v1/${path}`;
  const tags = options?.tags ?? [path];

  return applyDecorators(NestController(fullPath), ApiTags(...tags));
}
