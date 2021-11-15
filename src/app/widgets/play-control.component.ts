import {Component, HostListener} from "@angular/core";
import {ChoreographerService} from "../services/choreographer.service";
import {AbstractBaseComponent} from "../shared/abstract-base.component";
import {ToastrService} from "ngx-toastr";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'sqac-play-control',
    template: `
        <div *ngIf="!isPlaying">
            <button (click)="play()"
                    type="button" class="btn btn-default btn-circle btn-primary btn-lg">
                <span class="glyphicon glyphicon-play"></span>
            </button>
        </div>
        <div *ngIf="!isPlaying">
            <button (click)="nextOne()"
                    type="button" class="btn btn-default btn-circle btn-success btn-lg">
                <span class="glyphicon glyphicon-forward"></span>
            </button>
        </div>
        <div *ngIf="isPlaying" >
            <button (click)="pause()"
                    type="button" class="btn btn-default btn-circle btn-warning btn-lg">
                <span class="glyphicon glyphicon-pause"></span>
            </button>
        </div>
    `,
    styles: [`
        button {
            margin-bottom: 6px;
        }
    `]
})
export class PlayControlComponent extends AbstractBaseComponent {

    inProgress = false;
    isPlaying = false;

    constructor(public choreoSvc: ChoreographerService,
                private toastr: ToastrService) {
        super();
        this.choreoSvc.running$.pipe(takeUntil(this.destroy$))
            .subscribe((isRunning: boolean) => {
                this.isPlaying = isRunning;
                if (isRunning) {
                    this.inProgress = true;
                }
            });
    }

    play() {
        if (!this.choreoSvc.haveActiveTip$.getValue()) {
            if (!this.choreoSvc.haveChoreography()) {
                this.toastr.warning("No collections loaded.");
                return;
            }

            this.choreoSvc.beginTip();
        }

        this.choreoSvc.resume();
    }

    pause() {
        this.choreoSvc.pause();
    }

    nextOne() {
        if (!this.choreoSvc.haveActiveTip$.getValue()) {
            if (!this.choreoSvc.haveChoreography()) {
                this.toastr.warning("No collections loaded.");
                return;
            }

            this.choreoSvc.beginTip();
        }

        this.choreoSvc.next();
    }

    @HostListener('window:keydown', ['$event'])
    hotkeys(ev: KeyboardEvent) {
        switch (ev.key) {
            case 'P':
            case 'p': {
                if (this.isPlaying) {
                    this.pause();
                }
                else {
                    this.play();
                }
                break;
            }

            case 'ArrowRight':
            case 'N':
            case 'n': {
                if (!this.isPlaying) {
                    this.nextOne();
                }
                break;
            }
        }
    }
}
