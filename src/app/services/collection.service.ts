import {Injectable} from "@angular/core";
import {Subject} from "rxjs";
import {UserSettings} from "../models/user-settings";
import {CallService} from "./call.service";
import {FamilyService} from "./family.service";
import {FormationService} from "./formation.service";
import {PersistenceService} from "./persistence.service";
import {Collection} from "../models/collection";
import {ModuleService} from "./module.service";
import {CachingModelService} from "./caching-model.service";
import {SyncService} from "./sync.service";
import {ToastrService} from "ngx-toastr";

@Injectable()
export class CollectionService extends CachingModelService<Collection> {

    /** ID of the user collections are loaded for */
    user: UserSettings = null;

    /** Emit whenever the loaded collections changes */
    changed$ = new Subject<void>();

    constructor(
        private callSvc: CallService,
        private familySvc: FamilyService,
        private formationSvc: FormationService,
        private moduleSvc: ModuleService,
        private persistSvc: PersistenceService,
        private syncSvc: SyncService,
        private toastr: ToastrService
    ) {
        super();
    }

    /**
     * Create a new [Collection] owned by the current user.
     */
    createNew(): Collection {
        let c = Collection.forUser(this.user);
        this.syncSvc.setDirty(this.user);
        this.add(c);
        this.changed$.next();
        return c;
    }

    /**
     * Clear all collections, which results in clearing all Calls, Families, Formations, and Modules as well.
     * @override
     */
    clearAll() {
        super.clearAll();
        this.callSvc.clearAll();
        this.familySvc.clearAll();
        this.formationSvc.clearAll();
        this.moduleSvc.clearAll();
        this.user = null;
        this.changed$.next();
    }

    /**
     * Load all collections for a user into memory.
     * @param user
     * @returns {Promise<Null>}
     */
    async loadFrom(user: UserSettings): Promise<any> {
        this.clearAll();
        this.user = user;

        try {
            // Load own collections
            (await this.persistSvc.loadUserCollectionsFromCloud())
                .map(collection => this.loaded(collection));

            // Load subscriptions
            for (const collectionPath of Array.from(user.collections)) {
                const c = await this.persistSvc.loadCollection(collectionPath);
                this.loaded(c);
            }
        }
        catch(err) {
            console.error(err);
            this.toastr.error( err.toString(), 'Sync Failure', { timeOut: 10000});
        }

        if (this.size > 0)
            this.toastr.success('Loaded ' + this.size, "Collections");

        this.resolveReferences();
    }

    /**
     * A Collection has just been loaded. Process it.
     * @return true if a changes has been made.
     */
    private loaded(c: Collection): boolean {
        // Did the value change?
        let old = this.get(c.id);
        if (old && c.modified.getTime() === old.modified.getTime()) {
            return false;
        }
        else {
            this.add(c);
            return true;
        }
    }

    /**
     * After (all) collections are loaded, look for unresolved references and resolve them.
     * Resolve everything... a collection may have been reloaded and then references would be pointing to old objects!
     */
    public resolveReferences(): void {

        this.callSvc.clearAll();
        this.familySvc.clearAll();
        this.formationSvc.clearAll();
        this.moduleSvc.clearAll();

        super.forEach(c => {
            c.formations.forEach(f => this.formationSvc.add(f));
            c.families.forEach(f => this.familySvc.add(f));
            c.calls.forEach(c => this.callSvc.add(c));
            c.modules.forEach(m => {
                m.collection = c;
                this.moduleSvc.add(m);
            });
        });

        this.formationSvc.resolveReferences();
        this.familySvc.resolveReferences();
        this.callSvc.resolveReferences();
        this.moduleSvc.resolveReferences();

        this.forEach(c => {
            c.isAvailable =
                c.calls.find((call) => !call.isAvailable) == undefined &&
                c.modules.find((m) => !m.isAvailable) == undefined;
        });

        this.changed$.next();
    }

    /**
     * Store any changes to collections in memory to local storage.
     *
     * @returns {Promise<any>} resolves upon completion
     */
    localSave(collection?: Collection): Promise<any> {
        if (collection) {
            // One collection is specified, so only check it.
            if (collection.isDirty) {
                return this.persistSvc.localStoreCollection(collection);
            }
            else {
                return Promise.resolve();
            }
        }
        else {
            // No collection specified, so check them all.
            let queue = [];
            this.forEach(c => {
                if (c.isDirty) {
                    queue.push(this.persistSvc.localStoreCollection(c));
                }
            });

            return Promise.all(queue);
        }
    }

    /**
     * Synchronize local and server Collections.
     *
     * @param sendOnly
     * @returns {Promise<any>}
     * @throws PersistenceException upon unhandled failure.
     */
    async sync(sendOnly?: boolean): Promise<any> {
        let needToResolve = false;

        try {
            for (const collection of Array.from(this.values())) {
                let isMine = collection.authorUserId === this.user.id;

                if (isMine && (collection.isDirty || !collection.isCloudBacked)) {
                    console.log(`Collection ${collection.id} has been locally changed. Save it.`);
                    await this.persistSvc.cloudSaveCollection(collection);
                    this.toastr.success("Saved", collection.name);
                }
                else if (!sendOnly && (await this.persistSvc.isNewerInCloud(collection))) {
                    console.log(`Load updated content from server for collection ${collection.id}`);
                    const c = await this.persistSvc.loadCollection(collection);
                    const hasChanged = this.loaded(c);
                    if (hasChanged) {
                        needToResolve = true;
                        this.toastr.warning("Updated", c.name);
                    }
                }
            }

            // Did something change?
            if (needToResolve) {
                this.resolveReferences();
            }
            else {
                this.toastr.info("No updates received");
            }
        }
        catch (err) {
            console.error(err);
            return this.toastr.error(err.toString(), 'Sync Failure', { timeOut: 10000});
        }
    }

    /**
     * Load previous versions of a collection from the cloud.
     * @param {Collection} collection
     * @returns {Promise<Collection[]>}
     */
    loadHistory(collection: Collection): Promise<Collection[]> {
        return this.persistSvc.loadHistory(collection);
    }

    /**
     * Restore a collection from the cloud - trashing local changes.
     * @param {string} collectionId
     * @returns {Promise<Collection>}
     */
    restoreFromCloud(collectionId: string): Promise<Collection> {
        return this.persistSvc.cloudReloadCollection(collectionId)
            .then(c => {
                this.add(c);
                this.resolveReferences();
                return c;
            });
    }

    /**
     * Return Ionic Icon name based on the collection's visibility/editability.
     * @param c Collection
     * @returns {string}
     */
    getVisibilityIcon(c: Collection): string {
        if (!c)
            return "glyphicon glyphicon-warning-sign"; // not loaded
        else if (c.authorUserId !== this.user.id)
            return "glyphicon glyphicon-globe"; //somebody else's
        else if (c.isPublic)
            return "glyphicon glyphicon-gift"; //my public collection
        else
            return "glyphicon glyphicon-lock"; //my private collection
    }
}
