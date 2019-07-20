import React from 'react';
import GameLoader from './GameLoader.tsx';
import GameWrapper from './GameWrapper.tsx';
import logo from './assets/ttr.svg';
import './css/App.css';

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Pong.io</h2>
          <img src={logo} className="App-logo" alt="logo" /> 
          
        </div>
        <p className="App-intro" >
          Basic pong recreation written to learn typescript, pixi.js, socketio, and node
        </p>
        <div className="GameBox">
          <GameLoader />
        </div>
      </div>
    );
  }
}

export default App;
