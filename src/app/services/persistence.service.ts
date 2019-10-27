import {Injectable} from "@angular/core";
import {UserSettings, UserSettingsJSON} from "../models/user-settings";
import {Collection, CollectionJSON} from "../models/collection";
import {AbstractStorableModel, AbstractStorableModelJSON} from "../models/abstract-storable-model";
import * as localForage from "localforage";
import {SyncService} from "./sync.service";
import {AmplifyService} from 'aws-amplify-angular';
import {AuthClass, StorageClass} from 'aws-amplify';
import {ExpiringValue} from '@sailplane/expiring-value/dist/expiring-value';

const CLOUD_LIST_PERIOD = 10_000; // ten seconds

/// Exception thrown by failures in the [PersistenceService].
export class PersistenceException {

    constructor(readonly statusCode: number,
                readonly statusText: string,
                public readonly error?: Error) {
    }

    toString(): string {
        return `PersistenceException code #${this.statusCode}: ${this.statusText}`;
    }
}

/**
 * Persistence storage of data content.
 *
 * There are two levels of persistence:
 * 1. local - Changes are periodically saved to browser storage via LocalForage.
 * 2. cloud - Permanent storage to AWS S3 via Amplify.
 */
@Injectable()
export class PersistenceService {
    /** API to the cloud storage */
    private readonly cloud: StorageClass;

    /** Location to the latest revision of all of the user's files. Map key is model id. */
    private usersLatestFiles = new ExpiringValue<Map<string, StorageLocation>>(
        () => this.refreshLatestFiles(), CLOUD_LIST_PERIOD);

    constructor(private readonly syncSvc: SyncService,
                private readonly amplifySvc: AmplifyService,
    ) {
        this.cloud = this.amplifySvc.storage();

        localForage.config({
            name: 'SqAC',
            size: 20000000, // 20 MB
            storeName: 'SqAC',
            version: 2,
            description: 'Stores your login session and data for editing and offline use.'
        });
    }

    /**
     * Sign out the user. (Un-authenticate)
     */
    signOut() {
        this.syncSvc.reset();
        localForage.clear().then();
        return (this.amplifySvc.auth() as AuthClass).signOut();
    }

    /**
     * Does the cloud have a newer revision of a storable model?
     * @param model
     */
    async isNewerInCloud(model: AbstractStorableModel): Promise<boolean> {
        const latestCloud = (await this.usersLatestFiles.get()).get(model.id);
        return (latestCloud && latestCloud.revision > model.revision);
    }

    /**
     * Load UserSettings for the authenticated user.
     * @returns the UserSettings or reject with PersistenceException upon failure.
     */
    async loadUser(): Promise<UserSettings> {
        try {
            // First get local copy
            let json: UserSettingsJSON | null = (await localForage.getItem('settings')) as UserSettingsJSON;

            // Then ask the server for a newer one
            if (this.syncSvc.isOnline()) {
                // Load the user's latest settings
                const settingsLocation = (await this.usersLatestFiles.get()).get('settings');

                if (!settingsLocation) {
                    // New user!
                    throw new PersistenceException(404, "No such user");
                }
                if (settingsLocation && settingsLocation.revision > json.revision) {
                    const downloadedObj = await this.cloud.get(settingsLocation.key, settingsLocation.toStorageConfig(true));
                    try {
                        const downloadedStr = (downloadedObj as any).Body.toString('utf-8');
                        const downloadedJson = JSON.parse(downloadedStr) as UserSettingsJSON;
                        if (!json || downloadedJson.revision > json.revision) {
                            // Use and local save updated version
                            json = downloadedJson;
                            json.isCloudBacked = true;
                            localForage.setItem(settingsLocation.path, json).then();
                            console.log("Loaded settings", JSON.stringify(json));
                        } else {
                            console.debug("No change in user settings");
                        }
                    } catch (badCloudUpdate) {
                        console.error("Fetch of updated settings from cloud failure", badCloudUpdate);
                    }
                }
            }

            const user = UserSettings.fromJSON(json);
            user.isAvailable = true;
            this.syncSvc.reset();
            return user;
        }
        catch (error) {
            throw this.translateError(error);
        }
    }

