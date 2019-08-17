import {Component, OnInit} from '@angular/core';
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {CollectionJSON} from "../models/collection";
import {UserService} from "../services/user.service";
import {CollectionService} from "../services/collection.service";
import {UserSettings} from "../models/user-settings";
import {CollectionFilter} from "./widget/collection-filter.component";
import {PersistenceService} from "../services/persistence.service";
import {SyncService} from "../services/sync.service";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-search-collections',
    templateUrl: './search-collections.component.html',
})
export class SearchCollectionsComponent extends AbstractBaseComponent implements OnInit {

    collections: CollectionJSON[] = [];
    filter: CollectionFilter = {};
    settings: UserSettings;

    constructor(public collectionSvc: CollectionService,
                public userSvc: UserService,
                public syncSvc: SyncService,
                private persistenceSvc: PersistenceService) {
        super();
    }

    ngOnInit() {
        this.userSvc.user$.pipe(takeUntil(this.destroy$))
            .subscribe((userSettings: UserSettings) => {
                this.settings = userSettings;
            });
    }

    ngOnDestroy() {
        super.ngOnDestroy();

        return this.userSvc.sync(false)
            .then((newSettings) => {
                this.settings = newSettings;
                return this.collectionSvc.loadFrom(this.settings)
            });
    }

    doSearch() {
        if (!this.filter.text && !this.filter.difficulty && !this.filter.level)
            return;

        this.persistenceSvc.findCollections(this.filter)
            .then((results: CollectionJSON[]) => {
                this.collections = results;
            });
    }

    subscribe(collection: CollectionJSON) {
        this.settings.collections.add(collection.id);
        this.settings.isDirty = true;
    }
}
