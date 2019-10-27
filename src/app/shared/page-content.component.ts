import {Component, OnInit} from '@angular/core';
import {LayoutService} from "../services/layout.service";

/**
 * Top-level component for most pages.
 * Put the main page content in a <main> element,
 * and documentation in an <aside> element.
 */
@Component({
    selector: 'sqac-page-content',
    template: `
        <ng-sidebar-container backdropClass="help-backdrop">
            <ng-sidebar [opened]="layoutSvc.showHelp$|async" [closeOnClickOutside]="true" [closeOnClickBackdrop]="true" [autoFocus]="false"
                        mode="over" position="right" sidebarClass="help-sidebar" [showBackdrop]="true">
                <div class="panel panel-info">
                    <div class="panel-heading">
                        <span class="panel-title text-large">
                            Documentation
                        </span>
                        <span class="pull-right">
                            <button type="button" class="close" (click)="layoutSvc.showHelp$.next(false)">&times;</button>
                        </span>
                    </div>
                    <div class="panel-body">
                        <ng-content select="aside"></ng-content>
                    </div>
                </div>
            </ng-sidebar>
            <div ng-sidebar-content class="container-fluid content-area">
                <ng-content select="main"></ng-content>
            </div>
        </ng-sidebar-container>
    `,
    styleUrls: ['./page-content.component.scss']
})
export class PageContentComponent implements OnInit {
    constructor(public layoutSvc: LayoutService) {
    }

    ngOnInit(): void {
        // Delay - page navigation just cleared this, and now we're setting a value again
        // during the same cycle.
        setTimeout(() => this.layoutSvc.showHelp$.next(false));
    }
}
