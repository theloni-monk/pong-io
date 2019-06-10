import React from 'react';
import Game from './Game';
import logo from './assets/logo.svg';
import './css/App.css';

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Pong</h2>
        </div>
        <p className="App-intro">
          here's a shitty game of pong For the lonely:
        </p>
        <Game/>
      </div>
    );
  }
}

export default App;
