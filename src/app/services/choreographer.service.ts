/*
 * Square Auto-Choreographer
 * Copyright (c) 2017-2020, Adam Fanello
 * All rights reserved.
 */
import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {Module} from '../models/module';
import {FormationService} from './formation.service';
import {ModuleService} from './module.service';
import {Formation} from '../models/formation';
import {SequencedItem} from '../models/sequenced-item';
import {HandMap} from '../models/hand';
import {FlowDirectionMap} from '../models/flow-direction';
import {compareDanceLevels, DanceLevel} from '../models/dance-level';
import {Difficulty} from '../models/difficulty';
import {DanceSession} from '../models/dance-session';
import * as RandomJs from 'random-js';
import {ToastrService} from 'ngx-toastr';

/**
 * An entry in the stack of active module.
 */
export interface ModuleStackFrame {
    /** The module */
    module: Module;

    /** Index position in the sequence, undefined if not yet started */
    seqPos?: number;

    /** Message explaining how the module was selected */
    explanation?: string;
}

/**
 * The stack of active modules.
 */
export type ModuleStack = ModuleStackFrame[];


/**
 * The past, present, and future sequence of calls.
 */
export class CallTemporality {
    past: SequencedItem[] = [];
    now: SequencedItem;
    future: SequencedItem;

    /** Add an item to the call list */
    add(nextItem: SequencedItem): void {
        if (this.now) {
            this.past.push(this.now);
        }

        this.now = this.future;
        this.future = nextItem;
    }
}

type ModulesByCriteriaLookup = Map<string, Module[]>;

const SQUARED_SET_ID = 'S';

/**
 * Service to generate dance choreopraphy.
 */
@Injectable()
export class ChoreographerService {
    /** Start and end Formation. Matches Formation ID is the default collection. */
    /** Stream of all the current sequence of calls. */
    callList$ = new Subject<CallTemporality>();

    /** Stream that updates whenever the ModuleStack changes */
    moduleStack$ = new Subject<ModuleStack>();

    /** Stream of updates as to whether or not the choreopgrapher is actively generating. Matches isRunning() */
    readonly running$ = new Subject<boolean>();

    /** The active dance session */
    session: DanceSession = new DanceSession();

    /** Has beginTip() been called and not endTip()? */
    haveActiveTip = false;

    /** Running average difficulty level */
    private avgDifficulty = new RunningAverager();

    private callList: CallTemporality;
    private moduleStack: ModuleStack;

    private readonly rndEngine = RandomJs.engines.mt19937().autoSeed();
    private readonly rndContinuationRange = RandomJs.integer(0, 100);

    /**
     * Lookup map of modules that start from a Formation.id as the key.
     * This is a cache pre-filtered by selected maxDanceLevel and maxDifficulty.
     */
    private lookupByStartFormations: ModulesByCriteriaLookup;

    /** Is the generator running? */
    private running = false;

    /** true pause is initiated, but still calling out the stack */
    private pausing = false;

    /** Are we just playing a single module, not a tip? */
    private isPlayModule = false;

    /**
     * Tracks ms time of next call. New call gets added to this so that target timing remains accurate and
     * can make up for time lost due to single-threaded nature of the environment.
     */
    private nextCallTime: number;

    /** Construct */
    constructor(private formationSvc: FormationService,
                private moduleSvc: ModuleService,
                private toastr: ToastrService) {
    }

    /** Beats Per Minute at which to emit choreography */
    get bpm(): number { return this.session.bpm; }
    set bpm(v: number) { this.session.bpm = v; }

    /** Probability driver for continuing to grow the module stack, vs resolving. 0 = end ASAP, 100 = always go deeper */
    get continuationProbability(): number { return this.session.continuationProbability; }
    set continuationProbability(v: number) { this.session.continuationProbability = v; }

    /** Maximum dance level that may be used when selecting modules. */
    get maxDanceLevel(): DanceLevel { return this.session.level; }
    set maxDanceLevel(d: DanceLevel) { this.session.level = d; }

    /** Maximum difficulty level that may be used when selecting modules */
    get maxDifficulty(): Difficulty { return this.session.maxDifficulty; }
    set maxDifficulty(d: Difficulty) { this.session.maxDifficulty = d; }

