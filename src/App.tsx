import { ChainStatusProvider } from "./useChainStatus";
import { Board } from "./board/Board";

/**
 * The explorer is one screen.
 *
 * It used to be a set of pages behind a nav bar — overview, blocks, validators, and a detail
 * page per thing. That shape answers one question at a time and forgets the others while it
 * does: reading a block meant losing sight of whether the set was still co-signing, which is
 * the thing this chain can go wrong at.
 *
 * Routing did not go away; it stopped deciding what the page is. `/block/109600` is still a
 * link somebody can send, and following one opens the board with that block in the inspector.
 * The blocks and validators routes now land on the board itself, because their content is on
 * it permanently.
 */
export default function App() {
  return (
    <ChainStatusProvider>
      <Board />
    </ChainStatusProvider>
  );
}
