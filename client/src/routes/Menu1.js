import React from "react";
import "./Menu1.css";
import driver from "../img/driver-black.png";
import adduser from "../img/add-user.png";
import homeKey from "../img/home.png";
import { Link } from "react-router-dom";
import { connect } from "react-redux";

class Menu1 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checkbox: this.props.checkbox,
    };
  }

  render() {
    return (
      <div className="container3">
        {/* container */}
        {/* header title */}
        <header>
          <div className="row0">
            <p className="go-to-home-p">
              <Link
                className="go-to-home-link"
                to={{
                  pathname: "/",
                }}
              >
                <img className="go-to-home" src={homeKey} alt="homekey"></img>
              </Link>
            </p>
            <p className="title">생체인증 보안시스템</p>
          </div>
        </header>
        {/* header title */}

        {/* content main */}
        <section className="content">
          <nav></nav>
          <main>
            <div className="row1">
              <button className="menu1-page-button" id="resist_1">
                <div className="resist-padding"></div>
                <div className="resist-circle">
                  <img
                    className="circle-img"
                    src={this.props.user == 0 ? driver : adduser}
                    alt="driver"
                  ></img>
                </div>
                <div className="resist-bottom">
                  <p>user 1</p>
                </div>
              </button>
              <button className="menu1-page-button" id="resist_2">
                <div className="resist-padding"></div>
                <div className="resist-circle">
                  <img
                    className="circle-img"
                    src={this.props.user == 1 ? driver : adduser}
                    alt="adduser"
                  ></img>
                </div>
                <div className="resist-bottom">
                  <p>user 2</p>
                </div>
              </button>
              <button className="menu1-page-button" id="resist_3">
                <div className="resist-padding"></div>
                <div className="resist-circle">
                  <img
                    className="circle-img"
                    src={this.props.user == 2 ? driver : adduser}
                    alt="adduser"
                  ></img>
                </div>
                <div className="resist-bottom">
                  <p>user 3</p>
                </div>
              </button>
            </div>
          </main>
          <aside></aside>
        </section>
        {/* content main */}

        {/* bottom footer */}
        <footer className="menu1-page-footer">
          <div className="row2">
            {/* <p id="user1" class="user">user 1</p>
                        <p id="user2" class="user">user 2</p>
                        <p id="user3" class="user">user 3</p> */}
          </div>
        </footer>
        {/* bottom footer */}

        {/* container */}
      </div>
    );
  }
}

export default connect((state) => {
  return {
    user: state.user,
  };
})(Menu1);
