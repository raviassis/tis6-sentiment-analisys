const sleep = require('../sleep');
const query = `
{
    node(id: "{id}") {
      ... on PullRequest {
        id
        comments(first: 100, after:{after}) {
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

const isValid= (comment) => {
  return comment.bodyText;
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
                    const comments = node['comments'];
                    const pageInfo = comments['pageInfo'];
                    hasNextPage = pageInfo['hasNextPage'];
                    endCursor = pageInfo['endCursor'] ? `"${pageInfo['endCursor']}"`: null;
                    for(let comment of comments['nodes']) {
                      if(isValid(comment)) {
                        yield comment;
                      }
                    }
                }
            } catch(e) {
                sleep(10000)
            }  
        }
    }
};