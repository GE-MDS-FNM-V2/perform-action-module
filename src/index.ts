import { HttpClient } from './clients/httpclient'
import { Client } from './clients/client'
import { ClientType } from './enums/enums'
import { v1, ActionTypeV1, ActionObjectInformationV1 } from '@ge-fnm/action-object'
import { TSMap } from 'typescript-map'

export class Executer {
  private clientObjs = new TSMap<string, Client>()

  addclient(
    uri: string,
    type: string,
    protocol: string,
    username?: string,
    password?: string
  ): Promise<string> {
    // remove this ignore later when wehave other client types
    /* istanbul ignore next */
    if (type === ClientType.HTTP) {
      this.clientObjs.set(uri, new HttpClient(uri, protocol, username, password))
    }
    return this.clientObjs.get(uri).login()
  }

  execute(action: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let actionObj = v1.deserialize(action)
      let actionData = actionObj.information
      let key: string = actionData.uri
      if (actionObj.information.actionType === ActionTypeV1.INIT) {
        this.addclient(
          key,
          actionData.commData.commMethod,
          actionData.commData.protocol,
          actionData.commData.username,
          actionData.commData.password
        )
          .then(addClientresponse => {
            // Either Login failed, or login succeeded, or no need to login
            actionObj.information.response = {
              data: addClientresponse,
              error: null
            }
            resolve(actionObj.serialize())
          })
          .catch(addClientError => {
            // Either Axios error (connection refused), or Protocol is invalid
            /* istanbul ignore next */
            addClientError = addClientError.toString()
            actionObj.information.response = {
              error: `Error while adding client with uri ${key}. ${addClientError}`,
              data: null
            }
            reject(actionObj.serialize())
          })
      } else {
        if (this.clientObjs.has(key)) {
          this.clientObjs
            .get(key)
            .call(actionObj.information)
            .then(getSetResponse => {
              // Action succeeded
              actionObj.information.response = {
                data: getSetResponse,
                error: null
              }
              resolve(actionObj.serialize())
            })
            .catch(getSetError => {
              // Axios error (connection refused), invalid action type, Not logged in
              /* istanbul ignore next */
              actionObj.information.response = {
                error: getSetError.toString(),
                data: null
              }
              reject(actionObj.serialize())
            })
        } else {
          actionObj.information.response = {
            error: 'Not a valid radio uri. Please initialize radio before sending commands',
            data: null
          }
          reject(actionObj.serialize())
        }
      }
    })
  }

  killClientSession(uri: string): Promise<boolean> {
    return new Promise((resolve, rejects) => {
      if (this.clientObjs.has(uri)) {
        this.clientObjs
          .get(uri)
          .killsession()
          .then(response => {
            resolve(response)
          })
          .catch(error => {
            /* istanbul ignore next */
            rejects(error)
          })
      }
      rejects('No client session')
    })
  }
}
