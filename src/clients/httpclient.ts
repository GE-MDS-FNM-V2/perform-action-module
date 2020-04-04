import { Jsonrpc } from '../protocols/jsonrpc'
import Axios, { AxiosRequestConfig, AxiosInstance, AxiosResponse } from 'axios'
import { Client } from './client'
import { transType } from '../enums/enums'
import { ActionTypeV1, ActionObjectInformationV1, GEErrors } from '@ge-fnm/action-object'
import { HttpProtocol } from '../protocols/httpProtocol'
import { debug } from 'debug'

const GEPAMError = GEErrors.GEPAMError
const GEPAMErrorCodes = GEErrors.GEPAMErrorCodes
const pamLog = debug('ge-fnm:perform-action-module:httpclient')

/**
 * This class is responsible for sending http request to radios.
 * The payloads for the requests is determined by which protocol
 * You initate the client with
 */
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
  login(): Promise<object> {
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
            // Logic for handling cookies whether in browser or not.
            // Currently untestable, remove this in future
            /* istanbul ignore next */
            if (Object.keys(response.data.result).length === 0 && !('error' in response.data)) {
              pamLog('Login successful')
              this.loggedin = true
              let tokens = this.tokenPattern.exec(response.headers['set-cookie'])
              if (tokens !== null) {
                this.axiosSession.defaults.headers.Cookie = tokens[0]
              }
              resolve(response.data)
            } else {
              pamLog('Login failed')
              reject(
                new GEPAMError(
                  `Login failed for ${this.uri} please check client data`,
                  GEPAMErrorCodes.LOGIN_FAILED
                ).toJSON()
              )
            }
          })
          .catch(er => {
            pamLog('Login failed: %s', er)
            reject(
              new GEPAMError(
                'Unable to log in: ' + er.toString(),
                GEPAMErrorCodes.NETWORK_ERROR
              ).toJSON()
            )
          })
      } else {
        this.loggedin = true
        pamLog('Login not needed')
        resolve({})
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
        return Promise.reject(
          new GEPAMError(
            'Received invalid action object type',
            GEPAMErrorCodes.UNSUPPORTED_ACTION_TYPE
          ).toJSON()
        )
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
        return Promise.reject(
          new GEPAMError('GET/SET commands need a path', GEPAMErrorCodes.INVALID_ACTION).toJSON()
        )
      }

      if (type === transType.GET) {
        let schemaCmd = this.protocol.getSchema()
        pamLog('Get schema Command:\n%O', schemaCmd)
        return this.deliverPayload(schemaCmd, 'get schema', false)
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
   * @param name the name of the command
   * @param log OPTIONAL flag if you want response logged or not. Default is true
   */
  async deliverPayload(payload: any, name: string, log = true): Promise<object> {
    return this.axiosSession
      .post(this.uri, payload)
      .then(response => {
        if (log) {
          pamLog('Received the following %s response:\n%O', name, response.data)
        }
        if (this.protocol.handleResponseError(response)) {
          let responseStr = JSON.stringify(response.data)
          return Promise.reject(
            new GEPAMError(
              `Error calling ${name} cmd. Radio response: ` + responseStr,
              GEPAMErrorCodes.RADIO_ERROR
            ).toJSON()
          )
        } else {
          return Promise.resolve(response.data)
        }
      })
      .catch(error => {
        if (error.status === 405) {
          return Promise.reject(error)
        }
        return Promise.reject(
          new GEPAMError(
            `Error reaching radio with ${name} cmd. Response: ${error}`,
            GEPAMErrorCodes.NETWORK_ERROR
          ).toJSON()
        )
      })
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
  killsession(): Promise<object> {
    return this.deliverPayload(this.protocol.logout(), 'Kill Session')
  }
}
