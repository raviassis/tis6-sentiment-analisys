require('dotenv').config();
const sleep = require('./sleep');
const {GraphQLClient} = require('graphql-request');
const MongoClient = require('mongodb').MongoClient;
const token = process.env.GITHUB_TOKEN;
const MONGO_DB = process.env.MONGO_DB;
const LIMIT = 1100;
const SKIP = LIMIT * 0;

const query = `
{
    node(id: "{id}") {
        ... on IssueComment {
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
    const commentsDb = DB.collection('comments');
    const cursor = commentsDb.find({$or: [{idRepository: {$exists: false}}, {idPullRequest: {$exists: false}}]})
                                .skip(SKIP)
                                .limit(LIMIT);
    const comments = await cursor.toArray();
    const toUpdate = comments.length;
    let updated = 0;
    console.log("Update Comments References");
    console.log(`${updated} from ${toUpdate}`);
    for(const comment of comments) {
        let hasNextPage = true;
        while(hasNextPage) {
            try {
                const result = await clientGraphQl.request(query.replace("{id}", comment['id']));
                const node = result['node'];
                if (node && node.repository && node.pullRequest) {
                    comment.idRepository = node.repository.id;
                    comment.idPullRequest = node.pullRequest.id;
                    hasNextPage = false;
                }                
            } catch(e) {
                sleep(10000);
            }            
        }
        await commentsDb.updateOne({id: comment.id}, {$set: comment});
        updated++;
        console.log(`${updated} from ${toUpdate}`);
    }
    console.log("Finished.");
})();