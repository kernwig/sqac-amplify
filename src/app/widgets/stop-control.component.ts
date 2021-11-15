import {Component} from "@angular/core";
import {ChoreographerService} from "../services/choreographer.service";
import {AbstractBaseComponent} from "../shared/abstract-base.component";

@Component({
    selector: 'sqac-stop-control',
    template: `
        <div *ngIf="choreoSvc.haveActiveTip$ | async">
            <button (click)="stopModal.show()"
                    type="button" class="btn btn-default btn-circle btn-danger btn-lg">
                <span class="glyphicon glyphicon-stop"></span>
            </button>
        </div>

        <!-- STOP Confirmation Modal -->
        <div [config]="{backdrop: true}"
             class="modal fade" bsModal #stopModal="bs-modal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title md-danger">End this Tip?</h4>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger pull-left" (click)="stopModal.hide(); stop();">
                            <span class="glyphicon glyphicon-stop"></span>
                            End Tip
                        </button>
                        <button type="button" class="btn btn-success pull-right" (click)="stopModal.hide()">
                            <span class="glyphicon glyphicon-forward"></span>
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>

    `,
    styles: [`
        button {
            margin-bottom: 6px;
        }
    `]
})
export class StopControlComponent extends AbstractBaseComponent {

    constructor(public choreoSvc: ChoreographerService) {
        super();
    }

    stop() {
        this.choreoSvc.endTip();
    }
}
