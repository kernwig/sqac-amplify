import {Component, OnDestroy, OnInit} from "@angular/core";
import {Collection} from "../../models/collection";
import {Module} from "../../models/module";
import {compareDanceLevels, DanceLevel} from "../../models/dance-level";
import {Difficulties} from "../../models/difficulty";
import {Hands} from "../../models/hand";
import {FlowDirections} from "../../models/flow-direction";
import {Formation} from "../../models/formation";
import {Call} from "../../models/call";
import {SequencedItem} from "../../models/sequenced-item";
import {CallService} from "../../services/call.service";
import {CollectionService} from "../../services/collection.service";
import {FormationService} from "../../services/formation.service";
import {ModuleService} from "../../services/module.service";
import {UserService} from "../../services/user.service";
import {ActivatedRoute, Params, Router} from "@angular/router";
import {AbstractBaseComponent} from "../../shared/abstract-base.component";
import {UserSettings} from "../../models/user-settings";
import {SyncService} from "../../services/sync.service";
import {ChoreographerService} from "../../services/choreographer.service";
import {combineLatest} from "rxjs";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-edit-module',
    templateUrl: './edit-module.component.html',
    styleUrls: ['./edit-module.component.scss']
})
export class EditModuleComponent extends AbstractBaseComponent implements OnInit, OnDestroy {

    readonly availableDifficulties = Difficulties;
    readonly availableHands = Hands;
    readonly availableFlowDirections = FlowDirections;
    readonly availableFormations: Formation[] = [];
    readonly availableCalls: Call[] = [];

    /** Collection that the module resides in */
    collection: Collection;

    /** Module being edited */
    module: Module;

    /** Module has been modified */
    isDirty = false;

    /** Call being added to the sequence. */
    addingCall: Call = undefined;

    /** May this module be modified? */
    isMutable = false;

    /** Is this module name unique? */
    isNameUnique = true;

    /** Construct */
    constructor(
        private callSvc: CallService,
        private collectionSvc: CollectionService,
        private formationSvc: FormationService,
        private moduleSvc: ModuleService,
        private route: ActivatedRoute,
        private router: Router,
        public userSvc: UserService,
        private syncSvc: SyncService,
        public choreoSvc: ChoreographerService
    ) {
        super();
    }

    /**
     * Initialize Page
     */
    ngOnInit() {
        combineLatest([this.userSvc.user$, this.route.params])
            .pipe(takeUntil(this.destroy$))
            .subscribe((values: [UserSettings, Params]) => {
                const user = values[0];
                const cid = values[1].cid;
                this.collection = this.collectionSvc.get(cid);

                const mid = values[1].mid;
                this.module = this.moduleSvc.get(mid);

                if (this.collection && this.module) {
                    this.isMutable = (this.collection.authorUserId === user.id);

                    if (this.isMutable) {
                        this.availableFormations.length = 0;
                        this.formationSvc.forEach(f => this.availableFormations.push(f));
                        Formation.sort(this.availableFormations);

                        this.availableCalls.length = 0;
                        this.callSvc.forEach(c => this.availableCalls.push(c));
                    }
                }

                window.scrollTo(0, 0);
            });
    }

    /**
     * Leaving page.
     */
    ngOnDestroy() {
        if (this.collection && this.module && this.isDirty) {
            const m = this.module;

            // Set available flag
            m.isAvailable = (
                m.name && m.level != null &&
                m.startFormation && m.endFormation &&
                m.startHandBelle && m.startHandBeau && m.endHandBelle && m.endHandBeau &&
                m.endFlowBelle && m.endFlowBeau &&
                m.difficulty != null && m.sequence.length > 0
            );

            if (m.isAvailable) {
                if (m.difficulty > this.collection.difficulty) {
                    this.collection.difficulty = m.difficulty;
                }

                if (compareDanceLevels(m.level, this.collection.level) > 0) {
                    this.collection.level = m.level;
                }
            }

            // Store changes.
            this.syncSvc.setDirty(this.collection);
            this.collectionSvc.localSave(this.collection).then();
        }

        super.ngOnDestroy();
    }

    /**
     * Return how many beats a module takes to dance.
     */
    getTotalBeats(m: Module) {
        let count = 0;
        for (const seq of m.sequence) {
            if (seq.call) {
                count += seq.call.beats;
            }
        }

        return count;
    }

    /**
     * Return how many seconds a module takes to dance, at curret BPM
     */
    getTotalSeconds(m: Module) {
        return Math.round(this.getTotalBeats(m) / this.choreoSvc.bpm * 60);
    }

    /**
     * User has confirmed it: Delete this module!
     */
    onDeleteModule() {
        this.collection.modules = this.collection.modules.filter(m => m.id !== this.module.id);
        this.module = undefined;

        this.syncSvc.setDirty(this.collection);

        this.router.navigate(['/collections', this.collection.id, 'modules']).then();
    }

    /**
     * Add a new SequenceItem to the end of the sequence, featuring the given call.
     */
    addSeqItem(call: Call) {
        if (call) {
            const item = new SequencedItem();
            item.call = call;
            this.module.sequence.push(item);
            this.setModifiedLevel();
            this.addingCall = null;
        }
    }

    /**
     * Remove a SequenceItem from the sequence.
     */
    deleteSeqItem(itemIdx: number) {
        this.module.sequence.splice(itemIdx, 1);
        this.setModifiedLevel();
    }

    /**
     * Move a SequenceItem down one position in the sequence.
     */
    moveSeqItemDown(itemIdx: number) {
        const movingItem = this.module.sequence.splice(itemIdx, 1);
        this.module.sequence.splice(itemIdx + 1, 0, movingItem[0]);
    }

    /**
     * Toggle a call's concurrentWithNext flag
     */
    toggleConcurrency(item: SequencedItem) {
        item.concurrentWithNext = !item.concurrentWithNext;
        this.setModified();
    }

    checkUniqueName() {
        this.isNameUnique = true;
        const iter = this.moduleSvc.values();
        for (let next = iter.next(); !next.done; next = iter.next()) {
            const m = next.value;
            if (m.id !== this.module.id && m.name === this.module.name) {
                this.isNameUnique = false;
                break;
            }
        }

        this.setModified();
    }
    setModified() {
        this.isDirty = true;
    }

    /**
     * Modified in a way that may change level.
     */
    setModifiedLevel() {
        this.setModified();

        this.module.level =
            this.module.sequence.reduce((level: DanceLevel, item: SequencedItem) => {
                if (item.call) {
                    const callLevel = item.call.family.level;
                    return (compareDanceLevels(callLevel, level) > 0) ? callLevel : level;
                }
                else {
                    return level;
                }
            }, "NO" as DanceLevel);
    }
}
