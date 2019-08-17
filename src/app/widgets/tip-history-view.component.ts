import {Component, HostListener, OnInit} from "@angular/core";
import {CallTemporality, ChoreographerService, ModuleStack} from "../services/choreographer.service";
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {takeUntil} from "rxjs/operators";

const MAX_LOG_SIZE = 100;

@Component({
    selector: 'sqac-tip-history-view',
    template: `
        <div class="panel panel-default">
            <div class="panel-heading" (click)="showBody = !showBody">
                <label class="panel-title">Tip history:</label>
                <span class="glyphicon {{showBody ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right'}}"></span>
            </div>
            <div class="panel-body" *ngIf="showBody">
                <div *ngFor="let line of choreoLog">
                    <span *ngIf="line.charAt(0)===' '">&nbsp;{{line}}</span>
                    <span *ngIf="line.charAt(0)==='('" class="text-primary">{{line}}</span> 
                </div>
            </div>
        </div>
    `,
    styles: []
})
export class TipHistoryViewComponent extends AbstractBaseComponent implements OnInit {

    choreoLog: string[] = [];
    showBody: boolean = false;

    constructor(public choreoSvc: ChoreographerService) {
        super();
    }

    ngOnInit() {
        this.choreoSvc.moduleStack$.pipe(takeUntil(this.destroy$))
            .subscribe((stack: ModuleStack) => this.onChoreoModuleChange(stack));

        this.choreoSvc.callList$.pipe(takeUntil(this.destroy$))
            .subscribe((calls: CallTemporality) => this.onChoreoCallChange(calls));
    }

    onChoreoModuleChange(stack: ModuleStack): void {
        if (stack.length === 0) {
            this.choreoLog = [];
        }
        else {
            const frame = stack[stack.length - 1];
            const module = frame.module;
            this.addToLog(
                `(${module.name} [${module.startFormation.abbreviation} -> ${module.endFormation.abbreviation}] ${frame.explanation})`);
        }
    }

    onChoreoCallChange(callTemporality: CallTemporality): void {
        let item = callTemporality.now;
        if (item) {
            this.addToLog(' ' + item.displayText);
        }
    }

    /**
     * Add a line to the log, and control its size.
     */
    private addToLog(text: string) {
        this.choreoLog.push(text);

        if (this.choreoLog.length > MAX_LOG_SIZE) {
            this.choreoLog.shift();
        }
    }

    @HostListener('window:keydown', ['$event'])
    hotkeys(ev : KeyboardEvent) {
        switch (ev.key) {
            case 'H':
            case 'h': {
                this.showBody = !this.showBody;
                break;
            }
        }
    }
}
