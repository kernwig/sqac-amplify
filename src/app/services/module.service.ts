import {Injectable} from "@angular/core";
import {Module} from "../models/module";
import {FormationService} from "./formation.service";
import {CallService} from "./call.service";
import {CachingModelService} from "./caching-model.service";
import {Formation} from "../models/formation";
import {Call} from "../models/call";


/**
 * Provider of loaded Modules.
 */
@Injectable()
export class ModuleService extends CachingModelService<Module> {

    /** Construct */
    constructor(private callSvc: CallService,
                private formationSvc: FormationService) {
        super();
    }

    /**
     * Resolve references in data managed by this service.
     * Typically called by CollectionService after Collections have loaded.
     * @return true if all items are available
     */
    resolveReferences(): boolean {
        let availableCount = 0;

        super.forEach((module) => {
            let failure = false;

            // Resolve references to Formations
            let formationId = module.startFormation ? module.startFormation.id : null;
            let f = this.formationSvc.get(formationId);
            if (f && f.isAvailable) {
                module.startFormation = f;
            }
            else {
                console.log(`Module ${module.id} reference to formation ${formationId} not found`);
                failure = true;
            }

            formationId = module.endFormation ? module.endFormation.id : null;
            f = this.formationSvc.get(formationId);
            if (f && f.isAvailable) {
                module.endFormation = f;
            }
            else {
                console.log(`Module ${module.id} reference to formation ${formationId} not found`);
                failure = true;
            }

            // Resolve references to Call
            for (const item of module.sequence) {

                const callId = item.call ? item.call.id : null;
                const c = this.callSvc.get(callId);
                if (c && c.isAvailable) {
                    item.call = c;
                }
                else {
                    console.log(`Module ${module.id} reference to call ${callId} not found`);
                    failure = true;
                }
            }

            if (!failure) {
                // all resolved
                module.isAvailable = true;
                availableCount++;
            }
        });

        console.log(`${availableCount} of ${this.size} modules available`);
        return (availableCount === this.size);
    }

    /**
     * Is a formation referenced by any module?
     */
    isFormationReferenced(formation: Formation): boolean {
        const findId = formation.id;
        const iter = this.values();
        for (;;) {
            const next = iter.next();
            if (next.done === true) {
                return false;
            }

            const module = next.value;
            if (
                (module.startFormation && module.startFormation.id === findId) ||
                (module.endFormation && module.endFormation.id === findId)
            ) {
                return true;
            }
        }
    }

    /**
     * Is a call referenced by any module?
     * NOTE: This call is not cheap.
     */
    isCallReferenced(call: Call): boolean {
        const findId = call.id;
        const iter = this.values();
        for (;;) {
            const next = iter.next();
            if (next.done === true) {
                return false;
            }

            const module = next.value;
            for (const item of module.sequence) {
                if (item.call && item.call.id === findId) {
                    return true;
                }
            }
        }
    }
}
