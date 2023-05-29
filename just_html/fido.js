function CredentialCreate(session) {
    log("Creating credential", 'info', 'nav-cred-create-logging')
    let userId = ''
    const userIdElement = document.getElementById('nav-cred-create-user.id')
    if (userIdElement && 'value' in userIdElement) {
        userId = userIdElement.value
    }
    navigator.credentials.create({publicKey: session['nav-cred-create-options']})
        .then(function (newCredentialInfo) {
            log("Created credential successfully. ", 'info', 'nav-cred-create-logging')
            session['nav-cred-create-credential'] = newCredentialInfo
            SaveCredential(userId, newCredentialInfo)
        }).catch(function (err) {
        log("Failed to create credential. Error: " + err.message + "(" + err.name + ")", 'error', 'nav-cred-create-logging')
        log("Stack: " + err.stack, 'debug', 'nav-cred-create-logging')
        session['nav-cred-create-error'] = err
        ShowSection('nav-cred-createSections', 'tablinks', 'nav-cred-createSection-logging', 'nav-cred-createSectionLink-logging')
    });
    log("Started credential creation", 'info', 'nav-cred-create-logging')
}

function CredentialRequest(session) {
    log("Requesting credential", 'info', 'nav-cred-get-logging')
    navigator.credentials.get({publicKey: session['nav-cred-get-options']})
        .then(function (newCredentialInfo) {
            log("Requested credential successfully. ", 'info', LoggingPrefixMapping['nav-cred-req'])
            session['nav-cred-get-credential'] = newCredentialInfo
            const userId = textDecoder.decode((newCredentialInfo.response.userHandle))
            SaveCredential(userId, newCredentialInfo, LoggingPrefixMapping['nav-cred-req'])
        }).catch(function (err) {
        log("Failed to request credential. Error: " + err.message + "(" + err.name + ")", 'error', 'nav-cred-get-logging')
        log("Stack: " + err.stack, 'debug', 'nav-cred-get-logging')
        session['nav-cred-get-error'] = err
        ShowSection('nav-cred-getSections', 'tablinks', 'nav-cred-getSection-logging', 'nav-cred-getSectionLink-logging')
    });
    log("Started credential request", 'info', 'nav-cred-get-logging')
}

function GenerateExcludedCredential(allSessions, divNameToProcess, optionType = 'create') {
    let opsAttribute = "create-excludeCredentials"
    let debugLocation = 'nav-cred-create-logging'
    let classSuffix = 'create'
    switch (optionType) {
        case "create":
            opsAttribute = "create-excludeCredentials"
            debugLocation = 'nav-cred-create-logging'
            classSuffix = 'create'
            break
        case "get":
            opsAttribute = "get-allowCredentials"
            debugLocation = 'nav-cred-get-logging'
            classSuffix = 'get'
            break
        default:
            log("Unsupported option type " + optionType + " provided. Can not generate the credential for " +
                divNameToProcess, 'error', 'common-debug')
    }
    log("Generating the excluded credentials", "debug", debugLocation)
    let divToProcess = document.getElementById(divNameToProcess)
    currentSession['nav-cred-' + opsAttribute] = new Map()
    divToProcess.innerHTML = ""
    const savedCredentials = GetSavedCredentials(debugLocation)
    for (const userId in savedCredentials) {
        const key = userId
        currentSession['nav-cred-' + opsAttribute].set(key, savedCredentials[userId])
        divToProcess.innerHTML = divToProcess.innerHTML + "<label for='nav-cred-" + opsAttribute + "-options-" + key + "'>" + key +
            "</label><input type='checkbox' id='nav-cred-" + opsAttribute + "-options-" + key + "' " +
            "class='nav-cred-" + classSuffix + " nav-cred-" + opsAttribute + "-options' " +
            "name='nav-cred-" + classSuffix + " nav-cred-" + opsAttribute + "-options-" + key + "' checked value='" + key + "'>"
    }
    log("Generated the excluded credentials", 'debug', debugLocation)
}

const SavedCredentialKeyName = 'SavedCredentials'

