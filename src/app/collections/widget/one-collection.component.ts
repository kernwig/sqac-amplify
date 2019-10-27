import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Collection} from "../../models/collection";

@Component({
    selector: 'sqac-one-collection',
    templateUrl: './one-collection.component.html',
})
export class OneCollectionComponent {

    /** The Collection to display */
    @Input() collection: Collection;

    /** CSS classes to select the icon for the visibility field */
    @Input() visibilityIcon: string;

    /** Is this being displayed on the collection history screen? When true but isHistory=false, this is the active revision. */
    @Input() isOnHistoryScreen = false;

    /** Is this an old revision */
    @Input() isHistory = false;

    /** Is the current user the author of this collection? */
    @Input() isAuthor: boolean;

    /** Fired when user wants to unsubscribe */
    @Output() unsubscribe = new EventEmitter();

    /** Fired when user wants to edit */
    @Output() edit = new EventEmitter();

    /**
     * When isHistory=false, indicates the user wants to view history.
     * When isHistory=true, indicates the user wish to restore this revision
     */
    @Output() history = new EventEmitter();

    constructor() {
    }
}
