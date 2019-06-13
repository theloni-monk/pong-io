import React from 'react';
import Game from './Game';
import logo from './assets/ttr.svg';
import './css/App.css';

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Pong</h2>
        </div>
        <p className="App-intro" >
          Basic pong recreation written to learn pixi.js, typescript, socketio, and node
        </p>
        <div className = "GameBox">
          <Game/>
        </div>
      </div>
    );
  }
}

export default App;
