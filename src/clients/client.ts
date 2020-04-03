import { ActionObjectInformationV1 } from '@ge-fnm/action-object'

export interface Client {
  /**
   * Calls a command on the radio. Returns Radio response
   * @param action the information from the action object
   */
  call(action: ActionObjectInformationV1): Promise<object>

  /**
   * Logs into radio. Returns Radio response
   */
  login(): Promise<object>

  /**
   * Kills current session with radio
   */
  killsession(): Promise<object>
}
