# perform-action-module

This is the Perform Action Module used in the General Electric Field Network Manager

[![Coverage Status](https://coveralls.io/repos/github/GE-MDS-FNM-V2/action-object/badge.svg?branch=master)](https://coveralls.io/github/GE-MDS-FNM-V2/action-object?branch=master)

This module works directly with the communication-selector-module and the action-object module
This module requires a GE radio to work


## I would like to use the library in my application

To install this module in your project, use one of the following commands

## Install with yarn
```
yarn add @ge-fnm/perform-action-module
```

## Install with npm
```
npm install @ge-fnm/perform-action-module
```

## Debugging

### MacOS/Linux
```
DEBUG='ge-fnm:perform-action-module' yarn #to enable logging for only the perform-action-module
-or-
DEBUG='ge-fnm:perform-action-module:executer' yarn #to enable logging for only the perform-action-module executer
-or-
DEBUG='ge-fnm:perform-action-module:httpclient' yarn #to enable logging for only the perform-action-module httpclient
-or-
DEBUG='ge-fnm:perform-action-module:jsonrpc' yarn #to enable logging for only the perform-action-module jsonrpc protocol
-or-
DEBUG='ge-fnm:* yarn # for all logging related to ge-fnm
-or-
DEBUG=* yarn # enable logging for all installed node_modules that look for the env var DEBUG - please note, this is a lot. You probably dont want this
```

### Powershell (Windows)
```
$Env:DEBUG='ge-fnm:perform-action-module' yarn #to enable logging for only the perform-action-module
-or-
$Env:DEBUG='ge-fnm:perform-action-module:executer' yarn #to enable logging for only the perform-action-module executer
-or-
$Env:DEBUG='ge-fnm:perform-action-module:httpclient' yarn #to enable logging for only the perform-action-module httpclient
-or-
$Env:DEBUG='ge-fnm:perform-action-module:jsonrpc' yarn #to enable logging for only the perform-action-module jsonrpc protocol
-or-
$Env:DEBUG='ge-fnm:* yarn # for all logging related to ge-fnm
-or-
$Env:DEBUG=* yarn # enable logging for all installed node_modules that look for the env var DEBUG - please note, this is a lot. You probably dont want this
```

### Usage in Node
```
import { Executer } from './perform-action-module'
// See @gefnm/action-object for more information on below
import {
  v1,
  ActionTypeV1,
  CommunicationMethodV1,
  ProtocolV1
} from '@ge-fnm/action-object'}

const executer = new Executer()
const URL = '0.0.0.0'

// Add client
let init = v1.create({
      version: 1,
      actionType: ActionTypeV1.INIT,
      commData: {
        commMethod: CommunicationMethodV1.HTTP,
        protocol: ProtocolV1.JSONRPC,
        username: 'myusername',
        password: 'mypassword'
      },
      modifyingValue: '',
      path: [],
      response: {
        error: null,
        data: null
      },
      uri: URL
    })
let serilizedClient = action.serialize()

executer.execute(serilizedClient)
.then(response => {
    // Execute command
    let action = v1.create({
      version: 1,
      actionType: ActionTypeV1.GET,
      commData: {
        commMethod: CommunicationMethodV1.HTTP,
        protocol: ProtocolV1.JSONRPC
      },
      modifyingValue: '',
      path: ['/if:interfaces/'],
      response: {
        error: null,
        data: null
      },
      uri: URL
    })
    let serilizedAction = action.serialize()
    executer.execute(serilizedAction)
    .then(response2 => {
        // response2 is an action object with response field filled out
    })
    .catch(error2 => {
        // handle action error
    })
})
.catch(error => {
    // handle unsuccessful client addition
})
```