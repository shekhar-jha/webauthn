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
    let webAuthnStatus
    if (window?.PublicKeyCredential !== undefined && typeof window.PublicKeyCredential === "function") {
        webAuthnStatus = "Yes"
        if (typeof window.PublicKeyCredential.isConditionalMediationAvailable === 'function') {
            window.PublicKeyCredential.isConditionalMediationAvailable().then(function (result) {
                document.getElementById("mediation").innerHTML = result
            }, function (error) {
                document.getElementById("mediation").innerHTML = error
            })
        } else {
            document.getElementById("mediation").innerHTML = "function isConditionalMediationAvailable is not supported."
        }
        if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(function (result) {
                document.getElementById("userVerifyPlatformAuthn").innerHTML = result
            }, function (error) {
                document.getElementById("userVerifyPlatformAuthn").innerHTML = error
            })
        } else {
            document.getElementById("userVerifyPlatformAuthn").innerHTML = "function isConditionalMediationAvailable is not supported."
        }
    } else {
        webAuthnStatus = "No"
    }
    document.getElementById("HasWebAuthn").innerHTML = webAuthnStatus
    document.getElementById("externalURL").value = GetConfiguration("externalURL")
}

function ShowTab(element_id, select_prefix, tab_prefix, class_name = "nav-creds") {
    let tabs = document.getElementsByClassName(class_name)
    for (let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
        tabs[tabIndex].style.display = "none"
    }
    let selectId = document.getElementById(element_id).value
    let selectedTab = selectId.replace(select_prefix, tab_prefix)
    document.getElementById(selectedTab).style.display = "block"
}

function ShowSection(sectionClass, linkClass, sectionId, linkId, useClassToDisplaySection = false, linkType = 'link', sectionType = 'div') {
    let tabs = document.getElementsByClassName(sectionClass)
    for (let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
        tabs[tabIndex].style.display = "none"
    }
    let linkObject = document.getElementById(linkId)
    let displayValue //= "block"
    let setDisplayValue// = false
    switch (linkType) {
        case "link":
            setDisplayValue = true
            break;
        case 'checkbox':
            setDisplayValue = !!linkObject.checked;
            break;
        default:
            setDisplayValue = false;
            break;
    }
    switch (sectionType) {
        case "div":
            displayValue = "block"
            break
        case "table":
            displayValue = ""
            break
        default:
            displayValue = "block"
            break
    }
    if (setDisplayValue) {
        if (!useClassToDisplaySection) {
            document.getElementById(sectionId).style.display = displayValue
        } else {
            let sections = document.getElementsByClassName(sectionId)
            for (let tabIndex = 0; tabIndex < sections.length; tabIndex++) {
                sections[tabIndex].style.display = displayValue
            }
        }
    }
    let tabLinks = document.getElementsByClassName(linkClass)
    for (let tabIndex = 0; tabIndex < tabLinks.length; tabIndex++) {
        tabLinks[tabIndex].classList.remove('active')
    }
    document.getElementById(linkId).classList.add('active')
}

let DefaultInvalidUser = "InvalidUser"
let sessions = new Map()
let currentSession = {
    sessionId: "InvalidSessionID",
    sessionUser: DefaultInvalidUser,
}

function createSession(desc, user) {
    let sessionDesc, sessionUser
    if (desc) {
        sessionDesc = desc
    } else {
        sessionDesc = "" + document.getElementById("sessions-new-desc").value
    }
    if (!sessionDesc || sessions.has(sessionDesc)) {
        log("Missing session description or existing one. Nothing to do", 'error')
        return
    }
    if (user) {
        sessionUser = user
    } else {
        sessionUser = "" + document.getElementById("sessions-new-user").value
    }
    if (!sessionUser) {
        log("Missing session user. Nothing to do", 'error')
        return
    }

    let newSession = {
        sessionId: "InvalidSessionID",
        sessionUser: DefaultInvalidUser,
    }
    newSession.sessionId = sessionDesc
    newSession.sessionUser = sessionUser
    sessions.set(newSession.sessionId, newSession)
    sessionEventListeners.forEach((sessionEventListener, index) => {
        if (sessionEventListener) {
            try {
                sessionEventListener(newSession, SessionEventTypes.New)
            } catch (error) {
                log("Failed to execute " + SessionEventTypes.New + " event listener at index " + index +
                    "Error: " + error.message + "(" + error.name + ")", "error")
            }
        }
    })
    log("Created session" + sessionDesc, 'info')
    selectSession()
}

