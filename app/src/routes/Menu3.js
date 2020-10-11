import React from "react";
import "./Menu3.css";
import Warning from "../components/Warning.js";
import { Line } from "react-chartjs-2";
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

  parentCallback = (dataFromChild) => {
    // 자식 컴포넌트에서 받은 값을 이용한 로직 처리
    this.setState(
      (prevState, prevProps) => {
        return {warning: dataFromChild};
      },
      () => console.log("cancel warning status: " + this.state.warning)
    );
  };

  // changeChart = () => {
  //     if(this.state.checkbox === true){
  //         /* data */
  //         axios.get(/* json url */)
  //         .then(res => {
  //             /* 실시간 데이터 및 시간 받아서 state 값 바꾸고 chart에 출력 */

  //         })
  //         .catch(err => {
  //             console.log(res);
  //         })
  //     }

  //     // call it again after one second
  //     setTimeout((this.changeChart), 2000);

  // }

  render() {
    return (
      <div className="container5">
        {
          this.state.warning ?
          <Warning 
            callbackFromParent = {this.showWarn}
          />
          : null
        }
        {/* container */}
        {/* header title */}
        <header className="menu3-page-header">
          <div className="row5">
            <p className="go-to-home-p-3">
              <Link
                className="go-to-home-link-3"
                to={{
                  pathname: "/",
                }}
              >
                <img className="go-to-home-3" src={homeKey} alt="homekey"></img>
              </Link>
            </p>
            <p className="title">탑승자 케어 솔루션</p>
          </div>
        </header>
        {/* header title */}
        {/* content main */}
        <section className="content5">
          <nav></nav>
          <main className="menu3-page-main">
            <div className="row6">
              <div className="menu3-page-left">
                <Webcam         
                />
              </div>
              <div className="menu3-page-right">
                <button className="menu3-page-button" id="menu_1">
                  실시간 동승자 체온:{this.state.data[2][1]}도
                </button>
                <div className="menu3-page-chart">
                  <Line
                    options={{
                      maintainAspectRatio: false,
                    }}
                    data={{
                      labels: ["09", "10", "11", "12", "13", "14", "15", "16", "17", "18"],
                      datasets: [
                        {
                          label: "온도",
                          lineTension: 0,
                          borderColor: "rgba(171, 23, 164, 1.0)",
                          backgroundColor: "rgba(0,0,0,0.00)",
                          data: this.state.data[0],
                        },
                        {
                          label: "습도",
                          lineTension: 0,
                          borderColor: "rgba(176, 224, 230, 1.0)",
                          backgroundColor: "rgba(0,0,0,0.00)",
                          data: this.state.data[1],
                        },
                        {
                          label: "체온",
                          lineTension: 0,
                          borderColor: "rgba(171, 223, 64, 1.0)",
                          backgroundColor: "rgba(0,0,0,0.00)",
                          data: this.state.data[2],
                        }
                      ],
                    }}
                  />
                </div>
                {/* <button class="menu3-page-button" id="menu_2">실내온도 자동조절 시스템 : ON</button>
                                <button class="menu3-page-button" id="menu_3">기타</button> */}
              </div>
            </div>
          </main>
          <aside></aside>
        </section>
        {/* content main */}

        {/* bottom footer */}
        <footer className="menu3-page-footer"></footer>
        {/* bottom footer */}
        {/* container */}
      </div>
    );
  }
}

export default Menu3;
