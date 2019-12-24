import {ChangeDetectorRef, Component, OnInit, Optional, ViewChild} from '@angular/core';
import {ActivationStart, NavigationEnd, Router} from "@angular/router";
import {LocationStrategy} from "@angular/common";
import {SwUpdate} from "@angular/service-worker";
import {ModalDirective} from "ngx-bootstrap/modal";
import {UserService} from "./services/user.service";
import {ErrorCatchingService} from "./services/error-catching.service";
import {UserSettings} from "./models/user-settings";
import {AbstractBaseComponent} from "./shared/abstract-base.component";
import {ToastrService} from "ngx-toastr";
import {CollectionService} from "./services/collection.service";
import {SyncService} from "./services/sync.service";
import {environment} from "../environments/environment";
import {filter, takeUntil} from "rxjs/operators";
import {LayoutService} from "./services/layout.service";

const largeScreenWidth = 1360;

@Component({
    selector: 'sqac-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent extends AbstractBaseComponent implements OnInit {
    @ViewChild('errorModal', { static: true }) public errorModal: ModalDirective;

    errorTitle: string;
    errorMessages: string[] = [];
    isLargeScreen = false;
    showSidebar = false;

    userSettings: UserSettings;

    /** Is routing navigation a back-arrow nav, vs a click on something? */
    doingNavBack = false;

    pwaInstallPrompt;

    /**
     * Construct.
     */
    constructor(private errorSvc: ErrorCatchingService,
                private userSvc: UserService,
                private collectionSvc: CollectionService,
                @Optional() private swUpdate: SwUpdate,
                private toastr: ToastrService,
                public syncSvc: SyncService,
                public layoutSvc: LayoutService,
                private locStrat: LocationStrategy,
                private router: Router,
                private readonly changeRef: ChangeDetectorRef,
    ) {
        super();
    }

    public ngOnInit() {
        console.log("Hello! I'm a "
            + (environment.production ? "production" : "development")
            + " client");

        // Subscribe to errors
        this.errorSvc.error$.subscribe((error) => this.showError(error));

        // Subscribe to user changes
        this.userSvc.user$
            .pipe(takeUntil(this.destroy$))
            .subscribe(userSettings => {
                this.userSettings = userSettings;
                if (!this.userSettings) {
                    // Signed out
                    this.collectionSvc.clearAll();
                }
            });

        // Subscribe to application update flow
        this.appUpdateFlow();

        // Handler to scroll to top of window upon page navigation, unless we are going back.
        this.locStrat.onPopState(() => this.doingNavBack = true);
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                if (this.doingNavBack) {
                    this.doingNavBack = false;
                }
                else {
                    // Scroll to top of window
                    window.scrollTo(0, 0);
                }
            });

        // Get event from browser to use to ask the user to install this app as a PWA.
        // @see https://developers.google.com/web/fundamentals/app-install-banners/
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log("Received event 'beforeinstallprompt'");
            this.pwaInstallPrompt = event;
        });
        // If app is installed, remove the prompt
        window.addEventListener('appinstalled', () => {
            this.pwaInstallPrompt = undefined;
        });

        // Update sidebar according to screen size
        this.isLargeScreen = (window.innerWidth > largeScreenWidth);
        this.showSidebar = this.isLargeScreen;
        window.addEventListener('resize', () => {
            this.isLargeScreen = window.innerWidth > largeScreenWidth;
            if (this.isLargeScreen) {
                this.showSidebar = true;
            }
        });

        // Update UI when navigating to a new page
        this.router.events.pipe(filter(ev => ev instanceof ActivationStart))
            .subscribe(() => {
                // Close help and hide button
                this.layoutSvc.showHelp$.next(undefined);

                // Hide sidebar when navigating away on a small screen
                if (this.showSidebar && !this.isLargeScreen) {
                    this.showSidebar = false;
                }
            });
    }

    syncWithCloud(event: MouseEvent) {
        event.stopPropagation();

        this.syncSvc.syncWithCloud(this.userSvc, this.collectionSvc).then();
    }

    /**
     * Register all the event handlers for application update flow
     */
    appUpdateFlow() {
        if (!this.swUpdate) {
            return;
        }

        console.log("Registering app update flow");

        // When notified of an update being available, prompt the user
        this.swUpdate.available.subscribe(() => {
            const toast = this.toastr.info("A new version of SqAC is available. Click to update now.",
                "Update Available", {timeOut: 14000});
            toast.onTap.subscribe(() => {
                // When the user clicks on the prompt, activate the update
                this.swUpdate.activateUpdate().then();
            });
        });

        // When update activation completes, reload the page.
        this.swUpdate.activated.subscribe(() => window.location.reload());

        // Check for update now
        this.swUpdate.checkForUpdate()
            .then(() => console.log("Checked for update"))
            .catch((err) => console.error("Check for update fail", err));
    }

    toggleSidebar() {
        this.showSidebar = !this.showSidebar;

    }

    toggleHelp() {
        const showHelp$ = this.layoutSvc.showHelp$;
        showHelp$.next(!showHelp$.getValue());
    }

    ////////////////// Error Modal /////////////////////

    /**
     * Open a popup to display an unhandled error.
     */
    private showError(error: Error) {
        this.errorMessages.push(error.message);

        if (!this.errorModal.isShown) {
            this.errorTitle = error.name;
            this.errorModal.show();
        }
        this.changeRef.detectChanges();
    }

    /**
     * Close the error modal.
     */
    closeError() {
        this.errorModal.hide();
        this.errorTitle = undefined;
        this.errorMessages = [];
    }
}
