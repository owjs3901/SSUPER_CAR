import React from 'react';
import ReactDOM from 'react-dom';
import warn  from "../img/warning.png";
import "./Warning.css";

class Warning extends React.Component {
  constructor() {
    super();
    this.state ={
        isOn: true, 
        driver : "운전자가 인식되지 않습니다.",
        temperature : "동승자의 체온이 37.5도 이상입니다."
    };
    // {this.props.user == 1 ? driver : adduser}
  }


  cancelWarning = () => {
    this.setState(
        (prevState, prevProps) => {
          return { isOn: !this.state.isOn };
        },
        () => {
          console.log("after isOn status: " + this.state.isOn);
          this.props.callbackFromParent(this.state.isOn); //부모 warning 상태 변경 함수
        }
    );
    
  }


  render() {
    return (
        <div className={"warning-wrap "+(this.state.isOn ? "warn-active" : "warn-noactive") }>
            <div className="warning-top">
                <img className="warn-img" src="http://mbs-b.com:3000/img/warning.png" alt="warnimg"></img>
            </div>
            <div className="warning-center">
                <p className="warn-text">
                  {this.props.type === "temperature" ? this.state.temperature : this.state.driver }
                </p>
            </div>
            <div className="warning-bottom">
                <button className="warn-button" onClick={this.cancelWarning}>확인</button>
            </div>
        </div>
    );
  }
};


export default Warning;