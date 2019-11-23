import * as AWS from 'aws-sdk';

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

/**
 * Load a file from S3
 */
export async function loadFile(bucket: string, key: string): Promise<any> {
    console.log("Loading collection", key, "from S3");

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
 * Delete a file from S3.
 */
export async function deleteFile(bucket: string, key: string) {
    console.log("Deleting collection", key, "from S3");

    const params: any = {
        Bucket: bucket,
        Key: key
    };

    return new Promise<any>((res, rej) => {
        s3.deleteObject(params, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res(data);
            }
        });
    });
}
