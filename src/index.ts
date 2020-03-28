import { HttpClient } from './clients/httpclient'
import { Client } from './clients/client'
import { ClientType } from './enums/enums'
import { v1, ActionTypeV1, ActionObjectInformationV1 } from '@ge-fnm/action-object'
import { TSMap } from 'typescript-map'
import { debug } from 'debug'

export const pamLog = debug('ge-fnm:perform-action-module')

export class Executer {
  // Initated client objects are held in the MAP. URI is key
  private clientObjs = new TSMap<string, Client>()

  /**
   * Takes radio data and creates a client objext to the clientObjs map.
   * Returns a promise of the login response from the radio.
   * @param uri the ip address or serial port of radio
   * @param type the client type, e.g. http, serial, etc...
   * @param protocol the protocol to be used, e.g. JSONRPC, CLI
   * @param username OPTIONAL the username to authenticate
   * @param passoword OPTIONAL the password to authenticate
   */
  addclient(
    uri: string,
    type: string,
    protocol: string,
    username?: string,
    password?: string
  ): Promise<string> {
    pamLog(
      'Executer:: Adding client with uri: %s type: %s protocol: %s username: %s password: %s',
      uri,
      type,
      protocol,
      username,
      password
    )
    // remove this ignore later when wehave other client types
    /* istanbul ignore next */
    if (type === ClientType.HTTP) {
      this.clientObjs.set(uri, new HttpClient(uri, protocol, username, password))
    }
    return this.clientObjs.get(uri).login()
  }

  /**
   * Takes a serialized action object and calls commands on designated client
   * Returns serialized action object with response or error
   * @param action serialized action object
   */
  execute(action: string): Promise<string> {
    pamLog('Executer:: Executing serialized action object:\n%s', action)
    return new Promise((resolve, reject) => {
      let actionObj = v1.deserialize(action)
      let actionData = actionObj.information
      let key: string = actionData.uri
      pamLog('Executer:: Action Type: %s', actionObj.information.actionType)
      pamLog('Executer:: Client URI: %s', key)
      if (actionObj.information.actionType === ActionTypeV1.INIT) {
        this.addclient(
          key,
          actionData.commData.commMethod,
          actionData.commData.protocol,
          actionData.commData.username,
          actionData.commData.password
        )
          .then(addClientresponse => {
            // Either Login failed, or login succeeded, or no need to login
            actionObj.information.response = {
              data: addClientresponse,
              error: null
            }
            resolve(actionObj.serialize())
          })
          .catch(addClientError => {
            // Either Axios error (connection refused), or Protocol is invalid
            /* istanbul ignore next */
            addClientError = addClientError.toString()
            /* istanbul ignore next */
            actionObj.information.response = {
              error: `Error while adding client with uri ${key}. ${addClientError}`,
              data: null
            }
            /* istanbul ignore next */
            reject(actionObj.serialize())
          })
      } else {
        if (this.clientObjs.has(key)) {
          pamLog('Executer:: Found initiated client with uri: %s', key)
          this.clientObjs
            .get(key)
            .call(actionObj.information)
            .then(getSetResponse => {
              // Action succeeded
              // Commented out due to excesively large response with getSchema
              // pamLog('Executer:: Received response from the radio: %s', getSetResponse)
              actionObj.information.response = {
                data: getSetResponse,
                error: null
              }
              resolve(actionObj.serialize())
            })
            .catch(getSetError => {
              // Axios error (connection refused), invalid action type, Not logged in
              pamLog('Executer:: Received the following ERROR: %s', getSetError)
              /* istanbul ignore next */
              actionObj.information.response = {
                error: getSetError.toString(),
                data: null
              }
              reject(actionObj.serialize())
            })
        } else {
          pamLog('Executer:: No initiated client found with uri: %s', key)
          actionObj.information.response = {
            error: 'Not a valid radio uri. Please initialize radio before sending commands',
            data: null
          }
          reject(actionObj.serialize())
        }
      }
    })
  }

  /**
   * Kills the current session for the client
   * Returns radio response
   * @param uri the serial port or ip address of the client
   */
  killClientSession(uri: string): Promise<boolean> {
    pamLog('Executer:: Killing session for client with uri: %s', uri)
    return new Promise((resolve, rejects) => {
      if (this.clientObjs.has(uri)) {
        pamLog('Executer:: Found initiated client with uri: %s', uri)
        this.clientObjs
          .get(uri)
          .killsession()
          .then(response => {
            pamLog('Executer:: Kill session radio response: %s', response)
            resolve(response)
          })
          .catch(error => {
            /* istanbul ignore next */
            pamLog('Executer:: ERROR killing session: %s', error)
            /* istanbul ignore next */
            rejects(error)
          })
      }
      pamLog('Executer:: No initiated client found with uri: %s', uri)
      rejects('No client session')
    })
  }
}
