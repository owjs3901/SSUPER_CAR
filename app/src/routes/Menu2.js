import React from "react";
import "./Menu2.css";
import homeKey from "../img/home.png";
import { Link } from "react-router-dom";

class Menu3 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checkbox: this.props.checkbox,
    };
  }

  render() {
    return (
      <div className="container4">
        {/* container */}
        {/* header title */}
        <header className="menu2-page-header">
          <div className="row3">
            <p className="go-to-home-p-2">
              <Link
                className="go-to-home-link-2"
                to={{
                  pathname: "/",
                }}
              >
                <img className="go-to-home-2" src={homeKey} alt="homekey"></img>
              </Link>
            </p>
            <p className="title">운전자 모니터링</p>
          </div>
        </header>
        {/* header title */}

        {/* content  */}
        <section className="content4">
          <nav></nav>
          <main className="menu2-page-main">
            <div className="row4">
              <img className="menu3-page-img" src="" alt="driver-monitor" />
            </div>
          </main>
          <aside></aside>
        </section>
        {/* content  */}

        {/* bottom  */}
        <footer className="menu2-page-footer"></footer>
        {/* content  */}
        {/* container  */}
      </div>
    );
  }
}

export default Menu3;
