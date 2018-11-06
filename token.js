'use strict';
const request = require("@arangodb/request");

function validateToken(context) {
    let token = context.headers.token
    const response = request.get(
        context.authUrl,
        { headers: { 'Authorization': 'Token token=' + token } }
    );
    if (response.status == 401) {
        throw new Error('Unauthorized.');
    }
    else {
        if (response.status != 200) {
            throw new Error('Authentication failed.');
        }
        else {
            let roles = ['globomap_read']
            let res = JSON.parse(response.body)
            if (res.roles.filter((role) => (roles.indexOf(role.name) != -1)).length != roles.length) {
                throw new Error('Forbidden.');
            }
        }
    }
}

module.exports = {
    validateToken: validateToken
}