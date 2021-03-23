require('dotenv').config();
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const MONGO_DB = process.env.MONGO_DB;

(async () => {
    let clientDb = new MongoClient(MONGO_DB);
    clientDb = await clientDb.connect();
    const DB = clientDb.db('tis6');
    const repositoriesDb = DB.collection('repositories');
    const prsDb = DB.collection('pullrequests');
    const commentsDb = DB.collection('comments');
    const reviewsDb = DB.collection('reviews');

    console.log("Get dada");
    const repositoriesPromisse = repositoriesDb.find().toArray();
    const prsPromisse = prsDb.find().toArray();
    const commentsPromisse = commentsDb.find().toArray();
    const reviewsPromisse = reviewsDb.find().toArray();
    const resolved = await Promise.all([repositoriesPromisse, prsPromisse, commentsPromisse, reviewsPromisse]);
    let repositories = resolved[0];
    let prs = resolved[1];
    let comments = resolved[2];
    let reviews = resolved[3];
    let messages = comments.concat(reviews);
    let dados = [];

    console.log('Analysing');
    for(const message of messages) {
        const repository = repositories.find(r => r.id === message.idRepository);
        const pr = prs.find(p => p.id === message.idPullRequest);
        if (pr && repository) {
            message.createdAt = pr.createdAt;
            message.nameWithOwner = repository.nameWithOwner;
            message.stargazerCount = repository.stargazerCount;
            dados.push(message);
        }
        console.log(`${dados.length} of ${messages.length}`);
    }
    console.log(`${dados.length} of ${messages.length}`);

    console.log('Writing file');
    fs.writeFileSync('dados.json', JSON.stringify(dados, null, 2));
    console.log('End');
})();