import { transType } from '../enums/enums'

export interface Protocol {
  /**
   * Returns payload to start a transaction
   * @param type transaction type
   */
  transaction(type: transType): any

  /**
   * Returns payload to commit a change
   */
  commit(): any

  /**
   * Returns payload to validate a change
   */
  validateCommit(): any

  /**
   * Returns payload to log into radio
   */
  login(): any

  /**
   * Returns payload to log out of radio
   */
  logout(): any

  /**
   * Returns payload to get radio schema
   */
  getSchema(): any

  /**
   * Returns payload to end current transaction
   */
  endTrans(): any

  /**
   * Returns payload to change values. A transaction must be started and
   * a path must be specified for this command to work.
   * @param values the new values for the current path
   */
  setValues(values: any[] | any): any

  /**
   * Configures protocol for current transaction. Prereq to setting values
   * or getting schema
   * @param transResponse the response from a transaction command
   */
  setTrans(transResponse?: any): void

  /**
   * Configures protocol for specifed path. Prereq to setting values
   * or getting schema
   * @param path the path you wish to SET or GET
   */
  setPath(path: string[]): void

  /**
   * Returns a whether the response contains a error or not
   * @param response the response you wish to check
   */
  handleResponseError(response: any): boolean
}
