import axios, { AxiosInstance } from 'axios';
import { FilesMapFormat } from 'src';

export type FileMap = Record<string, File>;
export type ListOfFFiles = File[];

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  prepareGetParams(params: Record<string, any>): string {
    const urlParams = new URLSearchParams();
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null) {
        urlParams.append(key, String(params[key]));
      }
    }
    return urlParams.toString();
  }
  async get<T = any>(url: string, getParams?: Record<string, any>, config?: any): Promise<T> {
    const fullUrl = getParams ? `${url}?${this.prepareGetParams(getParams)}` : url;
    return (await this.client.get<T>(fullUrl, config)).data;
  }

  preparePostDataAndConfig(data: any, filesData?: Record<string, File> | null, config?: any): { payload: any; finalConfig: any } {
    if (filesData) {
      const formData = new FormData();
      formData.append('__data', JSON.stringify(data));
      const filesMap: Record<string, number> = {};
      let fileIndex = 0;
      for (const fileKey in filesData) {
        const fileValue = filesData[fileKey];
        filesMap[fileKey] = fileIndex++;
        formData.append('files[]', fileValue);
    }
      formData.append('__files', JSON.stringify(filesMap));
      const finalConfig = {
        ...(config || {}),
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data',
        },
      };
      return { payload: formData, finalConfig };
    }
    return { payload: data, finalConfig: config };
  }

  prepareFileArray(data: any, filesData: ListOfFFiles | null, config?: any): { payload: any; finalConfig: any } {
    if (filesData && Array.isArray(filesData) && filesData.length > 0) {
      const formData = new FormData();
      const __files: FilesMapFormat | null = data['__files'] || null;
      // pop __files from data if exists
      if (__files) {
        formData.append('__files', JSON.stringify(__files));
        delete data['__files'];
      }

      formData.append('__data', JSON.stringify(data));
      filesData.forEach((fileObj, index) => {
        formData.append('files[]', fileObj);
      });
      const finalConfig = {
        ...(config || {}),
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data',
        },
      };
      return { payload: formData, finalConfig };
    }
    return { payload: data, finalConfig: config };
  }
  
  async post<T = any>(url: string, data?: any, getParams?: Record<string, any> | null, filesData?: FileMap | null, config?: any): Promise<T> {
    const fullUrl = getParams ? `${url}?${this.prepareGetParams(getParams)}` : url;
    if (filesData && Object.keys(filesData).length > 0) {
      const { payload, finalConfig } = this.preparePostDataAndConfig(data, filesData, config);
      return (await this.client.post<T>(fullUrl, payload, finalConfig)).data;
    }
    return (await this.client.post<T>(fullUrl, data, config)).data;
  }

  async put<T = any>(url: string, data?: any, getParams?: Record<string, any> | null, filesData?: FileMap | ListOfFFiles | null, config?: any): Promise<T> {
    const fullUrl = getParams ? `${url}?${this.prepareGetParams(getParams)}` : url;
    if (filesData) {
      if (Array.isArray(filesData)) {
        const { payload, finalConfig } = this.prepareFileArray(data, filesData, config);
        return (await this.client.put<T>(fullUrl, payload, finalConfig)).data;
      } else if (Object.keys(filesData).length > 0) {
        const { payload, finalConfig } = this.preparePostDataAndConfig(data, filesData, config);
        return (await this.client.put<T>(fullUrl, payload, finalConfig)).data;
      }
    }
    return (await this.client.put<T>(fullUrl, data, config)).data;
  }

  async delete<T = any>(url: string, getParams?: Record<string, any>, config?: any): Promise<T> {
    const fullUrl = getParams ? `${url}?${this.prepareGetParams(getParams)}` : url;
    return (await this.client.delete<T>(fullUrl, config)).data;
  }

  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken() {
    delete this.client.defaults.headers.common['Authorization'];
  }
}

// Default export
export default new ApiClient();