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
        this.user.collections.add(c.id);
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
    loadFrom(user: UserSettings): Promise<any> {
        this.clearAll();
        this.user = user;

        let loadAll = Promise.all(Array.from(user.collections)
            .map(collectionId => {
                return this.persistSvc.loadCollection(collectionId)
                    .then(c => this.loaded(c))
                    .catch(err => {
                        console.error(err);
                        this.toastr.warning(err.toString(), "Unable to Load");
                        return false;
                    });
            }));

        return loadAll
            .then((results: boolean[]) => {
                // Transform isLoaded:boolean results into a count of collections loaded & display toast.
                let count = results.map(b => b ? 1 : 0).reduce((count, isUpdated) => isUpdated + count, 0);
                if (count > 0)
                    this.toastr.success('Loaded ' + count, "Collections");

                this.resolveReferences();
            })
            .catch(err => {
                console.error(err);
                return this.toastr.error( err.toString(), 'Sync Failure', { timeOut: 10000});
            });
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
    sync(sendOnly?: boolean): Promise<any> {

        return Promise.all(Array.from(this.values())
            .map(c => {
                let isMine = c.authorUserId === this.user.id;

                if (isMine && (c.isDirty || !c.isCloudBacked)) {
                    console.log(`Collection ${c.id} has been locally changed. Save it.`);
                    return this.persistSvc.cloudSaveCollection(c).then(() => {
                        this.toastr.success("Saved", c.name);
                        return false;
                    });
                }
                else if (!sendOnly) {
                    console.log(`Check for updated content on server for collection ${c.id}`);
                    return this.persistSvc.loadCollection(c.id)
                        .then(c => {
                            let hasChanged = this.loaded(c);
                            if (hasChanged)
                                this.toastr.warning("Updated", c.name);
                            return hasChanged;
                        })
                }
            }))
            .then((results: boolean[]) => {
                // Did something change?
                if (results.find(b => b))
                    this.resolveReferences();
                else
                    this.toastr.info("No updates received");
            })
            .catch(err => {
                console.error(err);
                return this.toastr.error(err.toString(), 'Sync Failure', { timeOut: 10000});
            });
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
