'use strict';
const schema = require('./schema');
const gql = require('graphql-sync');
const graphql = gql.graphql;
const createGraphqlRouter = require('./graphql-custom');

let contextCustom = {
  authUrl: module.context.configuration.url
}
const router = createGraphqlRouter({ 
  schema, 
  context: contextCustom, 
  formatError: function formatError(err) {
    return {
      message: err.message
    }
  }, 
  graphiql: true 
  })
  .summary('GraphQL endpoint')
  .description('GraphQL endpoint for the GloboMap Database.');

module.context.use(router);
