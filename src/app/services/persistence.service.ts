import {Injectable} from "@angular/core";
import {UserSettings, UserSettingsJSON} from "../models/user-settings";
import {Collection, CollectionJSON} from "../models/collection";
import {AbstractStorableModel, AbstractStorableModelJSON} from "../models/abstract-storable-model";
import * as localForage from "localforage";
import {SyncService} from "./sync.service";
import {AmplifyService} from 'aws-amplify-angular';
import {AuthClass, StorageClass} from 'aws-amplify';
import {ExpiringValue} from '@sailplane/expiring-value/dist/expiring-value';
import {StorageLocation} from '../models/storage-location';

const CLOUD_LIST_PERIOD = 10_000; // ten seconds

/** Exception thrown by failures in the PersistenceService */
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

    private isLocalUser = false;

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
        if (this.isLocalUser) {
            return false;
        }
        else {
            const latestCloud = (await this.usersLatestFiles.get()).get(model.id);
            return (latestCloud && latestCloud.revision > model.revision);
        }
    }

    /**
     * Load UserSettings for the authenticated user.
     * @returns the UserSettings or reject with PersistenceException upon failure.
     */
    async loadUser(isLocalAccount = false): Promise<UserSettings> {
        this.isLocalUser = isLocalAccount;

        try {
            // First get local copy
            let json: UserSettingsJSON | null = (await localForage.getItem('settings')) as UserSettingsJSON;

            if (isLocalAccount) {
                if (!json) {
                    // New user!
                    throw new PersistenceException(404, "No such user");
                }
            }
            // Then ask the server for a newer one
            else if (this.syncSvc.isOnline()) {
                // Load the user's latest settings
                const settingsLocation = (await this.usersLatestFiles.get()).get('settings');

                if (!settingsLocation) {
                    // New user!
                    throw new PersistenceException(404, "No such user");
                }
                if (settingsLocation && (!json || settingsLocation.revision > json.revision)) {
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

            if (!json) {
                throw new PersistenceException(0, "Offline");
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

    /**
     * Load a Collection at a specified path.
     * Returns the Collection or reject if not found.
     * @throws PersistenceException upon unhandled failure.
     */
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
        return this.saveModelToCloud(collection, new StorageLocation(collection, true));
    }

    /**
     * Save/update a Collection to local storage..
     *
     * @returns {Promise<Collection>} the modified model.
     */
    localStoreCollection(collection: Collection): Promise<Collection> {
        return this.saveModelToLocal(collection, new StorageLocation(collection, true));
    }

    /**
     * Load recent revisions to the given collection.
     */
    async loadHistory(collection: Collection): Promise<Collection[]> {

        // Get all private files that start with the collection's id (thus all of it's revisions)
        const list = await this.cloudList(new StorageLocation(collection.id, true));

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
                    results.push(new StorageLocation(path, isPrivate));
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

            const json = model.toJSON() as AbstractStorableModelJSON;
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
        const json = model.toJSON() as AbstractStorableModelJSON;

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
        catch (error) {
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

        if (!this.isLocalUser && this.syncSvc.isOnline()) {
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
        const status = error.statusCode || error.status || error.code || 0;

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
