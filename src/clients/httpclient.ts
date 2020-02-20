import { Jsonrpc } from '../protocols/jsonrpc'
import Axios, { AxiosRequestConfig, AxiosInstance } from 'axios'
import { Client } from './client'
import { transType } from '../enums/enums'
import { ActionTypeV1, ActionObjectInformationV1 } from '@ge-fnm/action-object'
import { HttpProtocol } from '../protocols/httpProtocol'

export class HttpClient implements Client {
  private axiosSession: AxiosInstance
  private config: AxiosRequestConfig = {}
  private uri: string
  private protocol: HttpProtocol
  private username: string | undefined
  private password: string | undefined
  private tokenPattern = /sessionid_80=.*==;/i
  private loggedin = false

  constructor(uri: string, protocolstr: string, username?: string, password?: string) {
    this.protocol = new Jsonrpc(username, password)
    this.uri = this.protocol.getURL(uri)
    this.config = this.protocol.config()
    this.axiosSession = Axios.create(this.config)
    this.username = username
    this.password = password
  }

  login(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.username !== undefined || this.password !== undefined) {
        let loginCmd = this.protocol.login()
        this.axiosSession
          .post(this.uri, loginCmd)
          .then(response => {
            let responseStr = JSON.stringify(response.data)
            /* istanbul ignore next */
            if (Object.keys(response.data.result).length === 0 && !('error' in response.data)) {
              this.loggedin = true
              let tokens = this.tokenPattern.exec(response.headers['set-cookie'])
              /* istanbul ignore next */
              if (tokens !== null) {
                this.axiosSession.defaults.headers.Cookie = tokens[0]
              }
              resolve(responseStr)
            } else {
              /* istanbul ignore next */
              resolve(`Login failed for ${this.uri} please check client data`)
            }
          })
          .catch(er => {
            reject('ERROR: Unable to log in: ' + er)
          })
      } else {
        this.loggedin = true
        resolve('No need to log in')
      }
    })
  }

  async call(action: ActionObjectInformationV1): Promise<string> {
    let transCmd = undefined
    let type: transType = transType.GET // default to GET

    if (this.loggedin === true) {
      if (action.actionType === ActionTypeV1.GET) {
        transCmd = this.protocol.transaction(transType.GET)
      } else if (action.actionType === ActionTypeV1.SET) {
        transCmd = this.protocol.transaction(transType.SET)
        type = transType.SET
      } else {
        throw new Error('Not a valid action type')
      }

      let transResponse = await this.axiosSession.post(this.uri, transCmd)
      this.protocol.setTrans(transResponse.data)
      let path: string[] | undefined = action.path
      if (path !== undefined) {
        this.protocol.setPath(path)
      } else {
        throw new Error('GET/SET commands need a path')
      }

      if (type === transType.GET) {
        let schemaCmd = this.protocol.getSchema()
        return new Promise<string>((resolve, reject) => {
          this.axiosSession
            .post(this.uri, schemaCmd)
            .then(actionResponse => {
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
        let validateCmd = this.protocol.validateCommit()
        let commitCmd = this.protocol.commit()
        let setResponse = await this.axiosSession.post(this.uri, setCmd)
        console.log('Set response: ' + JSON.stringify(setResponse.data))
        let validResponse = await this.axiosSession.post(this.uri, validateCmd)
        console.log('Validate commit response: ' + JSON.stringify(validResponse.data))
        return new Promise<string>((resolve, reject) => {
          this.axiosSession
            .post(this.uri, commitCmd)
            .then(commitResponse => {
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

  // For testing purposes ONLY
  setLogin(status: boolean) {
    this.loggedin = status
  }

  getLoginStatus(): boolean {
    if (this.loggedin === true) {
      return true
    } else {
      return false
    }
  }

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
