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
      data: [[], [], []],    
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
              this.showWarn();
            }
          });

        });
      }, 1000);
  }

  componentWillUnmount(){
    console.log("componentWillUnmount");
    clearInterval(this.interval);
  }

  showWarn = () => {
    this.setState(
      (prevState, prevProps) => {
        return { warning: !prevState.warning };
      },
      () => console.log("after warning status: " + this.state.warning)
    );
  };

  parentCallback = (dataFromChild) => {
    // 자식 컴포넌트에서 받은 값을 이용한 로직 처리
    this.setState(
      (prevState, prevProps) => {
        return {warning: dataFromChild};
      },
      () => console.log("cancel warning status: " + this.state.warning)
    );
  };

  changeData = (fetchData) => {
    this.setState({data: fetchData});
  }

  showWarn = () => {
    this.setState(
      (prevState, prevProps) => {
        return { warning: !prevState.warning };
      },
      () => console.log("after warning status: " + this.state.warning)
    );
  };

  render() {
    return (
      <div className="container4">
        {
          this.state.warning ?
          <Warning 
            callbackFromParent = {this.changeWarn}
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
