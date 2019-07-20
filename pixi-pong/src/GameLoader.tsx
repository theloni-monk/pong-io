/** 
 *  This file is a wrapper for creating a Game and thus GameFrame based on server info
 *  it connects to the server and handles user input for name and matchmaking
 *  it places the user into a match and then 
 */

// section for open matches
// input for match name
// button to join, button to create_new

import React from 'react';
import { match } from '../GameServer';
import './css/GameLoader.css'; //WRITEME: css
import GameWrapper from './GameWrapper';
const io = require('socket.io-client');

function renderOpenMatches(matches: any, onclick: any): JSX.Element[] {
    let matchDivs: JSX.Element[] = []
    //console.log(matches);
    Object.keys(matches).forEach((key, index) => {
        console.log("key: "+ key);
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
    name: string;
    nameSubmitted: boolean;
    openMatches: any;
    matchNameInput: string;
    error: string;
    matchJoined: boolean;
    matchCreated: boolean;
    matchRecieved: boolean;
}

export default class GameLoader extends React.Component<GLProps, GLState>{

    protected socket: SocketIO.Socket;

    protected match: match;

    constructor(props: any) {
        super(props);
        this.state = {
            name: '',
            nameSubmitted: false,
            openMatches: {},
            matchNameInput: '',
            error: '',
            matchCreated: false,
            matchJoined: false,
            matchRecieved: false
        }

    }

    componentDidMount() {
        this.socket = io('http://127.0.0.1:5000'); //TODO: connect to real webserver
        this.socket.on('ERROR', (msg: string) => {
            console.log('socket recived err msg: ' + msg);
            this.setState({ error: msg });
            msg === 'match does not exist' ? this.setState({ matchJoined: false }) : this.setState({ matchCreated: false });
        });
        this.socket.on('RECV_OPEN_MATCHES', (oMatches: any) => { this.setState({ openMatches: oMatches }) });
        this.socket.on('RECV_MATCH_BY_NAME', (match: match) => { this.match = match; this.setState({matchRecieved:true}) });
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
        this.socket.emit('GET_OPEN_MATCHES');
    }

    joinMatch = () => {
        this.socket.emit('JOIN_MATCH', this.state.matchNameInput, this.state.name)
        this.setState({ matchJoined: true });
        this.socket.emit('GET_MATCH_BY_NAME', this.state.matchNameInput);
    }

    createMatch = () => {
        this.socket.emit('CREATE_MATCH',
            this.state.matchNameInput.split(':')[0],
            this.state.name,
            parseInt(this.state.matchNameInput.split(':')[1]) //firstTo value given by colon in name
        );
        this.setState({ matchCreated: true });
        this.socket.on('OTHER_PLAYER_READY', () => {
            this.setState({ matchJoined: true });
            //this.socket.broadcast.emit('OTHER_PLAYER_READY')
            this.socket.emit('GET_MATCH_BY_NAME', this.state.matchNameInput);
        }
        );
    }

    render() {
        if (!this.state.nameSubmitted) { //name submitter
            return (
                <div className="name-screen">
                    Name:
                <input className="name-input" value={this.state.name} onChange={this.updateNameInput} />
                    <button onClick={() => { this.setState({ name: '' }) }}>X</button>
                    <button onClick={() => { this.setState({ nameSubmitted: true }); console.log("name submitted") }}>submit</button>
                </div>
            );
        }
        else {
            if (this.state.matchCreated && !this.state.matchJoined) { // waiting for match
                return (
                    <div className="waiting">
                        <strong>Waiting for players to join match...</strong>
                        once a player joins the game will automatically load
                    </div>
                );
            }
                                                //make sure we got the match by name
            else if (this.state.matchJoined && this.state.matchRecieved) { // matchmaking done: loading game
                console.log("matchmaking complete, rendering game");
                return (<GameWrapper match = {this.match} isCreator = {this.state.matchCreated} socket = {this.socket}/>);
            }
            else if (!this.state.matchCreated && !this.state.matchJoined && !this.state.matchRecieved){ // Match Joiner/Creator
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
            //TODO: fancy loading animation
            else{
                return ("LOADING...");
            }
        }
    }
}
