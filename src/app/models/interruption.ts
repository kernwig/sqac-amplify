/*
import 'call.dart';
import 'flow-direction.dart';
import 'formation.dart';
import 'hand.dart';
import 'module.dart';

/// An Interruption is a point within the sequence of a module where the application may
/// interrupt the module and start a compatible Zero Module. Once that module completes, the
/// interrupted module resumes with the next call. To select a compatible Zero Module, the
/// Interruption designates the formation, hands, and flow required for the interrupting module,
/// according to the calls before and after it in the sequence.
///
/// Good modules mark Interruptions whenever they reach a common formation. It’s particularly
/// beneficial to mark Interruptions when the module comes to a normal line formation, as these
/// can be used to pick up squares that have broken down.
class Interruption {
    /// The formation of the square after the previous [Call], and thus the permitted
    /// startFormation of a new [Module].
    Formation formation;

    /// Which dancers’ [Hand] are available after the previous [Call], and thus the permitted
    /// startHand of the new [Module].
    Hand startHand;

    /// Which dancers’ [Hand] is need for the next [Call] in the sequence, and thus can’t be the
    /// endHand of the new [Module].
    Hand nextHand;

    /// Dance flow after the previous [Call], and thus the permitted startFlow
    /// of the new [Module].
    FlowDirection startFlow;

    /// Dance flow that is acceptable going into the next [Call] in the sequence,
    /// and thus the permitted endFlow of the new [Module].
    FlowDirection nextFlow;


    /// Initialize new instance by deserializing from JSON.
    void fromJson(JsonObject json) {
        formation = new Formation.ref(json.formation);
        startHand = Hand.valueOf(json.startHand);
        nextHand = Hand.valueOf(json.nextHand);
        startFlow = FlowDirection.valueOf(json.startFlow);
        nextFlow = FlowDirection.valueOf(json.nextFlow);
    }

    /// Serialize this instance into JSON
    JsonObject toJson() {
        JsonObject json = new JsonObject();

        json.formation = formation.id;
        json.startHand = startHand.toString();
        json.nextHand = nextHand.toString();
        json.startFlow = startFlow.toString();
        json.nextFlow = nextFlow.toString();

        return json;
    }
}
*/
