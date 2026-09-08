import { Search } from "../components/Search";

export default function NotFound() {
  return (
    <>
      <p className="eyebrow">Not a page here</p>
      <div className="panel">
        <div className="panel-body">
          <p style={{ marginTop: 0 }}>
            Nothing lives at this address. Look something up instead — a block height, an
            account, a transaction hash, or a registered name.
          </p>
          <Search />
        </div>
      </div>
    </>
  );
}
