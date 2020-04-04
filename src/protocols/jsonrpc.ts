import { HttpProtocol } from './httpProtocol'
import { AxiosRequestConfig, AxiosResponse } from 'axios'
import { transType } from '../enums/enums'
import debug from 'debug'

const pamLog = debug('ge-fnm:perform-action-module:jsonrpc')

/**
 * This protocol class holds all the JSONRPC payload logic needed
 * To communicate with a GE radio
 */
export class Jsonrpc implements HttpProtocol {
  private th: number | undefined
  private cmdID: number
  private path: string = ''
  private username?: string
  private password?: string

  /**
   * Creates a jsonrpc protocol object
   * @param username
   * @param password
   */
  constructor(username?: string | undefined, password?: string | undefined) {
    pamLog('Creating jsonrpc protocol username: %s, password: %s', username, password)
    this.username = username
    this.password = password
    this.cmdID = 0
  }

  /**
   * Returns the JSONRPC formatted payload
   * @param method name of the command
   * @param params OPTIONAL command parameters
   */
  private cmd = (method: string, params?: object): command => {
    this.cmdID++
    let cmd = {
      jsonrpc: '2.0',
      id: this.cmdID,
      method: method,
      params: params
    }
    pamLog('Created command: \n%O', cmd)
    return cmd
  }

  /**
   * Returns a get schema JSONRPC payload
   */
  getSchema = (): command => {
    let params = {
      th: this.th,
      path: this.path,
      evaluate_when_entries: true,
      insert_values: true
    }
    return this.cmd('get_schema', params)
  }

  /**
   * Returns JSONRPC payload to end current transaction
   */
  endTrans = (): command => {
    let params = {
      th: this.th
    }
    return this.cmd('delete_trans', params)
  }

  /**
   * Returns url of radio JSONRPC API
   * @param uri the url of the radio
   */
  getURI = (uri: string): string => {
    return `http://${uri}/jsonrpc`
  }

  /**
   * Returns JSONRPC payload to log in
   */
  login = () => {
    let params = {
      user: this.username,
      passwd: this.password
    }
    return this.cmd('login', params)
  }

  /**
   * Returns JSONRPC payload to log out
   */
  logout = () => {
    return this.cmd('logout')
  }

  /**
   * Returns JSONRPC payload to create a transaction
   * @param type the transaction type
   */
  transaction = (type: transType): command => {
    let params: parameters = {
      mode: type,
      tag: 'test'
    }
    return this.cmd('new_trans', params)
  }

  /**
   * Returns a formated JSONRPC configuration for Axios
   */
  config = (): AxiosRequestConfig => {
    let headers = {
      'Content-Type': 'application/json',
      'access-control-allow-origin': '*'
    }
    let config: AxiosRequestConfig = {
      headers: headers,
      withCredentials: true,
      responseType: 'json'
    }
    pamLog('Config: %O', config)
    return config
  }

  /**
   * Returns JSONRPC payload to validate a change made by a set command
   */
  validateCommit = () => {
    let params = {
      th: this.th
    }
    return this.cmd('validate_commit', params)
  }

  /**
   * Returns JSONRPC payload to commit a change
   */
  commit = () => {
    let params = {
      th: this.th
    }
    return this.cmd('commit', params)
  }

  /**
   * Sets current transaction
   * @param transResponse the response from a transaction command
   */
  setTrans = (transResponse: transactionResponse) => {
    this.th = transResponse.result.th
  }

  /**
   * Returns current transaction
   */
  getTrans = (): number | undefined => {
    return this.th
  }

  /**
   * Returns current target path
   */
  getPath = (): string => {
    return this.path
  }

  /**
   * Sets current target path
   * @param path the target path
   */
  setPath = (path: string[]) => {
    this.path = ''
    for (let i = 0; i < path.length; i++) {
      this.path = this.path + '/' + path[i]
    }
    pamLog('Set path to: %s', this.path)
  }

  /**
   * Returns JSONRPC payload to set values in the radio
   * @param values new values for the values specified by the current path
   */
  setValues = (values: any[] | any) => {
    if (values.length === 1) {
      values = values[0]
    }
    let params = {
      th: this.th,
      path: this.path,
      value: values
    }
    return this.cmd('set_value', params)
  }

  /**
   * Returns whether the response contains an error
   * @param response any response from a JSONRPC command
   */
  handleResponseError = (response: AxiosResponse): boolean => {
    if (response.data['error']) {
      return true
    }
    return false
  }
}

/**
 * JSONRPC response for a transaction command
 */
export type transactionResponse = {
  jsonrpc: string
  result: result
  id: number
}

/**
 * Result of a transaction command
 */
type result = {
  th: number
}

/**
 * JSONRPC command format
 */
export type command = {
  jsonrpc: string
  id: number
  method: string
  params?: parameters
}

/**
 * Valid command parameters for JSONRPC
 */
type parameters = {
  mode?: string
  tag?: string
  user?: string
  passwd?: string
}
