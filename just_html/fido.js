function CredentialCreate(session) {
    log("Creating credential", 'info', 'nav-cred-create-logging')
    navigator.credentials.create({publicKey: session['nav-cred-create-options']})
        .then(function (newCredentialInfo) {
            log("Created credential successfully. ", 'info', 'nav-cred-create-logging')
            session['nav-cred-create-credential'] = newCredentialInfo
        }).catch(function (err) {
        log("Failed to create credential. Error: " + err.message + "(" + err.name + ")", 'error', 'nav-cred-create-logging')
        log("Stack: " + err.stack, 'debug', 'nav-cred-create-logging')
        session['nav-cred-create-error'] = err
    });
    log("Started credential creation", 'info', 'nav-cred-create-logging')
}

function GenerateExcludedCredential(allSessions, divNameToProcess) {
    log("Generating the excluded credentials", "debug", 'nav-cred-create-logging')
    let divToProcess = document.getElementById(divNameToProcess)
    currentSession['nav-cred-create-excludeCredentials'] = new Map()
    divToProcess.innerHTML = ""
    allSessions.forEach((value, key) => {
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

function ParseAttObjectAuthDataFlag(elementName = 'nav-cred-obj-parse-Response.AttestationObject.AuthData.flags') {
    const elementById = document.getElementById(elementName)
    if (elementById) {
        const flagValue = Number(elementById.value)
        for (let counter = 0; counter < 8; counter++) {
            const flagElement = document.getElementById(elementName + "-" + counter)
            if (flagElement) {
                if (((2 ** counter) & flagValue) > 0) { //
                    flagElement.innerHTML = "1"
                } else {
                    flagElement.innerHTML = "0"
                }
            } else {
                log("Could not locate element for index " + counter + " of element " + elementName, 'error', 'nav-cred-create-logging')
            }
        }

    } else {
        log("Failed to parse auth data flag for the element " + elementName + " since it could not be located", 'error', 'nav-cred-create-logging')
    }

}

function CreateCredentialResponse(session) {
    let inputKeyCredential = session['nav-cred-create-credential']
    return JSON.stringify({
        type: inputKeyCredential.type,
        id: inputKeyCredential.id,
        authenticatorAttachment: inputKeyCredential.authenticatorAttachment,
        rawId: EscapeBase64EncodedString(Transform(inputKeyCredential.rawId, 'Array', 'Base64', LoggingPrefixMapping['nav-cred-obj'])),
        clientExtensionResults: inputKeyCredential.getClientExtensionResults(),
        response: {
            attestationObject: EscapeBase64EncodedString(Transform(inputKeyCredential.response.attestationObject, 'Array', 'Base64', LoggingPrefixMapping['nav-cred-obj'])),
            clientDataJSON: EscapeBase64EncodedString(Transform(inputKeyCredential.response.clientDataJSON, 'Array', 'Base64', LoggingPrefixMapping['nav-cred-obj'])),
            transports: inputKeyCredential.response.getTransports(),
            publicKeyAlgorithm: inputKeyCredential.response.getPublicKeyAlgorithm(),
            publicKey: EscapeBase64EncodedString(Transform(inputKeyCredential.response.getPublicKey(), 'Array', 'Base64', LoggingPrefixMapping['nav-cred-obj'])),
        }
    })
}

const publicKeyCredentialDetails = {
    "-7": {"type": "public-key", "alg": -7},
    "-257": {"type": "public-key", "alg": -257},
    "-8": {"type": "public-key", "alg": -8},
}
const publicKeyCredentialMapper = new Map()
Object.keys(publicKeyCredentialDetails).forEach((key) => {
    publicKeyCredentialMapper.set(key, publicKeyCredentialDetails[key])
})

sessionEventListeners.push((currSession, eventType) => {
    switch (eventType) {
        case SessionEventTypes.New:
            currSession["nav-cred-create-pubKeyCredParams"] = publicKeyCredentialMapper
            break
        case SessionEventTypes.Select:
            SetObject(currSession['nav-cred-create-options'] ? currSession['nav-cred-create-options'] : EmptyCredOptions,
                "nav-cred-create")
            SetObject(currSession['nav-cred-create-credential'] ? currSession['nav-cred-create-credential'] : EmptyPublicKeyCredential,
                "nav-cred-obj")
            break
    }
})

let CredentialOptionList = {
    Empty: (currSession) => {
        log("Returning empty credential options for the " + currSession)
        return EmptyCredOptions
    },
    Default: (currSession) => {
        log("Returning default credential options for the " + currSession)
        return DefaultCredOptions
    },
    ServerSide: (currSession) => {
        log("Returning default credential options for the " + currSession)
        GetURL(API_ENDPOINTS.getRegisterRequest, currentSession, 'nav-cred-create-logging')
    }
}

let EmptyCredOptions = {
    "rp": {
        "id": "",
        "name": "",
    },
    "user": {
        "displayName": "",
        "id": new TextEncoder().encode(""),
        "name": ""
    },
    "challenge": new TextEncoder().encode(""),
    "pubKeyCredParams": [
        publicKeyCredentialDetails["-7"], publicKeyCredentialDetails["-8"], publicKeyCredentialDetails["-257"]
    ],
    "timeout": "",
    "authenticatorSelection": {
        "authenticatorAttachment": "invalidVal",
        "residentKey": "invalidVal",
        "requireResidentKey": false,
        "userVerification": "preferred",
    },
    "attestation": "invalidVal",
}

const DefaultCredOptions = {
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

const EmptyPublicKeyCredential = {
    authenticatorAttachment: "",
    id: "",
    rawId: new TextEncoder().encode(""),
    toJSON: "",
    response: {
        attestationObject: new TextEncoder().encode(""),
        clientDataJSON: new TextEncoder().encode(""),
        getAuthenticatorData: new TextEncoder().encode(""),
        getPublicKey: new TextEncoder().encode(""),
        getPublicKeyAlgorithm: "",
        getTransports: ""
    }
}

const TransformationDefinition = {
    "nav-cred-create": {
        "availableKeys": ["attestation", "attestationFormats", "authenticatorSelection.authenticatorAttachment",
            "authenticatorSelection.residentKey", "authenticatorSelection.userVerification", "authenticatorSelection.requireResidentKey",
            "challenge", "pubKeyCredParams", "timeout", "rp.name", "rp.id", "user.id", "user.name", "user.displayName"],
        "default": "text-noChange",
        "rp": "object-noChange",
        "user": "object-noChange",
        "user.id": "text-ArrayBuffer",
        "challenge": "text-ArrayBuffer",
        "pubKeyCredParams": "options-sessionMap/alg",
        "timeout": "text-number",
        "authenticatorSelection": "object-noChange",
        "authenticatorSelection.requireResidentKey": "options-bool-oneValue",
        "excludeCredentials": "options-sessionMap",
        "attestationFormats": "options-noChange"
    },
    "nav-cred-obj": {
        "availableKeys": ["authenticatorAttachment", "id", "rawId", "type",
            "response.attestationObject", "response.clientDataJSON", "response.type", "response.getAuthenticatorData",
            "response.getPublicKey", "response.getPublicKeyAlgorithm", "response.getTransports", "toJSON"],
        "default": "text-noChange",
        "rawId": "text-ArrayBuffer",
        "response.clientDataJSON": "text-ArrayBuffer",
        "response.attestationObject": "text-ArrayBuffer",
        "response.getAuthenticatorData": "text-ArrayBuffer",
        "response.getPublicKey": "text-ArrayBuffer",
    },
    "nav-cred-obj-parse": {
        "availableKeys": ["Response.CollectedClientData.type", "Response.CollectedClientData.challenge",
            "Response.CollectedClientData.origin", "Response.CollectedClientData.topOrigin",
            "Response.CollectedClientData.crossOrigin", "Response.AttestationObject.fmt",
            "Response.AttestationObject.AuthData.rpid", "Response.AttestationObject.AuthData.flags",
            "Response.AttestationObject.AuthData.sign_count", "Response.AttestationObject.AuthData.att_data.aaguid",
            "Response.AttestationObject.AuthData.att_data.credential_id", "Response.AttestationObject.AuthData.att_data.public_key",
            "Response.AttestationObject.AuthData.att_data.public_key", "Response.AttestationObject.attStmt.alg",
            "Response.AttestationObject.attStmt.sig", "Response.AttestationObject.attStmt.x5c",
            "Response.AttestationObject.attStmt.ecdaaKeyId", "Response.AttestationObject.attStmt.ver",
            "Response.AttestationObject.attStmt.response", "Response.AttestationObject.attStmt.certinfo",
            "Response.AttestationObject.attStmt.pubArea"
        ],
        "default": "text-noChange",
        "Response.CollectedClientData.challenge": "text-base64",
        "Response.AttestationObject.AuthData.rpid": "text-base64",
        "Response.AttestationObject.AuthData.att_data.credential_id": "text-base64",
        "Response.AttestationObject.AuthData.att_data.public_key": "text-base64",
        "Response.AttestationObject.attStmt.sig": "text-base64",
        "Response.AttestationObject.attStmt.x5c": "text-base64",
        "Response.AttestationObject.attStmt.ecdaaKeyId": "text-base64",
        "Response.AttestationObject.attStmt.response": "text-base64",
        "Response.AttestationObject.attStmt.certinfo": "text-base64",
        "Response.AttestationObject.attStmt.pubArea": "text-base64",
    }
}

LoggingPrefixMapping["nav-cred-create"] = "nav-cred-create-logging";
LoggingPrefixMapping["nav-cred-obj"] = "nav-cred-create-logging";
LoggingPrefixMapping["nav-cred-obj-parse"] = "nav-cred-create-logging";

const API_ENDPOINTS = {
    getDebug: {
        Method: "GET",
        URL: "/debug",
        Callback: (status, response, currSession, debugLocation) => {
            log("Executing callback", "info", debugLocation)
            if (status === 200 && response === "Hello") {
                log("Successfully invoked debug", "info", debugLocation)
            } else {
                log("Debug invocation failed with status " + status + " and response " + response, "info", debugLocation)
            }
            log("Executed callback", "info", debugLocation)
        }
    },
    getInfo: {
        Method: "GET",
        URL: "/api/info",
        Callback: (status, response, currSession, debugLocation) => {
            log("Executing callback for /api/info", "info", debugLocation)
            try {
                if (status === 200) {
                    if (response.status === "OK") {
                        if (currSession.sessionUser === response.data.username) {
                            log("Current session name matches server session i.e. " + currSession.sessionUser, "info", debugLocation)
                        } else {
                            log("Session user name " + currSession.sessionUser + " does not match " + response.data.username, "error", debugLocation)
                        }
                    }
                } else {
                    log("Debug invocation failed with status " + status + " and response " + response, "info", debugLocation)
                }
                log("Executed callback for /api/info", "info", debugLocation)
            } catch (error) {
                log("Failed to execute callback for /api/info with error " + error.message + "(" + error.name + ")", "error", debugLocation)
                log("Stack " + error.stack, "debug", debugLocation)
            }
        },
    },
    login: {
        Method: "POST",
        URL: "/api/login",
        Body: (session) => {
            return JSON.stringify({
                username: session.sessionUser
            })
        },
        Callback: (status, response, currSession, debugLocation) => {
            if (status === 200 && response.status === "OK") {
                log("Successfully login to server", "info", debugLocation)
            } else {
                log("Login to server failed " + status + " response " + response?.status, "error", debugLocation)
            }
        },
    },
    logout: {
        Method: "GET",
        URL: "/api/logout",
    },
    getRegisterRequest: {
        Method: "GET",
        URL: "/api/webauthn/attestation"
    },
    register: {
        Method: "POST",
        URL: "/api/webauthn/attestation",
        Body: (session) => {
            return CreateCredentialResponse(session)
        },
        Callback: (status, response, currSession, debugLocation) => {
            if (status === 200 && response.status === "OK") {
                log("Successfully registered to server", "info", debugLocation)
            } else {
                log("Failed to registered to server " + status + " response " + response?.status, "error", debugLocation)
            }
        },
    },
    getAuthRequest: {
        Method: "GET",
        URL: "/api/webauthn/assertion"
    },
    authenticate: {
        Method: "POST",
        URL: "/api/webauthn/assertion",
        Body: (session) => {
            log("Returning empty body for session " + session)
            return ""
        }
    },
    parseCredential: {
        Method: "POST",
        URL: "/api/webauthn/credential/parse",
        Body: (session) => {
            return CreateCredentialResponse(session)
        },
        Callback: (status, response, currSession, debugLocation) => {
            if (status === 200 && response.status === "OK") {
                log("Successfully parsed credential creation response on server", "info", debugLocation)
                currSession['nav-cred-create-credential-parsed'] = response.data
                //TODO: move this to callback
                SetObject(currentSession['nav-cred-create-credential-parsed'], 'nav-cred-obj-parse')
            } else {
                log("Failed to parsed credential creation response on server " + status + " response " + response?.status, "error", debugLocation)
            }
        }
    }
}