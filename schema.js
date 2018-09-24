'use strict';

const gql = require('graphql-sync');
const GraphQLJSON = require('./graphql-type-json');

const validateToken = require('./token').validateToken;
const edgeList = require('./database').edgeList
const collectionList = require('./database').collectionList
const getObject = require('./database').getObject
const getList = require('./database').getList

let collectionSearch = {
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
    }
}

let commonFields = {
    id: {
        type: new gql.GraphQLNonNull(gql.GraphQLString),
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
        description: 'The properties metadata of the document.'
    }
}

let edgeType = new Object()
let collectionType = new Object()

const directionType = new gql.GraphQLEnumType({
    name: 'Directions',
    description: 'Directions of edges.',
    values: {
        FROM: {
            value: 'from',
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

let getAlias = function(name){
    let alias = name.replace(/(^|_)./g, s => s.slice(-1).toUpperCase())
    return alias
}

let CollectionList = function () {
    collectionList.forEach((coll) => {
        let name = coll.collection.name

        collectionType[name] = new gql.GraphQLObjectType({
            name: getAlias(name),
            description: coll.collection.alias,
            fields: () => {
                let fields = Object.assign({}, commonFields)

                coll.edges.forEach((edge) => {
                    let args = Object.assign({}, collectionSearch, edgeSearch)
                    fields[edge.name] = {
                        description: edge.alias,
                        type: new gql.GraphQLList(edgeType[edge.name]),
                        args: args,
                        resolve(root, args) {
                          let res
                            if (args.direction != undefined) {
                                if (args.direction == 'from'){
                                  args['_from'] = root._id
                                }
                                else{
                                  args['_to'] = root._id
                                }
                              delete args.direction
                              res = getList(edge.name, args)
                            }
                            else{
                              args['_to'] = root._id
                              let res1 = getList(edge.name, args)
                              delete args._to
                              
                              args['_from'] = root._id
                              let res2 = getList(edge.name, args)
                              
                              res = res1.concat(res2)
                            }
                            return res
                        }
                    }
                });

                return fields
            },
            args: collectionSearch,
            resolve(root, args) {
                let res = getObject(name, args)
                return res
            }
        });
    });
    edgeList.forEach((edge) => {
        let name = edge.edge.name

        edgeType[name] = new gql.GraphQLObjectType({
            name: getAlias(name),
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
                let res = getObject(name, args)
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
        name: getAlias(edge.edge.name + '_from'),
        fields: () => {
            let fields_coll = new Object()
            fields_coll['id'] = {
                type: gql.GraphQLString,
                resolve(root, args) {
                    return root._from
                }
            }
            edge.from_collections.forEach((coll) => {
                fields_coll[coll.name] = {
                    description: coll.alias,
                    type: collectionType[coll.name],
                    args: collectionSearch,
                    resolve(root, args) {
                        args['_id'] = root._from
                        let res = getObject(coll.name, args)
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
        name: getAlias(edge.edge.name + '_to'),
        fields: () => {
            let fields_coll = new Object()
            fields_coll['id'] = {
                type: gql.GraphQLString,
                resolve(root, args) {
                    return root._to
                }
            }
            edge.to_collections.forEach((coll) => {
                fields_coll[coll.name] = {
                    description: coll.alias,
                    type: collectionType[coll.name],
                    args: collectionSearch,
                    resolve(root, args) {
                        args['_id'] = root._to
                        let res = getObject(coll.name, args)
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
        name: 'query',
        description: 'Query GloboMap',
        fields: () => {
            let fields_coll = new Object()
            
            // All Collections
            Object.keys(collectionType).map((name) => {
                fields_coll[name] = {
                    type: collectionType[name],
                    args: collectionSearch,
                    resolve(root, args, context) {
                        validateToken(context)
                        let res = getObject(name, args)
                        return res
                    }
                }
            })
            // All Edges
            Object.keys(edgeType).map((name) => {
                let args = Object.assign({}, collectionSearch)
                fields_coll[name] = {
                    type: edgeType[name],
                    args: args,
                    resolve(root, args, context) {
                        validateToken(context)
                        let res = getObject(name, args)
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

