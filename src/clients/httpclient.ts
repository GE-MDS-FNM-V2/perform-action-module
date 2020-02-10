import { Jsonrpc } from '../protocols/jsonrpc'
import Axios, { AxiosRequestConfig, AxiosInstance } from 'axios'
import { Client } from './client'
// import { ProtocolType } from '../enums/enums'
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
            console.log(response.data.result)
            console.log('error' in response.data)
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

  call(action: ActionObjectInformationV1): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.loggedin === true) {
        if (action.actionType === ActionTypeV1.GET) {
          let trans = this.protocol.readTrans()
          this.axiosSession
            .post(this.uri, trans)
            .then(response => {
              this.protocol.setTrans(response.data)
              this.protocol.setPath(action.path)
              let cmd = this.protocol.getCommand('getSchema')
              this.axiosSession
                .post(this.uri, cmd)
                .then(actionResponse => {
                  let actionResponseStr = JSON.stringify(actionResponse.data)
                  resolve(actionResponseStr)
                })
                .catch(error => {
                  /* istanbul ignore next */
                  reject(error)
                })
            })
            .catch(error => {
              /* istanbul ignore next */
              reject('ERROR::' + error)
            })
        } else {
          reject('Not a valid action type')
        }
      } else {
        let er = "Not logged in, can't do action"
        reject(er)
      }
    })
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
