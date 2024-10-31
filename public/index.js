const defaultLocale = 'en-US';
let currentLocale = defaultLocale;  // Track the currently selected language

function requestChatBot(loc, locale = defaultLocale) {
    const params = new URLSearchParams(location.search);
    const oReq = new XMLHttpRequest();
    oReq.addEventListener("load", initBotConversation);
    var path = "/chatBot?locale=" + locale;

    if (loc) {
        path += "&lat=" + loc.lat + "&long=" + loc.long;
    }
    if (params.has('userId')) {
        path += "&userId=" + params.get('userId');
    }
    if (params.has('userName')) {
        path += "&userName=" + params.get('userName');
    }
    oReq.open("POST", path);
    oReq.send();
}

function extractLocale(localeParam) {
    if (!localeParam) {
        return defaultLocale;
    }
    else if (localeParam === 'autodetect') {
        return navigator.language;
    }
    else {
        return localeParam;
    }
}

function chatRequested() {
    const params = new URLSearchParams(location.search);
    if (params.has('shareLocation')) {
        getUserLocation((location) => requestChatBot(location, currentLocale));
    }
    else {
        requestChatBot(undefined, currentLocale);
    }
}

function getUserLocation(callback) {
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const location = {
                lat: position.coords.latitude,
                long: position.coords.longitude
            }
            callback(location);
        },
        function(error) {
            console.log("location error:" + error.message);
            callback();
        });
}

function initBotConversation() {
    if (this.status >= 400) {
        alert(this.statusText);
        return;
    }

    const jsonWebToken = this.response;
    const tokenPayload = JSON.parse(atob(jsonWebToken.split('.')[1]));
    const user = {
        id: tokenPayload.userId,
        name: tokenPayload.userName,
        locale: currentLocale  // Use the selected locale
    };
    let domain = undefined;
    if (tokenPayload.directLineURI) {
        domain =  "https://" +  tokenPayload.directLineURI + "/v3/directline";
    }
    let location = undefined;

    const botConnection = window.WebChat.createDirectLine({
        token: tokenPayload.connectorToken,
        domain: domain
    });

    const styleOptions = {
        botAvatarImage: 'https://raw.githubusercontent.com/abdbdasal/HealthBotContainerSample/refs/heads/master/Amal-Fav-Icon-100px.png',
        hideSendBox: false,
        botAvatarInitials: 'Amal',
        userAvatarInitials: 'You',
        backgroundColor: '#F8F8F8'
    };

    const store = window.WebChat.createStore({}, (store) => (next) => (action) => {
        if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED') {
            store.dispatch({
                type: 'DIRECT_LINE/POST_ACTIVITY',
                meta: { method: 'keyboard' },
                payload: {
                    activity: {
                        type: "invoke",
                        name: "InitConversation",
                        locale: user.locale,
                        value: {
                            jsonWebToken: jsonWebToken,
                            triggeredScenario: {
                                trigger: "amalbot_greet",
                                args: {
                                    location: location,
                                    disclaimerAccepted: false
                                }
                            }
                        }
                    }
                }
            });
        }
        else if (action.type === 'DIRECT_LINE/INCOMING_ACTIVITY') {
            if (action.payload && action.payload.activity && action.payload.activity.type === "event" && action.payload.activity.name === "ShareLocationEvent") {
                getUserLocation((location) => {
                    store.dispatch({
                        type: 'WEB_CHAT/SEND_POST_BACK',
                        payload: { value: JSON.stringify(location) }
                    });
                });
            }
        }
        return next(action);
    });

    const webchatOptions = {
        directLine: botConnection,
        styleOptions: styleOptions,
        store: store,
        userID: user.id,
        username: user.name,
        locale: user.locale
    };

    startChat(user, webchatOptions);
}

function startChat(user, webchatOptions) {
    const botContainer = document.getElementById('webchat');
    window.WebChat.renderWebChat(webchatOptions, botContainer);
}

// Language switch function
function switchLanguage() {
    const languageSelect = document.getElementById('languageSelect');
    currentLocale = languageSelect.value;

    document.getElementById('webchat').innerHTML = '';  // Clear chat
    chatRequested();  // Reload chat with new language
}
