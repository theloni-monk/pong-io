/** 
 *  This file is a wrapper for creating a Game and thus GameFrame based on server info
 *  it connects to the server and handles user input for name and matchmaking
 *  it places the user into a match and then 
 */

//WRITEME: match finding logic and giving socket to gameframe
// section for open matches
// input for match name
// button to join, button to create_new

import React from 'react';
const io = require('socket.io-client');
import {match} from '../GameServer';
import { Socket } from 'dgram';

function renderOpenMatches(matches: any, onclick: any) : JSX.Element[]{
    let matchDivs:JSX.Element[] = []
    Object.keys(matches).forEach((key, index)=>{
        if(!matches[key].isFull){
            matchDivs.push(
                <div className = "open-match" onClick = {() => {onclick(matches[key].name)}}>
                    {matches[key].name}
                    <hr/> 
                    {matches[key].players[0]}
                </div>
            );
        }
    })
    return matchDivs;
}

interface GLProps { }
interface GLState { 
    openMatches: any;
    matchNameInput: string;
    error: string
}

class GameLoader extends React.Component<GLProps, GLState>{
    
    protected socket: SocketIO.Socket;

    constructor(props: any){
        super(props);
        this.state = {
            openMatches: {},
            matchNameInput: '',
            error: ''
        }
    }

    componentDidMount(){
        this.socket = io('http://127.0.0.1:5000'); //TODO: make sure this connects
        this.socket.on('ERROR', function(msg){
            console.log('socket recived err msg: '+ msg);
        });
        this.socket.on('RECV_OPEN_MATCHES', (oMatches:any)=>{this.setState({openMatches: oMatches})});
        
    }

    assignMatchNameInput = (name: string) => {
        this.setState({matchNameInput: name})
    }

    refreshOpenMatches = () => {
        this.socket.emit('GET_OPEN_MATCHES');
    }

    joinMatch = () => {
        //WRITEME: joinmatch
    }

    createMatch = () => {
        //WRITEME: creatematch
    }

    render(){
        return (
            <div className = "game-loader-container">
                <button onClick = {this.refreshOpenMatches}/>
                <div className = "open-match-wrapper">
                    {renderOpenMatches(this.state.openMatches, this.assignMatchNameInput)}
                </div>
                <input className = "match-name-input">{this.state.matchNameInput}</input>
                <button onClick = {this.joinMatch}>Join Match</button>
                <button onClick = {this.createMatch}>Create Match</button>
                <strong className = "error-strong">{this.state.error}</strong>
            </div>
            //TODO: conditionally render GameWrapper once matchmaking complete
        );
    }
}