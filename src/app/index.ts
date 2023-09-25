import express from "express";
import bodyParser from "body-parser";
import { ApolloServer } from '@apollo/server';
import cors from 'cors'
import { expressMiddleware } from '@apollo/server/express4';
import { prismaClient } from "../Client";

import {Tweet} from './tweet'
import {User} from './user'
import { GraphqlContext } from "../interfaces";
import JWTService from "../services/jwt";


export async function initServer() {
    const app = express();

    app.use(bodyParser.json());
    app.use(cors());

    const graphqlServer = new ApolloServer<GraphqlContext>({
        typeDefs:`
            ${User.types}
            ${Tweet.type}
            type Query {
                ${User.queries}
                ${Tweet.query}
            }

            type Mutation {
                ${Tweet.mutation}
                ${User.mutations}
            }
        `,
        resolvers:{
            Query:{
                ...User.resolvers.queries,
                ...Tweet.resolvers.query
            },
            Mutation: {
                ...Tweet.resolvers.mutations,
                ...User.resolvers.mutations,
            },
            ...Tweet.resolvers.extraResolver,
            ...User.resolvers.extraResolver,
        },
      });

      await graphqlServer.start();

    app.use('/graphql',expressMiddleware(graphqlServer,{
        context:async ({req, res}) => {
            return {
                user: req.headers.authorization ? JWTService.decode(req.headers.authorization.split('Bearer ')[1]) : undefined
            }
        }
    }));

    return app;
}