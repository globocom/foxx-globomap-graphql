/*
    Based on https://github.com/taion/graphql-type-json
*/
'use strict';

const gql = require('graphql-sync');
const gql2 = require('graphql/language');

function identity(value) {
    return value;
}

function parseLiteral(ast, variables) {
    switch (ast.kind) {
        case gql2.Kind.STRING:
        case gql2.Kind.BOOLEAN:
            return ast.value;
        case gql2.Kind.INT:
        case gql2.Kind.FLOAT:
            return parseFloat(ast.value);
        case gql2.Kind.OBJECT: {
            const value = Object.create(null);
            ast.fields.forEach(field => {
                value[field.name.value] = parseLiteral(field.value, variables);
            });

            return value;
        }
        case gql2.Kind.LIST:
            return ast.values.map(n => parseLiteral(n, variables));
        case gql2.Kind.NULL:
            return null;
        case gql2.Kind.VARIABLE: {
            const name = ast.name.value;
            return variables ? variables[name] : undefined;
        }
        default:
            return undefined;
    }
}


var exports = module.exports = {};

module.exports = new gql.GraphQLScalarType({
    name: 'JSON',
    description:
        'The `JSON` scalar type represents JSON values as specified by ' +
        '[ECMA-404](http://www.ecma-international.org/' +
        'publications/files/ECMA-ST/ECMA-404.pdf).',
    serialize: identity,
    parseValue: identity,
    parseLiteral,
});