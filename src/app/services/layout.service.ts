import {Injectable} from '@angular/core';
import {BehaviorSubject} from "rxjs";

/**
 * Track layout information.
 */
@Injectable()
export class LayoutService {
    /**
     * undefined - no help available
     * false - help available, not showing
     * true - show/showing help
     */
    readonly showHelp$ = new BehaviorSubject<boolean|undefined>(false);

    constructor() {
        // this.showHelp$.subscribe(value => {
        //     if (value === undefined)
        //         console.debug("No help");
        //     else if (value === false)
        //         console.debug('Help available');
        //     else
        //         console.debug('Show help');
        // });
    }
}