    /**
     * Save/update UserSettings to the cloud for the authenticated user.
     *
     * @returns {Promise<UserSettings>} the modified model.
     * @throws {PersistenceException} upon unhandled failure.
     */
    cloudSaveUser(userSettings: UserSettings): Promise<UserSettings> {
        return this.saveModelToCloud(userSettings, new StorageLocation('settings'));
    }

    /**
     * Save UserSettings to local storage for the authenticated user.
     *
     * @returns {Promise<UserSettings>} the modified model.
     */
    localStoreUser(userSettings: UserSettings): Promise<UserSettings> {
        return this.saveModelToLocal(userSettings, new StorageLocation('settings'));
    }

    /**
     * Load all Collections belonging to the user
     */
    async loadUserCollectionsFromCloud(): Promise<Collection[]> {
        const allPrivateCollections = Array.from(
            (await this.usersLatestFiles.get()).values()
        ).filter(location => location.id !== 'settings');

        return Promise.all(allPrivateCollections.map(location => this.cloudLoadCollection(location)));
    }

    /**
     * Load a Collection; locally or update from cloud.
     * @returns the Collection or reject with PersistenceException upon failure
     */
    async loadCollection(collectionModelOrPath: string | Collection): Promise<Collection> {
        try {
            // First get local copy
            const location = new StorageLocation(collectionModelOrPath);
            let model = Collection.fromJSON((await localForage.getItem(location.id)) as CollectionJSON);

            // Then check the server for a newer one
            if (this.syncSvc.isOnline() && (!model || (await this.isNewerInCloud(model)))) {
                model = await this.cloudLoadCollection(location);
            }

            if (!model) {
                throw new PersistenceException(0, "Unable to load collection " + location.id);
            }
            return model;
        }
        catch (error) {
            throw this.translateError(error);
        }
    }

    /**
     * Helper function to actually load a collection from the cloud
     * @param location
     */
    private async cloudLoadCollection(location: StorageLocation): Promise<Collection> {
        console.debug("cloudLoadCollection", location);
        const downloadedObj = await this.cloud.get(location.key, location.toStorageConfig(true));
        try {
            const downloadedStr = (downloadedObj as any).Body.toString('utf-8');

            // Use and local save updated version
            const json = JSON.parse(downloadedStr) as CollectionJSON;
            json.isCloudBacked = true;
            localForage.setItem(location.id, json).then();
            return Collection.fromJSON(json);
        }
        catch (badCloudUpdate) {
            console.error("Fetch of updated collection from cloud failure", badCloudUpdate);
        }
    }

    /// Load a [Collection] at a specified [path].
    /// Returns the [Collection] or reject if not found.
    /// Throws [PersistenceException] upon unhandled failure.
    async cloudReloadCollection(collectionPath: string): Promise<Collection> {
        await localForage.removeItem(new StorageLocation(collectionPath).id);
        return this.loadCollection(collectionPath);
    }

    /**
     * Save/update a Collection to the cloud.
     *
     * @returns {Promise<Collection>} the modified model.
     * @throws {PersistenceException} upon unhandled failure.
     */
    cloudSaveCollection(collection: Collection): Promise<Collection> {
        return this.saveModelToCloud(collection, new StorageLocation(collection));
    }

    /**
     * Save/update a Collection to local storage..
     *
     * @returns {Promise<Collection>} the modified model.
     */
    localStoreCollection(collection: Collection): Promise<Collection> {
        return this.saveModelToLocal(collection, new StorageLocation(collection));
    }

    /**
     * Search the server for public collections matching the search criteria.
     */
    async findCollections(criteria: object): Promise<CollectionJSON[]> {
        // TODO:
        throw new PersistenceException(501, 'Not implemented');
        // try {
        //     let json = await this.server.service(DATA_API_PATH).find({query: criteria});
        //
        //     // Return value isn't exactly a CollectionJSON.
        //     // All the arrays are only numbers of how many items are in the array on the server.
        //     return json as CollectionJSON[];
        // }
        // catch (err) {
        //     return this.translateError(err);
        // }
    }