    /** Desired average difficulty */
    get targetDifficulty(): number { return this.session.targetDifficulty; }
    set targetDifficulty(v: number) { this.session.targetDifficulty = v; }

    /**
     * Are modules available to dance?
     */
    haveChoreography(): boolean {
        return this.lookupByStartFormations.size > 0 || (this.isPlayModule && this.moduleStack.length > 0);
    }

    beginTip() {
        this.avgDifficulty.reset();
        this.isPlayModule = false;
        this.callList = new CallTemporality();
        this.moduleStack = [];
        this.haveActiveTip = true;

        this.moduleSvc.forEach((module) => {
            if (module.usedThisTip) {
                module.usedThisTip = undefined;
            }
        });

        this.callList$.next(this.callList);
        this.moduleStack$.next(this.moduleStack);
    }

    endTip() {
        this.pause();

        this.callList = new CallTemporality();
        this.moduleStack = [];
        this.isPlayModule = false;
        this.haveActiveTip = false;

        this.callList$.next(this.callList);
        this.moduleStack$.next(this.moduleStack);
    }

    /**
     * Play one specific module. Loop if it's a zero, otherwise stop when complete.
     * Must call resume() or next() to actually begin.
     */
    playModule(module: Module) {
        if (this.running) {
            this.endTip();
        }

        this.beginTip();

        this.isPlayModule = true;
        this.moduleStack.push({ module } as ModuleStackFrame);
    }

    /**
     * Stop generating output (immediately)
     */
    pause() {
        this.running = false;
        this.pausing = false;
        this.running$.next(false);
    }

    /**
     * Resume generating output.
     */
    resume() {
        this.pausing = false;
        this.running = true;
        this.running$.next(true);

        // Wait an extra two beats on the next call
        this.nextCallTime = window.performance.now() + (60000 / this.bpm);
        this.next();
    }

    /**
     * Generate next call.
     */
    next() {
        if (this.pausing) {
            this.callList.add(undefined);
            this.callList$.next(this.callList);

            if (!this.callList.now) {
                this.pause();
            }
        }
        else {
            let startedNewModule = false;

            // If stack is empty, we're waiting at a squared set.
            if (this.moduleStack.length === 0) {
                const firstFrame = this.getNextModule(this.formationSvc.get(SQUARED_SET_ID));
                if (firstFrame) {
                    this.moduleStack.push(firstFrame);
                }
            }

            // Get the current module stack frame and advance the sequence position.
            const frame = this.moduleStack[this.moduleStack.length - 1];
            if (frame.seqPos === undefined) {
                // Begin the new module
                startedNewModule = true;
                frame.seqPos = 0;
                frame.module.usedThisTip = true;
            }
            else {
                frame.seqPos++;
            }

            // Push the next call into the list
            this.callList.add(frame.module.sequence[frame.seqPos].resetSubstitution());
            this.callList$.next(this.callList);

            if (startedNewModule) {
                // We had to delay this, because the new call has just been pushed
                // into the call stack's -future- position
                this.moduleStack$.next(this.moduleStack);
            }

            // Was that the last call in the module?
            if (frame.seqPos === frame.module.sequence.length - 1) {
                this.moduleStack.pop();

                // Just playing a single module?
                if (this.isPlayModule) {
                    // Loop the module.
                    this.moduleStack.push({ module: frame.module } as ModuleStackFrame);
                    this.pausing = true;
                }
                // If stack unwound at home, pause.
                else if (this.moduleStack.length === 0 &&
                    frame.module.endFormation.id === SQUARED_SET_ID) {

                    this.pausing = true;
                }
                else {
                    const nextFrame = this.getNextModule(frame.module.endFormation, frame.module);
                    if (nextFrame) {
                        this.moduleStack.push(nextFrame);
                    }
                    else {
                        // Failed to find a module
                        return;
                    }
                }
            }
        }

        // Schedule next
        if (this.running) {
            const waitBeats = this.callList.now ? this.callList.now.call.beats : 1;
            this.nextCallTime += ((60000 / this.bpm) * waitBeats);
            const delay = this.nextCallTime - window.performance.now();
            window.setTimeout(() => {
                if (this.running) {
                    this.next();
                }
            }, delay > 0 ? delay : 0);
        }
    }

