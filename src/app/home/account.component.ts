import {Component, OnInit} from '@angular/core';
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {UserService} from "../services/user.service";
import {UserSettings} from "../models/user-settings";
import {CollectionService} from "../services/collection.service";
import {Authenticator, AUTHENTICATORS} from "../services/persistence.service";
import {SyncService} from "../services/sync.service";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-account',
    templateUrl: './account.component.html'
})
export class AccountComponent extends AbstractBaseComponent implements OnInit {

    readonly authenticators: Authenticator[] = AUTHENTICATORS;
    userSettings: UserSettings;

    /** Construct */
    constructor(private userSvc: UserService,
                public syncSvc: SyncService,
                private collectionSvc: CollectionService) {
        super();
    }

    ngOnInit() {
        this.userSvc.user$.pipe(takeUntil(this.destroy$))
            .subscribe(userSettings => {
                this.userSettings = userSettings;
            });
    }

    signOut() {
        this.userSvc.signOut();
    }

    syncWithCloud() {
        this.syncSvc.syncWithCloud(this.userSvc, this.collectionSvc).then();
    }
}
