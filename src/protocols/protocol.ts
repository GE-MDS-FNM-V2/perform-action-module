import { transType } from '../enums/enums'

export interface Protocol {
  transaction(type: transType): any

  commit(): any

  validateCommit(): any

  login(): any

  logout(): any

  getSchema(): any

  endTrans(): any

  setValues(value: any[] | any): any

  setTrans(transResponse?: any): void

  setPath(path: string[]): void
}
