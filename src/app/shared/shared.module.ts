import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterModule} from '@angular/router';

/* External Modules */
import {ButtonsModule} from 'ngx-bootstrap/buttons';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {ModalModule} from 'ngx-bootstrap/modal';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {PopoverModule} from 'ngx-bootstrap/popover';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {SidebarModule} from 'ng-sidebar';

//
// Pipes
//
import {DanceLevelPipe} from "../models/dance-level";
import {DifficultyPipe} from "../models/difficulty";
import {FlowDirectionPipe} from "../models/flow-direction";
import {HandPipe} from "../models/hand";

/** Pipes to declare and export */
const SHARED_PIPES = [
    DanceLevelPipe, DifficultyPipe, FlowDirectionPipe, HandPipe
];

//
// Components
//
import { PageContentComponent } from './page-content.component';

/** Components & Directives to declare and export */
const SHARED_COMPONENTS = [
    PageContentComponent
];


/**
 * The Shared module holds the common components, directives, and pipes and shares them with the modules that need them.
 *
 * Notes:
 * - Services and related models go in the Services module, not here.
 * - If a component, directive, or pipe is only needed by a single feature, it belongs within that feature's module.
 *
 * @see https://angular.io/docs/ts/latest/guide/ngmodule.html#!#shared-module
 */
@NgModule({
    imports: [
        // Angular stuff
        CommonModule,
        FormsModule,
        RouterModule,
        // Bootstrap stuff
        BsDropdownModule.forRoot(),
        ButtonsModule.forRoot(),
        CollapseModule.forRoot(),
        ModalModule.forRoot(),
        PopoverModule.forRoot(),
        TabsModule.forRoot(),
        TooltipModule.forRoot(),
        // Other stuff
        SidebarModule.forRoot(),
    ],
    declarations: [
        ...SHARED_COMPONENTS,
        ...SHARED_PIPES,
    ],
    exports: [
        // Shared module stuff;
        ...SHARED_COMPONENTS,
        ...SHARED_PIPES,

        // Angular stuff
        CommonModule, FormsModule,
        // Bootstrap stuff
        ButtonsModule, BsDropdownModule, CollapseModule,
        ModalModule, PopoverModule,
        TabsModule, TooltipModule,
        // Other stuff
        SidebarModule
    ]
})
export class SharedModule {
}
