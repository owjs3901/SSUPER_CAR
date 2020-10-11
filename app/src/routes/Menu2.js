import React from "react";
import "./Menu2.css";
import Warning from "../components/Warning.js";
import homeKey from "../img/home.png";
import { Link } from "react-router-dom";
import Webcam from "react-webcam";
import fetch from "node-fetch";

class Menu3 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checkbox: this.props.checkbox,
      warning: false,
      warningDriver: false,
      warnType1: "temperature",
      warnType2: "driver",
      data: [[], [], [], []],    
    };
  }

  componentDidMount(){
    console.log("componentDidMount");

    this.interval = setInterval(() => {
        fetch('http://mbs-b.com:3000/data')
        .then(res=>{
          return res.json()
        })
        .then(res=>{
          // console.log(res.data)
          this.changeData(res.data); // state 갱신

          res.data[2].forEach((value)=>{
            // console.log(value);
            if(value > 37.5) {
              this.showWarn(true);
            }
            else {
              this.showWarn(false);
            }
          });
          console.log(res.data[3]);
          this.showWarnDriver(!res.data[3][0]);

        });
      }, 100);
  }

  componentWillUnmount(){
    console.log("componentWillUnmount");
    clearInterval(this.interval);
  
  }

  changeData = (fetchData) => {
    this.setState({data: fetchData});
  }

  showWarn = (some) => {
    this.setState(
      (prevState, prevProps) => {
        return { warning: some };
      },
      () => console.log("after warning status: " + this.state.warning)
    );
  };

  showWarnDriver = (some) => {
    this.setState(
      (prevState, prevProps) => {
        return { warningDriver: some};
      },
      () => console.log("after warningDriver status: " + this.state.warningDriver)
    );
  };

  parentCallback = (dataFromChild) => {
    // 자식 컴포넌트에서 받은 값을 이용한 로직 처리
    this.setState(
      {
          warning: dataFromChild,
          warningDriver: dataFromChild
      },
      () => console.log("cancel warning status: " + this.state.warning + " " + this.state.warningDriver)
    );
  };

  render() {
    return (
      <div className="container4">
         {
          this.state.warning ?
          <Warning 
            callbackFromParent = {this.parentCallback}
            type = {this.state.warnType1}
          />
          : null
        }
        {
          this.state.warningDriver ?
          <Warning
            callbackFromParent = {this.parentCallback}
            type = {this.state.warnType2}
          />
          : null
        }
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
                <img className="go-to-home-2" src="http://mbs-b.com:3000/img/home.png" alt="homekey"></img>
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
              {/* <img className="menu3-page-img" src="" alt="driver-monitor" /> */}
              <Webcam />
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
