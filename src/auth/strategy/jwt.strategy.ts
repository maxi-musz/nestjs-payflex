import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import * as colors from "colors";

@Injectable()
export class JwtStrategy extends PassportStrategy(
    Strategy,
    'jwt'
) {
    constructor(
        private config: ConfigService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get('JWT_SECRET') || 'defaultSecret'
        })

        console.log(colors.blue(`JWT secret: ${config.get('JWT_SECRET')}`))
    }

    async validate(payload: any) {
        console.log('JWT Payload:', payload); // Debugging line
        return payload;
    }
}
