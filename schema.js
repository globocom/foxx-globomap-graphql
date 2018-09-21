'use strict';

const gql = require('graphql-sync');
const GraphQLJSON = require('./graphql-type-json');

const db = require('@arangodb').db;
const aql = require('@arangodb').aql;

const edgeList = db._query(aql`
FOR g IN meta_graph
  FOR l in g.links
    FOR e in meta_collection
      FILTER e.name == l.edge AND e.kind == 'edge'
      SORT e.name ASC
      RETURN {
        'edge': e,
        'from_collections': l.from_collections,
        'to_collections': l.to_collections
      }
`).toArray()

const collectionList = db._query(aql`
FOR c in meta_collection
  FILTER c.kind == 'document'
  LET edges = (
    FOR g IN meta_graph
      FOR l in g.links
        FILTER c.name in l.from_collections or c.name in l.to_collections
          RETURN l.edge
  )
  SORT c.name ASC
  RETURN {
    'collection': c,
    'edges': edges
  }
`).toArray()


function getQuery(collection, args) {
    let filters = Object.keys(args).map((key) => {
        return `c.${key} == '${args[key]}'`
    }).join(' AND ')
    let where = ''
    if (filters.length > 0)
        where = ` FILTER ${filters}`
    let query = `FOR c in ${collection} ${where} RETURN c`
    console.error(query)
    let queryCollection = db._query(query).toArray()
    if (queryCollection.length > 0)
        return queryCollection[0]
    return null
}

function getLink(collection, args) {
    let filters = Object.keys(args).map((key) => {
        return `c.${key} == '${args[key]}'`
    }).join(' AND ')
    let where = ''
    if (filters.length > 0)
        where = ` FILTER ${filters}`
    let query = `FOR c in ${collection} ${where} RETURN c`
    console.error(query)
    let queryCollection = db._query(query).toArray()
    return queryCollection
}

let commonFields = {
    id: {
        type: gql.GraphQLString,
        description: 'The id of the document.'
    },
    name: {
        type: gql.GraphQLString,
        description: 'The name of the document.'
    },
    provider: {
        type: gql.GraphQLString,
        description: 'The provider of the document.'
    },
    timestamp: {
        type: gql.GraphQLString,
        description: 'The timestamp of the document.'
    },
    properties: {
        type: GraphQLJSON,
        description: 'The properties of the document.'
    },
    properties_metadata: {
        type: GraphQLJSON,
        description: 'The properties_metadata of the document.'
    }
}

let edgeFields = {
    to: {
        type: null,
        description: 'The destination of the document.'
    },
    from: {
        type: null,
        description: 'The source of the document.'
    }
}

let edgeType = new Object()
let collectionType = new Object()

const directionType = new gql.GraphQLEnumType({
    name: 'Directions',
    description: 'Directions of edges.',
    values: {
        FROM: {
            value: 'from', // The internal value stored in ArangoDB
            description: 'From'
        },
        TO: {
            value: 'to',
            description: 'To'
        }
    }
});

let edgeSearch = {
    direction: {
        description: 'Direction of Link',
        type: directionType
    }
}


let CollectionList = function () {
    collectionList.forEach((coll) => {
        let name = coll.collection.name

        collectionType[name] = new gql.GraphQLObjectType({
            name: name,
            description: coll.collection.alias,
            fields: () => {
                let fields = Object.assign({}, commonFields)

                coll.edges.forEach((edge) => {
                    let args = Object.assign({}, commonFields, edgeSearch)
                    fields[edge] = {
                        description: 'Link:' + edge,
                        type: new gql.GraphQLList(edgeType[edge]),
                        args: args,
                        resolve(root, args) {
                            if (args.direction != undefined) {
                                if (args.direction == 'from')
                                    args['_from'] = root._id
                                else
                                    args['_to'] = root._id
                            }
                            console.error(args)
                            delete args.direction
                            let res = getLink(edge, args)
                            return res
                        }
                    }
                });

                return fields
            },
            args: commonFields,
            resolve(root, args) {
                let res = getQuery(name, args)
                return res
            }
        });
    });
    edgeList.forEach((edge) => {
        let name = edge.edge.name

        edgeType[name] = new gql.GraphQLObjectType({
            name: name,
            description: edge.edge.alias,
            fields: () => {
                let fields = Object.assign({}, commonFields)

                fields['from'] = {
                    description: 'From',
                    type: GetFromType(edge),
                    resolve(root, args) {
                        return root
                    }
                }
                fields['to'] = {
                    description: 'To',
                    type: GetToType(edge),
                    resolve(root, args) {
                        return root
                    }
                }

                return fields
            },
            resolve(root, args) {
                let res = getQuery(name, args)
                return res
            },
            args: {
                direction: {
                    description: 'Direction',
                    type: gql.GraphQLString
                }
            }
        });
    });
}

let GetFromType = function (edge) {
    let directionType = new gql.GraphQLObjectType({
        name: edge.edge.name + '_from',
        fields: () => {
            let fields_coll = new Object()
            fields_coll['id'] = {
                type: gql.GraphQLString,
                resolve(root, args) {
                    return root._from
                }
            }
            edge.from_collections.forEach((coll) => {
                fields_coll[coll] = {
                    type: collectionType[coll],
                    args: commonFields,
                    resolve(root, args) {
                        args['_id'] = root._from
                        let res = getQuery(coll, args)
                        return res
                    }
                }
            })
            return fields_coll
        }
    })
    return directionType
}
let GetToType = function (edge) {
    let directionType = new gql.GraphQLObjectType({
        name: edge.edge.name + '_to',
        fields: () => {
            let fields_coll = new Object()
            fields_coll['id'] = {
                type: gql.GraphQLString,
                resolve(root, args) {
                    return root._to
                }
            }
            edge.to_collections.forEach((coll) => {
                fields_coll[coll] = {
                    type: collectionType[coll],
                    args: commonFields,
                    resolve(root, args) {
                        args['_id'] = root._to
                        let res = getQuery(coll, args)
                        return res
                    }
                }
            })
            return fields_coll
        }
    })
    return directionType
}

let GetQueryType = function () {
    CollectionList()
    let queryType = new gql.GraphQLObjectType({
        name: 'Query',
        description: 'Query',
        fields: () => {
            let fields_coll = new Object()
            Object.keys(collectionType).map((name) => {
                fields_coll[name] = {
                    type: collectionType[name],
                    args: commonFields,
                    resolve(root, args) {
                        let res = getQuery(name, args)
                        return res
                    }
                }
            })
            Object.keys(edgeType).map((name) => {

                let args = Object.assign({}, commonFields, edgeSearch)
                fields_coll[name] = {
                    type: edgeType[name],
                    args: args,
                    resolve(root, args) {
                        let res = getQuery(name, args)
                        return res
                    }
                }
            })
            return fields_coll
        }
    });
    return queryType
}
module.exports = new gql.GraphQLSchema({
    query: GetQueryType()
});