    /**
     * Reset criteria based on the given dance session.
     * (Must call activateCriteria() some time after this.)
     */
    useDanceSession(danceSession: DanceSession) {
        if (danceSession) {
            this.session = danceSession;
        }
        else {
            this.session = new DanceSession();
        }
    }

    /**
     * Activate any modifications to module selection criteria.
     */
    activateCriteria() {
        const t0 = performance.now();
        this.lookupByStartFormations = new Map() as ModulesByCriteriaLookup;

        console.debug("Enabled collections: " + (this.session.enabledCollections.size || 'all'));
        console.debug("Enabled families: " + (this.session.enabledFamilies.size || 'all'));
        console.debug("Max difficulty: " + this.maxDifficulty);
        console.debug("Max level: " + this.maxDanceLevel);

        const acceptCollections = (this.session.enabledCollections.size > 0) ? this.session.enabledCollections : null;
        const acceptFamilies = (this.session.enabledFamilies.size > 0) ? this.session.enabledFamilies : null;
        let moduleCount = 0;
        this.moduleSvc.forEach((module) => {
            if (acceptCollections && !acceptCollections.has(module.collection.id)) {
                return;
            }

            if (compareDanceLevels(module.level, this.maxDanceLevel) > 0) {
                return;
            }

            if (module.difficulty > this.maxDifficulty) {
                return;
            }

            if (acceptFamilies) {
                for (const seq of module.sequence) {
                    if (seq.call && !acceptFamilies.has(seq.call.family.id)) {
                        return;
                    }
                }
            }

            const startFormationId = module.startFormation.id;
            let formationLookup = this.lookupByStartFormations.get(startFormationId);
            if (formationLookup == undefined) {
                formationLookup = [] as Module[];
                this.lookupByStartFormations.set(startFormationId, formationLookup);
            }

            if (module.usedThisTip) {
                module.usedThisTip = undefined;
            }

            formationLookup.push(module);
            ++moduleCount;
        });

        const t1 = performance.now();
        console.log(`ActivateCriteria took ${t1 - t0} ms to find ${moduleCount} modules`);
    }

