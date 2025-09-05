import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

// commands
import { GithubCallbackCommand } from '../github-callback.command';

// services
import { GithubService } from '../../services/github.service';

@CommandHandler(GithubCallbackCommand)
export class GithubCallbackCommandHandler
  implements ICommandHandler<GithubCallbackCommand>
{
  private readonly logger = new Logger(GithubCallbackCommandHandler.name);

  constructor(private readonly githubService: GithubService) {}

  async execute(command: GithubCallbackCommand): Promise<void> {
    const { code } = command;

    try {
      const pair = await this.githubService.getTokenPair(code);
      const user = await this.githubService.getUser(pair.accessToken);
      const email = await this.githubService.getUserPrimaryEmail(
        pair.accessToken,
      );

      //   Related then logic here
    } catch (error) {
      this.logger.error('Error getting token pair:', error);
      throw error;
    }
  }
}
