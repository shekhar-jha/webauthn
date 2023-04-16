function ShowCapabilities() {
    if (window.isSecureContext) {
        document.getElementById("IsSecure").innerHTML = "Secure"
    } else {
        document.getElementById("IsSecure").innerHTML = "Not Secure"
    }
    window.u2fApi.ensureSupport().then(
        function (result) {
            document.getElementById("HasU2F").innerHTML = "Yes <BR>(" + result + ")"
        },
        function (error) {
            document.getElementById("HasU2F").innerHTML = "No <BR>(" + error + ")"
        }
    )
    let webAuthnStatus = "Not computed"
    if (window?.PublicKeyCredential !== undefined && typeof window.PublicKeyCredential === "function") {
        webAuthnStatus = "Yes"
        if (typeof window.PublicKeyCredential.isConditionalMediationAvailable === 'function') {
            window.PublicKeyCredential.isConditionalMediationAvailable().then(function (result) {
                document.getElementById("mediation").innerHTML = result
            }, function (error) {
                document.getElementById("mediation").innerHTML = error
            })
        }
        if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(function (result) {
                document.getElementById("userVerifyPlatformAuthn").innerHTML = result
            }, function (error) {
                document.getElementById("userVerifyPlatformAuthn").innerHTML = error
            })
        }
    } else {
        webAuthnStatus = "No"
    }
    document.getElementById("HasWebAuthn").innerHTML = webAuthnStatus
    document.getElementById("externalURL").value = GetConfiguration("externalURL")
}

function ShowTab(element_id, select_prefix, tab_prefix) {
    let tabs = document.getElementsByClassName("nav-creds")
    for (let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
        tabs[tabIndex].style.display = "none"
    }
    let selectId = document.getElementById(element_id).value
    let selectedTab = selectId.replace(select_prefix, tab_prefix)
    document.getElementById(selectedTab).style.display = "block"
}

let sessions = new Map()
let currentSession = {
    "nav-cred-create": {}
}
let sessionID = 1

function createSession() {
    let sessionDesc = "" + document.getElementById("sessions-new-desc").value
    if (sessionDesc === "" || sessions.has(sessionDesc)) {
        return
    }
    let newSession = {
        sessionId: "InvalidSessionID"
    }
    newSession.sessionId = sessionDesc
    sessions.set(newSession.sessionId, newSession)
    let sessionsElement = document.createElement("option")
    sessionsElement.value = newSession.sessionId
    sessionsElement.text = newSession.sessionId
    sessionsElement.selected = true
    document.getElementById("sessions").add(sessionsElement)
    log("Created session" + sessionDesc, 'info')
    selectSession()
}

