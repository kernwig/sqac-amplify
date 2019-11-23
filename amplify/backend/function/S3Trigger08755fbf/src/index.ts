import {S3Event, S3Handler} from 'aws-lambda';
import {deleteFile, loadFile} from './storage';
import {CollectionJSON, isCollection, validateAndCount} from './collection';
import {removeFromDatabase, writeToDatabase} from './database';

// noinspection JSUnusedGlobalSymbols
/**
 * Lambda handler
 */
export const handler: S3Handler = async (event: S3Event) => {
    console.log('Received S3 event:', JSON.stringify(event, null, 2));
    // Get the object from the event and show its content type

    for (const record of event.Records) {
        const eventName = record.eventName;
        const bucket = record.s3.bucket.name;
        const {key, size} = record.s3.object;
        console.log(`Event: ${eventName}, Bucket: ${bucket}, Key: ${key}, Size: ${size}`);

        // If size > 2 MB, reject as hacking attempt.
        if (size > 2e+6) {
            console.warn("File size > 2 MB: Deleting it");
            await deleteFile(bucket, key);
        }
        else if (!isCollection(key)) {
            console.log("Ignoring settings file");
        }
        else if (eventName.startsWith('ObjectCreated:')) {
            await processCreatedFile(await loadFile(bucket, key));
        }
        else if (eventName.startsWith('ObjectRemoved:')) {
            await processRemovedFile(await loadFile(bucket, key));
        }
    }
};

async function processCreatedFile(collection: CollectionJSON): Promise<void> {
    if (collection.isPublic) {
        if (validateAndCount(collection) == null) {
            console.error("Collection", collection.id, "does not appear valid");
        }
        else {
            await writeToDatabase(collection);
        }
    }
    else {
        await removeFromDatabase(collection);
    }
}

async function processRemovedFile(collection: CollectionJSON): Promise<void> {
    if (collection.isPublic) {
        await removeFromDatabase(collection);
    }
}
