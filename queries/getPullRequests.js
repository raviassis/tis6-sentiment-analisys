const sleep = require('../sleep');
const query = `
{
    node(id: "{id}") {
      ... on Repository {
        id
        pullRequests(first:100, after:{after}) {
          pageInfo {
            endCursor
            hasNextPage
          }
          totalCount
          nodes {
            id
            bodyText
            createdAt
            reviews {
              totalCount
            }
            comments {
              totalCount
            }
          }
        }
      }
    }
  }  
`;

const isValidPeriod= (pr, initPeriod1, endPeriod1, initPeriod2, endPeriod2) => {
  const date = new Date(pr.createdAt);
  return (initPeriod1 <= date && date <= endPeriod1) ||
        (initPeriod2 <= date && date <= endPeriod2);
};

const hasCommentsOrReviews= (pr) => {
  return (pr.reviews && pr.reviews.totalCount > 0) ||
        (pr.comments && pr.comments.totalCount > 0);
};

const isValid= (pr, initPeriod1, endPeriod1, initPeriod2, endPeriod2) => {
  return pr &&
        hasCommentsOrReviews(pr) &&
        isValidPeriod(pr, initPeriod1, endPeriod1, initPeriod2, endPeriod2);
};

module.exports= async function*(client, repo, initPeriod1, endPeriod1, initPeriod2, endPeriod2) {
    if (repo && repo['id']) {
        hasNextPage = true;
        endCursor = null;
        while(hasNextPage) {
            try {
                const result = await client.request(query.replace("{after}", endCursor).replace("{id}", repo['id']));
                const node = result['node'];
                if(node) {
                    const pullRequests = node['pullRequests'];
                    const pageInfo = pullRequests['pageInfo'];
                    hasNextPage = pageInfo['hasNextPage'];
                    endCursor = pageInfo['endCursor'] ? `"${pageInfo['endCursor']}"`: null;
                    for(let pr of pullRequests['nodes']) {
                      if (isValid(pr, initPeriod1, endPeriod1, initPeriod2, endPeriod2)) {
                        yield pr;
                      }                        
                    }
                }
            } catch(e) {
                sleep(10000)
            }            
        }
    }
};