    /**
     * Search for the next Module to use and return it.
     *
     * @param formation current formation
     * @param prev previous Module, which this new one is to flow from.
     * @return the next ModuleStackFrame if module found, null if no module to flow to
     */
    private getNextModule(formation: Formation, prev?: Module): ModuleStackFrame|null {
        const t0 = performance.now();
        const doResolve = this.rndContinuationRange(this.rndEngine) > this.continuationProbability;
        console.log(`Continue ${this.continuationProbability}% = ${!doResolve}`);

        // Find all candidate module based on the current formation.
        const allCandidates: Module[] = this.lookupByStartFormations.get(formation.id);

        if (allCandidates.length === 0) {
            const message = `No module found that starts from formation ${formation.abbreviation}!`;
            this.toastr.error(message, 'Insufficient Module Variety', {timeOut: 10000});
            console.warn(message);
            this.pause();
            return null;
        }

        /*
         * Shuffle the candidates, so that we can then deterministically try each one in each pass.
         */
        RandomJs.shuffle(this.rndEngine, allCandidates);

        /*
         * Randomly pick a module - try to find a good one!
         *
         * Pass #1: Find perfect match on difficulty, flow, hands, previous use, and resolve.
         * Pass #2: Match on difficulty, flow, hands, & previous use. Don't worry about resolve.
         * Pass #3: Match on flow, hands, and previous use. Don't worry about difficulty.
         * Pass #4: Match on flow and hands only.
         * Pass #5: It's going to be bad; take anything we can get.
         */
        const currentAvgDifficulty = this.avgDifficulty.get();
        const targetDifficulty = Math.min(this.targetDifficulty, this.maxDifficulty);
        for (let passNum = 1; ; ++passNum) {

            // Skip pass 4 if no prev module
            if (!prev && passNum === 4) {
                passNum++;
            }

            for (const m of allCandidates) {
                // Pass 1 - Check resolution
                if (passNum === 1) {
                    // Reject if module resolution doesn't match desire to resolve (or not)
                    const willResolve = (m.endFormation.id === SQUARED_SET_ID);
                    if ((doResolve && !willResolve) || (!doResolve && willResolve)) {
                        continue;
                    }
                }

                // Pass 1 & 2: Check difficulty
                if (passNum <= 2) {
                    // Reject module if criteria not met
                    if (
                        // Moving in right direction? Good
                        (currentAvgDifficulty < targetDifficulty && m.difficulty >= currentAvgDifficulty) ||
                        (currentAvgDifficulty > targetDifficulty && m.difficulty <= currentAvgDifficulty) ||
                        // New avg within 1 level of target, it's fine
                        (Math.abs(this.avgDifficulty.getIf(m.difficulty) - targetDifficulty) < 0.5)
                    ) {
                        // good
                    } else {
                        // console.log("Rejected module with difficulty " + m.difficulty);
                        continue;
                    }
                }

                // Pass 1 & 2 & 3: Check prior use this tip
                if (passNum <= 3 && m.usedThisTip) {
                    console.debug('Skipping repeat module: ' + m.name);
                    continue;
                }

                // Pass 1 & 2 & 3 & 4: Check hand use and flow
                if (prev && passNum <= 4) {
                    // Filter based on previous module
                    if (HandMap[prev.endHandBelle].violation !== m.startHandBelle
                        && HandMap[prev.endHandBeau].violation !== m.startHandBeau
                        && FlowDirectionMap[prev.endFlowBelle].bad !== m.startFlowBelle
                        && FlowDirectionMap[prev.endFlowBeau].bad !== m.startFlowBeau
                    ) {
                        // good
                    }
                    else {
                        continue;
                    }
                }

                // Got here without rejection? We have a winner!
                if (prev && passNum === 5) {
                    console.warn(`No module match for ${formation.abbreviation} beau ` +
                        `${prev.endHandBeau}/${prev.endFlowBeau} & belle ${prev.endHandBelle}/${prev.endFlowBelle}`);
                    this.toastr.warning("Bad flow or hand use in next module.");
                }

                // console.log("Selected difficulty " + m.difficulty);
                this.avgDifficulty.add(m.difficulty);
                const explanation = this.generateSelectionExplanation(t0, passNum);
                return { module: m, explanation } as ModuleStackFrame;
            }// for each candidate
        }// for passNum
    }

    /**
     * Explain how the module was selected.
     * Warn the user of a performance problem if it takes more than half a beat to find the next module.
     * @param startTime unixtime when search began, for calculating time spent
     * @param passNum How many passes it took to find the module
     */
    private generateSelectionExplanation(startTime: number, passNum: number): string {
        const delta = Math.round(performance.now() - startTime);

        // Could check for 60000/bpm/2, but the extra computation seems pointless; it won't be far off from 128 bpm.
        if (delta > 234) {
            this.toastr.warning("Performance warning", undefined, {timeOut: 1000});
        }

        const avgDiff = Math.floor(this.avgDifficulty.get() * 10) / 10;
        let text = `Found module in ${delta} ms on attempt #${passNum}, Avg Difficulty ${avgDiff}. `;
        switch (passNum) {
            case 1:
                text += 'Perfect match.';
                break;
            case 2:
                text += 'Near match.';
                break;
            case 3:
                text += 'Difficulty drifted.';
                break;
            case 4:
                text += 'Previously used.';
                break;
            case 5:
                text += 'Bad flow or hand use.';
                break;
        }

        console.info(text);
        return text;
    }
}

/**
 * Utility class for tracking an average number.
 */
class RunningAverager {
    private total: number;
    private dataPointCount: number;

    constructor() {
        this.reset();
    }

    /** Reset data */
    reset() {
        this.total = 0;
        this.dataPointCount = 0;
    }

    /** Add a data point to average */
    add(dataPoint: number) {
        this.total += dataPoint;
        this.dataPointCount++;
    }

    /** Get the current average */
    get(): number {
        return this.total / this.dataPointCount;
    }

    /** Get what the average would be IF this new data point were added */
    getIf(dataPoint: number) {
        return (this.total + dataPoint) / (this.dataPointCount + 1);
    }
}
