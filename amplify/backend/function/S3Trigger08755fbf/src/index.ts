import {S3Event, S3EventRecord, S3Handler} from 'aws-lambda';
import {deleteFile, loadFile, saveFile} from './storage';
import {
    CollectionJSON,
    disectCollectionkey,
    getPrivateCollectionKey,
    isCollection,
    isPrivateFile,
    privateToPublicCollectionKey,
    validateAndCount
} from './collection';
import {removeFromDatabase, writeToDatabase} from './database';

// noinspection JSUnusedGlobalSymbols
/**
 * Lambda handler
 */
export const handler: S3Handler = async (event: S3Event) => {
    // console.log('Received S3 event:', JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        try {
            await processOneRecord(record);
        }
        catch (error) {
            console.error(error);
        }
    }
};

async function processOneRecord(record: S3EventRecord) {
    const eventName = record.eventName;
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);
    const size = record.s3.object.size;
    const isPrivate = isPrivateFile(key);
    const isPublic = !isPrivate;
    console.log(`Event: ${eventName}, Bucket: ${bucket}, Key: ${key}, Size: ${size}`);

    // If size > 2 MB, reject as hacking attempt.
    if (size > 2e+6) {
        console.warn("File size > 2 MB: Deleting it");
        await deleteFile(bucket, key);
    }
    else if (!isCollection(key)) {
        console.log("Ignoring settings file");
    }
    else if (eventName.startsWith('ObjectCreated:') && isPrivate) {
        await processNewPrivateFile(bucket, key);
    }
    else if (eventName.startsWith('ObjectCreated:') && isPublic) {
        await processNewPublicFile(bucket, key);
    }
    else if (eventName.startsWith('ObjectRemoved:') && isPublic) {
        await processRemovedPublicFile(bucket, key);
    }
}

async function processNewPrivateFile(bucket: string, key: string): Promise<void> {
    const collection = await loadFile(bucket, key) as CollectionJSON;

    /*
     * Manage public copy
     */
    const publicKey = privateToPublicCollectionKey(key);
    if (collection.isPublic) {
        // Copy to public location
        await saveFile(bucket, publicKey, JSON.stringify(collection));
        // This will trigger an ObjectCreated event
    }
    else {
        // Maybe used to be public - try deleting public version
        await deleteFile(bucket, publicKey).catch(() => undefined);
        // If file was actually removed, this will trigger an ObjectRemoved event
    }

    /*
     * Purge old revision
     */
    const oldCollection = {...collection, revision: collection.revision - 9};
    if (oldCollection.revision >= 0) {
        const oldKey = getPrivateCollectionKey(oldCollection);
        try {
            console.log("Purged old revision");
            await deleteFile(bucket, oldKey);
        }
        catch (notFound) {}
    }
}

async function processNewPublicFile(bucket: string, key: string): Promise<void> {
    const collection = await loadFile(bucket, key) as CollectionJSON;
    if (validateAndCount(collection) == null) {
        console.error("Collection", collection.id, "does not appear valid");
    }
    else {
        await writeToDatabase(collection);
    }
}

async function processRemovedPublicFile(bucket: string, key: string): Promise<void> {
    const collection = disectCollectionkey(key);
    await removeFromDatabase({id: collection.id!});
}
