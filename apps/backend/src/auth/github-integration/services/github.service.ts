import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GithubUser,
  GithubUserEmail,
} from '../interfaces/github-user.interface';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  private clientId?: string;
  private clientSecret?: string;
  private appUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('AUTH_GITHUB_CLIENT_ID');
    this.clientSecret = this.configService.get<string>(
      'AUTH_GITHUB_CLIENT_SECRET',
    );
    this.appUrl = this.configService.get<string>('APP_URL');
  }

  onModuleInit(): void {
    if (!this.clientId) this.logger.warn('Client ID is not set');
    if (!this.clientSecret) this.logger.warn('Client secret is not set');
    if (!this.appUrl) this.logger.warn('App URL is not set');
  }

  getRedirectUri(): string {
    const params = new URLSearchParams();

    params.set('client_id', this.clientId!);
    params.set('redirect_uri', `${this.appUrl!}/v1/auth/github/callback`);

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async getTokenPair(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const response = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          body: JSON.stringify({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const params = new URLSearchParams(await response.text());

      const error = params.get('error') ?? null;

      if (error) {
        throw new Error(error);
      }

      const accessToken = params.get('access_token')!;
      const refreshToken = params.get('refresh_token')!;

      if (!accessToken || !refreshToken) {
        throw new Error('Failed to get tokens');
      }

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Error getting access token:', error);
      throw error;
    }
  }

  async getUser(accessToken: string): Promise<GithubUser> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user');
      }

      const user = (await response.json()) as GithubUser;

      this.logger.log('User:', user);

      return user;
    } catch (error) {
      this.logger.error('Error getting user:', error);
      throw error;
    }
  }

  async getUserPrimaryEmail(accessToken: string): Promise<string> {
    try {
      const response = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user email');
      }

      const emails = (await response.json()) as GithubUserEmail[];

      const primaryEmail = emails.find((email) => email.primary);

      return primaryEmail?.email ?? emails[0].email;
    } catch (error) {
      this.logger.error('Error getting user email:', error);
      throw error;
    }
  }
}
