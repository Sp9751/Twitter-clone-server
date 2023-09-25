import axios from "axios"
import { prismaClient } from "../../Client";
import JWTService from "../../services/jwt";
import { GraphqlContext } from "../../interfaces";
import { User } from "@prisma/client";
import UserService from "../../services/user";
import { redisClient } from "../../Client/redis";

const queries = {
    verifyGoogleToken: async(parent: any, {token}:{token: string})=>{
        const setToken = await UserService.verifyGoogleAuthToken(token);
        return setToken
    },
    getCurrentUser:async (parent:any , args:any, ctx: GraphqlContext) => {
        const id= ctx.user?.id
        // console.log(ctx)
        if(!id) return null
        const user = await UserService.getUserById(id)
        return user;
    },

    getUserById:async (parent:any , {id}:{id : string}, ctx: GraphqlContext) =>{
        return UserService.getUserById(id)
    }
}

const extraResolver ={
    User:{
        tweets: (parent:User)=>{ return prismaClient.tweet.findMany({where:{author:{id:parent.id}}})},
        followers: async(parent:User)=>{ const result= await prismaClient.follows.findMany({where:{following: {id:parent.id}},
            include:{
                follower: true
            }
        })
        return result.map(el=>el.follower)
    },
        following: async(parent:User)=>{ const result= await prismaClient.follows.findMany({where:{follower: {id:parent.id}},
        include:{
            following:true
        }})
        return result.map(el=>el.following)
    },
    recommendedUsers: async(parent: User, _:any, ctx:GraphqlContext)=>{
        if(!ctx.user) return[];

        const cachedValue = await redisClient.get(`RECOMMENDED_USERS: ${ctx.user.id}`)

        if(cachedValue){
            return JSON.parse(cachedValue);
        }

        const myFollowing = await prismaClient.follows.findMany({
            where:{
                follower: {id: ctx.user.id}
            },
            include:{
                following: {
                    include:{followers: {include:{following:true}}}
                }
            }
        })

        const users: User[]= []
        for(const followings of myFollowing){
            for(const followingOfFollowerUser of followings.following.followers){
                if(
                    followingOfFollowerUser.following.id !== ctx.user.id &&
                    myFollowing.findIndex(e => e.followingId === followingOfFollowerUser.following.id)<0
                    ){
                        users.push(followingOfFollowerUser.following);
                }
            }
        }

        await redisClient.set(`RECOMMENDED_USERS: ${ctx.user.id}`,JSON.stringify(users));

        return users;
    }
    }
}

const mutations ={
    followUser: async(parent: any,{to}:{to: string}, ctx:GraphqlContext)=>{
        if(!ctx.user || !ctx.user.id){
            throw new Error('unauthenticated')
        }
        await UserService.followUser(ctx.user.id, to)
        await redisClient.del(`RECOMMENDED_USERS: ${ctx.user.id}`)
        return true
    },
    unfollowUser: async(parent: any,{to}:{to: string}, ctx:GraphqlContext)=>{
        if(!ctx.user || !ctx.user.id){
            throw new Error('unauthenticated')
        }
        await UserService.unfollowUser(ctx.user.id, to)
        await redisClient.del(`RECOMMENDED_USERS: ${ctx.user.id}`)
        return true
    }
}

export const resolvers = {queries,extraResolver,mutations};