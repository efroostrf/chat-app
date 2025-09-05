import { BadRequestException, Get, Logger, Query, Res } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

// common
import type { Response } from '@common/interfaces/response.interface';

// decorators
import { Controller } from '@common/decorators/controller.decorator';
import { GetGithubRedirectUriQuery } from './queries/get-github-redirect-uri.query';

@Controller('auth/github')
export class GithubAuthController {
  private readonly logger = new Logger(GithubAuthController.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'GitHub authentication' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to GitHub authentication',
  })
  async githubAuth(@Res() res: Response) {
    const query = new GetGithubRedirectUriQuery();
    const redirectUri = await this.queryBus.execute<
      GetGithubRedirectUriQuery,
      string
    >(query);

    res.redirect(redirectUri, 302);
  }

  @Get('callback')
  @ApiOperation({ summary: 'GitHub authentication callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to the app',
  })
  async githubAuthCallback(@Query('code') code: string) {
    try {
      //   Related then logic here
    } catch (error) {
      this.logger.error('Error handling github callback:', error);
      throw new BadRequestException();
    }
  }
}
