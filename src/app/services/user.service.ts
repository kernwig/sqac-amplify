import {SyncService} from "./sync.service";

const imageToURI = require('image-to-data-uri');
import {Injectable} from "@angular/core";
import {UserSettings} from "../models/user-settings";
import {CollectionService} from "./collection.service";
import {BehaviorSubject} from "rxjs";
import {AuthUser} from "../models/auth-user";
import {PersistenceService,PersistenceException} from "./persistence.service";
import {ToastrService} from "ngx-toastr";
import {AmplifyService} from 'aws-amplify-angular';
import {AuthClass} from 'aws-amplify';

const STORAGE_KEY = 'user';

/**
 * Manage the current user.
 */
@Injectable()
export class UserService {

    /**
     * Subject to observe to witness changes to the current user.
     * Emits a UserSettings object upon login, and null upon logout.
     */
    user$: BehaviorSubject<UserSettings> = new BehaviorSubject(null);

    /** Current signed-in user */
    private authUser: AuthUser | undefined;

    /// Settings for the current user
    private settings: UserSettings | undefined;

    /** Authenticated user's info. May be undefined if no user logged in. */
    get info(): AuthUser {
        return this.authUser;
    }

    /// Constructor
    constructor(private collectionSvc: CollectionService,
                private readonly amplifySvc: AmplifyService,
                private persistSvc: PersistenceService,
                private syncSvc: SyncService,
                private toastr: ToastrService
    ) {
        this.amplifySvc.authStateChange$
            .subscribe(authState => {
                if (authState.state === 'signedIn') {
                    this.onUserAuth(authState.user);
                }
                else {
                    this.onUserAuth(undefined);
                }
            });

        // Wait a moment, and try to init from stored authentication
        setTimeout(() => this.authenticate(), 100);
    }

    private authenticate() {
        // Try to init existing authenticatication from storage.
        try {
            const authUserStr = localStorage.getItem(STORAGE_KEY);
            if (authUserStr) {
                this.onUserAuth(JSON.parse(authUserStr));
            }
        } catch (err) {
            console.log(err);
        }

        // If online, try to renew authenticate on network.
        if (this.syncSvc.isOnline()) {
            const auth = this.amplifySvc.auth() as AuthClass;
            auth.currentSession()
                .then(() => auth.currentAuthenticatedUser())
                .then(user => {
                    this.onUserAuth(user);
                })
                .catch(err => {
                    console.warn("reAuthenticate failure", err);
                    // No user - make sure storage is clean.
                    return this.persistSvc.signOut();
                });
        }
    }

