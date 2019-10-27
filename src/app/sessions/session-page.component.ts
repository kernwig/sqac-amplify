import {Component, OnDestroy, OnInit} from '@angular/core';
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {DanceSession} from "../models/dance-session";
import {UserService} from "../services/user.service";
import {UserSettings} from "../models/user-settings";
import {ActivationStart, Router} from "@angular/router";
import {CollectionService} from "../services/collection.service";
import {Collection} from "../models/collection";
import {SyncService} from "../services/sync.service";
import {ChoreographerService} from "../services/choreographer.service";
import {Family} from "../models/family";
import {FamilyService} from "../services/family.service";
import {compareDanceLevels, DanceLevel, DanceLevels} from "../models/dance-level";
import {filter, takeUntil} from "rxjs/operators";

interface UiModelItem {
    id: string;
    name: string;
    enabled: boolean;
    level?: string;
}

@Component({
    selector: 'sqac-session-page',
    templateUrl: './session-page.component.html'
})
export class SessionPageComponent extends AbstractBaseComponent implements OnInit, OnDestroy {

    /** Make Math object available to template */
    readonly Math = Math;

    readonly danceLevels = [];

    /** Session being edited */
    session: DanceSession;

    /** User settings */
    settings: UserSettings;

    /** List of collections to be enabled/disabled for this session */
    collections: UiModelItem[] = [];

    /** List of families to be enabled/disabled for this session */
    families: UiModelItem[] = [];
    useAnyFamily = true;

    constructor(public userSvc: UserService,
                private collectionSvc: CollectionService,
                private familySvc: FamilyService,
                private syncSvc: SyncService,
                private choreoSvc: ChoreographerService,
                private router: Router) {
        super();
    }

    ngOnInit() {
        this.userSvc.user$.pipe(takeUntil(this.destroy$))
            .subscribe((settings) => {
                this.settings = settings;
                if (this.settings && this.settings.sessions) {
                    this.session = this.settings.activeSession;
                    if (!this.session) {
                        this.createNewSession();
                    }
                    else {
                        this.refresh();
                    }
                }
            });

        this.router.events
            .pipe(filter(ev => ev instanceof ActivationStart), takeUntil(this.destroy$))
            .subscribe(() => this.navigatedAway());

        this.collectionSvc.changed$.pipe(takeUntil(this.destroy$))
            .subscribe(() => this.refreshUiModels());
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        this.navigatedAway();
        this.userSvc.localSave();
    }

    createNewSession() {
        this.session = new DanceSession();
        this.settings.sessions.push(this.session);
        this.refresh();
    }

    private navigatedAway() {
        if (this.session && !this.session.name) {
            this.session.name = "Unnamed";
        }
    }

    refresh() {
        // Delay processing until the next cycle.
        // this.session isn't set right away from <select ngModel>
        setTimeout(() => {
            console.log("Selected session " + this.session.name);
            this.settings.activeSession = this.session;
            this.choreoSvc.useDanceSession(this.settings.activeSession);
            this.refreshUiModels();
        });
    }
    private refreshUiModels() {
        // Wait for session to be defined
        if (!this.session) {
            return;
        }

        // Build UI model for Collections
        this.collections = [];
        this.collectionSvc.forEach((c: Collection) => {
            if (c.modules.length === 0) {
                return;
            }

            this.collections.push({
                id: c.id,
                name: c.name,
                enabled: this.session.enabledCollections.has(c.id)
            });
        });
        this.collections.sort((a, b) => a.name.localeCompare(b.name));

        // Build UI model for Families
        DanceLevels.forEach(level => {
            if (level !== "NO" && compareDanceLevels(level as DanceLevel, this.session.level) <= 0) {
                this.danceLevels.push(level);
            }
        });

        this.useAnyFamily = (this.session.enabledFamilies.size === 0);
        this.families = [];
        this.familySvc.forEach((f: Family) => {
            if (compareDanceLevels(f.level, this.session.level) > 0) {
                return;
            }

            this.families.push({
                id: f.id,
                name: f.name,
                level: f.level,
                enabled: this.session.enabledFamilies.has(f.id)
            });
        });

        this.families.sort((a, b) => a.name.localeCompare(b.name));
    }

    setModified() {
        // Update enabled Collections
        this.session.enabledCollections.clear();
        this.collections
            .filter(c => c.enabled)
            .forEach(c => this.session.enabledCollections.add(c.id));

        // Update enabled Families
        this.session.enabledFamilies.clear();
        if (!this.useAnyFamily) {
            this.families
                .filter(f => f.enabled)
                .forEach(f => this.session.enabledFamilies.add(f.id));
        }

        // Set UserSettings as dirty
        this.syncSvc.setDirty(this.settings);
    }

    onDeleteSession() {
        // Remove the session from UserSettings
        this.settings.sessions = this.settings.sessions.filter(s => s.id !== this.session.id);

        // Auto-select the first session - we have to choose something!
        if (this.settings.sessions.length > 0) {
            this.session = this.settings.sessions[0];
            this.refresh();
        }
        else {
            this.createNewSession();
        }
    }
}
