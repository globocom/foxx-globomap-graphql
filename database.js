'use strict';

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

function getObject(collection, args) {
    let filters = Object.keys(args).map((key) => {
        return `c.${key} == '${args[key]}'`
    }).join(' AND ')
    let where = ''
    if (filters.length > 0)
        where = ` FILTER ${filters}`
    let query = `FOR c in ${collection} ${where} RETURN c`
    let queryCollection = db._query(query).toArray()
    if (queryCollection.length > 1){
        throw "Must be more specific. Many results was returned"
    } 
    else {        
        if (queryCollection.length == 0){
            return null
        }
        else{
            return queryCollection[0]        
        }
    }
}

function getList(collection, args) {
    let filters = Object.keys(args).map((key) => {
        return `c.${key} == '${args[key]}'`
    }).join(' AND ')
    let where = ''
    if (filters.length > 0)
        where = ` FILTER ${filters}`
    let query = `FOR c in ${collection} ${where} RETURN c`
    let queryCollection = db._query(query).toArray()
    return queryCollection
}



module.exports = {
    edgeList: edgeList,
    collectionList: collectionList,
    getObject: getObject,
    getList: getList
}

