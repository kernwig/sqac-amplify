import {Component, OnInit} from "@angular/core";
import {CallTemporality, ChoreographerService} from "../services/choreographer.service";
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {takeUntil} from "rxjs/operators";


@Component({
    selector: 'sqac-command-listing',
    template: `
        <div class="panel panel-default">
            <div class="panel-body">
                <h3 class="text-muted">{{prev1}}</h3>
                <h2>{{current}}</h2>
                <h3 class="text-muted">{{next}}</h3>
            </div>
        </div>
    `,
    styles: [`
        h2 {
            display: table-cell;
            vertical-align: middle;
            height: 8vw;
            font-size: 4vw;
            font-weight: bolder;
        }
        h3 {
            font-size: 3.3vw;
            height: 3.7vw;
        }

        h2, h3 {
            margin-top: 0;
            margin-bottom: 0.7vw;
            overflow: hidden;
        }
        .panel-body {
            height: 18vw;
            padding: 1.5vw;
        }
    `]
})
export class CommandListingComponent extends AbstractBaseComponent implements OnInit {

    /** Previous command */
    prev1 = '';
    /** Current command */
    current = '';
    /** Next command */
    next = '';


    constructor(public choreoSvc: ChoreographerService) {
        super();
    }

    ngOnInit() {
        this.choreoSvc.callList$.pipe(takeUntil(this.destroy$))
            .subscribe((calls: CallTemporality) => this.onChoreoCallChange(calls));
    }

    onChoreoCallChange(callTemporality: CallTemporality): void {
        const pastSize = callTemporality.past.length;
        if (pastSize === 0) {
            this.prev1 = '';
        }
        else {
            this.prev1 = callTemporality.past[pastSize - 1].displayText;
        }

        this.current = callTemporality.now ? callTemporality.now.displayText : '';
        this.next = callTemporality.future ? callTemporality.future.displayText : '';
    }
}
