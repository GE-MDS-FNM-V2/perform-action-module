import { Protocol } from './protocol'
import { AxiosRequestConfig, AxiosResponse } from 'axios'

export interface HttpProtocol extends Protocol {
  /**
   * Returns current Axios configuration for http protocol
   */
  config(): AxiosRequestConfig

  /**
   * Returns a whether the response contains a error or not
   * @param response the Axios response you wish to check
   */
  handleResponseError(response: AxiosResponse): any

  /**
   * Returns URL of the radio protocol API
   * @param url radio url
   */
  getURI(url: string): string
}
