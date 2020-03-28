import { Jsonrpc } from '../protocols/jsonrpc'
import Axios, { AxiosRequestConfig, AxiosInstance } from 'axios'
import { Client } from './client'
import { transType } from '../enums/enums'
import { ActionTypeV1, ActionObjectInformationV1 } from '@ge-fnm/action-object'
import { HttpProtocol } from '../protocols/httpProtocol'
import { pamLog } from '..'
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
      'HTTPCLIENT:: Creating httpclient with uri: %s, protocol: %s, username: %s, password: %s',
      uri,
      protocolstr,
      username,
      password
    )
    // This needs to be changed to an if statement after more http protocols are added
    this.protocol = new Jsonrpc(username, password)
    this.uri = this.protocol.getURL(uri)
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
          'HTTPCLIENT:: Logging into radio uri: %s, username: %s, password: %s',
          this.uri,
          this.username,
          this.password
        )
        let loginCmd = this.protocol.login()
        pamLog('HTTPCLIENT:: Login Command:\n%O', loginCmd)
        this.axiosSession
          .post(this.uri, loginCmd)
          .then(response => {
            pamLog('HTTPCLIENT:: Received the following login response: %O', response.data)
            let responseStr = JSON.stringify(response.data)
            /* istanbul ignore next */
            if (Object.keys(response.data.result).length === 0 && !('error' in response.data)) {
              pamLog('HTTPCLIENT:: Login successful')
              this.loggedin = true
              let tokens = this.tokenPattern.exec(response.headers['set-cookie'])
              /* istanbul ignore next */
              if (tokens !== null) {
                this.axiosSession.defaults.headers.Cookie = tokens[0]
              }
              resolve(responseStr)
            } else {
              /* istanbul ignore next */
              pamLog('HTTPCLIENT:: Login failed')
              resolve(`Login failed for ${this.uri} please check client data`)
            }
          })
          .catch(er => {
            pamLog('HTTPCLIENT:: Login failed: %s', er)
            reject('ERROR: Unable to log in: ' + er)
          })
      } else {
        this.loggedin = true
        pamLog('HTTPCLIENT:: Login not needed')
        resolve('No need to log in')
      }
    })
  }

  /**
   * Calls an GET or SET action on the radio
   * Returns a promise with radio response
   * @param action the action object information
   */
  async call(action: ActionObjectInformationV1): Promise<string> {
    let transCmd = undefined
    let type: transType = transType.GET // default to GET
    pamLog('HTTPCLIENT:: Received action obj: \n%s', action)
    if (this.loggedin === true) {
      pamLog('HTTPCLIENT:: Client is logged in')
      if (action.actionType === ActionTypeV1.GET) {
        pamLog('HTTPCLIENT:: Received GET action')
        transCmd = this.protocol.transaction(transType.GET)
      } else if (action.actionType === ActionTypeV1.SET) {
        pamLog('HTTPCLIENT:: Received SET action')
        transCmd = this.protocol.transaction(transType.SET)
        type = transType.SET
      } else {
        throw new Error('Not a valid action type')
      }
      pamLog('HTTPCLIENT:: Transaction Command:\n%O', transCmd)
      let transResponse = await this.axiosSession.post(this.uri, transCmd)
      pamLog('HTTPCLIENT:: Received the following transaction response: %O', transResponse.data)
      this.protocol.setTrans(transResponse.data)
      let path: string[] | undefined = action.path
      if (path !== undefined) {
        pamLog('HTTPCLIENT:: Setting path to %s', path.toString())
        this.protocol.setPath(path)
      } else {
        throw new Error('GET/SET commands need a path')
      }

      if (type === transType.GET) {
        let schemaCmd = this.protocol.getSchema()
        pamLog('HTTPCLIENT:: Get schema Command:\n%O', schemaCmd)
        return new Promise<string>((resolve, reject) => {
          this.axiosSession
            .post(this.uri, schemaCmd)
            .then(actionResponse => {
              //pamLog('HTTPCLIENT:: Received the following transaction response: %s', transResponse)
              let actionResponseStr = JSON.stringify(actionResponse.data)
              resolve(actionResponseStr)
            })
            .catch(error => {
              /* istanbul ignore next */
              reject(error)
            })
        })
      } else {
        // Else this is a set command...
        let setCmd = this.protocol.setValues(action.modifyingValue)
        pamLog('HTTPCLIENT:: Set values Command:\n%O', setCmd)
        let validateCmd = this.protocol.validateCommit()
        pamLog('HTTPCLIENT:: Validate commit Command:\n%O', validateCmd)
        let commitCmd = this.protocol.commit()
        pamLog('HTTPCLIENT:: Commit Command:\n%O', commitCmd)
        let setResponse = await this.axiosSession.post(this.uri, setCmd)
        pamLog('HTTPCLIENT:: Received the following set values response:\n%O', setResponse.data)
        let validResponse = await this.axiosSession.post(this.uri, validateCmd)
        pamLog('HTTPCLIENT:: Received the following set values response:\n%O', validResponse.data)
        return new Promise<string>((resolve, reject) => {
          this.axiosSession
            .post(this.uri, commitCmd)
            .then(commitResponse => {
              pamLog(
                'HTTPCLIENT:: Received the following commit response:\n%O',
                commitResponse.data
              )
              let actionResponseStr = JSON.stringify(commitResponse.data)
              resolve(actionResponseStr)
            })
            .catch(error => {
              /* istanbul ignore next */
              reject(error)
            })
        })
      }
    } else {
      throw new Error("Not logged in, can't do action")
    }
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
