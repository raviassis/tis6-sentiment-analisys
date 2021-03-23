require('dotenv').config();
const fs = require('fs');
const {GraphQLClient} = require('graphql-request');
const getRepositories = require('./queries/getRepositories');
const MongoClient = require('mongodb').MongoClient;
const token = process.env.GITHUB_TOKEN;
const MONGO_DB = process.env.MONGO_DB;
const SECOND = 1000;
const num_repositories = 1000;

(async () => {
    const clientGraphQl = new GraphQLClient("https://api.github.com/graphql", { headers: {authorization: `Bearer ${token}`}});
    let clientDb = new MongoClient(MONGO_DB);
    clientDb = await clientDb.connect();
    const DB = clientDb.db('tis6');
    const repositories = [];

    console.log("\nGet Repositories");
    process.stdout.write(`${repositories.length} of ${num_repositories}\r`);
    for await (const repo of getRepositories(num_repositories, clientGraphQl)) {
        const result = await DB.collection('repositories').replaceOne({"id": repo['id']}, repo, {upsert: true});
        if(result.modifiedCount === 0 ) {
            console.log(repo);
            console.log();
        }else {
            repositories.push(repo);
            process.stdout.write(`${repositories.length} of ${num_repositories}\r`);
        }
        
    }
    console.log("\nFinish");
})();