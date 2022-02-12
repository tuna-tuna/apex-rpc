// this a subset of the features that Apex Legends events provides - however,
// when writing an app that consumes events - it is best if you request
// only those features that you want to handle.
//
// NOTE: in the future we'll have a wildcard option to allow retrieving all

// features
var g_interestedInFeatures = [
];

var onErrorListener, onInfoUpdates2Listener, onNewEventsListener;

function registerEvents() {
  onErrorListener =
      function(info) {
    console.log('Error: ' + JSON.stringify(info));
  }

  onInfoUpdates2Listener =
      function(info) {
    console.log('Info UPDATE: ' + JSON.stringify(info));
  }

  onNewEventsListener =
      function(info) {
    console.log('EVENT FIRED: ' + JSON.stringify(info));
  }

      // general events errors
      overwolf.games.events.onError.addListener(onErrorListener);

  // "static" data changed (total kills, username, steam-id)
  // This will also be triggered the first time we register
  // for events and will contain all the current information
  overwolf.games.events.onInfoUpdates2.addListener(onInfoUpdates2Listener);
  // an event triggerd
  overwolf.games.events.onNewEvents.addListener(onNewEventsListener);
}

function unregisterEvents() {
  overwolf.games.events.onError.removeListener(onErrorListener);
  overwolf.games.events.onInfoUpdates2.removeListener(onInfoUpdates2Listener);
  overwolf.games.events.onNewEvents.removeListener(onNewEventsListener);
}

function gameLaunched(gameInfoResult) {
  if (!gameInfoResult) {
    return false;
  }

  if (!gameInfoResult.gameInfo) {
    return false;
  }

  if (!gameInfoResult.runningChanged && !gameInfoResult.gameChanged) {
    return false;
  }

  if (!gameInfoResult.gameInfo.isRunning) {
    return false;
  }

  // NOTE: we divide by 10 to get the game class id without it's sequence number
  if (Math.floor(gameInfoResult.gameInfo.id / 10) != 21566) {
    return false;
  }

  console.log('Apex Legends Launched');
  return true;
}

function gameRunning(gameInfo) {
  if (!gameInfo) {
    return false;
  }

  if (!gameInfo.isRunning) {
    return false;
  }

  // NOTE: we divide by 10 to get the game class id without it's sequence number
  if (Math.floor(gameInfo.id / 10) != 21566) {
    return false;
  }

  console.log('Apex Legends running');
  return true;
}


function setFeatures() {
  overwolf.games.events.setRequiredFeatures(
      g_interestedInFeatures, function(info) {
        if (info.status == 'error') {
          // console.log("Could not set required features: " + info.reason);
          // console.log("Trying in 2 seconds");
          window.setTimeout(setFeatures, 2000);
          return;
        }

        console.log('Set required features:');
        console.log(JSON.stringify(info));
      });
}


// Start here
overwolf.games.onGameInfoUpdated.addListener(function(res) {
  if (gameLaunched(res)) {
    registerEvents();
    unregisterEvents();
    setTimeout(setFeatures, 1000);
  }
  // console.log('onGameInfoUpdated: ' + JSON.stringify(res));
});

overwolf.games.getRunningGameInfo(function(res) {
  if (gameRunning(res)) {
    registerEvents();
    setTimeout(setFeatures, 1000);
  }
  // console.log('getRunningGameInfo: ' + JSON.stringify(res));
});

function convertGamemode(game_mode_raw) {
  if (game_mode_raw === '#PL_FIRINGRANGE') {
    return 'FiringRange';
  } else if (game_mode_raw === '#PL_TRAINING') {
    return 'Training';
  } else if (game_mode_raw === '#PL_DUO') {
    return 'Duo';
  } else if (game_mode_raw === '#PL_TRIO') {
    return 'Trio';
  } else if (game_mode_raw === '#PL_Ranked_Leagues') {
    return 'Ranked';
  } else if (game_mode_raw === '#PL_Ranked_Leagues') {
      return 'Ranked Arena';
  } else if (game_mode_raw === '#GAMEMODE_ARENAS') {
      return 'Arena';
  } else if (game_mode_raw === '#CONTROL_NAME') {
      return 'Control';
  }
}

