import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";
import Warning from "../components/Warning.js";
import sign1 from "../img/sign.png";
import sign2 from "../img/sign1.png";
import hexagon1 from "../img/hexagon-menu-1.png";
import hexagon2 from "../img/hexagon-menu-2.png";
import hexagon3 from "../img/hexagon-menu-3.png";
import fingerprint from "../img/finger-print.png";
import driver from "../img/driver.png";
import seatbelt from "../img/seat-belt.png";
import { connect } from "react-redux";

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      Menu1: props.setting[0],
      Menu2: props.setting[1],
      Menu3: props.setting[2],
      warning: false,      
    };
  }

  changeStatus1 = () => {
    this.setState(
      (prevState, prevProps) => {
        return { Menu1: !prevState.Menu1 };
      },
      () => console.log("after Menu1 status: " + this.state.Menu1)
    );
  };

  changeStatus2 = () => {
    this.setState(
      (prevState, prevProps) => {
        return { Menu2: !prevState.Menu2 };
      },
      () => console.log("after Menu2 status: " + this.state.Menu2)
    );
  };

  changeStatus3 = () => {
    this.setState(
      (prevState, prevProps) => {
        return { Menu3: !prevState.Menu3 };
      },
      () => console.log("after Menu3 status: " + this.state.Menu3)
    );
  };

  render() {
    return (
      <div className="home-page-container">
        <Warning/>
        <div className="home-left">
          <div className="sign">
            <div className="sign-padding">
              <div className="sign-padding-img">
                <img className="sign-img-1" src={sign1} alt="sign1"></img>
                <img className="sign-img-2" src={sign2} alt="sign2"></img>
              </div>
            </div>
          </div>
          <div className="left-sum-menu">
            <div className="left-menu-1">
              <div className="left-menu-padding">
                <button className="left-button" onClick={this.changeStatus1}>
                  <div className="left-button-inside">
                    <div className="left-img">
                      <div className="left-back">
                        <img
                          className="left-back-img"
                          src={fingerprint}
                          alt="fingerprint"
                        ></img>
                      </div>
                    </div>
                    <div className="left-text">
                      <p className="left-text-in">생체인증 보안시스템</p>
                    </div>
                    <div className="left-toggle-button">
                      <div
                        className={
                          this.state.Menu1 ? "toggle-btn active" : "toggle-btn"
                        }
                      >
                        <div className="inner-circle"></div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <div className="left-menu-2">
              <div className="left-menu-padding">
                <button className="left-button" onClick={this.changeStatus2}>
                  <div className="left-button-inside">
                    <div className="left-img">
                      <div className="left-back">
                        <img
                          className="left-back-img"
                          src={driver}
                          alt="fingerprint"
                        ></img>
                      </div>
                    </div>
                    <div className="left-text">
                      <p className="left-text-in">운전자 모니터링</p>
                    </div>
                    <div className="left-toggle-button">
                      <div
                        className={
                          this.state.Menu2 ? "toggle-btn active" : "toggle-btn"
                        }
                      >
                        <div className="inner-circle"></div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <div className="left-menu-3">
              <div className="left-menu-padding">
                <button className="left-button" onClick={this.changeStatus3}>
                  <div className="left-button-inside">
                    <div className="left-img">
                      <div className="left-back">
                        <img
                          className="left-back-img"
                          src={seatbelt}
                          alt="fingerprint"
                        ></img>
                      </div>
                    </div>
                    <div className="left-text">
                      <p className="left-text-in">동승자 케어 솔루션</p>
                    </div>
                    <div className="left-toggle-button">
                      <div
                        className={
                          this.state.Menu3 ? "toggle-btn active" : "toggle-btn"
                        }
                      >
                        <div className="inner-circle"></div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="home-right">
          <div className="right-sum-menu">
            <div className="right-menu-1">
              <div className="right-menu-padding-1">
                <Link
                  className="right-link"
                  to={{
                    pathname: "/menu1",
                    state: {
                      checkbox: this.state.Menu1,
                    },
                  }}
                >
                  <div className="right-menu-padding-img-1">
                    <img
                      className="right-menu-img-1"
                      src={hexagon1}
                      alt="menu-1"
                    ></img>
                    <div className="right-menu-text-1">
                      <img
                        className="home-right-img"
                        src={fingerprint}
                        alt="fingerprint"
                      ></img>
                      <br></br>생체인증<br></br>보안시스템
                    </div>
                  </div>
                </Link>
              </div>
            </div>
            <div className="right-menu-2">
              <div className="right-menu-padding-2">
                <Link
                  className="right-link"
                  to={{
                    pathname: "/menu2",
                    state: {
                      checkbox: this.state.Menu2,
                    },
                  }}
                >
                  <div className="right-menu-padding-img-2">
                    <img
                      className="right-menu-img-2"
                      src={hexagon2}
                      alt="menu-1"
                    ></img>
                    <div className="right-menu-text-2">
                      <img
                        className="home-right-img"
                        src={driver}
                        alt="driver"
                      ></img>
                      <br></br>운전자<br></br>모니터링
                    </div>
                  </div>
                </Link>
              </div>
            </div>
            <div className="right-menu-3">
              <div className="right-menu-padding-3">
                <Link
                  className="right-link"
                  to={{
                    pathname: "/menu3",
                    state: {
                      checkbox: this.state.Menu3,
                    },
                  }}
                >
                  <div className="right-menu-padding-img-3">
                    <img
                      className="right-menu-img-3"
                      src={hexagon3}
                      alt="menu-1"
                    ></img>
                    <div className="right-menu-text-3">
                      <img
                        className="home-right-img"
                        src={seatbelt}
                        alt="seat-belt"
                      ></img>
                      <br></br>동승자 케어<br></br>솔루션
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect((status) => {
  return {
    setting: status.setting,
  };
})(Home);
