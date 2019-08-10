import React from 'react';
import {match} from '../GameServer';
import GameBase from './GameBase'
import './css/Game.css';

interface GWProps {
    match: match;
    isCreator: boolean;
    socket: SocketIO.Socket;
}
interface GWState {
    match: match;
    timer: string;
    started: boolean
}
class GameWrapper extends React.Component<GWProps, GWState>{
    seconds: number;
    playerNo: number;
    interval: any;

    constructor(props: any){
        super(props);
        this.seconds = 0;
        this.state = {
            match: props.match,
            timer: "0:0.0",
            started: false
        }; //todo props inherit
        this.tick.bind(this);
        this.playerNo = this.props.isCreator ? 0:1;
        console.log("Socket: " + this.props.socket);
    }

    render(){
        return (
            <div className = "GameContainer">
                <div className = "GameHeader">
                    <div className = "PnameO" id = "1">P1: {this.state.match.playerNames[this.playerNo]}</div> 
                    <div className = "FirstTo">First To {this.state.match.firstTo}</div>
                    <div className = "PnameT" id = "2">P2: {this.state.match.playerNames[Math.abs(this.playerNo-1)]}</div>
                    <div className = "timer">{this.state.timer}</div>
                </div>
            <div className = "GameFrameContainer"> 
            <GameBase buttonfunc = {this.timer} socket = {this.props.socket} isCreator = {this.props.isCreator} /> 
            </div>
            </div>
        );
    }

    tick = () => {
        this.seconds+=0.1
        //Ik this is a monster but it just displays a timer that is 
        //0:0.0 or 0:00.0 so it needs ternary logic
        this.setState({timer: ((this.seconds-((this.seconds)%60))/60).toString()+":"+((this.seconds)%60).toString().substring(0, (this.seconds%60)<10 ? 3:4)});
    }

    timer = (pause = false, reset = false) => {
        //console.log(pause ? "stop":"start" + " called in game.js")
        if(reset){ // reset
            clearInterval(this.interval); 
            this.seconds = 0;
            this.setState({started:true, timer:"0:0.0" });
        }
        else if(!this.state.started){ // start
            this.seconds = 0;
            this.setState({started:true, timer:"0:0.0" });
            this.interval = setInterval(() => this.tick(), 100);
        }
        else if(pause){ // pause
            clearInterval(this.interval); 
        }
        else if (!pause && this.state.started){ // unpause
            this.interval = setInterval(() => this.tick(), 100);
        }
    }

    componentDidMount() {
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }
}

export default GameWrapper;
