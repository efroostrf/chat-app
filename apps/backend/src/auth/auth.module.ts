import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// controllers
import { AuthController } from './controllers/auth.controller';
import { GithubAuthController } from './github-integration/github-auth-controller';

// handlers
import { GetGithubRedirectUriQueryHandler } from './github-integration/queries/handlers/get-github-redirect-uri.handler';

// services
import { GithubService } from './github-integration/services/github.service';

@Module({
  imports: [CqrsModule],
  controllers: [AuthController, GithubAuthController],
  providers: [
    // services
    GithubService,

    // command handlers

    // query handlers
    GetGithubRedirectUriQueryHandler,
  ],
})
export class AuthModule {}
