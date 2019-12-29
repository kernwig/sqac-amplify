import {AbstractStorableModel} from './abstract-storable-model';
import {Collection} from './collection';

export class StorageLocation {
    /**
     * Location expressed as a single string.
     * If public: <identityId>/<id>
     * If private: <id>+<revision>
     */
    readonly path: string;

    /** Model id */
    readonly id?: string;
    /** Model revision number */
    readonly revision?: number;

    /** S3 Object Key */
    readonly key: string;
    readonly level: 'private' | 'protected';
    /** User ID, if level is 'protected' */
    readonly identityId?: string;


    /**
     * Convert either an AbstractStorableModel or a path to a one into the S3 storage location.
     *
     * @param modelOrPath a data model to make a location out of, or a path to content
     * @param forcePrivate if true, force to use private location even if modelOrPath can be public
     */
    constructor(modelOrPath: AbstractStorableModel | string, forcePrivate = false) {
        if (typeof modelOrPath === 'string') {
            // Path is just the ID when private.
            // When public the path has the user ID '/' model ID, with no +rev.
            const path = modelOrPath as string;
            const slashIdx = path.indexOf('/');
            const plusIdx = path.indexOf('+', slashIdx);
            if (slashIdx > 0 && !forcePrivate) {
                this.path = path;
                this.id = path.substring(slashIdx + 1, plusIdx > slashIdx ? plusIdx : undefined);
                this.revision = plusIdx > slashIdx ? +path.substring(plusIdx + 1) : undefined;
                this.key = path.substring(slashIdx + 1);
                this.level = 'protected';
                this.identityId = path.substring(0, slashIdx);
            } else {
                this.path = path;
                this.id = plusIdx > 0 ? path.substring(0, plusIdx) : path;
                this.revision = plusIdx > 0 ? +path.substring(plusIdx + 1) : undefined;
                this.key = path;
                this.level = 'private';
            }
        } else if ((modelOrPath as Collection).authorUserId) {
            const collection = modelOrPath as Collection;
            const isPublic = collection.isPublic && !forcePrivate;
            this.level = isPublic ? 'protected' : 'private';
            this.id = collection.id;
            this.revision = collection.revision;
            this.key = isPublic ? collection.id : collection.id + '+' + collection.revision;
            this.identityId = collection.isPublic ? collection.authorUserId : undefined;
            this.path = collection.isPublic ? collection.authorUserId + '/' + this.key : this.key;
        } else {
            // Some other AbstractStorableModel - always private
            const model = modelOrPath as AbstractStorableModel;
            this.id = model.id;
            this.revision = model.revision;
            this.key = this.id + '+' + this.revision;
            this.level = 'private';
            this.path = this.key;
        }
    }

    /**
     * Create config options for Amplify StorageClass operations
     * @param doDownload set to true for get operation to download content
     */
    toStorageConfig(doDownload?: boolean): any {
        return {
            level: this.level,
            identityId: this.identityId,
            download: doDownload === true,
            contentType: "application/json",
        };
    }
}
