import { HttpProtocol } from './httpProtocol'
import { AxiosRequestConfig } from 'axios'
import { transType } from '../enums/enums'
import debug from 'debug'

const pamLog = debug('ge-fnm:perform-action-module:jsonrpc')

export class Jsonrpc implements HttpProtocol {
  private th: number | undefined
  private cmdID: number
  private path: string = ''
  private username?: string
  private password?: string

  constructor(username?: string | undefined, password?: string | undefined) {
    pamLog('Creating jsonrpc protocol username: %s, password: %s', username, password)
    this.username = username
    this.password = password
    this.cmdID = 0
  }

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

  getSchema = (): command => {
    let params = {
      th: this.th,
      path: this.path,
      evaluate_when_entries: true,
      insert_values: true
    }
    return this.cmd('get_schema', params)
  }

  endTrans = (): command => {
    let params = {
      th: this.th
    }
    return this.cmd('delete_trans', params)
  }

  getURL = (url: string): string => {
    return `http://${url}/jsonrpc`
  }

  login = () => {
    let params = {
      user: this.username,
      passwd: this.password
    }
    return this.cmd('login', params)
  }

  logout = () => {
    return this.cmd('logout')
  }

  transaction = (type: transType): command => {
    let params: parameters = {
      mode: type,
      tag: 'test'
    }
    return this.cmd('new_trans', params)
  }

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

  validateCommit = () => {
    let params = {
      th: this.th
    }
    return this.cmd('validate_commit', params)
  }

  commit = () => {
    let params = {
      th: this.th
    }
    return this.cmd('commit', params)
  }

  setTrans = (transResponse: transactionResponse) => {
    this.th = transResponse.result.th
  }

  getTrans = (): number | undefined => {
    return this.th
  }

  getPath = (): string => {
    return this.path
  }

  setPath = (path: string[]) => {
    this.path = ''
    for (let i = 0; i < path.length; i++) {
      this.path = this.path + '/' + path[i]
    }
    pamLog('Set path to: %s', this.path)
  }

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
}

export type transactionResponse = {
  jsonrpc: string
  result: result
  id: number
}

type result = {
  th: number
}

export type command = {
  jsonrpc: string
  id: number
  method: string
  params?: parameters
}

type parameters = {
  mode?: string
  tag?: string
  user?: string
  passwd?: string
}
