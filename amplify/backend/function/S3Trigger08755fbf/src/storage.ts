import * as AWS from 'aws-sdk';

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

/**
 * Load a file from S3
 */
export async function loadFile(bucket: string, key: string): Promise<any> {
    console.log("Loading from S3", key);

    const params: any = {
        Bucket: bucket,
        Key: key
    };

    return new Promise<any>((res, rej) => {
        s3.getObject(params, (err, data) => {
            if (err) {
                rej(err);
            }
            else if (data && data.Body) {
                const body = (data.Body as Buffer).toString('utf-8');
                try {
                    res(JSON.parse(body));
                }
                catch (badParse) {
                    console.error("Unable to parse", key);
                    rej("Unable to parse");
                }
            }
        });
    });
}

/**
 * Save a file to S3
 */
export async function saveFile(bucket: string, key: string, content: string): Promise<any> {
    console.log("Saving to S3", key);

    const params: any = {
        Bucket: bucket,
        Key: key,
        Body: content,
        ContentType: "application/json",
    };

    await s3.upload(params).promise();
}

/**
 * Delete a file from S3, if it exist.
 * (Check before deleting, because S3 will trigger an ObjectRemoved event even if the file wasn't there!)
 */
export async function deleteFile(bucket: string, key: string) {
    const params: any = {
        Bucket: bucket,
        Key: key
    };

    console.log("Checking S3 for", key);
    try {
        const meta = await s3.headObject(params).promise();
        if (!meta.DeleteMarker) {
            console.log("Deleting from S3", key);
            await s3.deleteObject(params).promise();
        }
    }
    catch (notFound) {
    }
}
