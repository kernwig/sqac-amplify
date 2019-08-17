import {NgModule} from '@angular/core';

import {SharedModule} from "../shared/shared.module";
import {WidgetsModule} from "../widgets/widgets.module";
import {CollectionsRoutingModule} from './collections-routing.module';
import {ListCollectionsComponent} from './list-collections.component';
import {EditCallsComponent} from './call/edit-calls.component';
import {EditFamiliesComponent} from './family/edit-families.component';
import {EditFormationsComponent} from './formation/edit-formations.component';
import {ListModulesComponent} from './module/list-modules.component';
import {EditModuleComponent} from './module/edit-module.component';
import {SearchableInputComponent} from "./widget/searchable-input.component";
import { CollectionFilterComponent } from './widget/collection-filter.component';
import { SearchCollectionsComponent } from './search-collections.component';
import { CollectionFilterPipe } from './pipe/collection-filter.pipe';
import { OnlyOwnerMessageComponent } from './widget/only-owner-message.component';
import { OneCollectionComponent } from './widget/one-collection.component';

@NgModule({
    imports: [
        SharedModule, WidgetsModule,
        CollectionsRoutingModule
    ],
    declarations: [
        ListCollectionsComponent,
        EditCallsComponent,
        EditFamiliesComponent,
        EditFormationsComponent,
        ListModulesComponent, EditModuleComponent,
        // Widgets
        SearchableInputComponent,
        CollectionFilterComponent,
        SearchCollectionsComponent,
        CollectionFilterPipe,
        OnlyOwnerMessageComponent,
        OneCollectionComponent
    ]
})
export class CollectionsModule {
}
