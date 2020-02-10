import { HttpProtocol } from './httpProtocol'
import Axios, { AxiosRequestConfig, ResponseType } from 'axios'
import { TSMap } from 'typescript-map'

export class Jsonrpc implements HttpProtocol {
  private th: number | undefined
  private cmdID: number
  private path: string = ''
  private commandMap: TSMap<string, any>
  private username?: string
  private password?: string

  constructor(username?: string | undefined, password?: string | undefined) {
    this.username = username
    this.password = password
    this.cmdID = 0
    this.commandMap = new TSMap<string, any>()
    this.mapCommands()
  }

  private schema = (th: number, path: string): command => {
    let params = {
      th: th,
      path: path,
      evaluate_when_entries: true,
      insert_values: true,
      levels: 3
    }
    return this.cmd('get_schema', params)
  }

  private cmd = (method: string, params?: object): command => {
    this.cmdID++
    let cmd = {
      jsonrpc: '2.0',
      id: this.cmdID,
      method: method,
      params: params
    }

    return cmd
  }

  private mapCommands = () => {
    this.commandMap.set('getSchema', this.schema)
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

  readTrans = (): command => {
    let params: parameters = {
      mode: 'read',
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
    return config
  }

  setTrans = (transResponse: transactionResponse) => {
    this.th = transResponse.result.th
  }

  getTrans = (): number | undefined => {
    return this.th
  }

  getCommand = (commandStr: string): command => {
    if (this.commandMap.has(commandStr)) {
      return this.commandMap.get(commandStr)(this.th, this.path)
    } else {
      throw new Error('ERROR:: Invalid command')
    }
  }

  getPath = (): string => {
    return this.path
  }

  setPath = (path: string[]) => {
    for (let i = 0; i < path.length; i++) {
      this.path = this.path + '/' + path[i]
    }
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
