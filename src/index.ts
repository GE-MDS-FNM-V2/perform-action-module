import { HttpClient } from './clients/httpclient'
import { Client } from './clients/client'
import { ClientType } from './enums/enums'
import { v1, ActionTypeV1, ActionObjectInformationV1 } from '@ge-fnm/action-object'
import { TSMap } from 'typescript-map'
import { debug } from 'debug'
import { GEPAMError, GEPAMErrorCodes } from '@ge-fnm/action-object/dist/types/GEError'

export const pamLog = debug('ge-fnm:perform-action-module:executer')

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
  ): Promise<object> {
    pamLog(
      'Adding client with uri: %s type: %s protocol: %s username: %s password: %s',
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
    pamLog('Executing serialized action object:\n%s', action)
    return new Promise((resolve, reject) => {
      let actionObj = v1.deserialize(action)
      let actionData = actionObj.information
      let key: string = actionData.uri
      pamLog('Action Type: %s', actionObj.information.actionType)
      pamLog('Client URI: %s', key)
      if (actionObj.information.actionType === ActionTypeV1.INIT) {
        this.addclient(
          key,
          actionData.commData.commMethod,
          actionData.commData.protocol,
          actionData.commData.username,
          actionData.commData.password
        )
          .then(addClientresponse => {
            if (addClientresponse === undefined) {
              actionObj.information.response = {
                data: 'Authentication information not given, client added but not authenticated',
                error: null
              }
            } else {
              actionObj.information.response = {
                data: addClientresponse,
                error: null
              }
            }
            resolve(actionObj.serialize())
          })
          .catch(addClientError => {
            /* istanbul ignore next */
            actionObj.information.response = {
              error: addClientError,
              data: null
            }
            /* istanbul ignore next */
            reject(actionObj.serialize())
          })
      } else {
        if (this.clientObjs.has(key)) {
          pamLog('Found initiated client with uri: %s', key)
          this.clientObjs
            .get(key)
            .call(actionObj.information)
            .then(response => {
              // Action succeeded
              // Commented out due to excesively large response with getSchema
              // pamLog('Received response from the radio: %s', response)
              actionObj.information.response = {
                data: response,
                error: null
              }
              resolve(actionObj.serialize())
            })
            .catch(error => {
              pamLog('Received the following ERROR: %s', error)
              /* istanbul ignore next */
              actionObj.information.response = {
                error: error,
                data: null
              }
              reject(actionObj.serialize())
            })
        } else {
          pamLog('No initiated client found with uri: %s', key)
          actionObj.information.response = {
            error: new GEPAMError(
              `No initialized radio with uri ${key}. Please initialize the radio first.`,
              GEPAMErrorCodes.RADIO_UNINITIALIZED
            ).toJSON(),
            data: null
          }
          reject(actionObj.serialize())
        }
      }
    })
  }

  /**
   * Kills the current session for the client. Used mainly for testing purposes
   * Returns radio response
   * @param uri the serial port or ip address of the client
   */
  killClientSession(uri: string): Promise<object> {
    pamLog('Killing session for client with uri: %s', uri)
    if (this.clientObjs.has(uri)) {
      return this.clientObjs.get(uri).killsession()
    }
    return Promise.reject(
      new GEPAMError(
        `No client session to kill for uri: ${uri}`,
        GEPAMErrorCodes.KILL_CLIENT_SESSION_ERROR
      )
    )
  }
}
