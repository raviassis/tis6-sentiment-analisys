require('dotenv').config();
const sleep = require('./sleep');
const {GraphQLClient} = require('graphql-request');
const MongoClient = require('mongodb').MongoClient;
const token = process.env.GITHUB_TOKEN;
const MONGO_DB = process.env.MONGO_DB;
const LIMIT = 262;
const SKIP = LIMIT * 0;

const query = `
{
    node(id: "{id}") {
        ... on PullRequestReview {
            id
            pullRequest {
                id
            }
            repository { id }      
        }
    }
  }  
`;

(async () => {
    const clientGraphQl = new GraphQLClient("https://api.github.com/graphql", { headers: {authorization: `Bearer ${token}`}});
    let clientDb = new MongoClient(MONGO_DB);
    clientDb = await clientDb.connect();
    const DB = clientDb.db('tis6');
    const reviewsDb = DB.collection('reviews');
    const cursor = reviewsDb.find({$or: [{idRepository: {$exists: false}}, {idPullRequest: {$exists: false}}]})
                                .skip(SKIP)
                                .limit(LIMIT);
    const reviews = await cursor.toArray();
    const toUpdate = reviews.length;
    let updated = 0;
    console.log("Update Reviews References");
    console.log(`${updated} from ${toUpdate}`);
    for(const review of reviews) {
        let hasNextPage = true;
        while(hasNextPage) {
            try {
                const result = await clientGraphQl.request(query.replace("{id}", review['id']));
                const node = result['node'];
                if (node && node.repository && node.pullRequest) {
                    review.idRepository = node.repository.id;
                    review.idPullRequest = node.pullRequest.id;
                    hasNextPage = false;
                }                
            } catch(e) {
                console.log(e);
                sleep(10000);
            }            
        }
        await reviewsDb.updateOne({id: review.id}, {$set: review});
        updated++;
        console.log(`${updated} from ${toUpdate}`);
    }
    console.log("Finished.");
})();