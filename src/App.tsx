import { useLocation } from "react-router-dom";
import { ChainStatusProvider } from "./useChainStatus";
import { Board } from "./board/Board";
import { NetworkPage } from "./network/NetworkPage";

/**
 * Two views over one chain.
 *
 * The board is the instrument: one screen, nothing to scroll past, every answer in a place the eye
 * learns. It used to be a set of pages behind a nav bar, and that shape answered one question at
 * a time and forgot the others — reading a block meant losing sight of whether the set was still
 * co-signing. `/block/109600` is still a link somebody can send; following one opens the board
 * with that block in the inspector.
 *
 * The network page is the other kind of question: not "what is happening now" but "who holds
 * this chain" — stake, supply, the largest accounts, the last few hundred blocks drawn. Those
 * answers change slowly and want room, so they get a page that scrolls instead of a cell.
 *
 * Decided off the path rather than with a `<Routes>` here, because the board keeps routes of its
 * own (the inspector) that must see the full path.
 */
export default function App() {
  const onNetwork = useLocation().pathname === "/network";
  return <ChainStatusProvider>{onNetwork ? <NetworkPage /> : <Board />}</ChainStatusProvider>;
}
