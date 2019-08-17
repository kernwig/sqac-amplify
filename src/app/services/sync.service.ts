import {Injectable} from '@angular/core';
import {BehaviorSubject} from "rxjs";
import {UserService} from "./user.service";
import {CollectionService} from "./collection.service";
import {AbstractStorableModel} from "../models/abstract-storable-model";
import {ToastrService} from "ngx-toastr";

/**
 * Deal with data sync with server.
 */
@Injectable()
export class SyncService {

    /** Is there content in need of sync to cloud? */
    readonly unsynced$ = new BehaviorSubject<boolean>(false);

    /** Is the application currently connect to the cloud? */
    readonly online$ = new BehaviorSubject<boolean>(window.navigator.onLine);

    constructor(private toastr: ToastrService) {
        window.addEventListener('online', () => this.online$.next(true));
        window.addEventListener('offline', () => this.online$.next(false));
    }

    /**
     * Reset, after sync has completed or user sign in/out.
     */
    reset() {
        this.unsynced$.next(false);
    }

    isUnsynced(): boolean {
        return this.unsynced$.getValue();
    }

    setDirty(obj?: AbstractStorableModel): void {
        if (obj) {
            obj.isDirty = true;
            obj.isCloudBacked = false;
        }

        this.unsynced$.next(true);
    }

    /** Is the application currently connect to the cloud? */
    isOnline(): boolean {
        return this.online$.getValue();
    }

    /**
     * Perform a sync.
     */
    async syncWithCloud(userSvc: UserService, collectionSvc: CollectionService) {
        // Abort if offline
        if (!this.isOnline()) {
            return this.toastr.warning("Please connect to the Internet and try again.", "Offline");
        }

        let user = userSvc.user$.getValue();
        if (user) {
            try {
                await collectionSvc.sync(false);
                await userSvc.sync(!user.isCloudBacked);
                this.reset();
            }
            catch (err) {
                console.error(err);
                return this.toastr.error( err.toString(), 'Sync Failure', {timeOut: 10000});
            }
        }
        else {
            this.reset();
        }
    }

    /**
     * Return icon name based on the dirty and online flags.
     * @returns {string}
     */
    getIcon(): string {
        if (this.isOnline()) {
            return this.isUnsynced()
                ? "glyphicon glyphicon-cloud-upload text-danger text-larger"
                : "glyphicon glyphicon-cloud-download";
        }
        else {
            return this.isUnsynced()
                ? "glyphicon glyphicon-cloud text-danger"
                : "glyphicon glyphicon-cloud text-muted";
        }
    }
}
