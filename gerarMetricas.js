require('dotenv').config();
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const MONGO_DB = process.env.MONGO_DB;

function isOnPeriod(message, init, end) {
    if (!(message && message.pr)) return false;
    if (!(init instanceof Date && end instanceof Date)) return false;
    const date = new Date(message.pr.createdAt); 
    return init <= date && date <= end;
}

function groupBy(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
};

function mapperMessage(m) {
    return {
        _id: m._id,
        id: m.id,
        bodyText: m.bodyText,
        idPullRequest: m.idPullRequest,
        idRepository: m.idRepository,
        sentiment: m.sentiment,
        createdAt: m.pr.createdAt,
    };
}

const initPeriod1 = new Date('2019-03-01T00:00:00Z');
const endPeriod1 = new Date('2019-09-01T00:00:00Z');
const initPeriod2 = new Date('2020-03-01T00:00:00Z');
const endPeriod2 = new Date('2020-09-01T00:00:00Z');

(async () => {
    let clientDb = new MongoClient(MONGO_DB);
    clientDb = await clientDb.connect();
    const DB = clientDb.db('tis6');
    const prsDb = DB.collection('pullrequests');
    const commentsDb = DB.collection('comments');
    const reviewsDb = DB.collection('reviews');
    console.log("Get Prs");
    const prs = await prsDb.find().toArray();
    console.log("Get Comments");
    const comments = await commentsDb.find().toArray();
    console.log("Get Reviews");
    const reviews = await reviewsDb.find().toArray();
    const messages = comments.concat(reviews);

    console.log("Correlate comments and prs");
    for (let message of messages) {
        let pr = prs.find(p => p.id === message.idPullRequest);
        message.pr = pr;
    }

    console.log("Filter");
    const messagesBeforePandemic = messages.filter((c) => isOnPeriod(c, initPeriod1, endPeriod1))
                                            .map(mapperMessage);
    const messagesAfterPandemic = messages.filter((c) => isOnPeriod(c, initPeriod2, endPeriod2))
                                            .map(mapperMessage);

    // console.log("Group");
    // const groupedCommentsBeforePandemic = groupBy(messagesBeforePandemic, 'sentiment');
    // const groupedCommentsAfterPandemic = groupBy(messagesAfterPandemic, 'sentiment');
    // const metric = {
    //     groupedCommentsBeforePandemic,
    //     groupedCommentsAfterPandemic
    // };

    console.log("Write");
    fs.writeFileSync('messagesBeforePandemic.json', JSON.stringify(messagesBeforePandemic, null, 2));
    fs.writeFileSync('messagesAfterPandemic.json', JSON.stringify(messagesAfterPandemic, null, 2));
    console.log("End");

})();