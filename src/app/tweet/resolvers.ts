import { Tweet } from "@prisma/client";
import { prismaClient } from "../../Client";
import { GraphqlContext } from "../../interfaces";
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3'
import {getSignedUrl} from '@aws-sdk/s3-request-presigner'
import UserService from "../../services/user";
import TweetService, { CreateTweetPayload } from "../../services/tweet";

const s3Client = new S3Client({
    region:process.env.AWS_DEFAULT_REGION
})

const query = {
    getAllTweets: ()=>{return TweetService.getAllTweets()},

    getSignedURLForTweet: async(parent:any,{imageType, imageName}:{imageType:string, imageName:string},ctx:GraphqlContext)=>{
        if(!ctx.user||!ctx.user.id){
            throw new Error('Unauthenticated');
        }
        const allowedImageTypes = ["image/jpg","image/jpeg","image/png","image/webp","image/jfif"];

        if(!allowedImageTypes.includes(imageType)){
            throw new Error('Unsupported Image Type');
        }
        const putObjectCommand = new PutObjectCommand({
            Bucket:process.env.AWS_S3_BUCKET,
            Key:`uploads/${ctx.user.id}/tweets/${imageName}-${Date.now()}.${imageType}`
        })
        const signedURl = await getSignedUrl(s3Client, putObjectCommand);

        return signedURl;
    }
}

const mutations= {
    createTweet: async(parent: any, {payload}:{payload: CreateTweetPayload}, ctx:GraphqlContext)=>{
        if(!ctx.user){
            throw new Error("You are not authenticated")
        }
        const tweet = await TweetService.createTweet({
            ...payload,
            userId: ctx.user.id
        })

        return tweet;
        
    }
}

const extraResolver = {
    Tweet: {
        author: (parent: Tweet)=>{
           return UserService.getUserById(parent.authorId)
        }
    }
}

export const resolvers= {mutations, extraResolver, query}