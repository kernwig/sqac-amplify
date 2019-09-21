import {Injectable} from "@angular/core";
import {UserSettings, UserSettingsJSON} from "../models/user-settings";
import {Collection, CollectionJSON} from "../models/collection";
import {AbstractStorableModel, AbstractStorableModelJSON} from "../models/abstract-storable-model";
import * as localForage from "localforage";
import {SyncService} from "./sync.service";
import {AmplifyService} from 'aws-amplify-angular';
import {AuthClass, StorageClass} from 'aws-amplify';

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
     * Load [UserSettings] for the authenticated user.
     * Throws [PersistenceException] upon unhandled failure.
     */
    async loadUser(): Promise<UserSettings> {
        try {
            // Don't care about userId - always load 'settings', which the server translates to current user.
            const settingsKey = 'settings';

            // First get local copy
            let json: UserSettingsJSON | null = (await localForage.getItem(settingsKey)) as UserSettingsJSON;

            // Then ask the server for a newer one
            if (this.syncSvc.isOnline()) {
                const downloadedObj = await this.cloud.get(settingsKey, {level: 'private', download: true});
                try {
                    const downloadedStr = (downloadedObj as any).Body.toString('utf-8');
                    const downloadedJson = JSON.parse(downloadedStr) as UserSettingsJSON;
                    /// let response = await this.getJSON<UserSettingsJSON>(settingsUrl as string).toPromise();
                    if (!json || downloadedJson.revision > json.revision) {
                        // Use and local save updated version
                        json = downloadedJson;
                        json.isCloudBacked = true;
                        localForage.setItem(settingsKey, json).then();
                        console.log("Loaded settings", JSON.stringify(json));
                    } else {
                        console.debug("No change in user settings");
                    }
                }
                catch (badCloudUpdate) {
                    console.error("Fetch of updated settings from cloud failure", badCloudUpdate);
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
        return this.saveModelToCloud(userSettings, 'settings', 'private');
    }

    /**
     * Save UserSettings to local storage for the authenticated user.
     *
     * @returns {Promise<UserSettings>} the modified model.
     */
    localStoreUser(userSettings: UserSettings): Promise<UserSettings> {
        return this.saveModelToLocal(userSettings, 'settings');
    }

    /// Load a [Collection] at a specified [path].
    /// Returns the [Collection] or reject if not found.
    /// Throws [PersistenceException] upon unhandled failure.
    async loadCollection(collectionId: string): Promise<Collection> {
        // First get local copy
        let json: CollectionJSON = (await localForage.getItem(collectionId)) as CollectionJSON;

        // TODO: Then ask the server for a newer one
        if (this.syncSvc.isOnline()) {
            // let params: feathers.Params = json ? {query: {ifModifiedSince: json.modified}} : {};
            // try {
            //     let response = await this.server.service(DATA_API_PATH).get(collectionId, params);
            //     // response will be blank (empty string?) if server copy is not newer vis-a-vi isModifiedSince
            //     if (response) {
            //         // Use and local save updated version
            //         json = response as CollectionJSON;
            //         json.isCloudBacked = true;
            //         localForage.setItem(collectionId, json);
            //     }
            //     else {
            //         console.debug("No change in collection " + collectionId);
            //     }
            // }
            // catch (err) {
            //     return this.translateError(err);
            // }
        }

        return Collection.fromJSON(json);
    }

    /// Load a [Collection] at a specified [path].
    /// Returns the [Collection] or reject if not found.
    /// Throws [PersistenceException] upon unhandled failure.
    async cloudReloadCollection(collectionId: string): Promise<Collection> {
        // TODO:
        throw new PersistenceException(501, 'Not implemented');
        // try {
        //     let response = await this.server.service(DATA_API_PATH).get(collectionId);
        //     let json = response as CollectionJSON;
        //     json.isCloudBacked = true;
        //     localForage.setItem(collectionId, json);
        //     return Collection.fromJSON(json);
        // }
        // catch (err) {
        //     return this.translateError(err);
        // }
    }

    /**
     * Save/update a Collection to the cloud.
     *
     * @returns {Promise<Collection>} the modified model.
     * @throws {PersistenceException} upon unhandled failure.
     */
    cloudSaveCollection(collection: Collection): Promise<Collection> {
        return this.saveModelToCloud(collection, collection.id, collection.isPublic ? 'protected' : 'private');
    }

    /**
     * Save/update a Collection to local storage..
     *
     * @returns {Promise<Collection>} the modified model.
     */
    localStoreCollection(collection: Collection): Promise<Collection> {
        return this.saveModelToLocal(collection, collection.id);
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
        // TODO:
        throw new PersistenceException(501, 'Not implemented');
        // try {
        //     const criteria = {id: collection.id};
        //     let json = await this.server.service(DATA_API_PATH).find({query: criteria});
        //     return (json as CollectionJSON[]).map(c => Collection.fromJSON(c));
        // }
        // catch (err) {
        //     return this.translateError(err);
        // }
    }

    /**
     * Save/update an {AbstractStorableModel} to local storage.
     * @param {AbstractStorableModel} model
     * @param {string} id
     * @returns {Promise<AbstractStorableModel>} the modified model.
     */
    private async saveModelToLocal<T extends AbstractStorableModel>(model: T, id: string): Promise<T> {

        if (model.isDirty) {
            model.modified = new Date();
            model.isCloudBacked = false;
            model.isDirty = false;

            let json = model.toJSON() as AbstractStorableModelJSON;
            localForage.setItem(id, json).then();
            console.log("Local stored " + id);
        }

        return model;
    }

    /**
     * Save an {AbstractStorableModel}.
     *
     * @param model
     * @param id
     * @param level store as private or protected?
     * @returns the modified model, or rejects with {PersistenceException}
     */
    private async saveModelToCloud<T extends AbstractStorableModel>(model: T, id: string, level: 'private'|'protected'): Promise<T> {

        if (model.isDirty) {
            model = await this.saveModelToLocal(model, id);
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
                id, JSON.stringify(json),
                {level, contentType: "application/json"}
            );

            // Update local copy
            localForage.setItem(id, json).then();
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
