import {ErrorHandler, NgModule, Optional, SkipSelf} from "@angular/core";
import {CommonModule} from "@angular/common";
import {CallService} from "./call.service";
import {ChoreographerService} from "./choreographer.service";
import {CollectionService} from "./collection.service";
import {FamilyService} from "./family.service";
import {PersistenceService} from "./persistence.service";
import {FormationService} from "./formation.service";
import {ModuleService} from "./module.service";
import {UserService} from "./user.service";
import {ErrorCatchingService} from "./error-catching.service";
import {SyncService} from "./sync.service";
import {LayoutService} from "./layout.service";

/** ErrorCatchingService _is_ the ErrorHandler. Use the same instance. */
export function errorHandlerFactory(errorSvc: ErrorCatchingService): ErrorHandler {
    return errorSvc;
}

@NgModule({
    imports: [
        CommonModule
    ],
    providers: [
        CallService,
        ChoreographerService,
        CollectionService,
        ErrorCatchingService,
        FamilyService,
        FormationService,
        LayoutService,
        ModuleService,
        PersistenceService,
        SyncService,
        UserService,
        {
            provide: ErrorHandler,
            useFactory: errorHandlerFactory,
            deps: [ErrorCatchingService]
        }
    ]
})
export class ServicesModule {

    /** "One weird trick" to make sure we don't import CoreModule more than once. */
    constructor(@Optional() @SkipSelf() parentModule: ServicesModule) {
        if (parentModule) {
            throw new Error(
                'ServicesModule is already loaded. Import it in the AppModule only');
        }
    }
}
