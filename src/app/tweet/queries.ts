export const query = `#graphql
    getAllTweets: [Tweet]
    getSignedURLForTweet(imageName:String!, imageType: String!):String
`