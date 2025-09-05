import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

// services
import { GithubService } from '../../services/github.service';

// queries
import { GetGithubRedirectUriQuery } from '../get-github-redirect-uri.query';

@QueryHandler(GetGithubRedirectUriQuery)
export class GetGithubRedirectUriQueryHandler
  implements IQueryHandler<GetGithubRedirectUriQuery>
{
  constructor(private readonly githubService: GithubService) {}

  async execute(): Promise<string> {
    return Promise.resolve(this.githubService.getRedirectUri());
  }
}
