import React from "react";
import "./Warning.css";
import warnimg from "../img/";
// import driver from "../img/driver-black.png";
// import adduser from "../img/add-user.png";
// import homeKey from "../img/home.png";
// import { Link } from "react-router-dom";
// import { connect } from "react-redux";

class Warning extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        <div className="home-page-warning">
            <div className="warning-wrap">
                <div className="warning-top">
                    <img className="warning-img" src={warnimg} alt="warnimg"></img>
                </div>
                <div className="warning-center">
                    <p className="warn-text">운전자가 인식되지 않습니다.</p>
                </div>
                <div className="warning-bottom">
                    <button className="warn-button"></button>
                </div>
            </div>
        </div>
    };
}
export default Warning;
