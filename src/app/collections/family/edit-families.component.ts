import {Component, OnDestroy, OnInit} from "@angular/core";

import {Collection} from "../../models/collection";
import {DanceLevels} from "../../models/dance-level";
import {AbstractBaseComponent} from "../../shared/abstract-base.component";
import {CollectionService} from "../../services/collection.service";
import {UserService} from "../../services/user.service";
import {ActivatedRoute, Params} from "@angular/router";
import {UserSettings} from "../../models/user-settings";
import {Family} from "../../models/family";
import {FamilyService} from "../../services/family.service";
import {CallService} from "../../services/call.service";
import {SyncService} from "../../services/sync.service";
import {combineLatest} from "rxjs";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-edit-families',
    templateUrl: './edit-families.component.html',
})
export class EditFamiliesComponent extends AbstractBaseComponent implements OnInit, OnDestroy {

    readonly availableDanceLevels = DanceLevels;

    /** The collection being edited */
    collection: Collection;

    /** In-progress defining for a new Formation being added */
    adding: Family;

    /** May these families be modified? */
    isMutable = false;

    /** Construct */
    constructor(private route: ActivatedRoute,
                public collectionSvc: CollectionService,
                public familySvc: FamilyService,
                public callSvc: CallService,
                public userSvc: UserService,
                private syncSvc: SyncService) {
        super();
    }

    /**
     * Initialize Page
     */
    ngOnInit() {
        combineLatest([this.userSvc.user$, this.route.params])
            .pipe(takeUntil(this.destroy$))
            .subscribe(([user, params]: [UserSettings, Params]) => {
                const cid = params['cid'];
                this.collection = this.collectionSvc.get(cid);

                if (this.collection) {
                    Family.sort(this.collection.formations);
                    this.adding = new Family();
                    this.adding.isAvailable = true;
                    this.isMutable = (this.collection.authorUserId === user.id);
                }
            });
    }

    /**
     * Leaving page.
     */
    ngOnDestroy() {
        if (this.collection && this.collection.isDirty) {
            this.familySvc.clearCache();
            this.collectionSvc.localSave(this.collection).then();
        }

        super.ngOnDestroy();
    }

    /**
     * Add new formation if completely defined.
     */
    addIfComplete(giveFocus: HTMLInputElement): void {
        this.adding.isAvailable = !!this.adding.name && !!this.adding.level;

        if (this.adding.isAvailable) {
            // Add the completed Family
            this.collection.families.push(this.adding);
            this.setModified();
            this.familySvc.add(this.adding);

            const previous = this.adding;
            this.adding = new Family();
            this.clearAdding(giveFocus);
            this.adding.level = previous.level; // default to same level
        }
    }

    /**
     * Clear the fields for new family being entered.
     * @param giveFocus
     */
    clearAdding(giveFocus: HTMLInputElement) {
        this.adding.name = null;
        this.adding.level = null;
        this.adding.isAvailable = true;
        giveFocus.focus();
    }

    /**
     * Delete a Family
     */
    delete(familyToRemove: Family) {
        // Remove Family from collection
        this.collection.families = this.collection.families.filter(f => f.id !== familyToRemove.id);

        // Remove from service
        this.familySvc.delete(familyToRemove);
        this.setModified();

        // Purge all calls in Family. (U/I usually does no provide this option, but can be enabled for super-user management.)
        // this.collection.calls.filter(c => c.family.id === familyToRemove.id).forEach(c => this.callSvc.delete(c));
        // this.collection.calls = this.collection.calls.filter(c => c.family.id !== familyToRemove.id);
    }

    /**
     * Flag collection as modified.
     */
    setModified() {
        this.syncSvc.setDirty(this.collection);
    }
}
