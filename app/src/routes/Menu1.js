import React from "react";
import "./Menu1.css";
import Warning from "../components/Warning.js";
import driver from "../img/driver-black.png";
import adduser from "../img/add-user.png";
import homeKey from "../img/home.png";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import { login } from "../../../app/src/reducer";
import fetch from "node-fetch";

class Menu1 extends React.Component {
  constructor(props) {
    super(props);
    console.log("hello world");
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

  render() {
    return (
      <div className="container3">
        {
          this.state.warning ?
          <Warning 
            callbackFromParent = {this.changeWarn}
          />
          : null
        }
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
              <button  onClick={ e =>{
                this.props.setUser(login(0))
              }} className="menu1-page-button" id="resist_1">
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
              <button onClick={e => {
                      console.log('a')
                      this.props.setUser(login(1))
                    }
                    } className="menu1-page-button" id="resist_2">
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
              <button onClick={e => {
                      this.props.setUser(login(2))
                    }
                    } className="menu1-page-button" id="resist_3">
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
}, (dispatch) => {
  return {
    setUser: (a) => dispatch(a)
  }
})(Menu1);
