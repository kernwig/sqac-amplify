import * as AWS from 'aws-sdk';
import {CollectionJSON} from './collection';

const amplifyMeta = require('./amplify-meta');
const ddbTableName = 'Collection-' + amplifyMeta.api.sqacamplify.output.GraphQLAPIIdOutput + '-' + process.env.ENV;
const dynamo = new AWS.DynamoDB.DocumentClient();

export function writeToDatabase(collection: CollectionJSON): Promise<void> {
    console.log("Writing collection", collection.id, "to database");
    return dynamo.put({
        TableName: ddbTableName,
        Item: collection
    }).promise().then(() => undefined);
}

export function removeFromDatabase(collection: {id: string}): Promise<void> {
    console.log("Removing collection", collection.id, "from database");
    return dynamo.delete({
        TableName: ddbTableName,
        Key: {id: collection.id}
    }).promise().then(() => undefined);
}
