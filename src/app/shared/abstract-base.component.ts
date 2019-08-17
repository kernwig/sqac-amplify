import { OnDestroy } from '@angular/core';
import {Subject} from "rxjs";

/**
 * Base class for components that need some common functionality.
 */
export abstract class AbstractBaseComponent implements OnDestroy {

    /** The stop stream emits when new parameters will be soon coming. Use to abort any in-progress requests. */
    //protected stop$ = new Subject();
    /** A stream that emits when this component is being destroyed */
    protected destroy$ = new Subject();

    /**
     * Destroy component.
     */
    ngOnDestroy() {
        //this.stop$.next();
        this.destroy$.next();
        this.destroy$.complete();
    }
}
