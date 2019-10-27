import {OnDestroy} from '@angular/core';
import {Subject} from "rxjs";

/**
 * Base class for components that need some common functionality.
 */
export abstract class AbstractBaseComponent implements OnDestroy {

    /** A stream that emits when this component is being destroyed */
    protected destroy$ = new Subject();

    /**
     * Destroy component.
     */
    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
