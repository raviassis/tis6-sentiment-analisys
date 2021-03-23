const sleep = require('../sleep');
const query = `
{
    node(id: "{id}") {
      ... on PullRequest {
        id
        reviews(first: 100, after:{after}) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            id
            bodyText
          }
        }
      }
    }
  }  
`;

const isValid= (review) => {
  return review.bodyText;
};

module.exports = async function*(client, pr) {
    if(pr && pr['id']) {
        hasNextPage = true;
        endCursor = null;
        while(hasNextPage) {
            try {
                const result = await client.request(query.replace("{after}", endCursor).replace("{id}", pr['id']));
                const node = result['node'];
                if(node) {
                    const reviews = node['reviews'];
                    const pageInfo = reviews['pageInfo'];
                    hasNextPage = pageInfo['hasNextPage'];
                    endCursor = pageInfo['endCursor'] ? `"${pageInfo['endCursor']}"`: null;
                    for(let review of reviews['nodes']) {
                      if(isValid(review)) {
                        yield review;
                      }
                    }
                }
            } catch(e) {
                sleep(10000)
            }  
        }
    }
};