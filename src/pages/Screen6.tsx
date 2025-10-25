import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Player from "lottie-react";
import animationData from "../animations/confirmation.json";

export default function Screen6() {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem("taskAnimationShown");

    if (!hasShown) {
      setShowAnimation(true);
      const timer = setTimeout(() => {
        setShowAnimation(false);
        sessionStorage.setItem("taskAnimationShown", "true");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (showAnimation) {
    return (
      <div className="screen intro-screen">
        <div className="safe-top"></div> {/* safe top here */}
        <div className="logo-animation">
          <Player
            autoplay
            loop={false}
            animationData={animationData}
            style={{ height: 180, width: 180 }}
          />
          <p className="intro-text">Te-ai potrivit la un task!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen task-list">
      {/* Navbar */}
      <header className="navbar">
        <img src="/assets/logo-color.png" alt="logo" className="nav-logo" />
      </header>

      {/* Task list */}
      <div className="task-container">
        <h2 className="task-heading">Task-uri disponibile</h2>

        <div className="task-card">
          <div className="task-thumbnail">
            <img src="/assets/tasks/dog.jpg" alt="task" />
            <div className="gradient"></div>
            <div className="task-info">
              <h3>Îngrijire animal de companie</h3>
              <p className="date">30 septembrie</p>
              <p className="desc">
                Caut pe cineva să aibă grijă de cățelul meu pentru o zi, să îl
                plimbe și să îi dea de mâncare. Este foarte prietenos și jucăuș!…
              </p>
              <div className="task-footer">
                <div className="user">
                  <span>Maria</span>
                  <span className="stars">★★★★★</span>
                </div>
                <Link to="/screen7" className="btn primary small">
                  Ajută! →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Poți repeta <div className="task-card"> pentru mai multe taskuri */}
      </div>
    </div>
  );
}
