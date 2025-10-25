import { Link } from "react-router-dom";

export default function Screen1() {
  return (
    <div className="screen">
      <div className="content">
        <Link to="/create-provider" className="btn primary">
          <img src="/assets/icons/hand.png" alt="hand" />
          SUNT SOLUȚIA
        </Link>
        <Link to="/create-requester" className="btn secondary">
          <img src="/assets/icons/help.png" alt="help" />
          AM NEVOIE DE SOLUȚIE
        </Link>
        <div className="logo">
          <img src="/assets/logo-color.png" alt="logo" />
        </div>
      </div>
    </div>
  );
}
