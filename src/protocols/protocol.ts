import { TSMap } from 'typescript-map'

export interface Protocol {
  readTrans(): any

  login(): any

  logout(): any

  getCommand(commandStr: string): any

  setTrans(transResponse?: any): void

  setPath(path: string[]): void
}
