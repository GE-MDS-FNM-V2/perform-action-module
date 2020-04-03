import { Jsonrpc } from '../protocols/jsonrpc'
import Axios, { AxiosRequestConfig, AxiosInstance, AxiosResponse } from 'axios'
import { Client } from './client'
import { transType } from '../enums/enums'
import { ActionTypeV1, ActionObjectInformationV1 } from '@ge-fnm/action-object'
import { HttpProtocol } from '../protocols/httpProtocol'
import { debug } from 'debug'

const pamLog = debug('ge-fnm:perform-action-module:httpclient')

export class HttpClient implements Client {
  private axiosSession: AxiosInstance
  private config: AxiosRequestConfig = {}
  private uri: string
  private protocol: HttpProtocol
  private username: string | undefined
  private password: string | undefined
  private tokenPattern = /sessionid_80=.*==;/i
  private loggedin = false

  /**
   * Creates an httpclient object
   * @param uri the ip address of the radio
   * @param protocolstr the protocol to use, e.g. jsonrpc
   * @param username the username to authenticate
   * @param password the password to authenticate
   */
  constructor(uri: string, protocolstr: string, username?: string, password?: string) {
    pamLog(
      'Creating httpclient with uri: %s, protocol: %s, username: %s, password: %s',
      uri,
      protocolstr,
      username,
      password
    )
    // This needs to be changed to an if statement after more http protocols are added
    this.protocol = new Jsonrpc(username, password)
    this.uri = this.protocol.getURI(uri)
    this.config = this.protocol.config()
    this.axiosSession = Axios.create(this.config)
    this.username = username
    this.password = password
  }

  /**
   * Logs into the radio. Returns a promise with radio response
   */
  login(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.username !== undefined || this.password !== undefined) {
        pamLog(
          'Logging into radio uri: %s, username: %s, password: %s',
          this.uri,
          this.username,
          this.password
        )
        let loginCmd = this.protocol.login()
        pamLog('Login Command:\n%O', loginCmd)
        this.axiosSession
          .post(this.uri, loginCmd)
          .then(response => {
            pamLog('Received the following login response: %O', response.data)
            /* istanbul ignore next */
            if (Object.keys(response.data.result).length === 0 && !('error' in response.data)) {
              pamLog('Login successful')
              this.loggedin = true
              let tokens = this.tokenPattern.exec(response.headers['set-cookie'])
              /* istanbul ignore next */
              if (tokens !== null) {
                this.axiosSession.defaults.headers.Cookie = tokens[0]
              }
              resolve('Successfully logged in')
            } else {
              /* istanbul ignore next */
              pamLog('Login failed')
              reject(`Login failed for ${this.uri} please check client data`)
            }
          })
          .catch(er => {
            pamLog('Login failed: %s', er)
            reject('ERROR: Unable to log in: ' + er)
          })
      } else {
        this.loggedin = true
        pamLog('Login not needed')
        resolve('No need to log in')
      }
    })
  }

  /**
   * Calls an GET or SET action on the radio
   * Returns a promise with radio response
   * @param action the action object information
   */
  async call(action: ActionObjectInformationV1): Promise<object> {
    let transCmd = undefined
    let type: transType = transType.GET // default to GET
    pamLog('Received action obj: \n%s', action)
    if (this.loggedin === true) {
      pamLog('Client is logged in')
      if (action.actionType === ActionTypeV1.GET) {
        pamLog('Received GET action')
        transCmd = this.protocol.transaction(transType.GET)
      } else if (action.actionType === ActionTypeV1.SET) {
        pamLog('Received SET action')
        transCmd = this.protocol.transaction(transType.SET)
        type = transType.SET
      } else {
        return Promise.reject('Not a valid action type')
      }

      // Configure protocol to start sending commands to radio
      pamLog('Transaction Command:\n%O', transCmd)
      let transResponse = await this.deliverPayload(transCmd, 'transaction')
      this.protocol.setTrans(transResponse)
      let path: string[] | undefined = action.path
      if (path !== undefined) {
        pamLog('Setting path to %s', path.toString())
        this.protocol.setPath(path)
      } else {
        return Promise.reject('GET/SET commands need a path')
      }

      if (type === transType.GET) {
        let schemaCmd = this.protocol.getSchema()
        pamLog('Get schema Command:\n%O', schemaCmd)
        return this.deliverPayload(schemaCmd)
      } else {
        // Else this is a set command...
        // Grab payloads from protocol
        let setCmd = this.protocol.setValues(action.modifyingValue)
        pamLog('Set values Command:\n%O', setCmd)
        let validateCmd = this.protocol.validateCommit()
        pamLog('Validate commit Command:\n%O', validateCmd)
        let commitCmd = this.protocol.commit()
        pamLog('Commit Command:\n%O', commitCmd)

        // Deliver payloads to radio
        await this.deliverPayload(setCmd, 'set values')
        await this.deliverPayload(validateCmd, 'validate commit')
        return this.deliverPayload(commitCmd, 'commit change')
      }
    } else {
      throw new Error("Not logged in, can't do action")
    }
  }

  /**
   * Returns a promise with axios response data
   * Rejects if an error is found in the response
   * @param payload the payload to send in the post request
   * @param logName OPTIONAL if you want the response logged, give it a name
   */
  async deliverPayload(payload: any, logName?: string): Promise<object> {
    let response = await this.axiosSession.post(this.uri, payload)
    if (logName !== undefined) {
      pamLog('Received the following %s response:\n%O', logName, response.data)
    }
    if (this.protocol.handleResponseError(response)) {
      return Promise.reject(response.data)
    }
    return Promise.resolve(response.data)
  }

  /**
   * Sets status of Login. Recommended use only for testing
   * @param status the status to set login to
   */
  setLogin(status: boolean) {
    this.loggedin = status
  }

  /**
   * Returns current login status
   */
  getLoginStatus(): boolean {
    if (this.loggedin === true) {
      return true
    } else {
      return false
    }
  }

  /**
   * Kills current client session. Returns a promise with radio response
   */
  killsession(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let logout = this.protocol.logout()
      this.axiosSession
        .post(this.uri, logout)
        .then(response => {
          resolve(true)
        })
        .catch(error => {
          /* istanbul ignore next */
          reject(error)
        })
    })
  }
}
