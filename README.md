# Globomap Graphql
The GraphQL for GloboMap

## Developing

### Prerequisites
- [ArangoDB](https://www.arangodb.com) Instance

### Setting up Dev
```
git clone https://github.com/globocom/foxx-globomap-graphql
cd foxx-globomap-graphql
npm install
```

## Publish in Arango
- ```npm install```
- Use [foxx-cli](https://github.com/arangodb/foxx-cli) to publish
- Installing:
    - To Install<br>
    ```foxx install -H $HOST -D $DATABASE -u $USER -P /graphql```<br>
    - To Upgrade<br>
    ```foxx upgrade -H $HOST -D $DATABASE -u $USER -P /graphql```<br>


## License
The Apache-2.0 license. For more information, see the accompanying LICENSE file.
