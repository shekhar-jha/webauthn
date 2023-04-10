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