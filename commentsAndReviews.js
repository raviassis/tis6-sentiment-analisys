require('dotenv').config();
const {GraphQLClient} = require('graphql-request');
const getComments = require('./queries/getComments');
const getReviews = require('./queries/getReviews');
const MongoClient = require('mongodb').MongoClient;
const token = process.env.GITHUB_TOKEN;
const MONGO_DB = process.env.MONGO_DB;

(async () => {
    const clientGraphQl = new GraphQLClient("https://api.github.com/graphql", { headers: {authorization: `Bearer ${token}`}});
    let clientDb = new MongoClient(MONGO_DB);
    clientDb = await clientDb.connect();
    const DB = clientDb.db('tis6');
    const pullrequestsDb = DB.collection('pullrequests');
    const commentsDb = DB.collection('comments');
    const reviewsDb = DB.collection('reviews');
    const filter = {$or: [{gotCommentsAndReviews: {$exists: false}}, {gotCommentsAndReviews: {$eq: false}}]};
    const cursor = pullrequestsDb.find(filter).skip(20000).limit(5000);
    const prs = await cursor.toArray();
    let prsToAnalyse = prs.length;
    let numPrsAnalysed = 0;
    console.log("Get Comments and reviews");
    console.log(`${numPrsAnalysed} from ${prsToAnalyse} prs.`);    
    const comments = [];
    const reviews = [];
    for(const pr of prs) {
        for await (const comment of getComments(clientGraphQl, pr)) {
            comment.idPullRequest = pr.id;
            comment.idRepository = pr.idRepository;
            await commentsDb.replaceOne({"id": comment.id}, comment, {upsert: true});
            comments.push(comments);
            console.log(`${comments.length} comments.`);
        }
        for await (const review of getReviews(clientGraphQl, pr)) {
            review.idPullRequest = pr.id;
            review.idRepository = pr.idRepository;
            await reviewsDb.replaceOne({"id": review.id}, review, {upsert: true});
            reviews.push(review);
            console.log(`${reviews.length} reviews.`);
        }
        pr.gotCommentsAndReviews = true;
        await pullrequestsDb.updateOne({"id": pr.id}, {$set: pr});
        numPrsAnalysed++;
        console.log(`${numPrsAnalysed} from ${prsToAnalyse} prs.`);
    };
    console.log('Finished');
    
})();