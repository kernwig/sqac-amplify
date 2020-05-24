import {Component, OnInit, ViewChild} from '@angular/core';
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {Collection} from "../models/collection";
import * as Licenses from "../models/licenses";
import {UserService} from "../services/user.service";
import {CollectionService} from "../services/collection.service";
import {ActivatedRoute, Params, Router} from "@angular/router";
import {UserSettings} from "../models/user-settings";
import {ModalDirective} from "ngx-bootstrap/modal";
import {CollectionFilter} from "./widget/collection-filter.component";
import {CollectionFilterPipe} from "./pipe/collection-filter.pipe";
import {SyncService} from "../services/sync.service";
import {ToastrService} from "ngx-toastr";
import {combineLatest} from "rxjs";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-collections-list',
    templateUrl: './list-collections.component.html',
    styleUrls: ['./collections-list.component.scss']
})
export class ListCollectionsComponent extends AbstractBaseComponent implements OnInit {

    readonly predefinedLicenses = Licenses.All;

    @ViewChild("editModal", { static: true }) editModal: ModalDirective;

    collections: Collection[] = [];
    filteredCollections: Collection[] = [];
    appliedFilter: CollectionFilter;

    /** If set, only showing this one collection */
    showOnly: Collection|undefined;

    settings: UserSettings;

    /** Active/Referenced collection for the active modal */
    activeCollection: Collection;

    /** Set when showing history (restore points) of a specific collection */
    history: Collection[];

    // Index position in filteredCollections to put section headers
    troubleSectionIdx = -1;
    localModSectionIdx = -1;
    cloudSyncSectionIdx = -1;

    private filterPipe = new CollectionFilterPipe();

    constructor(public collectionSvc: CollectionService,
                public userSvc: UserService,
                private syncSvc: SyncService,
                private route: ActivatedRoute,
                private router: Router,
                private toastr: ToastrService) {
        super();
    }

    ngOnInit() {
        combineLatest([this.userSvc.user$, this.route.params])
            .pipe(takeUntil(this.destroy$))
            .subscribe(([user, params]: [UserSettings, Params]) => {
                this.settings = user;
                const cid = params['cid'];

                if (cid && this.collectionSvc.get(cid)) {
                    this.showOnly = this.collectionSvc.get(cid);
                    this.collections = [this.showOnly];
                    this.applyFilter(this.appliedFilter);

                    if (this.route.snapshot.url.find(u => u.path === 'history')) {
                        this.loadHistory();
                    }
                }
                else {
                    this.showOnly = undefined;
                    this.refreshCollectionList();
                }

            });

        this.collectionSvc.changed$.pipe(takeUntil(this.destroy$))
            .subscribe(() => this.refreshCollectionList());

        this.destroy$.subscribe(() => {
            this.userSvc.localSave();
            this.collectionSvc.localSave().then();
        });
    }

    /**
     * Refresh the display when the CollectionService reports a change.
     */
    private refreshCollectionList() {
        this.collections.length = 0;
        this.collectionSvc.forEach((c) => this.collections.push(c));
        this.collections.sort((a: Collection, b: Collection) => {
            // Problems sort to top
            if (a.isAvailable !== b.isAvailable) {
                return a.isAvailable ? 1 : -1;
            }

            // Active editing sorts to top
            if (a.isCloudBacked !== b.isCloudBacked) {
                return a.isCloudBacked ? 1 : -1;
            }

            // Otherwise sort by name
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });

        this.applyFilter(this.appliedFilter);
    }

    /**
     * User clicked the Add button
     */
    onCreateCollection() {
        if (!this.settings) {
            return;
        }

        // Create new collection for the user.
        const c = this.collectionSvc.createNew(); // triggers call to refreshCollectionList
        this.openEditModal(this.editModal, c);
        window.scrollTo(0, 0);
    }

    openEditModal(modal: ModalDirective, collection: Collection) {
        this.activeCollection = collection;
        modal.show();
    }

    openUnsubscribeModal(modal: ModalDirective, collection: Collection) {
        this.activeCollection = collection;
        modal.show();
    }

    modifiedCollection(collection: Collection) {
        this.syncSvc.setDirty(collection);
    }

    applyFilter(filter: CollectionFilter) {
        this.appliedFilter = filter;
        this.filteredCollections = this.filterPipe.transform(this.collections, filter);

        // Computer section header positions
        this.troubleSectionIdx = -1;
        this.localModSectionIdx = -1;
        this.cloudSyncSectionIdx = -1;

        this.filteredCollections.find((c, idx) => {
            if (!c.isAvailable && this.troubleSectionIdx < 0) {
                this.troubleSectionIdx = idx;
            }
            else if (!c.isCloudBacked && this.localModSectionIdx < 0) {
                this.localModSectionIdx = idx;
            }
            else if (c.isCloudBacked) {
                // If all cloud backed, don't show any section headers
                if (idx > 0) {
                    this.cloudSyncSectionIdx = idx;
                }
                return true; // no need to continue
            }
            return false;
        });
    }

    /**
     * User selected a predefined license while editing the active collection.
     */
    selectLicense(license: Licenses.License) {
        this.activeCollection.license = license.name;
        this.modifiedCollection(this.activeCollection);
    }

    /**
     * Load previous revisions from the cloud.
     */
    private loadHistory() {
        this.collectionSvc.loadHistory(this.showOnly)
            .then(history => {
                // Remove first item from history if it is the active revision
                if (history.length && history[0].modified.getTime() === this.showOnly.modified.getTime() && this.showOnly.isCloudBacked) {
                    history.shift();
                }
                this.history = history;
            });
    }

    /**
     * Open the history page.
     *
     * @param {Collection} collection
     */
    openHistory(collection: Collection) {
        if (this.syncSvc.isOnline()) {
            this.router.navigate(['/collections', collection.id, 'history']).then();
        }
        else {
            this.toastr.warning("The function is unavailable offline.", "Offline");
        }
    }

    /**
     * User has selected on old revision to restore. Confirm it.
     *
     * @param {ModalDirective} confirmRestoreModal
     * @param {Collection} oldRev
     */
    openRestoreConfirmModal(confirmRestoreModal: ModalDirective, oldRev: Collection) {
        // Confirmation popup
        this.activeCollection = oldRev;
        confirmRestoreModal.show();
    }

    /**
     * Unsubscribe from the active collection... Called when user confirms.
     */
    doUnsubscribe() {
        this.settings.unsubscribeCollection(this.activeCollection);
        this.syncSvc.setDirty(this.settings);
        this.collectionSvc.loadFrom(this.settings).then();
        // Upon the reload completing, refreshCollectionList() is automatically triggered.
    }

    /**
     * User has confirmed that they wish to restore an old revision.
     * @returns {Promise<boolean>}
     */
    doRestoreRevision() {
        const oldRev = this.activeCollection;

        // If just dumping local modifications
        if (!this.showOnly.isCloudBacked && oldRev.revision === this.showOnly.revision) {
            return this.collectionSvc.restoreFromCloud(oldRev.id)
                .then(() => this.router.navigate(['/collections', this.showOnly.id]));
        }
        else {
            // Save old rev as a new version
            oldRev.revision = this.showOnly.revision;
            oldRev.isDirty = true;
            this.collectionSvc.add(oldRev);
            return this.collectionSvc.localSave(oldRev)
                .then(() => this.collectionSvc.sync(true))
                .then(() => this.collectionSvc.resolveReferences())
                .then(() => this.router.navigate(['/collections', this.showOnly.id]));
        }
    }
}
