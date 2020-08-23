import React from 'react';
import { BrowserRouter, Route } from "react-router-dom";
import "./App.css";
import Home from "./routes/Home";
import Menu1 from "./routes/Menu1";
import Menu2 from "./routes/Menu2";
import Menu3 from "./routes/Menu3";


class App extends React.Component {
  render() {
    return (
      <BrowserRouter>
        <Route path="/SSUPER_CAR/" exact={true} component={Home} />
        <Route path="/SSUPER_CAR/menu1" exact={true} component={Menu1} />
        <Route path="/SSUPER_CAR/menu2" exact={true} component={Menu2} />
        <Route path="/SSUPER_CAR/menu3" exact={true} component={Menu3} />
      </BrowserRouter>
      
    );
  }
}

export default App;
