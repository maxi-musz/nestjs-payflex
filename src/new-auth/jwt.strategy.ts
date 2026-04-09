import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET') || 'defaultSecret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub?: string }) {
    if (!payload?.sub) return payload;
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { account_status: true },
    });
    if (user?.account_status === 'suspended') {
      throw new UnauthorizedException('Account suspended. Contact support.');
    }
    return payload;
  }
}
