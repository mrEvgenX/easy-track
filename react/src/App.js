import React, { Component } from 'react';
import base64 from 'base-64';
import './App.css';
import HeaderBlock from './components/HeaderBlock';
import Main from './components/Main';


function populateState() {
  return new Promise((resolve, _) => {
    Promise.all([
      'http://localhost:8000/api/v1/folders',
      'http://localhost:8000/api/v1/items',
      'http://localhost:8000/api/v1/entries'
    ].map(url => fetch(url)))
      .then(responses => {
        Promise.all(responses.map(response => response.json()))
          .then(data => {
            resolve({
              folders: data[0],
              trackedItems: data[1], 
              trackEntries: data[2]
            });
          });
      });
  });
}


class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      folders: [],
      trackedItems: [],
      trackEntries: [],
      createFolder: this.createFolder,
      createElement: this.createElement,
      addTrackEntry: this.addTrackEntry
    };
    populateState().then(data => {this.setState(data)});
  }

  createFolder = (name) => {
    // TODO потом прикрутится авторизация и будет круто
    const username = 'admin'
    const password = 'password1234'
    fetch(
      'http://localhost:8000/api/v1/folders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Authorization': 'Basic ' + base64.encode(username + ":" + password)
        },
        body: JSON.stringify({name})
      }
      )
      .then(response => response.json())
      .then(data => {
        this.setState({folders: [...this.state.folders, data]})
      });
  }

  createElement = (name, folder) => {
    // TODO потом прикрутится авторизация и будет круто
    const username = 'admin'
    const password = 'password1234'
    fetch(
      'http://localhost:8000/api/v1/items',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Authorization': 'Basic ' + base64.encode(username + ":" + password)
        },
        body: JSON.stringify({folder, name})
      }
      )
      .then(response => response.json())
      .then(data => {
        this.setState({trackedItems: [...this.state.trackedItems, data]})
      });
  }

  addTrackEntry = (itemId) => {
    // TODO потом прикрутится авторизация и будет круто
    const username = 'admin'
    const password = 'password1234'

    const now = new Date()
    const month = now.getMonth()+1
    const timeBucket = `${now.getFullYear()}-${month < 10? '0' + month : month}-${now.getDate()}`
    fetch(
      'http://localhost:8000/api/v1/entries',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Authorization': 'Basic ' + base64.encode(username + ":" + password)
        },
        body: JSON.stringify({timeBucket, item: itemId})
      }
      )
      .then(response => response.json())
      .then(data => {
        this.setState({trackEntries: [...this.state.trackEntries, data]})
      })
      .catch(error => {
        console.log(error);
      });
  }

  render() {
    return (
      <div className="App">
        <HeaderBlock />
        <Main globalState={this.state} />
      </div>
    ); 
  }

}

export default App;