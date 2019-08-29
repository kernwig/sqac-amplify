import {Component, OnInit} from '@angular/core';
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {UserService} from "../services/user.service";
import {UserSettings} from "../models/user-settings";
import {CollectionService} from "../services/collection.service";
import {SyncService} from "../services/sync.service";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-account',
    templateUrl: './account.component.html'
})
export class AccountComponent extends AbstractBaseComponent implements OnInit {

    readonly signUpConfig = {
        header: 'Create a new account',
        hideAllDefaults: true,
        defaultCountryCode: '1',
        signUpFields: [
            {
                label: 'Name',
                key: 'name',
                required: true,
                displayOrder: 1,
                type: 'string'
            },
            {
                label: 'Email',
                key: 'email',
                required: true,
                displayOrder: 2,
                type: 'string',
            },
            {
                label: 'Password',
                key: 'password',
                required: true,
                displayOrder: 3,
                type: 'password'
            },
        ]
    };

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
