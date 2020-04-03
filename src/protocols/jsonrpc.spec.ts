import { Jsonrpc, transactionResponse } from './jsonrpc'
import { strictEqual } from 'assert'
import { transType } from '../enums/enums'
import { AxiosResponse } from 'axios'

describe('JSON RPC Logic', () => {
  it('Can add a transaction token to JSONRPC', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let th = 1
    let response: transactionResponse = { jsonrpc: '2.0', result: { th: 1 }, id: 2 }
    jsonrpc.setTrans(response)
    strictEqual(jsonrpc.getTrans(), th)
  })

  it('Can parse a path correctly', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let path = ['serv:services', 'snmp:snmp', 'agent', 'enabled']
    let pathstr = '/serv:services/snmp:snmp/agent/enabled'
    jsonrpc.setPath(path)
    strictEqual(jsonrpc.getPath(), pathstr)
  })

  it('Can add take a command string and return correct command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let response: transactionResponse = { jsonrpc: '2.0', result: { th: 1 }, id: 2 }
    let path = ['serv:services', 'snmp:snmp', 'agent', 'enabled']
    jsonrpc.setTrans(response)
    jsonrpc.setPath(path)
    let cmd = jsonrpc.getSchema()
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'get_schema',
      params: {
        th: 1,
        path: '/serv:services/snmp:snmp/agent/enabled',
        evaluate_when_entries: true,
        insert_values: true
      }
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return a correct read transaction command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let cmd = jsonrpc.transaction(transType.GET)
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'new_trans',
      params: { mode: 'read', tag: 'test' }
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return the correct logout command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let cmd = jsonrpc.logout()
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'logout'
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return the correct end transaction command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let cmd = jsonrpc.endTrans()
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'delete_trans',
      params: { th: undefined }
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return the correct set values command', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let cmd = jsonrpc.setValues(['test1', 'test2'])
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'set_value',
      params: { th: undefined, path: '', value: ['test1', 'test2'] }
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can return the correct set values command 2', () => {
    let jsonrpc = new Jsonrpc('admin')
    let cmd = jsonrpc.setValues(['test'])
    let expected = {
      jsonrpc: '2.0',
      id: 1,
      method: 'set_value',
      params: { th: undefined, path: '', value: 'test' }
    }
    expect(cmd).toMatchObject(expected)
  })

  it('Can parse a path correctly2', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let path = ['serv:services', 'snmp:snmp', 'agent', 'enabled']
    let pathstr = '/serv:services/snmp:snmp/agent/enabled'
    jsonrpc.setPath(path)
    jsonrpc.setPath(path)
    console.log(jsonrpc.getPath())
    strictEqual(jsonrpc.getPath(), pathstr)
  })

  it('Can correctly detect an error in a JSONRPC Response', () => {
    let jsonrpc = new Jsonrpc('admin', 'admin')
    let resData = {
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32602,
        type: 'rpc.method.unexpected_params',
        message: 'Unexpected params',
        data: {
          param: 'foo'
        }
      }
    }
    let axiosResponse: AxiosResponse = {
      data: resData,
      status: 200,
      statusText: '',
      headers: '',
      config: {}
    }
    expect(jsonrpc.handleResponseError(axiosResponse)).toEqual(true)
  })
})
