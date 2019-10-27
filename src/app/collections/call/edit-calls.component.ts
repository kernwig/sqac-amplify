import {Component, OnDestroy, OnInit} from "@angular/core";

import {Collection} from "../../models/collection";
import {AbstractBaseComponent} from "../../shared/abstract-base.component";
import {CollectionService} from "../../services/collection.service";
import {UserService} from "../../services/user.service";
import {ActivatedRoute, Params} from "@angular/router";
import {UserSettings} from "../../models/user-settings";
import {Family} from "../../models/family";
import {FamilyService} from "../../services/family.service";
import {CallService} from "../../services/call.service";
import {Call} from "../../models/call";
import {ModuleService} from "../../services/module.service";
import {SyncService} from "../../services/sync.service";
import {combineLatest} from "rxjs";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-edit-calls',
    templateUrl: './edit-calls.component.html',
})
export class EditCallsComponent extends AbstractBaseComponent implements OnInit, OnDestroy {

    readonly availableFamilies: Family[] = [];

    /** The collection being edited */
    collection: Collection;

    /** In-progress defining for a new Cll being added */
    adding: Call;

    /** Track which Calls (by id) are referenced from loaded modules */
    usedCalls = new Set<string>();

    /** May these calls be modified? */
    isMutable = false;

    /** Construct */
    constructor(private route: ActivatedRoute,
                public collectionSvc: CollectionService,
                public familySvc: FamilyService,
                public callSvc: CallService,
                public moduleSvc: ModuleService,
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
            .subscribe((values: [UserSettings, Params]) => {
                const user = values[0];
                const cid = values[1]['cid'];
                this.collection = this.collectionSvc.get(cid);

                if (this.collection) {
                    Call.sort(this.collection.calls);
                    this.adding = new Call();
                    this.clearAdding();
                    this.isMutable = (this.collection.authorUserId === user.id);

                    this.availableFamilies.length = 0;
                    this.familySvc.forEach(fam => this.availableFamilies.push(fam));
                    Family.sort(this.availableFamilies);

                    // Cache usage information
                    for (const call of this.collection.calls) {
                        if (this.moduleSvc.isCallReferenced(call)) {
                            this.usedCalls.add(call.id);
                        }
                    }
                }
            });
    }

    /**
     * Leaving page.
     */
    ngOnDestroy() {
        if (this.collection && this.collection.isDirty) {
            this.callSvc.clearCache();
            this.collectionSvc.localSave(this.collection).then();
        }

        super.ngOnDestroy();
    }

    /**
     * Set beats user input.
     *
     * @param call to set beats on
     * @param beats value as a string
     */
    setBeats(call: Call, beats: string) {
        const n = Number.parseInt(beats, 10);
        if (Number.isInteger(n)) {
            call.beats = n;
            this.setModified();
        }
        else {
            console.log("setBeats(call, " + n + ") invalid");
        }
    }

    /**
     * Set family user input.
     *
     * @param call to set family on
     * @param family to set
     */
    setFamily(call: Call, family: Family) {
        if (family && family.id) {
            if (call !== this.adding) {
                this.setModified();
                this.familySvc.clearCache();
            }

            call.family = family;
        }
        else {
            console.log("setFamily(call, " + family + ") : Invalid Family");
        }
    }

    /**
     * Add new call if completely defined.
     */
    addIfComplete(giveFocus: HTMLInputElement): void {
        this.adding.isAvailable = !!this.adding.family && !!this.adding.command && this.adding.beats > 0;

        if (this.adding.isAvailable) {
            // Add the completed Call(s)
            const parts = this.adding.command.split('|');
            if (parts.length > 3) {
                // Bulk add using the |this|and|that| syntax
                for (let choice = 1; choice < parts.length - 1; ++choice) {
                    const call = new Call();
                    call.beats = this.adding.beats;
                    call.family = this.adding.family;
                    call.command = parts[0] + parts[choice] + parts[parts.length - 1];
                    call.isAvailable = true;

                    this.collection.calls.push(call);
                    this.callSvc.add(call);
                }
            }
            else {
                this.collection.calls.push(this.adding);
                this.callSvc.add(this.adding);
            }

            this.setModified();
            this.familySvc.clearCache();

            const previous = this.adding;
            this.adding = new Call();
            this.clearAdding(giveFocus);
            this.adding.family = previous.family; // default to same family
        }
    }

    /**
     * Clear the fields for new family being entered.
     * @param giveFocus
     */
    clearAdding(giveFocus?: HTMLInputElement) {
        this.adding.family = null;
        this.adding.command = null;
        this.adding.beats = null;
        this.adding.isAvailable = true;

        if (giveFocus) {
            giveFocus.focus();
        }
    }

    /**
     * Delete a Call
     */
    delete(callToRemove: Call) {
        this.collection.calls = this.collection.calls.filter(c => c.id !== callToRemove.id);
        this.callSvc.delete(callToRemove);
        this.familySvc.clearCache();
    }

    /**
     * Flag collection as modified.
     */
    setModified() {
        this.syncSvc.setDirty(this.collection);
    }
}
