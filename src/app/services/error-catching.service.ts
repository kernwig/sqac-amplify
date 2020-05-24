import { Injectable, ErrorHandler } from '@angular/core';
import {Subject} from "rxjs";

/**
 * Special type of Error to wrap an HTTP problem.
 */
export class HttpError extends Error {
    status?: number;
    statusText?: string;

    constructor(message?: string) {
        super(message);
    }
}

/**
 * Service that lets something subscribe to be notified of any unhandled Errors.
 */
@Injectable()
export class ErrorCatchingService extends ErrorHandler {

    /** Observable stream of caught errors */
    public readonly error$ = new Subject<Error>();

    /**
     * Receive an unhandled error.
     */
    handleError(error: any) {

        // Translate into a simple Error
        const originalError = this.ensureIsError(this.findOriginalError(error));

        // Notify asynchronously, so that it can't delay the super impl.
        setTimeout(() => this.error$.next(originalError));

        // Super will print to the console and rethrow.
        super.handleError(error);
    }

    /**
     * Dig down through Error chain created by async and Promise to find the original Error.
     */
    private findOriginalError(error: any): any {
        while (error) {
            if (error.originalError) {
                // nested async
                error = error.originalError;
            }
            else if (error.rejection) {
                // Promise rejection
                error = error.rejection;
            }
            else {
                break;
            }
        }

        return error;
    }

    /**
     * Take any thrown thing and return an Error instance.
     */
    private ensureIsError(thrown: any): Error {
        if (thrown instanceof Error) {
            return thrown;
        }
        else if (thrown.name && thrown.message) {
            return thrown as Error;
        }
        else if (thrown.status && thrown.statusText) {
            const e = new HttpError(thrown.toString());
            e.name = "Server Communication Failure";
            e.status = thrown.status;
            e.statusText = thrown.statusText;
            return e;
        }
        else {
            return new Error(thrown.toString());
        }
    }
}