    /**
     * AuthUser authentication changed. Process it.
     * @param cognitoUser a CognitoUser https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#cognito-user-pools-standard-attributes
     */
    private onUserAuth(cognitoUser: any|undefined) {
        const newUser: AuthUser = cognitoUser && cognitoUser.attributes
            ? {
                id: cognitoUser.attributes.sub,
                email: cognitoUser.attributes.email,
                name: cognitoUser.attributes.name || "Unknown",
                photo: cognitoUser.attributes.photo
              }
            : undefined;

        // Ignore if no change
        if ((this.authUser && newUser && this.authUser.id === newUser.id) || (!this.authUser && !newUser)) {
            console.log("Received user auth, but it didn't change");
            return;
        }

        this.authUser = newUser;
        if (this.authUser) {
            console.log("Login", this.authUser);

            // Load the UserSettings, and then notify any listeners that a user is available.
            this.getUserSettings()
                .then(() => {
                    return this.setPhotoFromURI(this.authUser.photo);
                })
                .then(() => {
                    // Save user data after
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.authUser));
                    this.user$.next(this.settings);
                })
                .catch(ex => console.error(ex));
        }
        else {
            console.log("Logout");
            localStorage.removeItem(STORAGE_KEY);

            // Notify listeners that the user is no longer available
            this.settings = undefined;
            this.user$.next(null);
        }
    }

    /**
     * Request anonymous login.
     */
    // signInAsGuest() {
    //     //TODO: this.fireAuth.auth.signInAnonymously();
    //     this.onUserAuth({
    //         id: 'user1',
    //         name: 'Adam Fanello',
    //         email: 'adam@fanello.net'
    //     } as AuthUser);
    // }

    /**
     * Sign out of system.
     */
    signOut() {
        this.persistSvc.signOut();
        this.onUserAuth(undefined);
    }

    /**
     * Return the current [UserSettings].
     * Will fetch from persistence if not already loaded.
     * @throws [PersistenceException] upon unhandled failure.
     */
    getUserSettings(): Promise<UserSettings> {
        // Initialize on first access...
        if (!this.authUser) {
            return Promise.reject(new PersistenceException(401, "not authenticated"));
        }
        else if (this.settings) {
            return Promise.resolve(this.settings);
        }
        else {
            return this.persistSvc.loadUser(this.authUser.id)
                .then(settings => {
                    console.log("User settings loaded");
                    this.settings = settings;
                })
                .catch((ex: PersistenceException) => {
                    if (ex.statusCode === 404) {
                        return this.createNewSettings();
                    }
                    else {
                        throw ex;
                    }
                })
                .then(() => {
                    // Load all the collections too!
                    return this.collectionSvc.loadFrom(this.settings);
                })
                .then(() => {
                    // Check for data that needs to sync to cloud
                    // if (!this.settings.isCloudBacked || Array.from(this.collectionSvc.values()).find(c => !c.isCloudBacked)) {
                    //     this.syncSvc.setDirty();
                    // }
                    let isDirty = false;
                    if (!this.settings.isCloudBacked) {
                        console.log('User settings are unsynced');
                        isDirty = true;
                    }
                    for (let c of Array.from(this.collectionSvc.values())) {
                        if (!c.isCloudBacked) {
                            console.log(`Collection ${c.id} is unsynced`);
                            isDirty = true;
                        }
                    }

                    if (isDirty)
                        this.syncSvc.setDirty();
                })
                .then(() => this.settings);
        }
    }

    /**
     * Store any changes to UserSettings in memory to local storage.
     */
    localSave(): void {
        if (this.settings && this.settings.isDirty) {
            this.persistSvc.localStoreUser(this.settings).then();
        }
    }

    /**
     * Synchronize local and server [UserSettings].
     * @throws [PersistenceException] upon unhandled failure.
     */
    async sync(sendOnly?: boolean): Promise<UserSettings> {
        if (!this.settings) {
            console.log("Not loaded - do so now?");
            if (this.authUser && !sendOnly) {
                return this.getUserSettings();
            }
            else {
                throw new PersistenceException(401, "Not authenticated");
            }
        }
        else if (this.settings.isDirty || !this.settings.isCloudBacked) {
            console.log("Settings have been locally changed. Saving..");

            // Update user settings from auth user
            this.settings.name = this.authUser.name || this.settings.name;
            this.settings.email = this.authUser.email || this.settings.email;

            // Save
            await this.persistSvc.cloudSaveUser(this.settings);
            await this.toastr.success("Saved changes", "Account");
            return this.settings;
        }
        else if (!sendOnly) {
            console.log("Check for updated content on server");
            let tmp = await this.persistSvc.loadUser(this.authUser.id);

            if (tmp.modified.getTime() > this.settings.modified.getTime()) {
                await this.toastr.warning("Updated from cloud", "Account");

                // Did the collection subscriptions change?
                let collectionsChanged = !setsAreEqual(tmp.collections, this.settings.collections);
                this.settings = tmp;

                if (collectionsChanged) {
                    await this.collectionSvc.loadFrom(this.settings);
                }
            }
            return this.settings;
        }
        else {
            console.log("UserService.sync - No change");
            await this.toastr.success("No updates", "Account");
            return this.settings;
        }
    }

    private createNewSettings() {
        console.log("Creating new UserSettings");
        let user = this.authUser;
        this.settings = new UserSettings(user.id);
        this.settings.isDirty = true;
        this.settings.isAvailable = true;
        this.settings.name = user.name;
        this.settings.email = user.email;

        // Default collections
        ["callerlab-basic","callerlab-mainstream","callerlab-plus","adam-classics"]
            .forEach(c => this.settings.collections.add(c));

        return this.settings;
    }

    /**
     * Given a user profile photo URI, read it into a data URI to store and display while offline.
     *
     * @return resolved Promise when complete.
     */
    private setPhotoFromURI(photoUri: string): Promise<void> {
        // Default to unknown user photo
        this.authUser.photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAB+1BMVEWCg4aEhYiEhoiEhomFh4mFiIqGiIqGiIuGiYuHiIqHiYuHiYyIiYuIiYyIioyIio2JioyJio2Ji42JjI6KjI6KjY+LjZCLjpCMjpCMj5GNj5GNj5KNkJKOkJOPkZOPkpSPkpWQk5WRlJeSlZeTlpiTlpmTlpqVl5mVmJuVmZyXmZ2XmpyXmp2Xmp6Xm56YmpyYm56YnKCYnaCZnaCZnaGanZ+anqCanqGanqKbn6KcnqCcn6KcoKOcoKScoaSdoKSdoaWdoqaen6Geoqaeo6eepKifoaOfpKego6aho6WhpKiipqqjpaejp6qkp6qkqKukqKymqa2mqqynqauoqqyorLCsr7CusLKwtLaxs7Wxtbiztre0tri0t7m1tri1t7q3ubq3uby3u764ury5u727vsG8vsG8v8G9wMG+wMG/wcO/wsS/wsXAwsTAw8TBw8XBxcjCxMbCxcjCxsnDxcfEx8jEx8nFx8nFyMrGyMrGys3Hy83Iy87IzM7Lzc/MztDMz9HO0NLO0dLP0dLP0dTQ0tTQ09XR1NXS1dbT1dfT1djU1tjU19jU19nV19rW2NrX2dvX2tzX2t3X293Y29zY293Z3N3Z3N7a3N7a3d7a3d/b3t/b3uDc3uDc3+Dc3+Hc4OLd3+Hd4OLe4OLe4ePf4ePf4uTg4uTg4+TZCKiIAAABkElEQVQ4ja2S1VbDQBRFgxUvUIIXiru7Q2lLcXd3d3d3v4UhEILrZ5ISmmSRsHhhv53JXudOZgZDf4D9twA0vwtAHixPTixdEPCLQF0sNhRrtaoFkpZFBNiqVqrVGo1G2TEGrMETzlQsyrJ9YQMUZnPGECJ+CrA2qM1kiQHBCPiYic9gSe4WNCCqNIWjvFkoXGXHc9Q9C/+CTI9jia0zFPCE24pIjl50LhCOs0IjDIQXvApG6PaSQjgS30VO8iY82ED0schRw3VJgIE0il3mX1aPnz+DYhaJChDoy5B3D2ICOj/18f5iB0Qb6H0lKPTI35CYAIggGt3kcrnLOEUIXxSgl9WqgaciZw/nysvW2t03HfAFII/6gqw974CqSa29h3U787CRE+btYsz3LlfcCW+nQF8F8FEvw3Gv0QdgBEDbuRJHmczRLGqeVoAc9rego8ws/5DQC4A2pfbfmPbTvZ1Sh+8o3QDAkG5aYitlWUdzJmywxVf0I1oseeQ8uttwyaiNoIUmiQUHNmXFS8ZtxCdiCrz8WJjJugAAAABJRU5ErkJggg==";

        if (photoUri) {
            return new Promise<void>((resolve) => {
                // Default Google photo URL requests 50px; change that to 96px
                photoUri = photoUri.replace(/\?sz=50$/, '?sz=96');

                // See https://github.com/HenrikJoreteg/image-to-data-uri.js
                imageToURI(photoUri, (err, dataUri) => {
                    if (err)
                        console.error("Failure loading user photo", err);
                    else
                        this.authUser.photo = dataUri;
                    resolve();
                });
            });
        }
        else {
            return Promise.resolve();
        }
    }

}

/**
 * Do two sets have the same content?
 */
function setsAreEqual<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size)
        return false;

    let match = true;
    a.forEach(value => {
        if (!b.has(value))
            match = false;
    });

    return match;
}
