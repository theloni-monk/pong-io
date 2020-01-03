/** 
 *  This file is a wrapper for creating a Game and thus GameFrame based on server info
 *  it connects to the server and handles user input for name and matchmaking
 *  it places the user into a match and then 
 */

// section for open matches
// input for match name
// button to join, button to create_new

import React from 'react';
import { match } from '../Server/MatchServer';
//import './css/GameLoader.css'; //WRITEME: css
import GameWrapper from './GameWrapper';
const io = require('socket.io-client');

function sleep(ms:number){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

function renderOpenMatches(matches: any, onclick: any): JSX.Element[] {
    let matchDivs: JSX.Element[] = []
    //console.log(matches);
    Object.keys(matches).forEach((key, index) => {
        console.log("key: " + key);
        if (!matches[key].isFull) {
            matchDivs.push(
                <div className="open-match" onClick={() => { onclick(matches[key].name) }}>
                    {matches[key].name}:{matches[key].firstTo}
                    <hr />
                    {matches[key].playerNames[0]}
                </div>
            );
        }
    })
    return matchDivs;
}

interface GLProps { }
interface GLState {
    connected: boolean;
    name: string;
    nameSubmitted: boolean;
    openMatches: any;
    matchNameInput: string;
    error: string;
    matchJoined: boolean;
    matchCreated: boolean;
    matchRecieved: boolean;
    gameReady: boolean;
}

export default class GameLoader extends React.Component<GLProps, GLState>{

    protected matchSock: SocketIO.Socket
    protected gameSock: SocketIO.Socket

    protected match: match

    constructor(props: any) {
        super(props);
        this.state = {
            connected: false,
            name: '',
            nameSubmitted: false,
            openMatches: {},
            matchNameInput: '',
            error: '',
            matchCreated: false,
            matchJoined: false,
            matchRecieved: false,
            gameReady: false
        }
    }
    
    componentDidMount() {
        this.matchSock = io('http://127.0.0.1:5000'); //TODO: connect to real webserver on rPi
        this.matchSock.on('connect', () => this.setState({ connected: this.matchSock.connected }))
        this.matchSock.on('ERROR', (msg: string) => {
            console.log('socket recived err msg: ' + msg);
            this.setState({ error: msg });
            msg === 'match does not exist' ? this.setState({ matchJoined: false }) : this.setState({ matchCreated: false });
        });
        this.matchSock.on('RECV_OPEN_MATCHES', (oMatches: any) => { this.setState({ openMatches: oMatches }) });
        this.matchSock.on('RECV_MATCH_BY_NAME', (match: match) => { //trigger to render match //TODO: fix needed later - can break if user tries to join invalid
            this.match = match;
            
            this.gameSock = io('http://127.0.0.1:5050',
                { transportOptions: { polling: { extraHeaders: { 'clientid': this.state.name } } } } 
            );
            console.log('connecting to LiveServer');
            //FIXME: LiveServer is recieving connection but gameSock.onConnection isn't being called
            this.gameSock.on('creation', () => { 
                this.setState({ matchRecieved: true,
                                gameReady: true }); 
                console.log('connected to LiveServer'); 
            });
        });
    }

    updateNameInput = (evt: any) => {
        this.setState({ name: evt.target.value })
    }

    updateMatchNameInput = (evt: any) => {
        this.setState({ matchNameInput: evt.target.value })
    }
    assignMatchNameInput = (name: string) => {
        this.setState({ matchNameInput: name })
    }

    refreshOpenMatches = () => {
        this.matchSock.emit('GET_OPEN_MATCHES');
    }

    joinMatch = () => {
        this.matchSock.emit('JOIN_MATCH', this.state.matchNameInput, this.state.name)
        this.setState({ matchJoined: true });
        this.matchSock.emit('GET_MATCH_BY_NAME', this.state.matchNameInput);
    }

    createMatch = () => {
        this.matchSock.emit('CREATE_MATCH',
            this.state.matchNameInput.split(':')[0],
            this.state.name,
            parseInt(this.state.matchNameInput.split(':')[1]) //firstTo value given by colon in name
        );
        this.setState({ matchCreated: true });
        console.log('Created match')
        this.matchSock.on('OTHER_PLAYER_READY', () => {
            this.setState({ matchJoined: true });
            //this.socket.broadcast.emit('OTHER_PLAYER_READY')
            this.matchSock.emit('GET_MATCH_BY_NAME', this.state.matchNameInput);
        }
        );
    }


    render() {
        if (!this.state.connected) { //waiting on connection to MatchServer screen
            return (
                <div className="connecting-screen">
                    waiting on connection to matchmaking server...
                </div>
            )
        }
        else if (!this.state.nameSubmitted) { //name submitter screen 
            return ( 
                <div className="name-screen">
                    Name:
                <input className="name-input" value={this.state.name} onChange={this.updateNameInput} />
                    <button onClick={() => { this.setState({ name: '' }) }}>X</button>
                    <button onClick={() => { this.setState({ nameSubmitted: true }); console.log("name submitted") }}>submit</button>
                </div>
            );
        }
        else { // came choosing screens: joining or creating a game
            if (this.state.matchCreated && !this.state.matchJoined) { // waiting for match screen
                return (
                    <div className="waiting-on-join-screen">
                        <strong>Waiting for players to join match...</strong>
                        once a player joins the game will automatically load
                    </div>
                );
            }
            else if (this.state.matchJoined && this.state.matchRecieved) { // matchmaking done: loading game screen
                console.log("matchmaking complete, connecting to liveserver and rendering game ...");
                //TODO: connect to liveserver
                if(this.state.gameReady){
                    return (<GameWrapper match={this.match} isCreator={this.state.matchCreated} socket={this.gameSock} />);
                }
                else{
                    return (<div>Matchmaking complete, connecting to liveserver and rendering game ...</div>)
                }
            }
            else if (!this.state.matchCreated && !this.state.matchJoined && !this.state.matchRecieved) { // Match Joiner/Creator screen
                return (
                    <div className="game-loader-container">
                        <button onClick={this.refreshOpenMatches}> refresh matches</button>
                        <div className="open-match-wrapper">
                            {renderOpenMatches(this.state.openMatches, this.assignMatchNameInput)}
                        </div>

                        Match Name: <input className="match-name-input" value={this.state.matchNameInput} onChange={this.updateMatchNameInput} />
                        <button onClick={this.joinMatch}>Join Match</button>
                        <button onClick={this.createMatch}>Create Match</button>
                        <strong className="error-strong">{this.state.error}</strong>
                    </div>
                );
            }
            else { //loading screen //TODO: fancy loading animation
                return ("LOADING...");
            }
        }
        //FIXME: go back to main screen on Error
    }
}
