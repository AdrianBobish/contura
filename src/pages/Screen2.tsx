import { Link } from "react-router-dom";

export default function Screen2() {
  return (
    <div className="screen">
      <header className="navbar">
        <Link to="/" className="back">←</Link>
        <img src="/assets/logo-color.png" alt="logo" />
      </header>
      <div className="content">
        <h2>Creează-ți cont</h2>
        <form className="form">
          <div className="input">
            <img src="/assets/icons/user.png" alt="user" />
            <input type="text" placeholder="Nume și prenume..." />
          </div>
          <div className="input">
            <img src="/assets/icons/mail.png" alt="mail" />
            <input type="email" placeholder="Adresă de e-mail..." />
          </div>
          <div className="input">
            <img src="/assets/icons/phone.png" alt="phone" />
            <input type="tel" placeholder="Număr de telefon..." />
          </div>
          <div className="input">
            <img src="/assets/icons/age.png" alt="age" />
            <input type="number" placeholder="Vârstă (minim 18)..." />
          </div>
        </form>
        <Link to="/screen3" className="btn continue">
          <img src="/assets/icons/next.png" alt="next" />
          Continuă
        </Link>
      </div>
    </div>
  );
}
