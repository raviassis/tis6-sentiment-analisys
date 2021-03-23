require('dotenv').config();
const {GraphQLClient} = require('graphql-request');
const getPullRequests = require('./queries/getPullRequests');
const MongoClient = require('mongodb').MongoClient;
const token = process.env.GITHUB_TOKEN;
const MONGO_DB = process.env.MONGO_DB;

const initPeriod1 = new Date('2019-03-01T00:00:00Z');
const endPeriod1 = new Date('2019-09-01T00:00:00Z');
const initPeriod2 = new Date('2020-03-01T00:00:00Z');
const endPeriod2 = new Date('2020-09-01T00:00:00Z');

(async () => {
    const clientGraphQl = new GraphQLClient("https://api.github.com/graphql", { headers: {authorization: `Bearer ${token}`}});
    let clientDb = new MongoClient(MONGO_DB);
    clientDb = await clientDb.connect();
    const DB = clientDb.db('tis6');
    const repositoriesDb =  DB.collection('repositories');
    const pullrequestsDb = DB.collection('pullrequests');
    const cursor = repositoriesDb.find({gotPrs: {$exists: false}}).skip(0).limit(20);
    const repos = await cursor.toArray();
    let repoToAnalyse = repos.length;
    let numRepoAnalysed = 0;
    console.log("Get Pullrequests");
    console.log(`${numRepoAnalysed} from ${repoToAnalyse} repositories.`);
    
    const prs = [];
    for(const repo of repos) {
        
        for await (const pr of getPullRequests(clientGraphQl, repo, initPeriod1, endPeriod1, initPeriod2, endPeriod2)) {
            pr.idRepository = repo.id;
            await pullrequestsDb.replaceOne({"id": pr.id}, pr, {upsert: true});
            prs.push(pr);
            console.log(`${prs.length} prs.`);
        }
        repo.gotPrs = true;
        await repositoriesDb.updateOne({"id": repo.id}, {$set: repo});
        numRepoAnalysed++;
        console.log(`${numRepoAnalysed} from ${repoToAnalyse} repositories.`);
    };
    console.log('Finished');
    
})();