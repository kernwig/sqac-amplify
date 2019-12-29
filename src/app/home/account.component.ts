import {Component, OnInit} from '@angular/core';
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {UserService} from "../services/user.service";
import {UserSettings} from "../models/user-settings";
import {CollectionService} from "../services/collection.service";
import {SyncService} from "../services/sync.service";
import {takeUntil} from "rxjs/operators";
import {AmplifyService} from 'aws-amplify-angular';

@Component({
    selector: 'sqac-account',
    templateUrl: './account.component.html',
    styles: [`
        .sign-in-google {
            background: url(../assets/btn_google_signin_light_normal_web.png) no-repeat;
            background-position-x: center;
            height: 46px;
            margin: 20px;
            cursor: pointer;
        }
    `]
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
                private collectionSvc: CollectionService,
                private readonly amplifySvc: AmplifyService,
    ) {
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

    signInWithGoogle() {
        this.amplifySvc.auth().federatedSignIn({provider: 'Google'});
    }

    localSignUp() {
        this.userSvc.createLocalAccount();
    }
}
