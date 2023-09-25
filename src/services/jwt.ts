import JWT from 'jsonwebtoken'
import {User} from '@prisma/client'
import { JWTUser } from '../interfaces';

const jwt_secret = '$uper$eUper.!o!'

class JWTService {
    public static generateTokenForUser(user: User){
        const payload: JWTUser = {
            id:user?.id,
            email:user?.email,
        }
        const token = JWT.sign(payload,jwt_secret)

        return token;
    }

    public static decode(token:string){
        try {            
            return JWT.verify(token,jwt_secret) as JWTUser;
        } catch (error) {
            return null
        }
    }
}

export default JWTService