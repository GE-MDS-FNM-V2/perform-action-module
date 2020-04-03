import { HttpClient } from './httpclient'
import { ProtocolType } from '../enums/enums'
import {
  v1,
  ActionTypeV1,
  CommunicationMethodV1,
  ProtocolV1,
  GEErrors
} from '@ge-fnm/action-object'

const GEPAMError = GEErrors.GEPAMError
const GEPAMErrorCodes = GEErrors.GEPAMErrorCodes

describe('HTTP Client', () => {
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
        expect(error).toBeTruthy()
      })
  })

  it('Resolves as undefined when no need to log in', async () => {
    let client = new HttpClient('0.0.0.0', ProtocolType.JSONRPC)
    await client
      .login()
      .then(response => {
        expect(response).toEqual(undefined)
      })
      .catch(error => {
        fail(error)
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
})
