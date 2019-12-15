import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AbstractBaseComponent} from "../../shared/abstract-base.component";
import {Collection} from "../../models/collection";
import {UserService} from "../../services/user.service";
import {CollectionService} from "../../services/collection.service";
import {ActivatedRoute, Params, Router} from "@angular/router";
import {ModuleService} from "../../services/module.service";
import {UserSettings} from "../../models/user-settings";
import {Module} from "../../models/module";
import {ChoreographerService} from "../../services/choreographer.service";
import {ModalDirective} from "ngx-bootstrap";
import {Formation} from "../../models/formation";
import {combineLatest} from "rxjs";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-list-modules',
    templateUrl: './list-modules.component.html',
    styleUrls: ['./list-modules.component.scss']
})
export class ListModulesComponent extends AbstractBaseComponent implements OnInit, OnDestroy {

    /** The collection being viewed */
    collection: Collection;

    /** May this collection be modified? */
    isMutable = false;

    modules: Module[];

    @ViewChild("playModal", { static: true }) playModal: ModalDirective;
    playingModule: Module;

    /** Summary of formations of modules in this collection */
    formationsSummary: StartFormationSummary[];

    constructor(private route: ActivatedRoute,
                private router: Router,
                private choreoSvc: ChoreographerService,
                public collectionSvc: CollectionService,
                public moduleSvc: ModuleService,
                public userSvc: UserService) {
        super();
    }

    ngOnInit() {
        combineLatest([this.userSvc.user$, this.route.params])
            .pipe(takeUntil(this.destroy$))
            .subscribe((values: [UserSettings, Params]) => {
                const user = values[0];
                const cid = values[1]['cid'];
                this.collection = this.collectionSvc.get(cid);

                if (this.collection) {
                    this.isMutable = (this.collection.authorUserId === user.id);
                    this.modules = [];
                    this.modules.push(...this.collection.modules);
                    Module.sort(this.modules);

                    setTimeout(() => this.summarizeModules());
                }
            });
    }

    ngOnDestroy() {
        if (this.playingModule) {
            this.closePlay();
        }

        this.collectionSvc.localSave(this.collection).then();

        super.ngOnDestroy();
    }

    /**
     * User clicked on one of the modules.
     */
    onModuleClick(module: Module) {
        this.router.navigate(['/collections', this.collection.id, 'modules', module.id]).then();
    }

    /**
     * User clicked the Add button
     */
    onCreateModule() {
        if (!this.collection) {
            return;
        }

        const module = new Module();
        module.collection = this.collection;
        this.collection.modules.push(module);
        this.moduleSvc.add(module);

        // Edit it
        this.onModuleClick(module);
    }

    /**
     * Dance a specific module.
     */
    play(module: Module, event: Event) {
        event.stopPropagation();

        this.choreoSvc.playModule(module);
        this.playingModule = module;
        this.playModal.show();
    }

    /**
     * Close the play module modal.
     */
    closePlay() {
        this.playModal.hide();
        delete this.playingModule;
        this.choreoSvc.endTip();
    }

    summarizeModules() {
        if (this.modules.length < 3) {
            this.formationsSummary = null;
            return;
        }

        const summary = new Map<string, StartFormationSummary>();
        for (const module of this.collection.modules) {
            if (!module.startFormation || !module.endFormation) {
                continue;
            }

            let start = summary.get(module.startFormation.id);
            if (!start) {
                start = { formation: module.startFormation, endsMap: new Map<string, EndFormationSummary>(), ends: []};
                summary.set(module.startFormation.id, start);
            }

            let end: EndFormationSummary = start.endsMap.get(module.endFormation.id);
            if (!end) {
                end = { formation: module.endFormation, count: 0};
                start.endsMap.set(module.endFormation.id, end);
            }
            end.count++;
        }

        this.formationsSummary = Array.from(summary.values());
        for (const start of this.formationsSummary) {
            start.ends = Array.from(start.endsMap.values());
            delete start.endsMap;
        }
    }
}

interface StartFormationSummary {
    formation: Formation;
    endsMap?: Map<string, EndFormationSummary>;
    ends: EndFormationSummary[];
}

interface EndFormationSummary {
    formation: Formation;
    count: number;
}
