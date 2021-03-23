const sleep = require('../sleep');
const repositoryQuery = `
{
    search(
        query: "stars:>=100 sort:stars",
        type: REPOSITORY, 
        first: 100,
        after: {after}
    ) {
        pageInfo {
        endCursor
        hasNextPage
        }
        repositoryCount
        nodes {
        ... on Repository {
            id
            name
            nameWithOwner
            stargazerCount
            watchers {
            totalCount
            }
            pullRequests {
            totalCount
            }
        }
        }
    }
}  
`;

const isValid= (repo) => {
    return repo &&
            repo.watchers &&
            repo.pullRequests &&
            repo.stargazerCount >= 100 &&
            repo.watchers.totalCount >= 100 &&
            repo.pullRequests.totalCount > 20;
};

module.exports = async function* (num_repositories, client) {
    collected = 0;
    hasNextPage = true;
    endCursor = null;
    while (hasNextPage && collected < num_repositories) {
        try {
            const result = await client.request(repositoryQuery.replace("{after}", endCursor));
            const search = result['search'];
            const pageInfo = search ? search['pageInfo'] : null;
            const nodes = search ? search['nodes'] : null;
            
            if(nodes && pageInfo) {
                hasNextPage = pageInfo['hasNextPage'];
                endCursor = pageInfo['endCursor'] ? `"${pageInfo['endCursor']}"`: null;
                for(let node of search['nodes']) {
                    if(isValid(node)) {
                        collected++;
                        yield node;
                    }                    
                }
            }  
        } catch (e) {
            sleep(10000);
        }              
    }    
};