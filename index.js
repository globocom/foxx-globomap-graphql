'use strict';
const schema = require('./schema');
const gql = require('graphql-sync');
const graphql = gql.graphql;
const formatError = gql.formatError;
const createGraphqlRouter = require('@arangodb/foxx/graphql');

const router = createGraphqlRouter({ schema, graphiql: true })
  .summary('GraphQL endpoint')
  .description('GraphQL endpoint for the GloboMap Database.');

module.context.use(router);
