require('dotenv').config();
const fs = require('fs');
const {GraphQLClient} = require('graphql-request');
const getRepositories = require('./queries/getRepositories');
const getPullRequests = require('./queries/getPullRequests');
const getComments = require('./queries/getComments');
const getReviews = require('./queries/getReviews');
const MongoClient = require('mongodb').MongoClient;
const { Observable } = require('rxjs');
const token = process.env.GITHUB_TOKEN;
const MONGO_DB = process.env.MONGO_DB;
const SECOND = 1000;
let intervalShowQueues = null;

function log(msg) {
    const date = new Date();
    const logText = `${date.toISOString()}  ${msg}\n`;
    fs.appendFileSync("log.txt", logText);
}

(async () => {

const clientGraphQl = new GraphQLClient("https://api.github.com/graphql", { headers: {authorization: `Bearer ${token}`}});
let clientDb = new MongoClient(MONGO_DB);
clientDb = await clientDb.connect();
const DB = clientDb.db('tis6');

const repositories = [];
const pullrequests = [];
const comments = [];
const reviews = [];

const num_repositories = 1000;
const initPeriod1 = new Date('2019-03-01T00:00:00Z');
const endPeriod1 = new Date('2019-09-01T00:00:00Z');
const initPeriod2 = new Date('2020-03-01T00:00:00Z');
const endPeriod2 = new Date('2020-09-01T00:00:00Z');

const endGetRepository = false;
let pendentingProcess = 0;
const observableRepository = new Observable(async (observer) => {
    for await (const repo of getRepositories(num_repositories, clientGraphQl)) {
        await DB.collection('repositories').replaceOne({"id": repo['id']}, repo, {upsert: true});
        repositories.push(repo);
        observer.next(repo);
        pendentingProcess++;
    }
    observer.complete();
    endGetRepository = true;
});

observableRepository.subscribe(
    async repo => {
        for await (const pr of getPullRequests(clientGraphQl, repo, initPeriod1, endPeriod1, initPeriod2, endPeriod2)) {
            pr.idRepository = repo.id;
            await DB.collection('pullrequests').replaceOne({"id": pr['id']}, pr, {upsert: true});
            pullrequests.push(pr);

            for await(const comment of getComments(clientGraphQl, pr)) {
                comment.idRepository = pr.idRepository;
                comment.idPullrequest = pr.id;
                await DB.collection('comments').replaceOne({"id": comment['id']}, comment, {upsert: true});
                comments.push(comment);
            }
            for await(const review of getReviews(clientGraphQl, pr)) {
                review.idRepository = pr.idRepository;
                review.idPullrequest = pr.id;
                await DB.collection('reviews').replaceOne({"id": review['id']}, review, {upsert: true});
                reviews.push(review);
            }
        }
        pendentingProcess--;

        // const observablePullrequest = new Observable(async (observer) => {
        //     for await (const pr of getPullRequests(clientGraphQl, repo, initPeriod1, endPeriod1, initPeriod2, endPeriod2)) {
        //         pr.idRepository = repo.id;
        //         await DB.collection('pullrequests').replaceOne({"id": pr['id']}, pr, {upsert: true});
        //         pullrequests.push(pr);
        //         observer.next(pr);
        //     }
        //     observer.complete();
        // });

        // observablePullrequest.subscribe(async pr => {
        //     const observableComments = new Observable(async (observer) => {
        //         for await(const comment of getComments(clientGraphQl, pr)) {
        //             comment.idRepository = pr.idRepository;
        //             comment.idPullrequest = pr.id;
        //             await DB.collection('comments').replaceOne({"id": comment['id']}, comment, {upsert: true});
        //             comments.push(comment);
        //         }
        //         observer.complete();
        //     });
        //     const observableReviews = new Observable(async (observer) => {
        //         for await(const review of getReviews(clientGraphQl, pr)) {
        //             review.idRepository = pr.idRepository;
        //             review.idPullrequest = pr.id;
        //             await DB.collection('reviews').replaceOne({"id": review['id']}, review, {upsert: true});
        //             reviews.push(review);
        //         }
        //         observer.complete();
        //     });
        // });
    }
);

const showQueues = () => {
    console.clear();
    console.log('Fetch from GitHub');
    console.log(`repositories: ${repositories.length}`);
    console.log(`pullrequests: ${pullrequests.length}`);
    console.log(`comments: ${comments.length}`);
    console.log(`reviews: ${reviews.length}`);
    console.log(`pendenting process: ${pendentingProcess}`);

    if(endGetRepository && pendentingProcess <= 0) {
        console.log("\n End Script");
        process.exit();
    }
};

intervalShowQueues = setInterval(showQueues, SECOND);

// console.log("\nGet Repositories");
// process.stdout.write(`${repositories.length} of ${num_repositories}\r`);
// for await (const repo of getRepositories(num_repositories, clientGraphQl)) {
//     await DB.collection('repositories').replaceOne({"id": repo['id']}, repo, {upsert: true});
//     repositories.push(repo);
//     process.stdout.write(`${repositories.length} of ${num_repositories}\r`);
// }
// console.log("");

// console.log("\nGet PullRequests");
// process.stdout.write(`pullrequests: ${pullrequests.length}\r`);
// for (let repo of repositories) {
//     for await (const pr of getPullRequests(clientGraphQl, repo, initPeriod1, endPeriod1, initPeriod2, endPeriod2)) {
//         pr.idRepository = repo.id;
//         await DB.collection('pullrequests').replaceOne({"id": pr['id']}, pr, {upsert: true});
//         pullrequests.push(pr);
//         process.stdout.write(`pullrequests: ${pullrequests.length}\r`);
//     }
// }
// console.log("");

// console.log("\nGet Comments and Reviews");
// process.stdout.write(`comments: ${comments.length} | reviews: ${reviews.length}\r`);
// for (let pr of pullrequests) {
//     for await(const comment of getComments(clientGraphQl, pr)) {
//         comment.idRepository = pr.idRepository;
//         comment.idPullrequest = pr.id;
//         await DB.collection('comments').replaceOne({"id": comment['id']}, comment, {upsert: true});
//         comments.push(comment);
//         process.stdout.write(`comments: ${comments.length} | reviews: ${reviews.length}\r`);
//     }
//     for await(const review of getReviews(clientGraphQl, pr)) {
//         review.idRepository = pr.idRepository;
//         review.idPullrequest = pr.id;
//         await DB.collection('reviews').replaceOne({"id": review['id']}, review, {upsert: true});
//         reviews.push(review);
//         process.stdout.write(`comments: ${comments.length} | reviews: ${reviews.length}\r`);
//     }
// }
// console.log();

// console.log("End script");

})().catch(err => {
    clearInterval(intervalShowQueues);
    log(err);
    console.error(err);
    process.exit();
});


