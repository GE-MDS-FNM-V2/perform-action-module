import { Protocol } from './protocol'
import { AxiosRequestConfig } from 'axios'

export interface HttpProtocol extends Protocol {
  config(): AxiosRequestConfig

  getURL(url: string): string
}
