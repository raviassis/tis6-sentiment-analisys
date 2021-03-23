require('dotenv').config();
const sleep = require('./sleep');
const {GraphQLClient} = require('graphql-request');
const MongoClient = require('mongodb').MongoClient;
const token = process.env.GITHUB_TOKEN;
const MONGO_DB = process.env.MONGO_DB;
const LIMIT = 1000;
const SKIP = LIMIT * 0;

const query = `
{
    node(id: "{id}") {
      ... on PullRequest {
        id
        repository {
            id
        }
      }
    }
  }  
`;

(async () => {
    const clientGraphQl = new GraphQLClient("https://api.github.com/graphql", { headers: {authorization: `Bearer ${token}`}});
    let clientDb = new MongoClient(MONGO_DB);
    clientDb = await clientDb.connect();
    const DB = clientDb.db('tis6');
    const pullrequestsDb = DB.collection('pullrequests');
    const cursor = pullrequestsDb.find({idRepository: {$exists: false}}, {timeout: false}).skip(SKIP).limit(LIMIT);
    const prs = await cursor.toArray();
    const toUpdate = prs.length;
    let updated = 0;
    console.log("Update PullRequests References");
    console.log(`${updated} from ${toUpdate}`);
    for (const pr of prs) {
        let hasNextPage = true;
        while(hasNextPage) {
            try {
                const result = await clientGraphQl.request(query.replace("{id}", pr['id']));
                const node = result['node'];
                if (node && node.repository) {
                    pr.idRepository = node.repository.id;
                    hasNextPage = false;
                }                
            } catch(e) {
                sleep(10000);
            }            
        }
        try {
            await pullrequestsDb.updateOne({id: pr.id}, {$set: pr});
            updated++;
            console.log(`${updated} from ${toUpdate}`);
        } catch (e) {
            console.log(e);
        }
        
    }
    console.log("Finished.");
})();