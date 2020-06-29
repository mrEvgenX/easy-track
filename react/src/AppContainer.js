import React, {
    Component
} from 'react';
import {
    populateState, refreshAccess, createNewUser, requestAndStoreCredentials, clearCredentialsFromStore,
    createFolder, createElement, addTrackEntry, putElementInFolder, deleteElement, deleteFolder, bulkUpdateTrackEntries,
    AccessTokenExpiredError
} from './asyncOperations';
import App from './App';


function actRefreshingTokenIfNecessary(func, refreshToken, accessRefresher) {
    return async (accessToken, ...args) => {
        try {
            return await func(accessToken, ...args);
        } catch(err) {
            if (err instanceof AccessTokenExpiredError) {
                const { access: newAccessToken } = await refreshAccess(refreshToken);
                accessRefresher(newAccessToken);
                return await func(newAccessToken, ...args);
            } else
                throw err;
        }
    }
}


export default class AppContainer extends Component {

    constructor(props) {
        super(props);
        this.state = {
            auth: {
                // TODO Incapsulate every call to localstorage
                refresh: localStorage.getItem('refreshToken'),
                access: localStorage.getItem('accessToken'),
                isAuthenticated: localStorage.getItem('refreshToken') !== null,
                registrationFailed: null
            },
            needToFetchData: true,
            folders: [],
            trackedItems: [],
            trackEntries: [],
            currentFilter: '',
        };
    }

    accessRefresher = newAccessToken => {
        this.setState(prevState => {
            prevState.auth.access = newAccessToken;
            return prevState;
        });
    }

    populateStateIfNecessary = () => {
        const { auth: { isAuthenticated }, needToFetchData } = this.state;
        if (
            isAuthenticated && needToFetchData
        ) {
            this.setState({needToFetchData: false});
            actRefreshingTokenIfNecessary(
                populateState, this.state.auth.refresh, this.accessRefresher
            )(this.state.auth.access)
                .then(data => {
                    if (data !== null) {
                        this.setState(data)
                    }
                });
        }
    }

    onLogin = async (username, password) => {
        try {
            let loginData = await requestAndStoreCredentials(username, password);
            this.setState({
                auth: {
                    ...loginData,
                    isAuthenticated: true,  
                },
                needToFetchData: true,
            });
            return true;
        } catch (error) {
            this.setState({
                auth: {
                    ...this.state.auth,
                    isAuthenticated: false,
                    registrationFailed: null
                }
            });
            console.log(error);
        }
        return false;
    }

    onLogout = () => {
        clearCredentialsFromStore();
        this.setState({
            auth: {
                ...this.state.auth,
                refresh: null,
                access: null,
                isAuthenticated: false,
                registrationFailed: null
            },
            needToFetchData: true,
            folders: [],
            trackedItems: [],
            trackEntries: [],
        });
    }

    onRegister = (login, password) => {
        createNewUser(login, password)
            .then(data => {
                console.log(data);
                this.setState({
                    auth: {
                        ...this.state.auth,
                        registrationFailed: false
                    }
                });
            })
            .catch(error => {
                console.log(error);
                this.setState({
                    auth: {
                        ...this.state.auth,
                        registrationFailed: true
                    }
                });
            });
    }

    onFolderCreation = (name) => {
        actRefreshingTokenIfNecessary(
            createFolder, this.state.auth.refresh, this.accessRefresher
        )(this.state.auth.access, name)
            .then(data => {
                this.setState({
                    folders: [...this.state.folders, data]
                })
            })
            .catch(error => {
                console.log(error);
            });
    }

    onFolderDelete = folder => {
        actRefreshingTokenIfNecessary(
            deleteFolder, this.state.auth.refresh, this.accessRefresher
        )(this.state.auth.access, folder.slug)
            .then(() => {
                this.setState(prevState => {
                    const folderPos = prevState.folders.indexOf(folder);
                    prevState.folders.splice(folderPos, 1);
                    return prevState;
                })
            })
            .catch(error => {
                console.log(error);
            });
    }

