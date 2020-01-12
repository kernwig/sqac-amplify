import {Component, OnDestroy, OnInit} from '@angular/core';
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {Collection, CollectionJSON} from '../models/collection';
import {UserService} from "../services/user.service";
import {CollectionService} from "../services/collection.service";
import {UserSettings} from "../models/user-settings";
import {CollectionFilter} from "./widget/collection-filter.component";
import {SyncService} from "../services/sync.service";
import {takeUntil} from "rxjs/operators";
import {APIService, ModelCollectionFilterInput} from '../API.service';
import {StorageLocation} from '../models/storage-location';
import {AbstractStorableModel} from '../models/abstract-storable-model';

interface CollectionView extends CollectionJSON {
    path: string;
    isSubscribed: boolean;
}

@Component({
    selector: 'sqac-search-collections',
    templateUrl: './search-collections.component.html',
    styles: [`
        sqac-collection-filter { padding-right: 1em; }
    `]
})
export class SearchCollectionsComponent extends AbstractBaseComponent implements OnInit, OnDestroy {

    collections: CollectionView[] = [];
    filter?: CollectionFilter;
    settings: UserSettings;

    constructor(public collectionSvc: CollectionService,
                public userSvc: UserService,
                public syncSvc: SyncService,
                private readonly cloudAPI: APIService,
    ) {
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
                return this.collectionSvc.loadFrom(this.settings);
            });
    }

    async doSearch() {
        if (!this.filter || (!this.filter.text && !this.filter.difficulty && !this.filter.level)) {
            return;
        }

        const criteria: ModelCollectionFilterInput = { and: [] };
        if (this.filter.text) {
            criteria.and.push({
                searchText: { contains: this.filter.text.toLocaleLowerCase() }
            });
        }
        if (this.filter.difficulty) {
            criteria.and.push({
                difficulty: { eq: this.filter.difficulty }
            });
        }
        if (this.filter.level) {
            criteria.and.push({
                level: { eq: this.filter.level }
            });
        }

        const list = await this.cloudAPI.ListCollections(criteria, 1000);
        this.collections = (list.items as any[]) as CollectionView[];

        // Add view properties
        this.collections.forEach(col => {
            col.path = new StorageLocation((col as any) as AbstractStorableModel).path;
            col.isSubscribed = (col.authorUserId === this.settings.id) || this.settings.collections.has(col.path);
        });
    }

    subscribe(collection: CollectionView) {
        collection.isSubscribed = true;
        this.settings.subscribeCollection((collection as any) as Collection);
        this.settings.isDirty = true;
    }
}
