import { useNavigate } from "react-router-dom";

export default function Screen3() {
  const navigate = useNavigate();

  const handleSelect = (occupation: string) => {
    // animate (optional advanced: add a class and wait)
    console.log("Selected:", occupation);

    // Small delay to let the animation run
    setTimeout(() => {
      navigate("/screen4");
    }, 200); // 200ms matches the :active transition
  };

  return (
    <div className="screen">
      <header className="navbar">
        <a href="/screen2" className="back">←</a>
        <img src="/assets/logo-color.png" alt="logo" />
      </header>
      <div className="content">
        <h2>Cu ce te ocupi?</h2>
        <div className="form">
          <div className="input">
            <input type="text" placeholder="Ocupație..." />
          </div>
          <div className="list">
            <div className="list-item" onClick={() => handleSelect("Grădinărit")}>Grădinărit</div>
            <div className="list-item" onClick={() => handleSelect("Îngrijire animale")}>Îngrijire animale</div>
            <div className="list-item" onClick={() => handleSelect("Curățenie la domiciliu")}>Curățenie la domiciliu</div>
            <div className="list-item" onClick={() => handleSelect("Curățenie autovehicule")}>Curățenie autovehicule</div>
          </div>
        </div>
      </div>
    </div>
  );
}
