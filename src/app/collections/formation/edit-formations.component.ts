import {Component, OnDestroy, OnInit} from "@angular/core";

import {Collection} from "../../models/collection";
import {Formation} from "../../models/formation";
import {DanceLevels} from "../../models/dance-level";
import {AbstractBaseComponent} from "../../shared/abstract-base.component";
import {CollectionService} from "../../services/collection.service";
import {FormationService} from "../../services/formation.service";
import {ModuleService} from "../../services/module.service";
import {UserService} from "../../services/user.service";
import {ActivatedRoute, Params} from "@angular/router";
import {UserSettings} from "../../models/user-settings";
import {SyncService} from "../../services/sync.service";
import {takeUntil} from "rxjs/operators";
import {combineLatest} from "rxjs";

@Component({
    selector: 'sqac-edit-formations',
    templateUrl: './edit-formations.component.html',
    styleUrls: ['./edit-formations.component.scss']
})
export class EditFormationsComponent extends AbstractBaseComponent implements OnInit, OnDestroy {

    readonly availableDanceLevels = DanceLevels;

    /** The collection being edited */
    collection: Collection;

    /** In-progress defining for a new Formation being added */
    adding: Formation;

    /** Track which formations (by id) are referenced from loaded modules */
    usedFormations = new Set<string>();

    /** May these formations be modified? */
    isMutable = false;

    /** Construct */
    constructor(private route: ActivatedRoute,
                public collectionSvc: CollectionService,
                public formationSvc: FormationService,
                public moduleSvc: ModuleService,
                public userSvc: UserService,
                private syncSvc: SyncService
    ) {
        super();
    }

    /**
     * Initialize Page
     */
    ngOnInit() {
        combineLatest([this.userSvc.user$, this.route.params])
            .pipe(takeUntil(this.destroy$))
            .subscribe(([user, params]: [UserSettings, Params]) => {
                const cid = params.cid;
                this.collection = this.collectionSvc.get(cid);

                if (this.collection) {
                    Formation.sort(this.collection.formations);
                    this.adding = new Formation();
                    this.adding.isAvailable = true;
                    this.isMutable = (this.collection.authorUserId === user.id);

                    // Cache usage information
                    for (const formation of this.collection.formations) {
                        if (this.moduleSvc.isFormationReferenced(formation)) {
                            this.usedFormations.add(formation.id);
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
            this.formationSvc.clearCache();
            this.collectionSvc.localSave(this.collection).then();
        }

        super.ngOnDestroy();
    }

    /**
     * Add new formation if completely defined.
     */
    addIfComplete(giveFocus: HTMLInputElement): void {
        this.adding.isAvailable = !!this.adding.name && !!this.adding.abbreviation && !!this.adding.level;

        if (this.adding.isAvailable) {
            // Add the completed Formation
            this.collection.formations.push(this.adding);
            this.setModified();
            this.formationSvc.add(this.adding);

            const previous = this.adding;
            this.adding = new Formation();
            this.clearAdding(giveFocus);
            this.adding.level = previous.level; // default to same level
        }
    }

    /**
     * Clear the fields for new formation being entered.
     */
    clearAdding(giveFocus: HTMLInputElement) {
        this.adding.name = null;
        this.adding.abbreviation = null;
        this.adding.level = null;
        this.adding.isAvailable = true;
        giveFocus.focus();
    }

    /**
     * Delete a Formation
     */
    delete(formationToRemove: Formation) {
        this.collection.formations = this.collection.formations.filter(f => f.id !== formationToRemove.id);
        this.formationSvc.delete(formationToRemove);
        this.setModified();
    }

    /**
     * Flag collection as modified.
     */
    setModified() {
        this.syncSvc.setDirty(this.collection);
    }
}