    onElementCreation = (name, folder) => {
        if (folder === null && this.state.currentFilter !== '') {
            folder = this.state.currentFilter;
        }
        actRefreshingTokenIfNecessary(
            createElement, this.state.auth.refresh, this.accessRefresher
        )(this.state.auth.access, folder, name)
            .then(data => {
                this.setState({
                    trackedItems: [...this.state.trackedItems, data]
                })
            })
            .catch(error => {
                console.log(error);
            });
    }

    onElementDelete = (item) => {
        actRefreshingTokenIfNecessary(
            deleteElement, this.state.auth.refresh, this.accessRefresher
        )(this.state.auth.access, item.id)
            .then(() => {
                this.setState(prevState => {
                    const itemPos = prevState.trackedItems.indexOf(item);
                    prevState.trackedItems.splice(itemPos, 1);
                    return prevState;
                })
            })
            .catch(error => {
                console.log(error);
            });
    }

    onTrackEntryAddition = (itemId) => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const timeBucket = `${now.getFullYear()}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
        actRefreshingTokenIfNecessary(
            addTrackEntry, this.state.auth.refresh, this.accessRefresher
        )(this.state.auth.access, timeBucket, itemId)
            .then(data => {
                this.setState(prevState => {
                    prevState.trackEntries = [...prevState.trackEntries, data];
                    return prevState;
                })
            })
            .catch(error => {
                console.log(error);
            });
    }

    putItemInFolder = (item, folder) => {
        actRefreshingTokenIfNecessary(
            putElementInFolder, this.state.auth.refresh, this.accessRefresher
        )(this.state.auth.access, item.id, folder)
            .then(data => {
                this.setState(prevState => {
                    const itemPos = prevState.trackedItems.indexOf(item);
                    prevState.trackedItems[itemPos].folder = data.folder;
                    return prevState;
                })
            })
            .catch(error => {
                console.log(error);
            });
    }

    changeFilter = folderSlug => {
        this.setState({ currentFilter: folderSlug });
    }

    applyEntriesChanging = (trackEntriesToAdd, trackEntriesToRemove) => {
        actRefreshingTokenIfNecessary(
            bulkUpdateTrackEntries, this.state.auth.refresh, this.accessRefresher
        )(this.state.auth.access, trackEntriesToAdd, trackEntriesToRemove)
            .then(() => {
                this.setState(prevState => {
                    trackEntriesToAdd.forEach(({item, timeBucket}) => {
                        const entryPos = prevState.trackEntries.findIndex(
                            ({item: currentItem, timeBucket: currentTimeBucket}) => {
                            return currentItem === item && currentTimeBucket === timeBucket;
                        });
                        if (entryPos === -1) {
                            prevState.trackEntries.push({timeBucket, item});
                        }
                    });
                    trackEntriesToRemove.forEach(({item, timeBucket}) => {
                        const entryPos = prevState.trackEntries.findIndex(
                            ({item: currentItem, timeBucket: currentTimeBucket}) => {
                            return currentItem === item && currentTimeBucket === timeBucket;
                        });
                        if (entryPos !== -1) {
                            prevState.trackEntries.splice(entryPos, 1);
                        }
                    });
                    return prevState;
                })
                console.log('save results', trackEntriesToAdd, trackEntriesToRemove);
            })
            .catch(error => {
                console.log(error);
            })
    }

    render() {
        return <App
            populateStateIfNecessary={this.populateStateIfNecessary}
            folders={this.state.folders}
            trackedItems={this.state.trackedItems}
            trackEntries={this.state.trackEntries}
            isAuthenticated={this.state.auth.isAuthenticated}
            currentFilter={this.state.currentFilter}
            changeFilter={this.changeFilter}
            onFolderCreation={this.onFolderCreation}
            onFolderDelete={this.onFolderDelete}
            onElementCreation={this.onElementCreation}
            onTrackEntryAddition={this.onTrackEntryAddition}
            putItemInFolder={this.putItemInFolder}
            onElementDelete={this.onElementDelete}
            registrationFailed={this.state.auth.registrationFailed}
            applyEntriesChanging={this.applyEntriesChanging}
            onLogin={this.onLogin}
            onLogout={this.onLogout}
            onRegister={this.onRegister}
            />;
    }

}