function selectSession() {
    let sessionDesc = document.getElementById("sessions").value
    if (sessions.has(sessionDesc)) {
        let sessObj = sessions.get(sessionDesc)
        currentSession = sessObj
        log("Selected session" + sessionDesc, 'info')
    }
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const objectProcessingGuidance = {
    "nav-cred-create": {
        "default": "text-noChange",
        "rp": "object-noChange",
        "user": "object-noChange",
        "user.id": "text-ArrayBuffer",
        "challenge": "text-ArrayBuffer",
        "pubKeyCredParams": "options-stoj",
        "timeout": "text-number",
        "authenticatorSelection": "object-noChange",
        "authenticatorSelection.requireResidentKey": "options-bool-oneValue",
        "excludeCredentials": "options-sessionMap",
        "attestationFormats": "options-noChange"
    },
    "extract": {
        "text": {
            "get": (prefix, attributeName) => {
                let dataElement = document.getElementById(prefix + "-" + attributeName)
                if (dataElement !== null) {
                    log(prefix + "-" + attributeName + "=" + dataElement.value)
                    return dataElement.value
                }
                log(prefix + "-" + attributeName + "=<no value>")
                return ""
            },
            "set": (prefix, attributeName, attributeValue) => {
                let dataElement = document.getElementById(prefix + "-" + attributeName)
                if (dataElement !== null) {
                    dataElement.value = attributeValue
                    log("Set value: " + prefix + "-" + attributeName + "=" + dataElement.value)
                }
            }
        },
        "object": {
            "get": (prefix, attributeName) => {
                return {}
            },
            "set": (prefix, attributeName, attributeValue) => {

            }
        },
        "options": {
            "get": (prefix, attributeName) => {
                let dataElements = document.getElementsByClassName(prefix + "-" + attributeName + "-options")
                if (dataElements.length > 0) {
                    let optionValues = []
                    for (let dECounter = 0; dECounter < dataElements.length; dECounter++) {
                        if (dataElements[dECounter].checked) {
                            optionValues.push(dataElements[dECounter].value)
                        }
                    }
                    log(prefix + "-" + attributeName + "=" + optionValues)
                    return optionValues
                }
                log(prefix + "-" + attributeName + "=<no value>")
                return []
            },
            "set": (prefix, attributeName, attributeValue) => {
                //TODO:
            }
        }
    },
    "transform": {
        "noChange": {
            "get": (input, prefix, attributeName) => {
                return input
            },
            "set": (input, prefix, attributeName) => {
                return input
            }
        },
        "number": {
            "get": (input, prefix, attributeName) => {
                return Number(input)
            },
            "set": (input, prefix, attributeName) => {
                return input
            }
        },
        "ArrayBuffer": {
            "get": (input, prefix, attributeName) => {
                let encodedValue = textEncoder.encode(input)
                log("buffer value" + encodedValue)
                return encodedValue
            },
            "set": (input, prefix, attributeName) => {
                let decodedValue = textDecoder.decode(input)
                log("decoded value" + decodedValue)
                return decodedValue
            }
        },
        "stoj": {
            "get": (input, prefix, attributeName) => {
                if (Array.isArray(input)) {
                    return input.reduce((collectValues, item, currentIndex, items) => {
                        collectValues.push(JSON.parse(item))
                        return collectValues
                    }, [])
                } else {
                    let parsedValue = JSON.parse(input)
                    log("String to JSON Parsed" + parsedValue)
                    return parsedValue
                }
            },
            "set": (input, prefix, attributeName) => {
                if (Array.isArray(input)) {
                    return input.reduce((collectValues, item, currentIndex, items) => {
                        collectValues.push(JSON.stringify(item))
                        return collectValues
                    }, [])
                } else {
                    let stringedValue = JSON.stringify(input)
                    log("String to JSON Parsed" + stringedValue)
                    return stringedValue
                }
            }
        },
        "bool": {
            "get": (input, prefix, attributeName) => {
                if (Array.isArray(input)) {
                    return input.reduce((collectValues, inputValue, currentIndex, items) => {
                        collectValues.push((inputValue?.toLowerCase?.() === 'true'))
                        return collectValues
                    }, [])
                } else {
                    let parsedValue = (input?.toLowerCase?.() === 'true')
                    log("Bool parse result" + parsedValue)
                    return parsedValue
                }
            },
            "set": (input, prefix, attributeName) => {
                //TODO:
            }
        },
        "sessionMap": {
            "get": (input, prefix, attributeName) => {
                let noTransformationPerformed = true
                let transformationMapAttributeName = prefix + "-" + attributeName
                let transformationMap = new Map()
                if (currentSession.hasOwnProperty(transformationMapAttributeName)) {
                    transformationMap = currentSession[transformationMapAttributeName]
                    noTransformationPerformed = false
                } else {
                    log('Failed to locate property ' + transformationMapAttributeName + " in current session " + currentSession)
                }
                if (Array.isArray(input)) {
                    return input.reduce((collectValues, inputValue, currentIndex, items) => {
                        if (noTransformationPerformed) {
                            collectValues.push(inputValue)
                        } else if (transformationMap.has(inputValue)) {
                            collectValues.push(transformationMap.get(inputValue))
                        } else if (transformationMap.has("DEFAULT-VALUE")) { //BAD Idea
                            collectValues.push(transformationMap.get("DEFAULT-VALUE"))
                        } else {
                            log("Failed to locate transformation detail for " + inputValue + ". Skipping the value", 'warn')
                        }
                        return collectValues
                    }, [])
                } else {
                    let returnValue = input
                    if (!noTransformationPerformed) {
                        returnValue = transformationMap.get(input)
                    }
                    log("Mapped value" + returnValue)
                    return returnValue
                }
            },
            "set": (input, prefix, attributeName) => {
                //TODO:
            }
        }
    },
    "reduce": {
        "oneValue": {
            "get": (input, prefix, attributeName) => {
                if (Array.isArray(input)) {
                    if (input.length >= 1) {
                        return input[0]
                    } else {
                        return ""
                    }
                } else {
                    return input
                }
            },
            "set": (input, prefix, attributeName) => {
                return [input]
            }
        }
    }
}

function GenerateObject(prefix = "nav-creds-create",) {
    let elements = document.getElementsByClassName(prefix)
    log("Generating object for " + prefix, 'info')
    let generatedObject = {}
    let allowedParentAttributes = []
    for (let elementCounter = 0; elementCounter < elements.length; elementCounter++) {
        let element = elements.item(elementCounter)
        let elementValue = element.id.replace(prefix + "-", "").split("-")
        if (elementValue.length === 2 && elementValue[1].toLowerCase() === 'set') {
            let attributeName = elementValue[0]
            log("Processing attribute name " + attributeName, 'debug')
            let attributeNameItems = attributeName.split(".")
            let setAttribute = attributeNameItems.reduce((attributeToSet, attributeNameItem, currentIndex, items) => {
                let applicableAttrName = prefix + "-" + items[0]
                for (let counter = 1; counter <= currentIndex; counter++) {
                    applicableAttrName = applicableAttrName + "." + items[counter]
                }
                applicableAttrName = applicableAttrName + "-set"
                log("Checking for attribute " + applicableAttrName)
                let applicableElement = document.getElementById(applicableAttrName)
                if (applicableElement.tagName.toLowerCase() === 'input' && applicableElement.type.toLowerCase() === 'checkbox' && applicableElement.checked) {
                    log("attribute selected.")
                    return attributeToSet
                } else {
                    log("attribute not selected.")
                    return false
                }
            }, true)
            log("Attribute to be set " + setAttribute, 'debug')
            if (setAttribute) {
                let attrType = objectProcessingGuidance[prefix].default
                if (objectProcessingGuidance[prefix].hasOwnProperty(attributeName)) {
                    attrType = objectProcessingGuidance[prefix][attributeName]
                }
                log("Attribute of type " + attrType)
                switch (attrType) {
                    case "skip":
                        log("Skipping attribute value setting")
                        break
                    default:
                        let typeValues = attrType.split("-")
                        let extractedValue = objectProcessingGuidance.extract[typeValues[0]].get(prefix, attributeName)
                        let reducedValue = extractedValue
                        if (typeValues.length === 3) {
                            reducedValue = objectProcessingGuidance.reduce[typeValues[2]].get(extractedValue, prefix, attributeName)
                        }
                        let attrVal = objectProcessingGuidance.transform[typeValues[1]].get(reducedValue, prefix, attributeName)
                        log("Attribute value" + attrVal)
                        setVal(attributeName, attrVal, generatedObject, ".")
                        break
                }
            }
        }
    }
    log("Generated object for " + prefix + " as " + JSON.stringify(generatedObject), 'info')
    return generatedObject
}

function GetURL(suffix, callback, operation = "GET", body = "", debugLocation = "common-debug") {
    let extURL = document.getElementById("externalURL").value
    let debugElement = document.getElementById(debugLocation)
    let xhr = new XMLHttpRequest();
    const logLocation = debugLocation
    xhr.open(operation, extURL + "/" + suffix, true);
    xhr.responseType = 'json';
    xhr.onerror = (event) => {
        log("Error: " + event.type, 'error', logLocation)
    }
    xhr.onabort = (event) => {
        log("Aborted: " + event.type, 'info', logLocation)
    }
    xhr.onprogress = (event) => {
        log(event.type + " (" + event.total + ")", 'debug', logLocation)
    }
    xhr.onload = () => {
        let status = xhr.status;
        if (status === 200) {
            log("Response:" + xhr.response, 'info', logLocation)
            callback(null, xhr.response);
        } else {
            log("Status:" + status, 'error', logLocation)
            callback(status);
        }
    }
    if (body !== "") {
        xhr.send(body)
    } else {
        xhr.send()
    }
}

const defaultConfiguration = new Map()

function SetupDefaultConfiguration() {
    defaultConfiguration.set("ExternalURL", window.location.origin)
}

function GetConfiguration(variableName, source = "body") {
    let value = ""
    if (source == "body") {
        value = document.body.getAttribute('data-' + variableName);
    } else {
        value = document.getElementById(variableName).value
    }
    if (value.startsWith("{{ .")) {
        let matched = value.match("[a-zA-Z0-9]+")
        if (matched.length == 1) {
            return defaultConfiguration.get(matched[0])
        } else {
            return ""
        }
    }
    return value
}

let logLineCounterMap = new Map()

function log(content, level = "debug", debugLocation = "common-debug") {
    let applicableDebugLocation = debugLocation
    let debugElement = document.getElementById(debugLocation)
    if (debugElement != null && debugElement.value === '') {
        debugElement = document.getElementById("common-debug")
        if (debugElement == null || debugElement.value === '') {
            return
        }
        applicableDebugLocation = "common-debug"
    }
    let lineCounter = 1
    if (logLineCounterMap.has(applicableDebugLocation)) {
        lineCounter = logLineCounterMap.get(applicableDebugLocation)
    }
    logLineCounterMap.set(applicableDebugLocation, lineCounter + 1)

    let finalContent = debugElement.innerHTML
    switch (level) {
        case 'debug':
            finalContent = finalContent + "<p class='log-debug'>" + lineCounter + ": " + content + "</p>"
            break
        case 'info':
            finalContent = finalContent + "<p class='log-info' style='color:green; font-weight: bold'>" + lineCounter + ": " + content + "</p>"
            break
        case 'warn':
            finalContent = finalContent + "<p class='log-warn' style='color:red;'>" + lineCounter + ": " + content + "</p>"
            break
        case 'error':
            finalContent = finalContent + "<p class='log-error' style='color:red; font-weight: bold'>" + lineCounter + ": " + content + "</p>"
            break
        default:
            finalContent = finalContent + "<p class='log-debug'>" + lineCounter + ": " + content + "</p>"
            break
    }
    debugElement.innerHTML = finalContent
}

function ShowHideLog(logLevel) {
    let levelChecked = document.getElementById("log-" + logLevel + "-set").checked
    let logElements = document.getElementsByClassName("log-" + logLevel)
    for (let elementCounter = 0; elementCounter < logElements.length; elementCounter++) {
        if (levelChecked) {
            logElements[elementCounter].style.display = "block"
        } else {
            logElements[elementCounter].style.display = "none"
        }

    }
}

function clearLog(debugLocation = "common-debug") {
    let debugElement = document.getElementById(debugLocation)
    debugElement.innerHTML = ""
}

function resolve(path, obj = self, separator = '.') {
    let properties = Array.isArray(path) ? path : path.split(separator)
    return properties.reduce((prev, curr) => prev?.[curr], obj)
}

function setVal(path, value, obj = self, separator = '.') {
    let properties = Array.isArray(path) ? path : path.split(separator)
    let lastItemInIndex = properties.length - 1
    properties.reduce(
        (obj, val, index) => {
            let retval = obj[val]
            if (obj.hasOwnProperty(val)) {
                retval = obj[val]
            } else if (index < lastItemInIndex) {
                obj[val] = {}
                retval = obj[val]
            } else {
                obj[val] = value
                retval = obj[val]
            }
            return retval
        }, obj
    )
    return obj
}