    /**
     * Load recent revisions to the given collection.
     */
    async loadHistory(collection: Collection): Promise<Collection[]> {

        // Get all private files that start with the collection's id (thus all of it's revisions)
        const list = await this.cloudList(new StorageLocation(collection.id));

        const results: Collection[] = [];
        for (const location of list) {
            const downloadedObj = await this.cloud.get(location.key, location.toStorageConfig(true));
            try {
                const downloadedStr = (downloadedObj as any).Body.toString('utf-8');
                const downloadedJson = JSON.parse(downloadedStr) as CollectionJSON;
                results.push(Collection.fromJSON(downloadedJson));
            }
            catch (badCloudUpdate) {
                console.error("Fetch of collection from cloud failure", badCloudUpdate);
            }
        }

        return results.sort((a, b) => a.revision - b.revision);
    }

    private async cloudList(location: StorageLocation): Promise<StorageLocation[]> {
        const isPrivate = location.level === 'private';
        try {
            const results: StorageLocation[] = [];

            if (this.syncSvc.isOnline()) {
                const contents = await this.cloud.list(location.key, location.toStorageConfig());
                console.log("cloudList data", contents);
                for (const item of contents) {
                    const path = isPrivate
                        ? item.key
                        : item.owner.id + '/' + item.key;
                    results.push(new StorageLocation(path));
                }
            }

            console.debug("Files at", location.path, ':', results);
            return results;
        }
        catch (error) {
            throw this.translateError(error);
        }
    }

    /**
     * Save/update an {AbstractStorableModel} to local storage.
     * @returns the modified model.
     */
    private async saveModelToLocal<T extends AbstractStorableModel>(model: T, location: StorageLocation): Promise<T> {

        if (model.isDirty) {
            model.modified = new Date();
            model.isCloudBacked = false;
            model.isDirty = false;

            let json = model.toJSON() as AbstractStorableModelJSON;
            localForage.setItem(location.id, json).then();
            console.log("Local stored " + location.path);
            this.usersLatestFiles.clear();
        }

        return model;
    }

    /**
     * Save an {AbstractStorableModel}.
     *
     * @returns the modified model, or rejects with {PersistenceException}
     */
    private async saveModelToCloud<T extends AbstractStorableModel>(model: T, location: StorageLocation): Promise<T> {

        if (model.isDirty) {
            model = await this.saveModelToLocal(model, location);
        }

        if (model.isCloudBacked) {
            // Already saved.
            return model;
        }

        // Save to cloud
        model.revision = model.revision ? model.revision + 1 : 1;
        model.isCloudBacked = true;
        let json = model.toJSON() as AbstractStorableModelJSON;

        try {
            await this.cloud.put(
                location.key,
                JSON.stringify(json),
                location.toStorageConfig()
            );

            // Update local copy
            localForage.setItem(location.id, json).then();
            this.usersLatestFiles.clear();
            return model;
        }
        catch(error) {
            // Unset changed values in model
            model.revision--;
            model.isCloudBacked = false;

            // Return Error
            throw this.translateError(error);
        }
    }

    /**
     * Get a the StorageLocation for the latest revision of all
     * of the current user's files in the cloud.
     *
     * Do not use directly - this is a helper for #usersLatestFiles
     * and is automatically called when stale.
     */
    private async refreshLatestFiles(): Promise<Map<string, StorageLocation>> {
        const files = new Map<string, StorageLocation>();

        if (this.syncSvc.isOnline()) {
            const list = await this.cloudList(new StorageLocation(""));

            for (const item of list) {
                const existing = files.get(item.id);
                if (!existing || existing.revision < item.revision) {
                    files.set(item.id, item);
                }
            }

        }

        console.debug("refreshLatestFiles", Array.from(files.values()));
        return files;
    }

    /**
     * Translate a Response failure to a PersistenceException.
     */
    private translateError(error: any): PersistenceException {
        let errMsg;
        let status = error.statusCode || error.status || error.code || 0;

        if (error.name) {
            errMsg = error.name + ': ' + error.message;
        }
        else {
            errMsg = error.message ? error.message : error.toString();
        }

        const ex = new PersistenceException(status, errMsg, error);
        console.error(ex.toString(), error);
        return ex;
    }
}

class StorageLocation {
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
