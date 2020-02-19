import { Executer } from './index'
import { HttpClient } from './clients/httpclient'
import { ClientType, ProtocolType, transType } from './enums/enums'
import {
  v1,
  ActionTypeV1,
  CommunicationMethodV1,
  ProtocolV1,
  ActionObjectInformationV1
} from '@ge-fnm/action-object'
import { Jsonrpc, transactionResponse } from './protocols/jsonrpc'
import { strictEqual } from 'assert'
// import { isBrowser, isNode } from 'browser-or-node'

describe('Perform Action Module', () => {
  // perform-action-module
  it('Can create executer and add a Client', async () => {
    let executer = new Executer()
    await executer
      .addclient('0.0.0.0', ClientType.HTTP, ProtocolType.JSONRPC, 'admin', 'admin')
      .then(response => {
        fail('Invalid client didnt reject')
      })
      .catch(error => {
        expect(error).toEqual('ERROR: Unable to log in: Error: connect ECONNREFUSED 0.0.0.0:80')
      })
  })

  it('Can call an execute command', async () => {
    let executer = new Executer()
    let URL = '98.10.43.107'
    await executer
      .addclient(URL, ClientType.HTTP, ProtocolType.JSONRPC, 'admin', 'd0NotCommit')
      .then(async addClientResponse => {
        let action = v1.create({
          version: 1,
          actionType: ActionTypeV1.GET,
          commData: {
            commMethod: CommunicationMethodV1.HTTP,
            protocol: ProtocolV1.JSONRPC
          },
          modifyingValue: '',
          path: ['/serv:services/snmp:snmp/agent/enabled'],
          response: {
            error: null,
            data: null
          },
          uri: URL
        })
        let serilizedAction = action.serialize()
        await executer
          .execute(serilizedAction)
          .then(async response => {
            await executer.killClientSession(URL).catch(error2 => {
              console.log('Unable to kill session 1')
            })
          })
          .catch(error => {
            fail(error)
          })
      })
  })

  it('Fails when action object has no path', async () => {
    let executer = new Executer()
    let URL = '98.10.43.107'
    await executer
      .addclient(URL, ClientType.HTTP, ProtocolType.JSONRPC, 'admin', 'd0NotCommit')
      .then(async addClientResponse => {
        let action = v1.create({
          version: 1,
          actionType: ActionTypeV1.GET,
          commData: {
            commMethod: CommunicationMethodV1.HTTP,
            protocol: ProtocolV1.JSONRPC
          },
          modifyingValue: '',
          response: {
            error: null,
            data: null
          },
          uri: URL
        })
        let serilizedAction = action.serialize()
        await executer
          .execute(serilizedAction)
          .then(async response => {
            fail('No error when no action path: ' + response)
          })
          .catch(error => {
            let actionObjJson: ActionObjectInformationV1 = JSON.parse(error.toString())
            strictEqual(actionObjJson.response.error, 'Error: GET/SET commands need a path')
          })
      })
  })

  it('Can execute a set command', async () => {
    let executer = new Executer()
    let URL = '98.10.43.107'
    await executer
      .addclient(URL, ClientType.HTTP, ProtocolType.JSONRPC, 'admin', 'd0NotCommit')
      .then(async addClientResponse => {
        let action = v1.create({
          version: 1,
          actionType: ActionTypeV1.SET,
          commData: {
            commMethod: CommunicationMethodV1.HTTP,
            protocol: ProtocolV1.JSONRPC
          },
          modifyingValue: true,
          path: ['/serv:services/snmp:snmp/agent/enabled'],
          response: {
            error: null,
            data: null
          },
          uri: URL
        })
        let serilizedAction = action.serialize()
        await executer
          .execute(serilizedAction)
          .then(async response => {
            await executer.killClientSession(URL).catch(error2 => {
              console.log('Unable to kill session 1')
            })
          })
          .catch(error => {
            fail(error)
          })
      })
  })

  it('Errors when a call is made without a client command', async () => {
    let executer = new Executer()
    let URL = '98.10.43.107'
    let action = v1.create({
      version: 1,
      actionType: ActionTypeV1.GET,
      commData: {
        commMethod: CommunicationMethodV1.HTTP,
        protocol: ProtocolV1.JSONRPC
      },
      modifyingValue: '',
      path: ['/serv:services/snmp:snmp/enabled'],
      response: {
        error: null,
        data: null
      },
      uri: URL
    })
    let serilizedAction = action.serialize()
    await executer
      .execute(serilizedAction)
      .then(async response => {
        await executer.killClientSession(URL).catch(error => {
          console.log('Unable to kill session 2: ' + error)
        })
        fail('No error thrown')
      })
      .catch(async error => {
        expect(error)
      })
  })

  it('Can create a client from an Action Object', async () => {
    const executer = new Executer()
    const URL = '98.10.43.107'
    let action = v1.create({
      version: 1,
      actionType: ActionTypeV1.INIT,
      commData: {
        commMethod: CommunicationMethodV1.HTTP,
        protocol: ProtocolV1.JSONRPC,
        username: 'admin',
        password: 'd0NotCommit'
      },
      modifyingValue: '',
      path: [],
      response: {
        error: null,
        data: null
      },
      uri: URL
    })

    let serilizedAction = action.serialize()
    await executer
      .execute(serilizedAction)
      .then(async response => {
        await executer.killClientSession(URL).catch(error => {
          console.log('Unable to kill session 3: ' + error)
        })
      })
      .catch(async error => {
        await executer.killClientSession(URL).catch(error2 => {
          console.log('Unable to kill session 3: ' + error2)
        })
        fail(error)
      })
  })

  it('Rejects killsession when perform action module has no client of given URI', async () => {
    let executer = new Executer()
    await executer
      .killClientSession('0.0.0.0')
      .then(response => {
        fail('No error from killClientSession on undefined radio')
      })
      .catch(error => {
        expect(error).toEqual('No client session')
      })
  })

  // httpClient
  it('Can properly log into a radio', async () => {
    let client = new HttpClient('98.10.43.107', ProtocolType.JSONRPC, 'admin', 'd0NotCommit')
    await client
      .login()
      .then(async response => {
        await client.killsession().catch(error => {
          console.log('Unable to kill session 3: ' + error)
        })
      })
      .catch(error => {
        fail(error)
      })
  })

  it('Passes when no session exists when killing a session', async () => {
    let client = new HttpClient('98.10.43.107', ProtocolType.JSONRPC, 'admin', 'd0NotCommit')
    await client
      .killsession()
      .then(response => {
        expect(response)
      })
      .catch(error => {
        fail(error)
      })
  })

  it('Rejects when not logged in', async () => {
    let client = new HttpClient('0.0.0.0', ProtocolType.JSONRPC)
    let action = v1.create({
      version: 1,
      actionType: ActionTypeV1.GET,
      commData: {
        commMethod: CommunicationMethodV1.HTTP,
        protocol: ProtocolV1.JSONRPC
      },
      modifyingValue: '',
      path: ['/serv:services/snmp:snmp/agent/enabled'],
      response: {
        error: null,
        data: null
      },
      uri: '0.0.0.0'
    })
    await client
      .call(action.information)
      .then(response => {
        fail('No error when not logged in')
      })
      .catch(error => {
        expect(error.toString()).toEqual("Error: Not logged in, can't do action")
      })
  })

  it('Rejects invalid action type', async () => {
    let client = new HttpClient('0.0.0.0', ProtocolType.JSONRPC)
    let action = v1.create({
      version: 1,
      actionType: ActionTypeV1.INIT,
      commData: {
        commMethod: CommunicationMethodV1.HTTP,
        protocol: ProtocolV1.JSONRPC
      },
      modifyingValue: '',
      path: ['/serv:services/snmp:snmp/agent/enabled'],
      response: {
        error: null,
        data: null
      },
      uri: '0.0.0.0'
    })
    client.setLogin(true)
    await client
      .call(action.information)
      .then(response => {
        fail('No error when invalid action type')
      })
      .catch(error => {
        expect(error.toString()).toEqual('Error: Not a valid action type')
      })
  })

  it('Resolved when login not needed', async () => {
    let client = new HttpClient('0.0.0.0', ProtocolType.JSONRPC)
    await client
      .login()
      .then(response => {
        expect(response).toEqual('No need to log in')
      })
      .catch(error => {
        fail(error)
      })
  })

  it('Resolved when login fails', async () => {
    let client = new HttpClient('98.10.43.107', ProtocolType.JSONRPC, 'admin', 'admin')
    await client
      .login()
      .then(response => {
        expect(response).toEqual(
          'Login failed for http://98.10.43.107/jsonrpc please check client data'
        )
      })
      .catch(error => {
        // handles timeout
        expect(error).toEqual(
          'ERROR: Unable to log in: TypeError: Cannot convert undefined or null to object'
        )
      })
  })

  it('Can set login to true', () => {
    let client = new HttpClient('0.0.0.0', ProtocolType.JSONRPC)
    client.setLogin(true)
    expect(client.getLoginStatus()).toEqual(true)
  })

  it('Has loggedin set to false by default', () => {
    let client = new HttpClient('0.0.0.0', ProtocolType.JSONRPC)
    expect(client.getLoginStatus()).toEqual(false)
  })

  // JSONRPC
  it('Can add a transaction token to JSONRPC', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let th = 1
    let response: transactionResponse = { jsonrpc: '2.0', result: { th: 1 }, id: 2 }
    jsonrpc.setTrans(response)
    strictEqual(jsonrpc.getTrans(), th)
  })

  it('Can parse a path correctly', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let path = ['serv:services', 'snmp:snmp', 'agent', 'enabled']
    let pathstr = '/serv:services/snmp:snmp/agent/enabled'
    jsonrpc.setPath(path)
    strictEqual(jsonrpc.getPath(), pathstr)
  })

  it('Can add take a command string and return correct command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let response: transactionResponse = { jsonrpc: '2.0', result: { th: 1 }, id: 2 }
    let path = ['serv:services', 'snmp:snmp', 'agent', 'enabled']
    jsonrpc.setTrans(response)
    jsonrpc.setPath(path)
    let cmd = jsonrpc.getSchema()
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'get_schema',
      params: {
        th: 1,
        path: '/serv:services/snmp:snmp/agent/enabled',
        evaluate_when_entries: true,
        insert_values: true,
        levels: 3
      }
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return a correct read transaction command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let cmd = jsonrpc.transaction(transType.GET)
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'new_trans',
      params: { mode: 'read', tag: 'test' }
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return the correct logout command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let cmd = jsonrpc.logout()
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'logout'
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return the correct end transaction command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let cmd = jsonrpc.endTrans()
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'delete_trans',
      params: { th: undefined }
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return the correct set values command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let cmd = jsonrpc.setValues(['test1', 'test2'])
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'set_value',
      params: { th: undefined, path: '', value: ['test1', 'test2'] }
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return the correct set values command 2', () => {
    let jsonrpc = new Jsonrpc('admin')
    let cmd = jsonrpc.setValues(['test'])
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'set_value',
      params: { th: undefined, path: '', value: 'test' }
    }
    expect(cmd).toMatchObject(expected)
  })
})