const SessionEventTypes = {
    New: "newSession",
    Select: "selectSession"
}

const sessionEventListeners = [
    (currSession, eventType) => {
        switch (eventType) {
            case SessionEventTypes.New:
                log("New Session created " + currSession.sessionId, "info")
                break;
            case SessionEventTypes.Select:
                log("Changing Session to " + currSession.sessionId, "info")
                break
        }
    },
    (currSession, eventType) => {
        switch (eventType) {
            case SessionEventTypes.New:
                let sessionsElement = document.createElement("option")
                sessionsElement.value = currSession.sessionId
                sessionsElement.text = currSession.sessionId
                sessionsElement.selected = true
                document.getElementById("sessions").add(sessionsElement)
                break

            case SessionEventTypes.Select:
                GetURL(API_ENDPOINTS.login, currSession)
                break
        }
    },
]

function selectSession() {
    let sessionDesc = document.getElementById("sessions").value
    if (sessions.has(sessionDesc)) {
        currentSession = sessions.get(sessionDesc)
        log("Selected session" + sessionDesc, 'info')
        sessionEventListeners.forEach((sessionEventListener, index) => {
            if (sessionEventListener) {
                try {
                    sessionEventListener(currentSession, SessionEventTypes.Select)
                } catch (error) {
                    log("Failed to execute " + SessionEventTypes.Select + " event listener at index " + index +
                        "Error: " + error.message + "(" + error.name + ")", "error")
                }
            }
        })
    }
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8', {fatal: true})
const objectProcessingGuidance = {
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
                let applicableValues = attributeValue
                if (!Array.isArray(attributeValue)) {
                    applicableValues = [attributeValue]
                }
                let dataElements = document.getElementsByClassName(prefix + "-" + attributeName + "-options")
                for (let dECounter = 0; dECounter < dataElements.length; dECounter++) {
                    dataElements[dECounter].checked = false
                }
                applicableValues.forEach((applicableValue, index, appArray) => {
                    if (dataElements.length > 0) {
                        for (let dECounter = 0; dECounter < dataElements.length; dECounter++) {
                            if (String(applicableValue) === dataElements[dECounter].value) {
                                dataElements[dECounter].checked = true
                            }
                        }
                    } else {
                        log(prefix + "-" + attributeName + " does not have any options to set value")
                    }
                })
            }
        }
    },
    "transform": {
        "noChange": {
            "get": (input, prefix, attributeName, transformers) => {
                return input
            },
            "set": (input, prefix, attributeName, transformers) => {
                return input
            }
        },
        "number": {
            "get": (input, prefix, attributeName, transformers) => {
                return Number(input)
            },
            "set": (input, prefix, attributeName, transformers) => {
                return input
            }
        },
        "ArrayBuffer": {
            "get": (input, prefix, attributeName) => {
                let applicableSource = 'Text'
                const formatElement = document.getElementById(prefix + "-" + attributeName + "-Transform")
                if (formatElement) {
                    applicableSource = formatElement.value
                }
                let encodedValue = Transform(input, applicableSource, 'Array', DefaultLoggingLocation)
                log("buffer value" + encodedValue)
                return encodedValue
            },
            "set": (input, prefix, attributeName, transformers) => {
                let applicableDest = 'Text'
                const formatElement = document.getElementById(prefix + "-" + attributeName + "-Transform")
                if (formatElement) {
                    applicableDest = formatElement.value
                }
                let decodedValue = Transform(input, 'Array', applicableDest, DefaultLoggingLocation)
                log("decoded value" + decodedValue)
                return decodedValue
            }
        },
        "base64": {
            "get": (input, prefix, attributeName) => {
                let applicableSource = 'Text'
                const formatElement = document.getElementById(prefix + "-" + attributeName + "-Transform")
                if (formatElement) {
                    applicableSource = formatElement.value
                }
                let encodedValue = Transform(input, applicableSource, 'Base64', DefaultLoggingLocation)
                log("base64 value " + encodedValue)
                return encodedValue
            },
            "set": (input, prefix, attributeName, transformers) => {
                let applicableDest = 'Text'
                const formatElement = document.getElementById(prefix + "-" + attributeName + "-Transform")
                if (formatElement) {
                    applicableDest = formatElement.value
                }
                let decodedValue = Transform(input, 'Base64', applicableDest, DefaultLoggingLocation)
                log("Base64 decoded value" + decodedValue)
                return decodedValue
            }
        },
        "stoj": {
            "get": (input, prefix, attributeName, transformers) => {
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
            "set": (input, prefix, attributeName, transformers) => {
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
            "get": (input, prefix, attributeName, transformers) => {
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
            "set": (input, prefix, attributeName, transformers) => {
                //TODO:
            }
        },
        "sessionMap": {
            "get": (input, prefix, attributeName, transformers) => {
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
            "set": (input, prefix, attributeName, transformers) => {
                let noTransformationPerformed = true
                let transformationMapAttributeName = prefix + "-" + attributeName + "-reverse"
                let transformationMap = new Map()
                if (currentSession.hasOwnProperty(transformationMapAttributeName)) {
                    transformationMap = currentSession[transformationMapAttributeName]
                    noTransformationPerformed = false
                } else {
                    log('Failed to locate property ' + transformationMapAttributeName + " in current session " + currentSession)
                }
                if (Array.isArray(input)) {
                    return input.reduce((collectValues, inputValue, currentIndex, items) => {
                        let applicationInputValue = inputValue
                        if (transformers.length > 1) {
                            applicationInputValue = resolve(transformers[1], inputValue)
                        }
                        if (noTransformationPerformed) {
                            collectValues.push(applicationInputValue)
                        } else if (transformationMap.has(applicationInputValue)) {
                            collectValues.push(transformationMap.get(applicationInputValue))
                        } else if (transformationMap.has("DEFAULT-VALUE")) { //BAD Idea
                            collectValues.push(transformationMap.get("DEFAULT-VALUE"))
                        } else {
                            log("Failed to locate transformation detail for " + applicationInputValue + ". Skipping the value", 'warn')
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
                if (applicableElement && applicableElement.tagName.toLowerCase() === 'input' && applicableElement.type.toLowerCase() === 'checkbox' && applicableElement.checked) {
                    log("attribute selected.")
                    return attributeToSet
                } else if (!applicableElement) {
                    log("Since attribute set element is not available, defaulting to true")
                    return attributeToSet
                } else {
                    log("attribute not selected.")
                    return false
                }
            }, true)
            log("Attribute to be set " + setAttribute, 'debug')
            if (setAttribute) {
                let attrType = TransformationDefinition[prefix].default
                if (TransformationDefinition[prefix].hasOwnProperty(attributeName)) {
                    attrType = TransformationDefinition[prefix][attributeName]
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
                        let applicableTransformationType = typeValues[1]
                        let transformTypes = applicableTransformationType.split("/")
                        let attrVal = objectProcessingGuidance.transform[transformTypes[0]].get(reducedValue, prefix, attributeName, transformTypes)
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


function SetObject(objectValue, prefix = "nav-cred-obj", base_prefix = "") {
    if (!objectValue) {
        log("Failed to set object for prefix " + prefix, 'error')
        return
    }
    let elements = document.getElementsByClassName(prefix)
    log("Setting object for " + prefix + " from " + JSON.stringify(objectValue), 'info')
    let keyNames = TransformationDefinition[prefix].availableKeys
    keyNames.forEach((keyName) => {
        try {
            let applicableValue = resolve(keyName, objectValue)
            let applyValue = false
            switch (typeof applicableValue) {
                case "object":
                    if (ArrayBuffer.isView(applicableValue) || applicableValue.toString() === '[object ArrayBuffer]' || Array.isArray(applicableValue)) {
                        applyValue = true
                    } else {
                        log("Did not expect an object value for key " + keyName + ". Skipping key with value " + JSON.stringify(applicableValue))
                        applyValue = false // since we can not consume it.
                    }
                    break;
                case "function":
                    let applicableObject = objectValue
                    let keyitems = keyName.split(".")
                    if (keyitems.length > 1) {
                        let prefixKeys = keyitems.slice(0, keyitems.length - 1).join(".")
                        applicableObject = resolve(prefixKeys, objectValue)
                    }
                    log("Invoking function " + keyName + " with no parameter")
                    try {
                        applicableValue = applicableValue.call(applicableObject)
                        applyValue = true
                    } catch (error) {
                        log("Error while invoking function " + keyName + ". Error: " + error.message + "(" + error.name + ")", 'error')
                        log(error.stack, 'debug')
                    }
                    break;
                case "undefined":
                    log("Skipping key " + keyName + " since it is undefined value")
                    applyValue = false
                    break;
                default:
                    applyValue = true
                    break;
            }
            if (applyValue) {
                let attrType = TransformationDefinition[prefix].default
                if (TransformationDefinition[prefix].hasOwnProperty(keyName)) {
                    attrType = TransformationDefinition[prefix][keyName]
                }
                log("Attribute of type " + attrType)
                switch (attrType) {
                    case "skip":
                        log("Skipping attribute value setting")
                        break
                    default:
                        let typeValues = attrType.split("-")
                        let applicableTransformationType = typeValues[1]
                        let transformTypes = applicableTransformationType.split("/")
                        let transformedValue = objectProcessingGuidance.transform[transformTypes[0]].set(applicableValue, prefix, keyName, transformTypes)
                        let expandedValue = transformedValue
                        if (typeValues.length === 3) {
                            expandedValue = objectProcessingGuidance.reduce[typeValues[2]].set(transformedValue, prefix, keyName)
                        }
                        objectProcessingGuidance.extract[typeValues[0]].set(prefix, keyName, expandedValue)
                        break
                }
            } else {
                log("Skipping attribute " + keyName)
            }
        } catch (error) {
            log("Failed to set attribute " + keyName + " due to error " + error.message + "(" + error.name + ")", 'error')
            log(error.stack, 'debug')
        }
    })
    log("Set object for " + prefix, 'info')
}

function TransformSelectHandlerRegister() {
    const elements = document.getElementsByClassName("Transformers")
    if (elements) {
        for (let index = 0; index < elements.length; index++) {
            const element = elements.item(index)
            const idValues = element.id.split("-")
            if (idValues.length > 3 && idValues[idValues.length - 1] === 'Transform') {
                const prefix = idValues.slice(0, idValues.length - 2).join("-")
                const attributeName = idValues[idValues.length - 2]
                const logLocation = LoggingPrefixMapping.hasOwnProperty(prefix) ? LoggingPrefixMapping[prefix] : DefaultLoggingLocation
                const handler = SelectOnChangeHandler(prefix, attributeName, DefaultSelectOnChangeHandler, logLocation)
                element.addEventListener("change", handler)
            } else {
                console.error("Element " + element.id + " is not in prefix-attributeName-Transform format. Will not register Transform handler")
            }
        }
    }
}

const DefaultSelectOnChangeHandler = (previousValue, newValue, prefix, attributeName, logLocation) => {
    const valueElement = document.getElementById(prefix + "-" + attributeName)
    if (valueElement) {
        const currentValue = valueElement.value
        const transformedValue = Transform(currentValue, previousValue, newValue, logLocation)
        if (transformedValue) {
            valueElement.value = transformedValue
        }
    }
}

function SelectOnChangeHandler(prefix, attributeName, changeHandler = DefaultSelectOnChangeHandler, logLocation = DefaultLoggingLocation) {
    const selectElement = document.getElementById(prefix + "-" + attributeName + "-Transform")
    if (selectElement) {
        let previousValue = selectElement.value
        return () => {
            log("Select " + prefix + "-" + attributeName + " Changed", "debug", logLocation)
            const newValue = selectElement.value
            if (changeHandler) {
                log("Handling change in select for " + prefix + "-" + attributeName + " with new value " + newValue + " and old value " + previousValue, "debug", logLocation)
                changeHandler(previousValue, newValue, prefix, attributeName, logLocation)
            }
            previousValue = newValue
        }
    } else {
        log("No select available for " + prefix + "-" + attributeName, 'error', logLocation)
        return () => {
        }
    }
}

function GetURL(requestDetails, session = currentSession, debugLocation = DefaultLoggingLocation) {
    let extURL = document.getElementById("externalURL").value
    let xhr = new XMLHttpRequest();
    const logLocation = debugLocation
    xhr.open(requestDetails.Method, extURL + requestDetails.URL, true);
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
            requestDetails.Callback(status, xhr.response, session, debugLocation);
        } else {
            log("Status:" + status, 'error', logLocation)
            requestDetails.Callback(status, null, session, debugLocation);
        }
    }
    if (requestDetails.Body && typeof requestDetails.Body === 'function') {
        xhr.send(requestDetails.Body(session))
    } else {
        xhr.send()
    }
}

const defaultConfiguration = new Map()

function SetupDefaultConfiguration() {
    defaultConfiguration.set("ExternalURL", window.location.origin)
}

function GetConfiguration(variableName, source = "body") {
    let value
    if (source === "body") {
        value = document.body.getAttribute('data-' + variableName);
    } else {
        value = document.getElementById(variableName).value
    }
    if (value.startsWith("{{ .")) {
        let matched = value.match("[a-zA-Z0-9]+")
        if (matched.length === 1) {
            return defaultConfiguration.get(matched[0])
        } else {
            return ""
        }
    }
    return value
}

const LoggingPrefixMapping = {}

const logLineCounterMap = new Map()

const DefaultLoggingLocation = "common-debug"

function log(content, level = "debug", debugLocation = DefaultLoggingLocation) {
    let applicableDebugLocation = debugLocation
    let debugElement = document.getElementById(debugLocation)
    if (debugElement != null && debugElement.value === '') {
        debugElement = document.getElementById(DefaultLoggingLocation)
        if (debugElement == null || debugElement.value === '') {
            return
        }
        applicableDebugLocation = DefaultLoggingLocation
    }
    let lineCounter = 1
    if (logLineCounterMap.has(applicableDebugLocation)) {
        lineCounter = logLineCounterMap.get(applicableDebugLocation)
    }
    logLineCounterMap.set(applicableDebugLocation, lineCounter + 1)
    let levelChecked = document.getElementById("log-" + level + "-set").checked

    let finalContent = debugElement.innerHTML
    switch (level) {
        case 'debug':
            finalContent = finalContent + "<p class='log-debug' style='display: " + (levelChecked ? "block" : "none") + "'>" + lineCounter + ": " + content + "</p>"
            break
        case 'info':
            finalContent = finalContent + "<p class='log-info' style='color:green; font-weight: bold; display: " + (levelChecked ? "block" : "none") + "'>" + lineCounter + ": " + content + "</p>"
            break
        case 'warn':
            finalContent = finalContent + "<p class='log-warn' style='color:red; display: " + (levelChecked ? "block" : "none") + "'>" + lineCounter + ": " + content + "</p>"
            break
        case 'error':
            finalContent = finalContent + "<p class='log-error' style='color:red; font-weight: bold; display: " + (levelChecked ? "block" : "none") + "'>" + lineCounter + ": " + content + "</p>"
            break
        default:
            finalContent = finalContent + "<p class='log-debug' style='display: " + (levelChecked ? "block" : "none") + "'>" + lineCounter + ": " + content + "</p>"
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

function clearLog(debugLocation = DefaultLoggingLocation) {
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
            let retval
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

function EscapeBase64EncodedString(encodedString) {
    return encodedString.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function Transform(inputValue, source, dest, logLocation = DefaultLoggingLocation) {
    if (inputValue) {
        let applicableInput = new Uint8Array()
        switch (source) {
            case 'Array':
                applicableInput = new Uint8Array(inputValue)
                break;
            case 'Hex':
                if (inputValue.length % 2 !== 0) {
                    log("Expected Hex value length " + inputValue.length + " to be divisible by 2.", 'error', logLocation)
                    return null
                }
                applicableInput = new Uint8Array(inputValue.length / 2)
                for (let counter = 0; counter < inputValue.length / 2; counter = counter + 1) {
                    const hexValue = inputValue.substring(counter * 2, counter * 2 + 2)
                    applicableInput[counter] = parseInt(hexValue, 16)
                }
                break;
            case 'Text':
                applicableInput = textEncoder.encode(inputValue)
                break;
            case "EscapedBase64":
                const unEscapedValue = inputValue.replace(/-/g, "+").replace(/_/g, "/");
                const utf8DecodedUnEscapedString = atob(unEscapedValue)
                applicableInput = new Uint8Array(utf8DecodedUnEscapedString.length)
                for (let counter = 0; counter < utf8DecodedUnEscapedString.length; counter++) {
                    applicableInput[counter] = utf8DecodedUnEscapedString.charCodeAt(counter)
                }
                break
            case 'Base64':
                const utf8DecodedString = atob(inputValue)
                applicableInput = new Uint8Array(utf8DecodedString.length)
                for (let counter = 0; counter < utf8DecodedString.length; counter++) {
                    applicableInput[counter] = utf8DecodedString.charCodeAt(counter)
                }
                break
            default:
                log("Transformation from source " + source + " is not supported", 'error', logLocation)
                return null
        }
        let returnValue = null
        switch (dest) {
            case 'Array':
                returnValue = applicableInput
                break;
            case 'Hex':
                returnValue = applicableInput.reduce((generatedValue, currentValue) => {
                    const stringVal = currentValue.toString(16)
                    if (stringVal.length === 1) {
                        generatedValue = generatedValue + "0" + stringVal
                    } else {
                        generatedValue += stringVal
                    }
                    return generatedValue
                }, "")
                break;
            case 'Text':
                // Not using TextDecoder since we want to maintain UTF-8 encoding to handle Uint8Array transformations.
                returnValue = textDecoder.decode(applicableInput);
                break;
            case "EscapedBase64":
                const generatedBase64String = btoa(String.fromCharCode.apply(null, new Uint8Array(applicableInput)))
                returnValue = generatedBase64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
                break
            case 'Base64':
                returnValue = btoa(String.fromCharCode.apply(null, new Uint8Array(applicableInput)))
                break;
            case 'UUID':
                returnValue = Array.from(applicableInput, function (byte) {
                    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
                }).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
                break;
            default:
                log("Transformation to destination " + dest + " is not supported", 'error', logLocation)
                return null
        }
        log("Transformed input value " + inputValue + " to return value " + returnValue, 'debug', logLocation)
        return returnValue
    } else {
        log('Nothing to transform, returning null', 'info', logLocation)
        return null
    }
}