function getLegend(info) {
    let i = 0;
    const clubRegex = new RegExp('\[\w{0,4}\]');
    for (i; i < 3;i++){
        let index = 'legendSelect_' + i;
        let playerName;
        if (info['res']['match_info'][index]['playerName']) { 
            continue;
        }
        legendInfo = info['res']['match_info'][index];
        legendInfoJson = JSON.parse(legendInfo);
        playerName = String(legendInfoJson['playerName']);
        playerName = playerName.replace(' ', '');
        playerName = playerName.replace(clubRegex, '');
        meName = String(info['res']['me']['name']);
        meName = meName.replace(' ', '');
        meName = meName.replace(clubRegex, '');
        if (meName.endsWith(playerName)) {
            let legendName = String(legendInfoJson['legendName']);
            legendName = legendName.replace('#character_', '');
            legendName = legendName.replace('_NAME', '');
            if (legendName === 'maggie') {
                legendName = 'madmaggie';
            }
            return legendName;
        }
        
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function getRequest(url = '', headers) {
    try {
        const response = await fetch(url, { method: "get", headers: headers });
        return response.json();
    } catch (e) {
        console.error(e);
    }
}

const ApplicationID = '00000000000000';
var plugin = null;
function loadPlugin() {
    return new Promise((resolve, reject) => {
        try {
            setTimeout(() => {
                overwolf.extensions.current.getExtraObject('DiscordRPCPlugin', (result) => {
                    if (result.status === 'success') {
                        plugin = result.object;
                    }
                    resolve();
                });
            }, 1000);
        }catch(e) {
            reject();
        }
    })
}
loadPlugin().then(() => {
    try {
        plugin.initialize(ApplicationID, console.log);
    } catch (e) {
        console.error(e);
    }
}).catch(e => {
    console.error('error' + e);
})

const apexLegendsApiKey = 'API_KEY_HERE'
const mapURL = 'https://api.mozambiquehe.re/maprotation?version=2&auth=' + apexLegendsApiKey;
let headers = new Headers({
    "User-Agent"   : "Mozilla/5.0"
});
let matchState;
let game_mode_raw;
let game_mode;
let kills;
let assists;
let teams;
let players;
let damage;
let legend;
let map;
let mapKey;
let state;
let detail;
let currentState = false;

function updateRPC() {
    try {
        overwolf.games.events.getInfo(function (info) {
            if (info['success'] === true) {
                console.log(info);
                if ('game_info' in info['res'] && 'match_state' in info['res']['game_info']) {
                    matchState = info['res']['game_info']['match_state']
                    if (matchState === 'active') {
                        game_mode_raw = info['res']['match_info']['game_mode'];
                        game_mode = convertGamemode(game_mode_raw);
                        if (game_mode !== 'Control') {
                            let tabs = JSON.parse(info['res']['match_info']['tabs']);
                            kills = tabs['kills'];
                            assists = tabs['assists'];
                            teams = tabs['teams'];
                            players = tabs['players'];
                            damage = tabs['damage'];
                            state = kills + ' Kills  ' + damage + ' dmg';
                        } else if (game_mode === 'Control') {
                            damage = info['res']['me']['totalDamageDealt'];
                        }
                        detail = game_mode + ' - ' + teams + ' teams remain';
                        if (game_mode !== 'FiringRange') {
                            legend = getLegend(info);
                            legendName = capitalize(legend);
                        } else {
                            legendName = 'online';
                        }
                        if (currentState === false) {
                            currentState = true;
                            getRequest(mapURL, headers).then(data => {
                                if (game_mode === 'Duo' || game_mode === 'Trio') {
                                    map = data['battle_royale']['current']['map'];
                                } else if (game_mode === 'Ranked') {
                                    map = data['ranked']['current']['map'];
                                } else if (game_mode === 'Arena') {
                                    map = data['arenas']['current']['map'];
                                } else if (game_mode === 'Ranked Arena') {
                                    map = data['arenasRanked']['current']['map'];
                                } else if (game_mode === 'Control') {
                                    map = data['control']['current']['map'];
                                } else {
                                    map = 'FiringRange';
                                }
                                if (game_mode !== 'Control') {
                                    mapKey = map.toLowerCase();
                                } else {
                                    if (map === 'Barometer') {
                                        mapKey = 'stormpoint';
                                    } else {
                                        mapKey = 'olympus';
                                    }
                                }
                                console.log('fetch map: ' + map);
                                if(game_mode === 'Control'){
                                    plugin.updatePresence(game_mode + ' - ' + map, damage + ' damage', mapKey, map, legend, legendName, console.log);
                                } else if (game_mode !== 'FiringRange') {
                                    plugin.updatePresence(detail, state, mapKey, map, legend, legendName, console.log);
                                } else {
                                    plugin.updatePresence(game_mode, '', mapKey, map, legend, legendName, console.log);
                                }
                            })
                        } else {
                            if(game_mode === 'Control'){
                                plugin.updatePresence(game_mode + ' - ' + map, damage + 'damage', mapKey, map, legend, legendName, console.log);
                            } else if (game_mode !== 'FiringRange') {
                                plugin.updatePresence(detail, state, mapKey, map, legend, legendName, console.log);
                            } else {
                                plugin.updatePresence(game_mode, '', mapKey, map, legend, legendName, console.log);
                            }
                        }
                    }
                    else if (matchState === 'inactive') {
                        game_mode_raw = info['res']['match_info']['game_mode'];
                        game_mode = convertGamemode(game_mode_raw);
                        currentState = false;
                        plugin.updatePresence('In Lobby', 'In ' + game_mode + ' queue', 'logo', 'In Lobby', 'online', 'Currently Online', console.log);
                    }
                } else {
                    game_mode_raw = info['res']['match_info']['game_mode'];
                    game_mode = convertGamemode(game_mode_raw);
                    currentState = false;
                    plugin.updatePresence('In Lobby', 'In ' + game_mode + ' queue', 'logo', 'In Lobby', 'online', 'Currently Online', console.log);
                }
            }
        });
    } catch (e) {
        console.error('Error occurred while updating RPC');
        console.error(e);
        //WIP dispose
        plugin.dispose(console.log);
    }
}
setInterval(updateRPC, 15000);
