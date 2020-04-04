import { Executer } from './index'
import { ClientType, ProtocolType } from './enums/enums'
import {
  v1,
  ActionTypeV1,
  CommunicationMethodV1,
  ProtocolV1,
  ActionObjectInformationV1
} from '@ge-fnm/action-object'
import { promises as fsPromises } from 'fs'
import { PassThrough } from 'stream'

jest.setTimeout(30000)

describe('Perform Action Module', () => {
  it('Errors when addclient cannot reach a radio', async () => {
    let executer = new Executer()
    await executer
      .addclient('0.0.0.0', ClientType.HTTP, ProtocolType.JSONRPC, 'admin', 'admin')
      .then(response => {
        fail('Invalid client didnt reject')
      })
      .catch(error => {
        expect(error.message).toEqual('Unable to log in: Error: connect ECONNREFUSED 0.0.0.0:80')
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

  it('Can call two GET commands', async () => {
    let executer = new Executer()
    let URL = '98.10.43.107'
    await fsPromises.mkdir(__dirname + '/../test/log/can_call_two_GET_commands/', {
      recursive: true
    })
    let init = v1.create({
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
    let initstr = init.serialize()
    await executer.execute(initstr)
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
    await executer
      .execute(serilizedAction)
      .then(async response => {
        let actionobj = v1.deserialize(response)
        if (actionobj.information.response !== undefined) {
          await fsPromises.writeFile(
            __dirname + '/../test/log/can_call_two_GET_commands/output1.txt',
            JSON.stringify(actionobj.information.response.data)
          )
        } else {
          fail('No response data')
        }
      })
      .catch(error => {
        fail(error)
      })

    let action2 = v1.create({
      version: 1,
      actionType: ActionTypeV1.GET,
      commData: {
        commMethod: CommunicationMethodV1.HTTP,
        protocol: ProtocolV1.JSONRPC
      },
      modifyingValue: '',
      path: ['/serv:services/'],
      response: {
        error: null,
        data: null
      },
      uri: URL
    })
    let serilizedAction2 = action2.serialize()
    await executer
      .execute(serilizedAction2)
      .then(async response => {
        let actionobj = v1.deserialize(response)
        if (actionobj.information.response !== undefined) {
          await fsPromises.writeFile(
            __dirname + '/../test/log/can_call_two_GET_commands/output2.txt',
            JSON.stringify(actionobj.information.response.data)
          )
        } else {
          fail('No response data')
        }
      })
      .catch(error => {
        fail(error)
      })
  })

  it('Errors when action object has no path', async () => {
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
            if (actionObjJson.response !== undefined) {
              expect(actionObjJson.response.error.message).toEqual('GET/SET commands need a path')
            } else {
              fail('No error thrown when action object as no path')
            }
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

  it('Rejects initializing an unreachable radio', async () => {
    const executer = new Executer()
    const URL = '0.0.0.0'
    let action = v1.create({
      version: 1,
      actionType: ActionTypeV1.INIT,
      commData: {
        commMethod: CommunicationMethodV1.HTTP,
        protocol: ProtocolV1.JSONRPC,
        username: 'user',
        password: 'pass'
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
      .then(response => {
        fail('Did not reject with when unable to reach radio while initializing')
      })
      .catch(error => {
        expect(error).toBeTruthy()
      })
  })

  it('Rejects unimplemented client type', async () => {
    const executer = new Executer()
    const URL = '0.0.0.0'
    let action = v1.create({
      version: 1,
      actionType: ActionTypeV1.INIT,
      commData: {
        commMethod: CommunicationMethodV1.SERIAL,
        protocol: ProtocolV1.JSONRPC,
        username: 'user',
        password: 'pass'
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
      .then(response => {
        fail('Did not reject unimplemented client type')
      })
      .catch(error => {
        expect(error).toBeTruthy()
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
        expect(error).toBeTruthy()
      })
  })
})
