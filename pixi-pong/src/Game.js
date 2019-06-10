import React from 'react';
import GameFrame from './GameFrame.tsx'
import './css/Game.css';

class Game extends React.Component{
    constructor(props){
        super(props);
        this.seconds = 0;
        this.state = {
            P1name: '',
            P2name: '',
            BestOf: 7,
            timer: "0:0.0",
            started: false
        }; //todo props inherit
        this.tick.bind(this);
    }
    render(){
        return (
            <div className = "GameContainer">
                <div className = "GameHeader">
                    <div className = "Pname" id = "1">P1: {this.state.P1name}</div> 
                    <div className = "BestOf">Best of {this.state.BestOf}</div>
                    <div className = "timer">{this.state.timer}</div>
                    <div className = "Pname" id = "2">P2: {this.state.P2name}</div>
                </div>
            <div className = "GameFrameContainer"> <GameFrame buttonfunc = {this.start}/> </div>
            </div>
        );
    }
    tick = () => {
        this.seconds+=0.1
        //Ik this is a monster but it just displays a timer that is 
        //0:0.0 or 0:00.0 so it needs ternary logic
        this.setState({timer: ((this.seconds-((this.seconds)%60))/60).toString()+":"+((this.seconds)%60).toString().substring(0, (this.seconds%60)<10 ? 3:4)});
    }
    start = () => {
        this.interval = setInterval(() => this.tick(), 100);
        this.setState({started:true});
    }
    componentDidMount() {
    }
    componentWillUnmount() {
        clearInterval(this.interval);
    }
}

export default Game;
