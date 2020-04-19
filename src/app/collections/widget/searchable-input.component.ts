import {Component, Input, Output, EventEmitter, ViewChild, ElementRef} from "@angular/core";
import {BsDropdownMenuDirective} from "ngx-bootstrap";

export interface SearchItem {
    /** Unique ID */
    id: string;
    /** Text to display && search on */
    searchableName: string;
}

@Component({
    selector: 'sqac-searchable-input',
    template: `
        <div dropdown container="body" [isOpen]="matchedItems?.length > 0" [dropup]="showAbove">
            <div class="input-group">
                <input #inputBar class="form-control"
                       [placeholder]="selection?.searchableName || ''"
                       (input)="applySearch()"
                       (blur)="onBlur()"
                       (keyup)="onKeyup($event)">
                <span *ngIf="matchedItems?.length === 0" class="input-group-addon" (click)="inputBar.focus()">
                    <span class="glyphicon glyphicon-search"></span>
                </span>
                <span *ngIf="matchedItems?.length > 0" class="input-group-addon" (click)="clear()">
                    <span class="glyphicon glyphicon-remove"></span>
                </span>
            </div>
            <ul class="dropdown-menu search-popup" *dropdownMenu #matchItemList>
                <li *ngFor="let item of matchedItems; let idx=index"
                    [ngClass]="{'bg-primary': idx === highlightMatchIdx}"
                    (click)="onMatchClick(item)">
                    {{ item.searchableName }}
                </li>
            </ul>
            <span #scrollIntoView></span>
        </div>
    `,
    styles: [`
        /* Dark placeholder shows the value until focus, then it fades to light grey for typing */
        input::-webkit-input-placeholder { color: #333; }
        input:focus::-webkit-input-placeholder { color: #999; }
        input::-moz-placeholder { color: #333; }
        input:focus::-moz-placeholder { color: #999; }
        input:-ms-input-placeholder { color: #333; }
        input:focus:-ms-input-placeholder { color: #999; }
        .search-popup { width: 20em; }
    `]
})
export class SearchableInputComponent<T extends SearchItem> {
    /** Ordered list of available items */
    @Input() availableItems: T[];
    /** Current selection to display */
    @Input() selection: T;

    /** Emit when selection changes */
    @Output() selectionChange = new EventEmitter<T>();

    /** Show the matches above the input (true) or below (false)? */
    showAbove = false;

    @ViewChild('inputBar', { static: true }) inputBar: ElementRef;
    @ViewChild('matchItemList') matchItemList: BsDropdownMenuDirective;
    @ViewChild('scrollIntoView', { static: true }) scrollIntoViewElem: ElementRef;

    /** availableItems filtered by search input */
    matchedItems = [] as T[];

    highlightMatchIdx = 0;

    /**
     * Update matchedItems.
     */
    applySearch(): void {
        const inputBar: HTMLInputElement = this.inputBar.nativeElement;
        const search = inputBar.value as string;

        if (search) {
            // Match anything with the characters in the order given
            let exp = '';
            for (const c of search) {
                exp += '.*' + c;
            }
            const rexp = new RegExp(exp, 'i');
            const list = this.availableItems
                .filter(item => rexp.test(item.searchableName))
                .sort((a, b) => a.searchableName.length - b.searchableName.length);
            this.matchedItems = list.length > 10 ? list.slice(0, 10) : list;
            this.highlightMatchIdx = 0;

            this.showAbove = inputBar.getBoundingClientRect().top > (window.innerHeight / 2);
        }
        else {
            this.clear();
        }
    }

    /** Reset all */
    clear(): void {
        this.inputBar.nativeElement.value = '';
        this.matchedItems = [];
    }

    /** User clicked on a matchItem */
    onMatchClick(item: T) {
        this.selectionChange.emit(item);
        this.clear();
    }

    onBlur() {
        // Delay processing. Should blur be caused by some other event that will handle this better.
        // Clicking a match and pressing tab both cause blur, but onMatchClick() and onKeyup() handle these better.
        setTimeout(() => this.finish(), 200);
    }

    finish() {
        if (this.matchedItems && this.highlightMatchIdx < this.matchedItems.length) {
            this.onMatchClick(this.matchedItems[this.highlightMatchIdx]);
        }
        else {
            this.clear();
        }
    }

    onKeyup(event: KeyboardEvent) {
        // noinspection JSDeprecatedSymbols
        switch (event.keyCode) {
            case 9: // tab
            case 13: // enter
                this.finish();
                break;
            case 27: // etc
                this.clear();
                break;
            case 33: // page up
                this.highlightMatchIdx = 0;
                event.stopPropagation();
                event.preventDefault();
                break;
            case 34: // page down
                this.highlightMatchIdx = (this.matchedItems ? this.matchedItems.length - 1 : 0);
                event.stopPropagation();
                event.preventDefault();
                break;
            case 38: // cursor up
                if (this.matchedItems) {
                    this.highlightMatchIdx = (this.highlightMatchIdx > 0) ? this.highlightMatchIdx - 1 : this.matchedItems.length - 1;
                }
                break;
            case 40: // cursor down
                if (this.matchedItems) {
                    this.highlightMatchIdx = (this.highlightMatchIdx < this.matchedItems.length - 1) ? this.highlightMatchIdx + 1 : 0;
                }
                break;
        }
    }
}
