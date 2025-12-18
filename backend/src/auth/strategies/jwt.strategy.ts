import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@users/schemas/user.schema';
import { Request } from 'express';

// Custom extractor that checks both Authorization header and query parameter
const extractJwtFromHeaderOrQuery = (req: Request): string | null => {
  // First try Authorization header
  const authHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (authHeader) {
    return authHeader;
  }
  // Fallback to query parameter (used for iframe/PDF viewing)
  if (req.query && req.query.token) {
    return req.query.token as string;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: extractJwtFromHeaderOrQuery,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: any) {
    const user = await this.userModel
      .findById(payload.sub)
      .select('-password -refreshToken')
      .exec();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }
}
