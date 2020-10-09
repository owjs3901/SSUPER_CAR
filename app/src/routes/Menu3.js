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

    setInterval(function(){
      fetch('http://mbs-b.com:3000/data')
      .then(res=>{
        return res.json()
      })
      .then(res=>{
        console.log(res.data)
        let a = {...this.state}
        a.data = res;
        setState(a)
      })
    }, 1000);

    this.state = {
      checkbox: this.props.checkbox,
      warning: false,
      chartTemperature: [],
      chartHumidity: [],
      data: [[],[],[]]
    };
  }

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
        <Warning />
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
                  실시간 동승자 체온:36.5도
                </button>
                <div className="menu3-page-chart">
                  <Line
                    options={{
                      maintainAspectRatio: false,
                    }}
                    data={{
                      labels: ["1", "2", "3", "4", "5"],
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
