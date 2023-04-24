
function CredentialCreate(session) {
    log("Creating credential", 'info', 'nav-cred-create-logging')
    navigator.credentials.create({publicKey: session['nav-cred-create-options']})
        .then(function (newCredentialInfo) {
            log("Created credential successfully. ", 'info', 'nav-cred-create-logging')
            session['nav-cred-create-credential'] = newCredentialInfo
        }).catch(function (err) {
        log("Failed to create credential. Error: " + JSON.stringify(err), 'error', 'nav-cred-create-logging')
        session['nav-cred-create-error'] = err
    });
    log("Started credential creation", 'info', 'nav-cred-create-logging')
}

function GenerateExcludedCredential(allSessions, divNameToProcess) {
    log("Generating the excluded credentials", "debug", 'nav-cred-create-logging')
    let divToProcess = document.getElementById(divNameToProcess)
    currentSession['nav-cred-create-excludeCredentials'] = new Map()
    divToProcess.innerHTML = ""
    allSessions.forEach((value, key, allSessions) => {
        if (value.hasOwnProperty('nav-cred-create-credential')) {
            let rawId = value['nav-cred-create-credential'].rawId
            let excludeCred = {
                type: 'public-key',
                id: rawId,
                transports: value['nav-cred-create-credential'].response.getTransports()
            }
            currentSession['nav-cred-create-excludeCredentials'].set(key, excludeCred)
            divToProcess.innerHTML = divToProcess.innerHTML + "<label for='nav-cred-create-excludeCredentials-options-" + key + "'>" + key +
                "</label><input type='checkbox' id='nav-cred-create-excludeCredentials-options-" + key + "' " +
                "class='nav-cred-create nav-cred-create-excludeCredentials-options' " +
                "name='nav-cred-create nav-cred-create-excludeCredentials-options-" + key + "' checked value='" + key + "'>"
        }
    })
    log("Generated the excluded credentials", 'debug', 'nav-cred-create-logging')
}

let DefaultCredOptions = {
    "rp": {
        "name": "ACME",
    },
    "user": {
        "displayName": "testUserDisplayName",
        "id": new TextEncoder().encode("testUserID"),
        "name": "testUserName"
    },
    "challenge": new TextEncoder().encode("dsnkdksnsdkjndskjdnskn8e49898e9w89ewyhchchwchwe8che8cwc"),
    "pubKeyCredParams": [
        {
            "alg": -7,
            "type": "public-key"
        },
        {
            "alg": -257,
            "type": "public-key"
        }

    ]
}