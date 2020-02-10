import { Protocol } from '../protocols/protocol'
import { Jsonrpc } from '../protocols/jsonrpc'
import axios from 'axios'
import { ActionObjectInformationV1 } from '@ge-fnm/action-object'

export interface Client {
  call(action: ActionObjectInformationV1): Promise<string>

  login(): Promise<string>

  killsession(): Promise<boolean>
}
