import { Injectable, ErrorHandler } from '@angular/core';
import {Response, ResponseType} from "@angular/http";
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
     * @param error
     * @override
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
     * @param thrown
     * @returns {Error}
     */
    private ensureIsError(thrown: any): Error {
        if (thrown instanceof Error) {
            return thrown;
        }
        else if (thrown.name && thrown.message) {
            return thrown as Error;
        }
        else if (thrown instanceof Response) {
            const response = thrown as Response;
            const e = new HttpError(response.toString());
            e.name = (response.type === ResponseType.Cors ? "CORS" : "Server") + " Communication Failure";
            e.status = response.status;
            e.statusText = response.statusText;

            try {
                const serverMsg = response.json().message;
                if (serverMsg) {
                    e.message = serverMsg;
                }
            }
            catch (err) {}

            return e;
        }
        else {
            return new Error(thrown.toString());
        }
    }
}
