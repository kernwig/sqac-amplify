import {Component, OnInit} from "@angular/core";
import {Module} from "../models/module";
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {ChoreographerService, ModuleStack} from "../services/choreographer.service";
import {DanceLevels} from "../models/dance-level";
import {CollectionService} from "../services/collection.service";
import {UserService} from "../services/user.service";
import {UserSettings} from "../models/user-settings";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-dance-page',
    templateUrl: './dance-page.component.html',
    styleUrls: ['./dance-page.component.scss']
})
export class DancePageComponent extends AbstractBaseComponent implements OnInit {

    readonly availableDanceLevels = DanceLevels;

    currentModule: Module = undefined;

    constructor(public choreoSvc: ChoreographerService,
                private collectionSvc: CollectionService,
                private userSvc: UserService
    ) {
        super();
    }

    ngOnInit() {
        this.choreoSvc.moduleStack$.pipe(takeUntil(this.destroy$))
            .subscribe((stack: ModuleStack) => {
                if (stack.length === 0) {
                    this.currentModule = undefined;
                }
                else {
                    this.currentModule = stack[stack.length - 1].module;
                }
            });

        // If collections change (refresh) while on the Dance page,
        // have the Choreo service update.
        this.collectionSvc.changed$.pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.choreoSvc.activateCriteria();
            });

        // Initialize the active session
        this.userSvc.user$
            .pipe(takeUntil(this.destroy$))
            .subscribe((settings: UserSettings) => {
                this.choreoSvc.useDanceSession(settings ? settings.activeSession : null);
                this.choreoSvc.activateCriteria();
            });
    }
}