function GetSavedCredentials(debugLocation = 'common-debug') {
    const savedCredentials = {}
    let storedCredentialAsString = localStorage.getItem(SavedCredentialKeyName)
    if (storedCredentialAsString) {
        const storedCredential = JSON.parse(storedCredentialAsString)
        if (storedCredential && 'credentials' in storedCredential) {
            for (const property in storedCredential.credentials) {
                const userId = property
                const credential = storedCredential.credentials[userId]
                if (credential) {
                    const updatedId = Transform(credential.id, 'Base64', 'Array', debugLocation)
                    if (updatedId) {
                        credential['id'] = updatedId
                        savedCredentials[userId] = credential
                    } else {
                        log("Failed to transform credential id for user " + userId + "ID: " + credential.id, 'error', debugLocation)
                    }
                } else {
                    log("Failed to identify credential for user " + userId, 'error', debugLocation)
                }
            }
        } else {
            log("Failed to parse stored credentials from localstorage using JSON", 'error', debugLocation)
        }
    } else {
        log("Failed to load information for " + SavedCredentialKeyName + " from localstorage", 'error', debugLocation)
    }
    return savedCredentials
}

function SaveCredential(userId, credential, debugLocation = 'common-debug') {
    if (localStorage) {
        let storedCredentials = {}
        let storedCredentialAsString = localStorage.getItem(SavedCredentialKeyName)
        if (storedCredentialAsString) {
            storedCredentials = JSON.parse(storedCredentialAsString)
        } else {
            storedCredentials.credentials = {}
            storedCredentials.browser = {}
            storedCredentials.browser.appName = navigator.appName
            storedCredentials.browser.appVersion = navigator.appVersion
        }
        if (credential && userId) {
            const storeCred = {}
            storeCred['type'] = 'public-key'
            storeCred['id'] = Transform(credential.rawId, 'Array', 'Base64', debugLocation)
            if (typeof credential.authenticatorAttachment === 'string') {
                storeCred['transports'] = [credential.authenticatorAttachment]
            } else {
                storeCred['transports'] = [...credential.authenticatorAttachment]
            }
            storedCredentials.credentials[userId] = storeCred
        }
        const updatedStoredCredentialAsString = JSON.stringify(storedCredentials)
        localStorage.setItem(SavedCredentialKeyName, updatedStoredCredentialAsString)
    } else {
        log("Localstorage is not available on this browser. Can not save credential.", 'warn')
    }
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

function CreateRequestResponse(session) {
    const inputKeyCredential = session['nav-cred-get-credential']
    const loggingLocation = LoggingPrefixMapping['nav-cred-req']
    return JSON.stringify({
        type: inputKeyCredential.type,
        id: inputKeyCredential.id,
        authenticatorAttachment: inputKeyCredential.authenticatorAttachment,
        rawId: EscapeBase64EncodedString(Transform(inputKeyCredential.rawId, 'Array', 'Base64', loggingLocation)),
        clientExtensionResults: inputKeyCredential.getClientExtensionResults(),
        response: {
            clientDataJSON: EscapeBase64EncodedString(Transform(inputKeyCredential.response.clientDataJSON, 'Array', 'Base64', loggingLocation)),
            authenticatorData: EscapeBase64EncodedString(Transform(inputKeyCredential.response.authenticatorData, 'Array', 'Base64', loggingLocation)),
            signature: EscapeBase64EncodedString(Transform(inputKeyCredential.response.signature, 'Array', 'Base64', loggingLocation)),
            userHandle: EscapeBase64EncodedString(Transform(inputKeyCredential.response.userHandle, 'Array', 'Base64', loggingLocation)),
        }
    })
}

function HandleParsedCredential(credType, status, response, currSession, debugLocation) {
    let parsedCredentialSessionKey = ''
    let parsedCredentialSpecKey = ''
    switch (credType) {
        case 'create':
            parsedCredentialSessionKey = 'nav-cred-create-credential-parsed'
            parsedCredentialSpecKey = 'nav-cred-obj-parse'
            break
        case 'get':
            parsedCredentialSessionKey = 'nav-cred-get-credential-parsed'
            parsedCredentialSpecKey = 'nav-cred-req-parse'
            break
        default:
            log("Credential type " + credType + " not support for parsing the credential", 'error', debugLocation)
            return
    }
    if (status === 200 && response.status === "OK") {
        log("Successfully parsed credential creation response on server", "info", debugLocation)
        currSession[parsedCredentialSessionKey] = response.data
        //TODO: move this to callback
        SetObject(currentSession[parsedCredentialSessionKey], parsedCredentialSpecKey)
    } else {
        log("Failed to parsed credential response on server " + status + " response " + response?.status, "error", debugLocation)
    }
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

function SelectOption(selectElementId, prefix, debugLocation) {
    const element = document.getElementById(selectElementId)
    if (element && 'value' in element) {
        const selectedItem = element.value
        if (selectedItem && selectedItem in CredentialOptionList) {
            SetObject(CredentialOptionList[selectedItem](currentSession), prefix)
        } else {
            log('Failed to locate configuration for ' + selectedItem + " associated for " + selectElementId, 'error', debugLocation)
        }
    } else {
        log('Failed to locate element for ' + selectElementId + " or missing value", 'error', debugLocation)
    }
}

let CredentialOptionList = {
    Empty: (currSession) => {
        log("Returning empty credential options for the " + currSession)
        return EmptyCredOptions
    },
    Default: (currSession) => {
        log("Returning default credential options for the " + currSession)
        return {
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

            ],
            "customFields": {
                //"nav-cred-create-timeout-set": true,
                //"nav-cred-createOptionBox-rp": function (objectValue, prefix, elementId) {
                //    document.getElementById(elementId).checked = false
                //    ShowSection('nav-cred-createOptions-rp','nav-cred-createOptionBox', 'nav-cred-createOptions-rp', 'nav-cred-createOptionBox-rp', true, 'checkbox', 'table')
                //    return false
                //}
            }
        }
    },
    Platform: (currSession) => {
        return {
            "rp": {
                "name": "ACMEonPlatform",
            },
            "user": {
                "displayName": "tuPlatformVerifiedAttestedDName",
                "id": new TextEncoder().encode("tuPlatformVerifiedAttested"),
                "name": "tuPlatformVerifiedAttestedName"
            },
            "challenge": new TextEncoder().encode("longchallengefor-tuPlatformVerifiedAttestedDName"),
            "pubKeyCredParams": [
                {
                    "alg": -7,
                    "type": "public-key"
                },
                {
                    "alg": -257,
                    "type": "public-key"
                }

            ],
            "authenticatorSelection": {
                "authenticatorAttachment": "platform",
                "residentKey": "required",
                "requireResidentKey": true,
                "userVerification": "required",
            },
            "attestation": "direct",
            "customFields": {
                "nav-cred-create-authenticatorSelection-set": true,
                "nav-cred-create-authenticatorSelection.authenticatorAttachment-set": true,
                "nav-cred-create-authenticatorSelection.residentKey-set": true,
                "nav-cred-create-authenticatorSelection.requireResidentKey-set": true,
                "nav-cred-create-authenticatorSelection.userVerification-set": true,
                "nav-cred-create-attestation-set": true,
                "nav-cred-create-attestationFormats-set": true,
            }
        }
    },

    CrossPlatform: (currSession) => {
        return {
            "rp": {
                "name": "ACMEonPlatform",
            },
            "user": {
                "displayName": "tuPlatformVerifiedAttestedDName",
                "id": new TextEncoder().encode("tuPlatformVerifiedAttested"),
                "name": "tuPlatformVerifiedAttestedName"
            },
            "challenge": new TextEncoder().encode("longchallengefor-tuPlatformVerifiedAttestedDName"),
            "pubKeyCredParams": [
                {
                    "alg": -7,
                    "type": "public-key"
                },
                {
                    "alg": -257,
                    "type": "public-key"
                }

            ],
            "authenticatorSelection": {
                "authenticatorAttachment": "cross-platform",
                "residentKey": "required",
                "requireResidentKey": true,
                "userVerification": "required",
            },
            "attestation": "direct",
            "customFields": {
                "nav-cred-create-authenticatorSelection-set": true,
                "nav-cred-create-authenticatorSelection.authenticatorAttachment-set": true,
                "nav-cred-create-authenticatorSelection.requireResidentKey-set": true,
                "nav-cred-create-authenticatorSelection.userVerification-set": true,
                "nav-cred-create-attestation-set": true,
            }
        }
    },
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
        "attestationFormats": "options-noChange",
        "extensions": "object-noChange",
        "extensions.credProps": "options-bool-oneValue",
        "extensions.prf": "object-noChange",
        "extensions.prf.eval": "object-noChange",
        "extensions.prf.eval.first": "text-ArrayBuffer",
        "extensions.prf.eval.second": "text-ArrayBuffer",
        "extensions.exts": "options-bool-oneValue",
        "extensions.uvi": "options-bool-oneValue",
        "extensions.loc": "options-bool-oneValue",
        "extensions.largeBlob": "object-noChange",

    },
    "nav-cred-get": {
        "availableKeys": ["challenge", "mediation", "signal", "timeout", "rpid", "allowCredentials", "userVerification",
            "attestation", "attestationFormats"],
        "default": "text-noChange",
        "challenge": "text-ArrayBuffer",
        "signal": "text-AbortSignal",
        "timeout": "text-number",
        "allowCredentials": "options-sessionMap",
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
    "nav-cred-req": {
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
        "Response.AuthenticatorData.AuthData.rpid": "text-base64",
        "Response.AttestationObject.AuthData.att_data.credential_id": "text-base64",
        "Response.AttestationObject.AuthData.att_data.public_key": "text-base64",
        "Response.AttestationObject.attStmt.sig": "text-base64",
        "Response.AttestationObject.attStmt.x5c": "text-base64",
        "Response.AttestationObject.attStmt.ecdaaKeyId": "text-base64",
        "Response.AttestationObject.attStmt.response": "text-base64",
        "Response.AttestationObject.attStmt.certinfo": "text-base64",
        "Response.AttestationObject.attStmt.pubArea": "text-base64",
    },
    "nav-cred-req-parse": {
        "availableKeys": [
            "Response.Signature", "Response.UserHandle",
            "Response.CollectedClientData.type", "Response.CollectedClientData.challenge",
            "Response.CollectedClientData.origin", "Response.CollectedClientData.topOrigin",
            "Response.CollectedClientData.crossOrigin",
            "Response.AuthenticatorData.rpid", "Response.AuthenticatorData.flags",
            "Response.AuthenticatorData.sign_count", "Response.AuthenticatorData.att_data.aaguid",
            "Response.AuthenticatorData.att_data.credential_id", "Response.AuthenticatorData.att_data.public_key",
            "Response.AttestationObject.fmt", "Response.AttestationObject.attStmt.alg",
            "Response.AttestationObject.attStmt.pubArea", "Response.AttestationObject.attStmt.sig",
            "Response.AttestationObject.attStmt.x5c", "Response.AttestationObject.attStmt.ecdaaKeyId",
            "Response.AttestationObject.attStmt.ver", "Response.AttestationObject.attStmt.response",
            "Response.AttestationObject.attStmt.certinfo",
        ],
        "default": "text-noChange",
        "Response.Signature": "text-base64",
        "Response.UserHandle": "text-base64",
        "Response.CollectedClientData.challenge": "text-base64",
        "Response.AuthenticatorData.rpid": "text-base64",
        "Response.AuthenticatorData.att_data.credential_id": "text-base64",
        "Response.AuthenticatorData.att_data.public_key": "text-base64",
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
LoggingPrefixMapping["nav-cred-get"] = "nav-cred-get-logging";
LoggingPrefixMapping["nav-cred-req"] = "nav-cred-get-logging";
LoggingPrefixMapping["nav-cred-req-parse"] = "nav-cred-get-logging";

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
    parseCredential: {
        Method: "POST",
        URL: "/api/webauthn/credential/parse",
        Body: (session) => {
            return CreateCredentialResponse(session)
        },
        Callback: (status, response, currSession, debugLocation) => {
            HandleParsedCredential('create', status, response, currSession, debugLocation)
        }
    },
    parseGetCredential: {
        Method: "POST",
        URL: "/api/webauthn/assertion/parse",
        Body: (session) => {
            return CreateRequestResponse(session)
        },
        Callback: (status, response, currSession, debugLocation) => {
            HandleParsedCredential('get', status, response, currSession, debugLocation)
        }

    },
}